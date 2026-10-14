"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLatestUpdates = getLatestUpdates;
exports.checkIfHandiworkHasUpdate = checkIfHandiworkHasUpdate;
// Modules from file
const errors_1 = require("./classes/errors");
const fetch_latest_1 = __importDefault(require("./fetch-data/fetch-latest"));
const handiwork_from_url_1 = require("./handiwork-from-url");
const network_helper_1 = require("./network-helper");
const handiwork_parse_1 = __importDefault(require("./scrape-data/handiwork-parse"));
const shared_1 = __importDefault(require("./shared"));
const generic_1 = require("./constants/generic");
// Classes from file
const handiwork_1 = __importDefault(require("./classes/handiwork/handiwork"));
/**
 * Gets the latest updated games that match the specified parameters.
 *
 * You **must** be logged in to the portal before calling this method.
 *
 * @param {LatestSearchQuery} query Parameters used for the search.
 * @param {new () => T} type Handiwork class to use for casting the result.
 * @param {Number} limit Maximum number of results. Default: 30
 */
async function getLatestUpdates(query, type, limit = 30) {
    // Check limit value
    if (limit <= 0)
        throw new Error("Limit must be greater than 0");
    // Check if the user is logged
    if (!shared_1.default.isLogged)
        throw new errors_1.UserNotLogged(errors_1.USER_NOT_LOGGED);
    // Fetch the results
    const urls = await (0, fetch_latest_1.default)(query, limit);
    // Get the data from urls
    const promiseList = urls.map((u) => (0, handiwork_parse_1.default)(u, type));
    return Promise.all(promiseList);
}
/**
 * Chek if exists a new version of the handiwork.
 *
 * You **must** be logged in to the portal before calling this method.
 */
async function checkIfHandiworkHasUpdate(hw) {
    // Local variables
    let hasUpdate = false;
    // Check if the user is logged
    if (!shared_1.default.isLogged)
        throw new errors_1.UserNotLogged(errors_1.USER_NOT_LOGGED);
    // F95 change URL at every game update,
    // so if the URL is different an update is available
    const isTheSameURL = await (0, network_helper_1.urlExists)(hw.url, true);
    if (!isTheSameURL) {
        // Fetch the online handiwork
        const onlineHw = await (0, handiwork_from_url_1.getHandiworkFromURL)(hw.url, handiwork_1.default);
        // Check if properties exists in the object
        const version = hw["version"];
        const lastRelease = hw["lastRelease"];
        // Compare different values
        if (version !== "") {
            hasUpdate = onlineHw.version.toUpperCase() !== version.toUpperCase();
        }
        else if (lastRelease != generic_1.DEFAULT_DATE) {
            hasUpdate = onlineHw.lastRelease.getTime() !== lastRelease.getTime();
        }
        else {
            hasUpdate = onlineHw.lastThreadUpdate.getTime() !== hw.lastThreadUpdate.getTime();
        }
    }
    return hasUpdate;
}
