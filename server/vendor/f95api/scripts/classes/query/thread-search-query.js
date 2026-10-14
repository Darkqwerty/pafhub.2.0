"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
// Module from files
const network_helper_1 = require("../../network-helper");
const prefix_parser_1 = __importDefault(require("./../prefix-parser"));
const url_1 = require("../../constants/url");
const shared_1 = __importDefault(require("../../shared"));
class ThreadSearchQuery {
    //#region Private fields
    static MIN_PAGE = 1;
    #page = _a.MIN_PAGE;
    #itype = "ThreadSearchQuery";
    //#endregion Private fields
    //#region Properties
    /**
     * Keywords to use in the search.
     */
    keywords = "";
    /**
     * Indicates to search by checking only the thread titles and not the content.
     */
    onlyTitles = false;
    /**
     * The results must be more recent than the date indicated.
     */
    newerThan = null;
    /**
     * The results must be older than the date indicated.
     */
    olderThan = null;
    includedTags = [];
    excludedTags = [];
    /**
     * Minimum number of answers that the thread must possess.
     */
    minimumReplies = 0;
    includedPrefixes = [];
    category = null;
    /**
     * Results presentation order.
     */
    order = "relevance";
    //#endregion Properties
    //#region Getters/Setters
    set page(v) {
        if (v < _a.MIN_PAGE)
            throw new Error(`Page must be greater or equal to ${_a.MIN_PAGE}`);
    }
    get page() {
        return this.#page;
    }
    get itype() {
        return this.#itype;
    }
    //#endregion Getters/Setters
    //#region Public methods
    async execute() {
        // Define the POST parameters
        const params = this.preparePOSTParameters();
        // Return the POST response
        return (0, network_helper_1.fetchPOSTResponse)(url_1.urls.SEARCH, params);
    }
    //#endregion Public methods
    //#region Private methods
    /**
     * Prepare the parameters for post request with the data in the query.
     */
    preparePOSTParameters() {
        // Local variables
        const params = {};
        // Ad the session token
        params["_xfToken"] = shared_1.default.session.token;
        // Specify if only the title should be searched
        if (this.onlyTitles)
            params["c[title_only]"] = "1";
        // Add keywords
        params["keywords"] = this.keywords ?? "*";
        // Specify the scope of the search (only "threads/post")
        params["search_type"] = "post";
        // Set the dates
        if (this.newerThan) {
            const date = this.convertShortDate(this.newerThan);
            params["c[newer_than]"] = date;
        }
        if (this.olderThan) {
            const date = this.convertShortDate(this.olderThan);
            params["c[older_than]"] = date;
        }
        // Set included and excluded tags (joined with a comma)
        if (this.includedTags)
            params["c[tags]"] = this.includedTags.join(",");
        if (this.excludedTags)
            params["c[excludeTags]"] = this.excludedTags.join(",");
        // Set minimum reply number
        if (this.minimumReplies > 0)
            params["c[min_reply_count]"] = this.minimumReplies.toString();
        // Add prefixes
        const parser = new prefix_parser_1.default();
        const ids = parser.prefixesToIDs(this.includedPrefixes);
        for (let i = 0; i < ids.length; i++) {
            const name = `c[prefixes][${i}]`;
            params[name] = ids[i].toString();
        }
        // Set the category
        params["c[child_nodes]"] = "1"; // Always set
        if (this.category) {
            const catID = this.categoryToID(this.category).toString();
            params["c[nodes][0]"] = catID;
        }
        // Set the other values
        params["order"] = this.order.toString();
        params["page"] = this.page.toString();
        return params;
    }
    /**
     * Convert a date in the YYYY-MM-DD format taking into account the time zone.
     */
    convertShortDate(d) {
        const offset = d.getTimezoneOffset();
        d = new Date(d.getTime() - offset * 60 * 1000);
        return d.toISOString().split("T")[0];
    }
    /**
     * Gets the unique ID of the selected category.
     */
    categoryToID(category) {
        const catMap = {
            games: 2,
            mods: 41,
            comics: 40,
            animations: 94,
            assets: 95
        };
        return catMap[category];
    }
}
_a = ThreadSearchQuery;
exports.default = ThreadSearchQuery;
