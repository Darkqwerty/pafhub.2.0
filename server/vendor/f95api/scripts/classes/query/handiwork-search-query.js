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
const latest_search_query_1 = __importDefault(require("./latest-search-query"));
const thread_search_query_1 = __importDefault(require("./thread-search-query"));
class HandiworkSearchQuery {
    //#region Private fields
    static MIN_PAGE = 1;
    #itype = "HandiworkSearchQuery";
    #page = _a.MIN_PAGE;
    //#endregion Private fields
    //#region Properties
    /**
     * Keywords to use in the search.
     */
    keywords = "";
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
    /**
     * Select what kind of search should be
     * performed based on the properties of
     * the query.
     */
    selectSearchType() {
        // Local variables
        const MAX_TAGS_LATEST_SEARCH = 5;
        const DEFAULT_SEARCH_TYPE = "latest";
        // If the keywords are set or the number
        // of included tags is greather than 5,
        // we must perform a thread search
        if (this.keywords || this.includedTags.length > MAX_TAGS_LATEST_SEARCH)
            return "thread";
        return DEFAULT_SEARCH_TYPE;
    }
    async execute() {
        // Local variables
        let response = null;
        // Convert the query
        if (this.selectSearchType() === "latest")
            response = await this.cast("LatestSearchQuery").execute();
        else
            response = await this.cast("ThreadSearchQuery").execute();
        return response;
    }
    cast(type) {
        // Local variables
        let returnValue = null;
        // Convert the query
        if (type === "LatestSearchQuery")
            returnValue = this.castToLatest();
        else if (type === "ThreadSearchQuery")
            returnValue = this.castToThread();
        else
            returnValue = this;
        // Cast the result to T
        return returnValue;
    }
    //#endregion Public methods
    //#region Private methods
    castToLatest() {
        // Cast the basic query object and copy common values
        const query = new latest_search_query_1.default();
        Object.keys(this).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(query, key)) {
                query[key] = this[key];
            }
        });
        // Adapt keyword
        query.title = this.keywords;
        // Adapt order filter
        let orderFilter = this.order;
        if (orderFilter === "relevance")
            orderFilter = "rating";
        else if (orderFilter === "replies")
            orderFilter = "views";
        query.order = orderFilter;
        // Adapt date
        if (this.newerThan)
            query.date = query.findNearestDate(this.newerThan);
        return query;
    }
    castToThread() {
        // Cast the basic query object and copy common values
        const query = new thread_search_query_1.default();
        Object.keys(this).forEach((key) => {
            if (Object.prototype.hasOwnProperty.call(query, key)) {
                query[key] = this[key];
            }
        });
        // Set uncommon values
        query.onlyTitles = true;
        // Adapt order filter
        let orderFilter = this.order;
        if (orderFilter === "title")
            orderFilter = "relevance";
        else if (orderFilter === "likes")
            orderFilter = "replies";
        query.order = orderFilter;
        return query;
    }
}
_a = HandiworkSearchQuery;
exports.default = HandiworkSearchQuery;
