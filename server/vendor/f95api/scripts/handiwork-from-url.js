"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHandiworkFromURL = getHandiworkFromURL;
// Modules from file
const errors_1 = require("./classes/errors");
const network_helper_1 = require("./network-helper");
const handiwork_parse_1 = __importDefault(require("./scrape-data/handiwork-parse"));
const shared_1 = __importDefault(require("./shared"));
/**
 * Given the url, it gets all the information about the handiwork requested.
 *
 * You **must** be logged in to the portal before calling this method.
 * @param {new () => T} type Handiwork class to use for casting the result.
 */
async function getHandiworkFromURL(url, type) {
    // Check if the user is logged
    if (!shared_1.default.isLogged)
        throw new errors_1.UserNotLogged(errors_1.USER_NOT_LOGGED);
    // Check URL validity
    if (!(0, network_helper_1.isStringAValidURL)(url))
        throw new URIError(`'${url}' is not a valid URL`);
    const exists = await (0, network_helper_1.urlExists)(url);
    if (!exists)
        throw new URIError(`${url} does not exists`);
    if (!(0, network_helper_1.isF95URL)(url))
        throw new Error(`${url} is not a valid F95Zone URL`);
    // Get game data
    /* c8 ignore next */
    return (0, handiwork_parse_1.default)(url, type);
}
