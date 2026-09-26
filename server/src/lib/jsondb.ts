import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import superjson from 'superjson';
import type { ZodType } from 'zod';

const logger = console;

export type JsonDbDebugLogger = typeof logger.debug;

export class JsonDbError extends Error {
    constructor(message: string) {
        super(`[JsonDB] ${message}`);
        this.name = 'JsonDbError';
    }
}

export type JsonDbTableOptions = {
    superjsonEnabled?: boolean;
    debugLogger?: JsonDbDebugLogger;
};

/**
 * Async JSON array store used by the importers. Rows are kept in memory and
 * indexed by id, so importing a batch only reads the file once and writes it
 * once when save() is called.
 */
export class JsonDatabase<R extends { id: string | number }> {
    private static readonly instances = new Map<string, Promise<JsonDatabase<any>>>();

    private readonly records = new Map<R['id'], R>();
    private saveQueue: Promise<void> = Promise.resolve();

    private constructor(
        private readonly filePath: string,
        private readonly schema: ZodType<R[]>,
        initialRecords: R[],
    ) {
        for (const record of initialRecords) this.records.set(record.id, record);
    }

    static open<R extends { id: string | number }>(
        filePath: string,
        schema: ZodType<R[]>,
    ): Promise<JsonDatabase<R>> {
        const resolvedPath = path.resolve(filePath);
        const existing = JsonDatabase.instances.get(resolvedPath);
        if (existing) return existing as Promise<JsonDatabase<R>>;

        const opening = JsonDatabase.load<R>(resolvedPath, schema);
        JsonDatabase.instances.set(resolvedPath, opening);
        opening.catch(() => {
            if (JsonDatabase.instances.get(resolvedPath) === opening) {
                JsonDatabase.instances.delete(resolvedPath);
            }
        });
        return opening;
    }

    private static async load<R extends { id: string | number }>(
        filePath: string,
        schema: ZodType<R[]>,
    ): Promise<JsonDatabase<R>> {
        await fsp.mkdir(path.dirname(filePath), { recursive: true });
        let content: string;
        try {
            content = await fsp.readFile(filePath, 'utf8');
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
            return new JsonDatabase(filePath, schema, []);
        }

        let parsed: unknown;
        try {
            parsed = JSON.parse(content);
        } catch (error) {
            throw new JsonDbError(`Invalid JSON in ${filePath}: ${error instanceof Error ? error.message : error}`);
        }

        let records: R[];
        try {
            records = schema.parse(parsed);
        } catch (error) {
            throw new JsonDbError(`Invalid data in ${filePath}: ${error instanceof Error ? error.message : error}`);
        }
        return new JsonDatabase(filePath, schema, records);
    }

    upsert(record: R): void {
        this.records.set(record.id, record);
    }

    upsertMany(records: R[]): void {
        for (const record of records) this.upsert(record);
    }

    get(id: R['id']): R | undefined {
        return this.records.get(id);
    }

    delete(id: R['id']): boolean {
        return this.records.delete(id);
    }

    all(): R[] {
        return Array.from(this.records.values());
    }

