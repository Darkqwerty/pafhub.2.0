"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = fetchPlatformData;
// Core modules
const fs_1 = require("fs");
// Public modules from npm
const cheerio_1 = require("cheerio");
// Modules from file
const shared_1 = __importDefault(require("../shared"));
const url_1 = require("../constants/url");
const css_selector_1 = require("../constants/css-selector");
const network_helper_1 = require("../network-helper");
//#endregion Interface definitions
//#region Public methods
/**
 * Gets the basic data used for game data processing
 * (such as graphics engines and progress statuses)
 */
async function fetchPlatformData() {
    // Check if the data are cached
    const cacheExists = await readCache(shared_1.default.cachePath);
    if (!cacheExists) {
        // Load the HTML
        const response = await (0, network_helper_1.fetchHTML)(url_1.urls.LATEST_UPDATES);
        // Parse data
        if (response.isSuccess()) {
            const data = parseLatestPlatformHTML(response.value);
            // Assign data
            assignLatestPlatformData(data);
            // Cache data
            await saveCache(shared_1.default.cachePath);
        }
        else
            throw response.value;
    }
}
//#endregion Public methods
//#region Private methods
/**
 * Read the platform cache (if available).
 */
async function readCache(path) {
    // Local variables
    let returnValue = false;
    async function checkFileExists(file) {
        return fs_1.promises
            .access(file, fs_1.constants.F_OK)
            .then(() => true)
            .catch(() => false);
    }
    const existsCache = await checkFileExists(path);
    if (existsCache) {
        const data = await fs_1.promises.readFile(path, { encoding: "utf-8", flag: "r" });
        const json = JSON.parse(data);
        // Map objects don't natively support JSON conversion
        // so they were saved as normal object and we need to
        // re-covert them
        shared_1.default.setPrefixPair("engines", objectToMap(json.engines));
        shared_1.default.setPrefixPair("statuses", objectToMap(json.statuses));
        shared_1.default.setPrefixPair("tags", objectToMap(json.tags));
        shared_1.default.setPrefixPair("others", objectToMap(json.others));
        returnValue = true;
    }
    return returnValue;
}
/**
 * Save the current platform variables to disk.
 */
async function saveCache(path) {
    // Map objects don't natively support JSON conversion
    // so we will convert them to normal object and than
    // stringify them
    const saveDict = {
        engines: Object.fromEntries(shared_1.default.prefixes["engines"]),
        statuses: Object.fromEntries(shared_1.default.prefixes["statuses"]),
        tags: Object.fromEntries(shared_1.default.prefixes["tags"]),
        others: Object.fromEntries(shared_1.default.prefixes["others"])
    };
    const json = JSON.stringify(saveDict);
    await fs_1.promises.writeFile(path, json);
}
/**
 * Given the HTML code of the response from the F95Zone,
 * parse it and return the result.
 */
function parseLatestPlatformHTML(html) {
    const $ = (0, cheerio_1.load)(html);
    // Clean the JSON string
    const unparsedText = $(css_selector_1.GENERIC.LATEST_UPDATES_TAGS_SCRIPT).html().trim();
    const startIndex = unparsedText.indexOf("{");
    const endIndex = unparsedText.lastIndexOf("}");
    const parsedText = unparsedText.substring(startIndex, endIndex + 1);
    return JSON.parse(parsedText);
}
/**
 * Assign to the local variables the values from the F95Zone.
 */
function assignLatestPlatformData(data) {
    // Local variables
    const scrapedData = new Map();
    // Parse and assign the values that are NOT tags
    for (const res of Object.values(data.prefixes).flat()) {
        // Prepare the dict
        const dict = new Map();
        // Assign values
        res.prefixes.map((e) => dict.set(e.id, e.name.replace("&#039;", "'")));
        // Merge the dicts ("Other"/"Status" field)
        if (scrapedData.has(res.name)) {
            for (const key of dict.keys()) {
                const field = scrapedData.get(res.name);
                // Add ("Merge") value only if it isn't already present
                if (!field.has(key)) {
                    const value = dict.get(key);
                    field.set(key, value);
                }
            }
        }
        // Assign the property
        else
            scrapedData.set(res.name, dict);
    }
    // Save the values
    shared_1.default.setPrefixPair("engines", scrapedData.get("Engine"));
    shared_1.default.setPrefixPair("statuses", scrapedData.get("Status"));
    shared_1.default.setPrefixPair("others", scrapedData.get("Other"));
    shared_1.default.setPrefixPair("tags", objectToMap(data.tags));
}
/**
 * Convert a `Record` object to `Map` (`TPrefixDict`).
 */
function objectToMap(data) {
    // file deepcode ignore CollectionUpdatedButNeverQueried: This map doesn't need to be queried here
    const map = new Map();
    Object.entries(data).forEach(([key, value]) => map.set(parseInt(key, 10), value));
    return map;
}
//#endregion
