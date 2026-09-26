import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import superjson from 'superjson';
import { config } from './config.js';
import { catalogQuerySchema, getCatalog } from './catalog.js';
import {
  createGame,
  createGameSchema,
  deleteGame,
  getGame,
  gamesListQuerySchema,
  listGames,
  patchGame,
  replaceGame,
} from './games.js';

class RequestBodyError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': config.CLIENT_ORIGIN,
    'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'access-control-allow-headers': 'content-type',
  });
  response.end(JSON.stringify(superjson.serialize(payload)));
}

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 1_000_000) throw new RequestBodyError(413, 'Request body is too large');
    chunks.push(buffer);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  } catch {
    throw new RequestBodyError(400, 'Invalid JSON body');
  }
}

async function handleRequest(request: IncomingMessage, response: ServerResponse) {
  if (request.method === 'OPTIONS') {
    response.writeHead(204, {
      'access-control-allow-origin': config.CLIENT_ORIGIN,
      'access-control-allow-methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'access-control-allow-headers': 'content-type',
    });
    response.end();
    return;
  }

  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  if (request.method === 'GET' && url.pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok', service: 'pafhub-api' });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/api/catalog') {
    const parsed = catalogQuerySchema.safeParse({
      search: url.searchParams.get('search') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
    });
    if (!parsed.success) {
      sendJson(response, 400, { error: 'Invalid catalog query', details: parsed.error.flatten() });
      return;
    }
    sendJson(response, 200, { data: getCatalog(parsed.data) });
    return;
  }

  if (url.pathname === '/api/games') {
    if (request.method === 'GET') {
      const parsed = gamesListQuerySchema.safeParse({
        search: url.searchParams.get('search') ?? undefined,
        limit: url.searchParams.get('limit') ?? undefined,
        offset: url.searchParams.get('offset') ?? undefined,
      });
      if (!parsed.success) {
        sendJson(response, 400, { error: 'Invalid games query', details: parsed.error.flatten() });
        return;
      }
      sendJson(response, 200, await listGames(parsed.data));
      return;
    }

    if (request.method === 'POST') {
      const body = await readJsonBody(request);
      const parsed = createGameSchema.safeParse(body);
      if (!parsed.success) {
        sendJson(response, 400, { error: 'Invalid game', details: parsed.error.flatten() });
        return;
      }
      const game = await createGame(parsed.data);
      if (!game) {
        sendJson(response, 409, { error: 'Game already exists' });
        return;
      }
      sendJson(response, 201, { data: game });
      return;
    }

    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  const gamePathMatch = url.pathname.match(/^\/api\/games\/([^/]+)$/);
  if (gamePathMatch) {
    let id: string;
    try {
      id = decodeURIComponent(gamePathMatch[1]);
    } catch {
      sendJson(response, 400, { error: 'Invalid game ID' });
      return;
    }

    if (request.method === 'GET') {
      const game = await getGame(id);
      if (!game) {
        sendJson(response, 404, { error: 'Game not found' });
        return;
      }
      sendJson(response, 200, { data: game });
      return;
    }

    if (request.method === 'PUT') {
      const body = await readJsonBody(request);
      const parsed = createGameSchema.omit({ id: true }).safeParse(body);
      if (!parsed.success) {
        sendJson(response, 400, { error: 'Invalid game', details: parsed.error.flatten() });
        return;
      }
      const game = await replaceGame(id, parsed.data);
      if (!game) {
        sendJson(response, 404, { error: 'Game not found' });
        return;
      }
      sendJson(response, 200, { data: game });
      return;
    }

    if (request.method === 'PATCH') {
      const body = await readJsonBody(request);
      const parsed = createGameSchema.omit({ id: true }).partial().safeParse(body);
      if (!parsed.success || !Object.keys(parsed.success ? parsed.data : {}).length) {
        sendJson(response, 400, {
          error: 'Invalid game update',
          ...(parsed.success ? {} : { details: parsed.error.flatten() }),
        });
        return;
      }
      const game = await patchGame(id, parsed.data);
      if (!game) {
        sendJson(response, 404, { error: 'Game not found' });
        return;
      }
      sendJson(response, 200, { data: game });
      return;
    }

    if (request.method === 'DELETE') {
      const deleted = await deleteGame(id);
      if (!deleted) {
        sendJson(response, 404, { error: 'Game not found' });
        return;
      }
      response.writeHead(204, {
        'access-control-allow-origin': config.CLIENT_ORIGIN,
      });
      response.end();
      return;
    }

    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  sendJson(response, 404, { error: 'Not found' });
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch((error: unknown) => {
    if (error instanceof RequestBodyError) {
      sendJson(response, error.status, { error: error.message });
      return;
    }
    console.error(error);
    sendJson(response, 500, { error: 'Internal server error' });
  });
});
server.listen(config.PORT, () => {
  console.log(`PAFHub API listening on http://localhost:${config.PORT}`);
});
