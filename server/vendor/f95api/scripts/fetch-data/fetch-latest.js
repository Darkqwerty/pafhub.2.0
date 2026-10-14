"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = fetchLatestHandiworkURLs;
// Modules from file
const latest_search_query_1 = __importDefault(require("../classes/query/latest-search-query"));
const url_1 = require("../constants/url");
/**
 * Gets the URLs of the latest handiworks that match the passed parameters.
 *
 * You *must* be logged.
 * @param {LatestSearchQuery} query
 * Query used for the search
 * @param {Number} limit
 * Maximum number of items to get. Default: 30
 * @returns {Promise<String[]>} URLs of the handiworks
 */
async function fetchLatestHandiworkURLs(query, limit = 30) {
    // Local variables
    const shallowQuery = Object.assign(new latest_search_query_1.default(), query);
    const resultURLs = [];
    let fetchedResults = 0;
    let noMorePages = false;
    do {
        // Fetch the response (application/json)
        const response = await shallowQuery.execute();
        // Save the URLs
        if (response.isSuccess()) {
            // In-loop variables
            const data = response.value.data.msg.data;
            const totalPages = response.value.data.msg.pagination.total;
            for (const e of data) {
                if (fetchedResults < limit) {
                    const gameURL = new URL(e.thread_id.toString(), url_1.urls.THREADS).href;
                    resultURLs.push(gameURL);
                    fetchedResults += 1;
                }
            }
            // Increment page and check for it's existence
            shallowQuery.page += 1;
            noMorePages = shallowQuery.page > totalPages;
        }
        else
            throw response.value;
    } while (fetchedResults < limit && !noMorePages);
    return resultURLs;
}
