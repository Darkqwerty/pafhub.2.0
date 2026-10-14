"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Public modules from npm
const cheerio_1 = require("cheerio");
// Modules from files
const post_1 = __importDefault(require("./post"));
const platform_user_1 = __importDefault(require("./platform-user"));
const url_1 = require("../../constants/url");
const css_selector_1 = require("../../constants/css-selector");
const network_helper_1 = require("../../network-helper");
const errors_1 = require("../errors");
const json_ld_1 = require("../../scrape-data/json-ld");
const shared_1 = __importDefault(require("../../shared"));
const generic_1 = require("../../constants/generic");
const utils_1 = require("../../utils");
/**
 * Represents a generic F95Zone platform thread.
 */
class Thread {
    //#region Fields
    POST_FOR_PAGE = 20;
    _id;
    _url = "";
    _title = "";
    _tags = [];
    _prefixes = [];
    _rating = undefined;
    _owner = undefined;
    _publication = generic_1.DEFAULT_DATE;
    _modified = generic_1.DEFAULT_DATE;
    _category = undefined;
    _headline = "";
    //#endregion Fields
    //#region Getters
    /**
     * Unique ID of the thread on the platform.
     */
    get id() {
        return this._id;
    }
    /**
     * URL of the thread.
     *
     * It may vary depending on any versions of the contained product.
     */
    get url() {
        return this._url !== "" ? this._url : new URL(`${this.id}/`, url_1.urls.THREADS).toString();
    }
    /**
     * Thread title.
     */
    get title() {
        return this._title;
    }
    /**
     * Tags associated with the thread.
     */
    get tags() {
        return this._tags;
    }
    /**
     * Prefixes associated with the thread
     */
    get prefixes() {
        return this._prefixes;
    }
    /**
     * Rating assigned to the thread.
     */
    get rating() {
        return this._rating;
    }
    /**
     * Owner of the thread.
     */
    get owner() {
        return this._owner;
    }
    /**
     * Date the thread was first published.
     */
    get publication() {
        return this._publication;
    }
    /**
     * Date the thread was last modified.
     */
    get modified() {
        return this._modified;
    }
    /**
     * Category to which the content of the thread belongs.
     */
    get category() {
        return this._category;
    }
    /**
     * The title without status tags and graphics engine.
     * It can be useful on old template threads when the
     * version is missing and needs to be retrieved from
     * the title.
     */
    get headline() {
        return this._headline;
    }
    constructor(args) {
        // Check argument
        if (!args)
            throw new errors_1.ParameterError(errors_1.INVALID_THREAD_CONSTRUCTOR_ARGUMENT);
        // Assign ID
        this._id = typeof args === "number" ? args : this.getIDFromURL(args);
        // Check ID
        if (!this.id || this.id < 1)
            throw new errors_1.InvalidID(errors_1.INVALID_THREAD_ID);
    }
    //#region Private methods
    /**
     * Set the number of posts to display for the current thread.
     */
    async setMaximumPostsForPage(n) {
        // Prepare the parameters to send via POST request
        const params = {
            _xfResponseType: "json",
            _xfRequestUri: `/account/dpp-update?content_type=thread&content_id=${this.id}`,
            _xfToken: shared_1.default.session.token,
            _xfWithData: "1",
            content_id: this.id.toString(),
            content_type: "thread",
            "dpp_custom_config[posts]": n.toString()
        };
        // Send POST request
        const response = await (0, network_helper_1.fetchPOSTResponse)(url_1.urls.POSTS_NUMBER, params);
        if (response.isFailure())
            throw response.value;
    }
    /**
     * Fetch one at a time the posts on the current page.
     */
    async *parsePostsInPage(html) {
        // Load the HTML
        const $ = (0, cheerio_1.load)(html);
        // Start parsing the posts
        const posts = $(css_selector_1.THREAD.POSTS_IN_PAGE)
            .toArray()
            .map((el) => {
            // Force Typescript to accept "string" type instead of "undefined"
            const element = $(el).find(css_selector_1.POST.ID).attr("id");
            const id = parseInt(element.replace("post-", ""), 10);
            return new post_1.default(id);
        });
        // Fetch the data of the posts
        for (const post of posts) {
            await post.fetch();
            yield post;
        }
    }
    /**
     * It processes the rating of the thread
     * starting from the data contained in the JSON+LD tag.
     */
    parseRating(data) {
        const ratingTree = data["aggregateRating"];
        const rating = {
            average: ratingTree ? parseFloat(ratingTree["ratingValue"]) : 0,
            best: ratingTree ? parseInt(ratingTree["bestRating"], 10) : 0,
            count: ratingTree ? parseInt(ratingTree["ratingCount"], 10) : 0
        };
        return rating;
    }
    /**
     * Clean the title of a thread, removing prefixes
     * and generic elements between square brackets, and
     * returns the clean title of the work.
     */
    cleanHeadline(headline) {
        // From the title we can extract: Name, author and version
        // [PREFIXES] TITLE [VERSION] [AUTHOR]
        const matches = headline.match(/(?<=\s|^|\])\[.*?\](?=\s|$)/gi);
        // Get the title name
        let name = headline;
        if (matches)
            matches.forEach((e) => (name = name.replace(e, "")));
        return name.trim();
    }
    /**
     * Process the HTML code received as
     * an answer and gets the data contained in it.
     */
    async elaborateResponse(html) {
        // Load the HTML
        const $ = (0, cheerio_1.load)(html);
        // Fetch data from selectors
        const ownerID = $(css_selector_1.THREAD.OWNER_ID).attr("data-user-id");
        const tagArray = $(css_selector_1.THREAD.TAGS).toArray();
        const prefixArray = $(css_selector_1.THREAD.PREFIXES).toArray();
        const JSONLD = (0, json_ld_1.getJSONLD)($("body"));
        const published = (0, utils_1.getDateFromString)(JSONLD["datePublished"]);
        const modified = (0, utils_1.getDateFromString)(JSONLD["dateModified"]);
        // Throws error if no ID is found
        if (!ownerID)
            throw new errors_1.InvalidResponseParsing("Cannot get ID from HTML response");
        // Parse the thread's data
        this._headline = JSONLD["headline"];
        this._title = this.cleanHeadline(this._headline);
        this._tags = tagArray.map((el) => $(el).text().trim());
        this._prefixes = prefixArray.map((el) => $(el).text().trim());
        this._owner = new platform_user_1.default(parseInt(ownerID, 10));
        await this._owner.fetch();
        this._rating = this.parseRating(JSONLD);
        const section = JSONLD["articleSection"].toString().toLowerCase();
        this._category = section;
        // Validate the dates
        if (modified)
            this._modified = modified;
        if (published)
            this._publication = published;
    }
    /**
     * Gets the ID of the thread from its URL.
     */
    getIDFromURL(url) {
        // Local variables
        const surl = url.toString();
        let id = -1;
        // Find IDs in URLs in the form:
        // + https://f95zone.to/threads/NAME.ID/
        // + https://f95zone.to/threads/ID/
        const regex = new RegExp(/(threads\/|\.)([0-9]+)/);
        const match = surl.match(regex);
        if (match) {
            const sid = match[0].replace(".", "").replace("threads/", "");
            id = parseInt(sid, 10);
        }
        return id;
    }
    //#endregion Private methods
    //#region Public methods
    /**
     * Gets information about this thread.
     */
    async fetch() {
        // Check login
        if (!shared_1.default.isLogged)
            throw new errors_1.UserNotLogged(errors_1.USER_NOT_LOGGED);
        // Get the actual URL of the thread
        this._url = await (0, network_helper_1.getUrlRedirect)(this.url);
        // Fetch the HTML source
        const response = await (0, network_helper_1.fetchHTML)(this.url);
        if (response.isSuccess())
            await this.elaborateResponse(response.value);
        else
            throw response.value;
    }
    /**
     * Gets the post in the `index` position with respect to the posts in the thread.
     *
     * `index` must be greater or equal to 1.
     * If the post is not found, `undefined` is returned.
     */
    async getPost(index) {
        // Validate parameters
        if (index < 1)
            throw new errors_1.ParameterError("Index must be greater or equal than 1");
        // Reduce the maximum number of posts per page to POST_FOR_PAGE
        await this.setMaximumPostsForPage(this.POST_FOR_PAGE);
        // Get the page number of the post
        const page = Math.ceil(index / this.POST_FOR_PAGE);
        // Fetch the page
        const url = new URL(`page-${page}`, `${this.url}`).toString();
        const htmlResponse = await (0, network_helper_1.fetchHTML)(url);
        if (htmlResponse.isSuccess()) {
            // Prepare the iterator that fetch the posts
            const iter = this.parsePostsInPage(htmlResponse.value);
            // Find and return the post with the same
            // position number as the specified index
            let curr = await iter.next();
            while (!curr.done) {
                // Explicit cast because the iterator doesn't return anything
                const post = curr.value;
                if (post.number === index)
                    return post;
                curr = await iter.next();
            }
        }
        else
            throw htmlResponse.value;
    }
}
exports.default = Thread;