    save(): Promise<void> {
        const snapshot = this.schema.parse(this.all());
        const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;
        this.saveQueue = this.saveQueue.catch(() => undefined).then(async () => {
            const temporaryPath = `${this.filePath}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
            try {
                await fsp.writeFile(temporaryPath, serialized, 'utf8');
                await fsp.rename(temporaryPath, this.filePath);
            } catch (error) {
                await fsp.rm(temporaryPath, { force: true }).catch(() => undefined);
                throw error;
            }
        });
        return this.saveQueue;
    }
}

/**
 * Simple file-based JSON database built on top of SuperJSON.
 */
export class JsonDbTable<R extends Record<string, any>> {
    private readonly tableName: string;
    private readonly pkField: keyof R;
    private readonly filePath: string;
    private readonly options: Required<JsonDbTableOptions>;

    constructor(
        absoluteFilePath: string,
        pkField: keyof R,
        initialData: R[] = [],
        options?: JsonDbTableOptions
    ) {
        const dirName = path.dirname(absoluteFilePath);

        if (!fs.existsSync(dirName)) {
            fs.mkdirSync(dirName, { recursive: true });
        }

        this.tableName = path.basename(absoluteFilePath).replace('.json', '');
        this.pkField = pkField;
        this.filePath = absoluteFilePath;

        this.options = {
            debugLogger: (message, ctx) =>
                logger.debug(`[JsonDB] ${this.tableName} - ${message}`, ctx),
            superjsonEnabled: true,
            ...options
        };

        if (!fs.existsSync(absoluteFilePath)) {
            this.saveFile(initialData);
        }
    }

    private get log(): JsonDbDebugLogger {
        return this.options.debugLogger;
    }

    private getData(): R[] {
        const db = this.readFile();
        if (!Array.isArray(db)) {
            throw new JsonDbError(`Invalid data in ${this.filePath}`);
        }
        return db;
    }

    all(): R[] {
        return this.getData();
    }

    readFile(): R[] {
        this.log(`Reading table from ${this.filePath}`);

        if (!fs.existsSync(this.filePath)) {
            this.saveFile([]);
            return [];
        }

        const fileContent = fs.readFileSync(this.filePath, 'utf8');
        return this.options.superjsonEnabled
            ? superjson.parse<R[]>(fileContent)
            : JSON.parse(fileContent);
    }

    saveFile(db: R[]): void {
        this.log(`Saving table to ${this.filePath}`);
        const serializedDb = this.options.superjsonEnabled
            ? JSON.stringify(superjson.serialize(db), null, 2)
            : JSON.stringify(db, null, 2);
        fs.writeFileSync(this.filePath, serializedDb);
    }

    findById(id: string): R | undefined {
        const db = this.getData();
        return db.find((record) => record[this.pkField] === id);
    }

    findBy(field: keyof R, value: any): R[] {
        const db = this.getData();
        return db.filter((record) => record[field] === value);
    }

    findFirstBy(field: keyof R, value: any): R | undefined {
        const db = this.getData();
        return db.find((record) => record[field] === value);
    }

    search(filterFn: (record: R) => boolean): R[] {
        const db = this.getData();
        return db.filter((record) => filterFn(record));
    }

    insert(record: R): void {
        const pk = record[this.pkField];
        if (!pk) {
            throw new JsonDbError(
                `Record does not have a primary key: ${this.tableName}.${String(this.pkField)}`
            );
        }

        const db = this.getData();
        db.push(record);

        this.saveFile(db);
    }

    insertMany(records: R[]): void {
        const db = this.getData();
        db.push(...records);

        this.saveFile(db);
    }

    update(record: Partial<R>): void {
        const pk = record[this.pkField];
        if (!pk) {
            throw new JsonDbError(`Record not found in ${this.tableName}: ${pk}`);
        }

        const db = this.getData();

        for (const currentRecord of db) {
            if (currentRecord[this.pkField] === pk) {
                Object.assign(currentRecord, record);
                break;
            }
        }

        this.saveFile(db);
    }

    updateMany(records: Array<Partial<R>>): void {
        const db = this.getData();
        for (const record of records) {
            const pk = record[this.pkField];
            if (!pk) {
                throw new JsonDbError(`Record not found in ${this.tableName}: ${pk}`);
            }
            const current = db.find((item) => item[this.pkField] === pk);
            if (current) Object.assign(current, record);
        }
        this.saveFile(db);
    }

    delete(id: string): void {
        this.deleteMany([id]);
    }

    deleteMany(ids: string[]): void {
        this.log(`Deleting ${ids.length} records`);
        const idsToDelete = new Set(ids);
        const db = this.getData().filter((record) => !idsToDelete.has(record[this.pkField]));

        this.saveFile(db);
    }

    truncate(): void {
        this.saveFile([]);
    }
}

export class JsonDbRepository<R extends Record<string, any>> {
    protected table: JsonDbTable<R>;

    constructor(dataPath: string, pkField: keyof R) {
        this.table = jsondb<R>(dataPath, pkField, []);
    }
}

// In-memory cache of JsonDB table instances
const _jsonDbTables: Record<string, JsonDbTable<any>> = {};

/**
 * Helper function to create a new JsonDB table.
 * It reuses the same table instance if the same file path is used.
 */
export function jsondb<R extends Record<string, any>>(
    filePath: string,
    pkField: keyof R,
    initialData: R[],
    options?: JsonDbTableOptions
): JsonDbTable<R> {
    if (!_jsonDbTables[filePath]) {
        _jsonDbTables[filePath] = new JsonDbTable<R>(filePath, pkField, initialData, options);
    }
    return _jsonDbTables[filePath];
}
