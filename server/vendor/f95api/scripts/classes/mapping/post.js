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
const iso_datestring_validator_1 = require("iso-datestring-validator");
// Modules from file
const platform_user_1 = __importDefault(require("./platform-user"));
const css_selector_1 = require("../../constants/css-selector");
const url_1 = require("../../constants/url");
const network_helper_1 = require("../../network-helper");
const shared_1 = __importDefault(require("../../shared"));
const errors_1 = require("../errors");
const post_parse_tree_1 = require("../../scrape-data/post-parse-tree");
const generic_1 = require("../../constants/generic");
/**
 * Represents a post published by a user on the F95Zone platform.
 */
class Post {
    //#region Fields
    _id = -1;
    _number = -1;
    _published = generic_1.DEFAULT_DATE;
    _lastEdit = generic_1.DEFAULT_DATE;
    _owner = undefined;
    _bookmarked = false;
    _message = "";
    _body = [];
    //#endregion Fields
    //#region Getters
    /* c8 ignore start */
    /**
     * Unique ID of the post on the F95Zone platform.
     */
    get id() {
        return this._id;
    }
    /**
     * Unique ID of the post within the thread in which it is present.
     */
    get number() {
        return this._number;
    }
    /**
     * Date the post was first published.
     */
    get published() {
        return this._published;
    }
    /**
     * Date the post was last modified.
     */
    get lastEdit() {
        return this._lastEdit;
    }
    /**
     * User who owns the post.
     */
    get owner() {
        return this._owner;
    }
    /**
     * Indicates whether the post has been bookmarked.
     */
    get bookmarked() {
        return this._bookmarked;
    }
    /**
     * Post message text.
     */
    get message() {
        return this._message;
    }
    /**
     * Set of the elements that make up the body of the post.
     */
    get body() {
        return this._body;
    }
    /* c8 ignore stop */
    //#endregion Getters
    constructor(id) {
        this._id = id;
    }
    //#region Public methods
    /**
     * Gets the post data starting from its unique ID for the entire platform.
     * @param html HTML source code of the page that contains the post
     */
    async fetch(html) {
        // Check login
        if (!shared_1.default.isLogged)
            throw new errors_1.UserNotLogged(errors_1.USER_NOT_LOGGED);
        // Check ID
        if (!this.id || this.id < 1)
            throw new errors_1.InvalidID(errors_1.INVALID_POST_ID);
        // Avoid to fetch the HTML if we already have it
        if (html)
            await this.elaborateResponse(html);
        // Fetch HTML page containing the post
        const url = new URL(this.id.toString(), url_1.urls.POSTS).toString();
        const response = await (0, network_helper_1.fetchHTML)(url);
        if (response.isSuccess())
            await this.elaborateResponse(response.value);
        else
            throw response.value;
    }
    //#endregion Public methods
    //#region Private methods
    /**
     * Process the HTML code received as
     * an answer and gets the data contained in it.
     */
    async elaborateResponse(html) {
        // Load cheerio and find post
        const $ = (0, cheerio_1.load)(html);
        const post = $(css_selector_1.THREAD.POSTS_IN_PAGE)
            .toArray()
            .find((el) => {
            // Fetch the ID and check if it is what we are searching
            const sid = findAttribute($(el), css_selector_1.POST.ID, "id").replace("post-", "").trim();
            const id = parseInt(sid, 10);
            if (id === this.id)
                return el;
        });
        // Finally parse the post
        await this.parsePost($, $(post));
    }
    /**
     * Extract all the relevant data from the post.
     *
     * The following information are extracted:
     * `id`, `number`, `publishing date`, `bookmarked`, `message`, `body`
     *
     * These information could not exists:
     * `last edit date`, `owner id`
     */
    async parsePost($, post) {
        // Find post's ID
        const sid = findAttribute(post, css_selector_1.POST.ID, "id").replace("post-", "");
        this._id = parseInt(sid, 10);
        // Find post's number
        const sNumber = post.find(css_selector_1.POST.NUMBER).text().replace("#", "");
        this._number = parseInt(sNumber, 10);
        // Find post's publishing date
        const sPublishing = findAttribute(post, css_selector_1.POST.PUBLISH_DATE, "datetime");
        if ((0, iso_datestring_validator_1.isValidISODateString)(sPublishing))
            this._published = new Date(sPublishing);
        // Find post's last edit date (could not exists if the post was never edited)
        const sLastEdit = findAttribute(post, css_selector_1.POST.LAST_EDIT, "datetime", false);
        if ((0, iso_datestring_validator_1.isValidISODateString)(sLastEdit))
            this._lastEdit = new Date(sLastEdit);
        else
            this._lastEdit = this._published;
        // Find post's owner (if no ID is found than the user has been deleted)
        const ownerID = findAttribute(post, css_selector_1.POST.OWNER_ID, "data-user-id", false);
        if (ownerID !== "") {
            this._owner = new platform_user_1.default(parseInt(ownerID.trim(), 10));
            await this._owner.fetch();
        }
        // Find if the post is bookmarked
        this._bookmarked = post.find(css_selector_1.POST.BOOKMARKED).length !== 0;
        // Find post's message
        this._message = post.find(css_selector_1.POST.BODY).text();
        // Parse post's body
        const body = post.find(css_selector_1.POST.BODY).get()[0];
        this._body = (0, post_parse_tree_1.extractDataFromFirstThreadPost)($, body);
    }
}
exports.default = Post;
/**
 * Make sure you get the attribute you are looking for or throw an exception.
 *
 * Return empty string if no attribute is found and `raise` if false.
 */
function findAttribute(e, selector, attribute, raise = true) {
    // Extract the attribute
    const extracted = e.find(selector).attr(attribute) ?? "";
    // Check if the attribute is undefined
    if (!extracted && raise) {
        const message = `Cannot find '${attribute}' attribute in element with selector '${selector}'`;
        throw new errors_1.MissingOrInvalidParsingAttribute(message);
    }
    else
        return extracted;
}
