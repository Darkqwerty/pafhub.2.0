"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getJSONLD = getJSONLD;
// Public modules from npm
const cheerio_1 = require("cheerio");
// Modules from file
const shared_1 = __importDefault(require("../shared"));
const css_selector_1 = require("../constants/css-selector");
/**
 * Extracts and processes the JSON-LD values of the page.
 * @param {Cheerio<AnyNode>} body Page `body` selector
 * @returns {TJsonLD[]} List of data obtained from the page
 */
function getJSONLD(body) {
    shared_1.default.logger.trace("Extracting JSON-LD data...");
    // Fetch the JSON-LD data
    const structuredDataElements = body.find(css_selector_1.THREAD.JSONLD);
    // Parse the data
    const values = structuredDataElements
        .get()
        .filter((el) => el)
        .map((el) => parseJSONLD(el));
    // Merge the data and return a single value
    return mergeJSONLD(values);
}
//#region Private methods
/**
 * Merges multiple JSON+LD tags into one object.
 * @param data List of JSON+LD tags
 */
function mergeJSONLD(data) {
    // Local variables
    let merged = {};
    for (const value of data) {
        merged = Object.assign(merged, value);
    }
    return merged;
}
/**
 * Parse a JSON-LD element source code.
 */
function parseJSONLD(element) {
    // Get the element HTML
    const html = (0, cheerio_1.load)(element).html().trim();
    // Obtain the JSON-LD
    const data = html.replace('<script type="application/ld+json">', "").replace("</script>", "");
    // Convert the string to an object
    return JSON.parse(data);
}
//#endregion Private methods
