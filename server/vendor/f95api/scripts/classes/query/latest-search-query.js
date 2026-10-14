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
// Modules from file
const network_helper_1 = require("../../network-helper");
const prefix_parser_1 = __importDefault(require("../prefix-parser"));
const url_1 = require("../../constants/url");
/**
 * Query used to search handiwork in the "Latest" tab.
 */
class LatestSearchQuery {
    //#region Private fields
    static MAX_TAGS = 10;
    static MIN_PAGE = 1;
    #page = _a.MIN_PAGE;
    #includedTags = [];
    #itype = "LatestSearchQuery";
    //#endregion Private fields
    //#region Properties
    /**
     * Name of the creator of the work.
     */
    creator = null;
    /**
     * Title (or part of it) to search.
     */
    title = null;
    category = "games";
    /**
     * Ordering type.
     *
     * Default: `date`.
     */
    order = "date";
    /**
     * Date limit in days, to be understood as "less than".
     * Use `1` to indicate "today" or `null` to indicate "anytime".
     *
     * Default: `null`
     */
    date = null;
    /**
     * Maximum number of items viewable per page.
     */
    itemsPerPage = 30;
    includedPrefixes = [];
    excludedTags = [];
    //#endregion Properties
    //#region Getters/Setters
    set page(v) {
        if (v < _a.MIN_PAGE)
            throw new Error(`Page must be greater or equal to ${_a.MIN_PAGE}`);
    }
    get page() {
        return this.#page;
    }
    set includedTags(v) {
        if (v.length > _a.MAX_TAGS)
            throw new Error(`The included tags must be less or equal to ${_a.MAX_TAGS}`);
        this.#includedTags = v;
    }
    get includedTags() {
        return this.#includedTags;
    }
    get itype() {
        return this.#itype;
    }
    //#endregion Getters/Setters
    //#region Public methods
    async execute() {
        // Prepare the URL
        const url = this.prepareGETurl();
        const decoded = decodeURIComponent(url.toString());
        // Fetch the result
        return (0, network_helper_1.fetchGETResponse)(decoded);
    }
    /**
     * Gets the value (in days) acceptable in the query starting from a generic date.
     */
    findNearestDate(d) {
        // Find the difference between today and the passed date
        const diff = this.dateDiffInDays(new Date(), d);
        // Find the closest valid value in the array
        const validDiffDays = [365, 180, 90, 30, 14, 7, 3, 1];
        const closest = validDiffDays.reduce((prev, curr) => Math.abs(curr - diff) < Math.abs(prev - diff) ? curr : prev);
        return closest;
    }
    //#endregion Public methods
    //#region Private methods
    /**
     * Prepare the URL by filling out the GET parameters with the data in the query.
     */
    prepareGETurl() {
        // Create the URL
        const url = new URL(url_1.urls.LATEST_PHP);
        url.searchParams.set("cmd", "list");
        url.searchParams.set("ignored", "hide"); // Exclude ignored threads
        // Set the category
        url.searchParams.set("cat", this.category);
        // Add tags and prefixes
        const parser = new prefix_parser_1.default();
        parser
            .prefixesToIDs(this.includedTags)
            .map((tag) => url.searchParams.append("tags[]", tag.toString()));
        parser
            .prefixesToIDs(this.excludedTags)
            .map((tag) => url.searchParams.append("notags[]", tag.toString()));
        parser
            .prefixesToIDs(this.includedPrefixes)
            .map((p) => url.searchParams.append("prefixes[]", p.toString()));
        // Set the other values
        if (this.title)
            url.searchParams.set("search", this.title);
        if (this.creator)
            url.searchParams.set("creator", this.creator);
        if (this.date)
            url.searchParams.set("date", this.date.toString());
        url.searchParams.set("sort", this.order.toString());
        url.searchParams.set("page", this.page.toString());
        url.searchParams.set("rows", this.itemsPerPage.toString());
        return url;
    }
    /**
     *
     */
    dateDiffInDays(a, b) {
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        // Discard the time and time-zone information.
        const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
        const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
        return Math.floor((utc2 - utc1) / MS_PER_DAY);
    }
}
_a = LatestSearchQuery;
exports.default = LatestSearchQuery;
