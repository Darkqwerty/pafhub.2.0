"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = fetchHandiworkURLs;
const fetch_latest_1 = __importDefault(require("./fetch-latest"));
const fetch_thread_1 = __importDefault(require("./fetch-thread"));
/**
 * Gets the URLs of the handiworks that match the passed parameters.
 * You *must* be logged.
 * @param {LatestSearchQuery} query
 * Query used for the search
 * @param {Number} limit
 * Maximum number of items to get. Default: 30
 * @returns {Promise<String[]>} URLs of the handiworks
 */
async function fetchHandiworkURLs(query, limit = 30) {
    // Local variables
    let urls = null;
    const searchType = query.selectSearchType();
    // Convert the query
    if (searchType === "latest") {
        // Cast the query
        const castedQuery = query.cast("LatestSearchQuery");
        // Fetch the urls
        urls = await (0, fetch_latest_1.default)(castedQuery, limit);
    }
    else {
        // Cast the query
        const castedQuery = query.cast("ThreadSearchQuery");
        // Fetch the urls
        urls = await (0, fetch_thread_1.default)(castedQuery, limit);
    }
    return urls;
}
