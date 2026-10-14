"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = fetchThreadHandiworkURLs;
// Public modules from npm
const cheerio_1 = require("cheerio");
// Modules from file
const shared_1 = __importDefault(require("../shared"));
const css_selector_1 = require("../constants/css-selector");
const url_1 = require("../constants/url");
//#region Public methods
/**
 * Gets the URLs of the handiwork' threads that match the passed parameters.
 *
 * You *must* be logged.
 * @param {ThreadSearchQuery} query
 * Query used for the search
 * @param {number} limit
 * Maximum number of items to get. Default: 30
 * @returns {Promise<String[]>} URLs of the handiworks
 */
async function fetchThreadHandiworkURLs(query, limit = 30) {
    // Execute the query
    const response = await query.execute();
    // Fetch the results from F95 and return the handiwork urls
    if (response.isSuccess())
        return fetchResultURLs(response.value.data, limit);
    else
        throw response.value;
}
//#endregion Public methods
//#region Private methods
/**
 * Gets the URLs of the threads resulting from the F95Zone search.
 * @param {number} limit
 * Maximum number of items to get. Default: 30
 */
async function fetchResultURLs(html, limit = 30) {
    // Prepare cheerio
    const $ = (0, cheerio_1.load)(html);
    // Here we get all the DIV that are the body of the various query results
    const results = $("body").find(css_selector_1.THREAD_SEARCH.BODY);
    // Than we extract the URLs
    const urls = results
        .slice(0, limit)
        .map((idx, el) => {
        const elementSelector = $(el);
        return extractLinkFromResult(elementSelector);
    })
        .get();
    return urls;
}
/**
 * Look for the URL to the thread referenced by the item.
 * @param {cheerio.Cheerio} selector Element to search
 * @returns {String} URL to thread
 */
function extractLinkFromResult(selector) {
    shared_1.default.logger.trace("Extracting thread link from result...");
    const partialLink = selector.find(css_selector_1.THREAD_SEARCH.THREAD_TITLE).attr("href").trim();
    // Compose and return the URL
    return new URL(partialLink, url_1.urls.BASE).toString();
}
//#endregion Private methods
