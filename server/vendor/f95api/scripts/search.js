"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = search;
const handiwork_parse_1 = __importDefault(require("./scrape-data/handiwork-parse"));
const fetch_handiwork_1 = __importDefault(require("./fetch-data/fetch-handiwork"));
const fetch_latest_1 = __importDefault(require("./fetch-data/fetch-latest"));
const fetch_thread_1 = __importDefault(require("./fetch-data/fetch-thread"));
const errors_1 = require("./classes/errors");
const shared_1 = __importDefault(require("./shared"));
/**
 * Gets the handiworks that match the passed parameters.
 *
 * You *must* be logged.
 * @param {IQuery} query Parameters used for the search.
 * @param {new () => T} type Handiwork class to use for casting the result.
 * @param {Number} limit Maximum number of items to get. Default: 30
 */
async function search(query, type, limit = 30) {
    // Check if the user is logged
    if (!shared_1.default.isLogged)
        throw new errors_1.UserNotLogged(errors_1.USER_NOT_LOGGED);
    // Fetch the URLs
    const urls = await getURLsFromQuery(query, limit);
    // Fetch the data
    const results = urls.map((url) => (0, handiwork_parse_1.default)(url, type));
    return Promise.all(results);
}
//#region Private methods
/**
 * Gets the URLs of the Handiworks that are defined by the search query.
 *
 * @param query Query used for the search
 * @param limit Maximum number of items to get. Default: 30
 * @returns URLs of the fetched games
 */
async function getURLsFromQuery(query, limit = 30) {
    const functionMap = {
        HandiworkSearchQuery: (query, limit) => (0, fetch_handiwork_1.default)(query, limit),
        LatestSearchQuery: (query, limit) => (0, fetch_latest_1.default)(query, limit),
        ThreadSearchQuery: (query, limit) => (0, fetch_thread_1.default)(query, limit)
    };
    // Throws error if the type of query is non existent
    if (!Object.keys(functionMap).includes(query.itype)) {
        throw Error(`Invalid query type: ${query.itype}`);
    }
    // fetch and return the urls
    return await functionMap[query.itype](query, limit);
}
//#endregion Private methods
