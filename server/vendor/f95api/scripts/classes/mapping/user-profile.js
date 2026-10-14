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
const iso_datestring_validator_1 = require("iso-datestring-validator");
const cheerio_1 = require("cheerio");
// Modules from files
const platform_user_1 = __importDefault(require("./platform-user"));
const url_1 = require("../../constants/url");
const css_selector_1 = require("../../constants/css-selector");
const network_helper_1 = require("../../network-helper");
const errors_1 = require("../errors");
const shared_1 = __importDefault(require("../../shared"));
const game_1 = __importDefault(require("../handiwork/game"));
const fetch_alert_1 = __importDefault(require("../../fetch-data/user-data/fetch-alert"));
const thread_1 = __importDefault(require("./thread"));
const handiwork_from_url_1 = require("../../handiwork-from-url");
const fetch_conversation_1 = __importDefault(require("../../fetch-data/user-data/fetch-conversation"));
const generic_1 = require("../../constants/generic");
/**
 * Class containing the data of the user currently connected to the F95Zone platform.
 */
class UserProfile extends platform_user_1.default {
    //#region Fields
    _watched = undefined;
    _bookmarks = undefined;
    _alerts = undefined;
    _conversations = undefined;
    _featuredGames = undefined;
    //#endregion Fields
    //#region Getters
    /**
     * List of followed thread data.
     */
    get watched() {
        return this.watchedThreadsGetWrapper();
    }
    /**
     * List of bookmarked posts data.
     */
    get bookmarks() {
        return this.bookmarksGetWrapper();
    }
    /**
     * List of alerts.
     */
    get alerts() {
        return this.alertsGetWrapper();
    }
    /**
     * List of conversations.
     */
    get conversations() {
        return this.conversationsGetWrapper();
    }
    /**
     * List of featured games from the platform.
     */
    get featuredGames() {
        return this.featuredGamesGetWrapper();
    }
    //#endregion Getters
    //#region Getters async wrappers
    async watchedThreadsGetWrapper() {
        // Checks if basic data has already been retrieved
        if (!this.id)
            throw new errors_1.InvalidID("First you need to call the fetch() method");
        // Cache data
        if (!this._watched) {
            shared_1.default.logger.trace("Fetching watched threads...");
            // Prepare the url of the threads followed by
            // extending the selection to the threads already read
            const url = new URL(url_1.urls.WATCHED_THREADS);
            url.searchParams.set("unread", "0");
            // Prepare the options to use for fetching the data
            const options = {
                url: url.toString(),
                selector: css_selector_1.WATCHED_THREAD.LAST_PAGE,
                parseFunction: this.fetchPageThreadElements
            };
            // Fetch data
            this._watched = await this.fetchElementsInPages(options);
        }
        return Promise.resolve(this._watched);
    }
    async bookmarksGetWrapper() {
        // Checks if basic data has already been retrieved
        if (!this.id)
            throw new errors_1.InvalidID("First you need to call the fetch() method");
        // Cache data
        if (!this._bookmarks) {
            shared_1.default.logger.trace("Fetching bookmarks...");
            // Prepare the options to use for fetching the data
            const options = {
                url: url_1.urls.BOOKMARKS,
                selector: css_selector_1.BOOKMARKED_POST.LAST_PAGE,
                parseFunction: this.fetchBookmarkElements
            };
            // Fetch data
            this._bookmarks = await this.fetchElementsInPages(options);
        }
        return Promise.resolve(this._bookmarks);
    }
    async alertsGetWrapper() {
        // Checks if basic data has already been retrieved
        if (!this.id)
            throw new errors_1.InvalidID("First you need to call the fetch() method");
        // Cache data
        if (!this._alerts) {
            shared_1.default.logger.trace("Fetching alerts...");
            // Prepare the options to use for fetching the data
            const options = {
                url: url_1.urls.ALERTS,
                selector: css_selector_1.ALERT.LAST_PAGE,
                parseFunction: fetch_alert_1.default
            };
            // Fetch data
            this._alerts = await this.fetchElementsInPages(options);
        }
        return Promise.resolve(this._alerts);
    }
    async featuredGamesGetWrapper() {
        // Checks if basic data has already been retrieved
        if (!this.id)
            throw new errors_1.InvalidID("First you need to call the fetch() method");
        // Cache data
        if (!this._featuredGames) {
            shared_1.default.logger.trace("Fetching featured games...");
            this._featuredGames = await this.fetchFeaturedGames();
        }
        return Promise.resolve(this._featuredGames);
    }
    async conversationsGetWrapper() {
        // Checks if basic data has already been retrieved
        if (!this.id)
            throw new errors_1.InvalidID("First you need to call the fetch() method");
        // Cache data
        if (!this._conversations) {
            shared_1.default.logger.trace("Fetching conversations...");
            // Prepare the options to use for fetching the data
            const options = {
                url: url_1.urls.CONVERSATIONS,
                selector: css_selector_1.CONVERSATION.LAST_PAGE,
                parseFunction: fetch_conversation_1.default
            };
            // Fetch data
            this._conversations = await this.fetchElementsInPages(options);
        }
        return Promise.resolve(this._conversations);
    }
    //#endregion Getters async wrappers
    constructor() {
        super();
    }
    //#region Public methods
    /**
     * Gets the basic data relating to the object.
     *
     * @param extended
     * If `true`, it also gets the threads followed
     * by the user, the conversations, the favorites.
     * Default: `false`
     */
    async fetch(extended = false) {
        // Check login
        if (!shared_1.default.isLogged)
            throw new errors_1.UserNotLogged(errors_1.USER_NOT_LOGGED);
        // First get the user ID and set it
        const id = await this.fetchUserID();
        const temp = new platform_user_1.default(id);
        shared_1.default.logger.info(`Got user's ID: ${id}`);
        // Than fetch the basic data
        shared_1.default.logger.info("Fetching user information...");
        await temp.fetch();
        // Copy the property of the superior class (PlatformUser) to this instance
        const superprops = Object.getOwnPropertyNames(temp);
        superprops
            .filter((p) => !p.includes("__proto__"))
            // file deepcode ignore PrototypePollution: I already ignored __proto__ strings
            .map((p) => (this[p] = temp[p]));
        // Fetch all the "extra" data of this user
        if (extended) {
            shared_1.default.logger.info("Fetching extended information...");
            const promises = [
                this.watchedThreadsGetWrapper(),
                this.bookmarksGetWrapper(),
                this.alertsGetWrapper(),
                this.featuredGamesGetWrapper(),
                this.conversationsGetWrapper()
            ];
            // Await all the promises. We can use `any`
            // because the values are saved inside the functions.
            await Promise.all(promises);
            shared_1.default.logger.trace("Extended information fetched");
        }
    }
    //#endregion Public methods
    //#region Private methods
    /**
     * Gets the ID of the user currently logged.
     */
    async fetchUserID() {
        // Local variables
        const url = new URL(url_1.urls.BASE).toString();
        // Fetch and parse page
        const response = await (0, network_helper_1.fetchHTML)(url);
        const result = response.applyOnSuccess((html) => {
            // Load page with cheerio
            const $ = (0, cheerio_1.load)(html);
            const sid = $(css_selector_1.GENERIC.CURRENT_USER_ID).attr("data-user-id");
            if (!sid)
                throw new errors_1.MissingOrInvalidParsingAttribute("Cannot extract user's ID");
            return parseInt(sid.trim(), 10);
        });
        if (result.isFailure())
            throw result.value;
        else
            return result.value;
    }
    /**
     * Gets all the elements that solve a specific
     * selector in a list on multiple web pages.
     */
    async fetchElementsInPages(options) {
        // Fetch page
        const response = await (0, network_helper_1.fetchHTML)(options.url);
        if (response.isFailure())
            throw response.value;
        // Load page in cheerio
        const $ = (0, cheerio_1.load)(response.value);
        // Fetch the pages (select only the first selector if multiple are found)
        const lastPageText = $(options.selector).first().text().trim();
        const lastPage = lastPageText ? parseInt(lastPageText, 10) : 1;
        // Create the async iterator used to fetch the pages
        const iter = this.fetchPages(options.url, lastPage);
        let curr = await iter.next();
        const promises = [];
        while (!curr.done) {
            // Explicit cast because it always return a string
            const page = curr.value;
            // Parse elements but not resolve the promise
            const elements = options.parseFunction(page);
            promises.push(elements);
            curr = await iter.next();
        }
        // Resolve and flat the array then return the elements
        const elementsScraped = await Promise.all(promises);
        return [].concat(...elementsScraped);
    }
    /**
     * Gets the pages at the specified URL.
     * @param url Base URL to use for scraping a page
     * @param n Total number of pages
     * @param s Page to start from
     */
    async *fetchPages(url, n, s = 1) {
        // Local variables
        const u = new URL(url);
        const pipeline = [];
        // Fetch the page' HTML in sequence
        for (let page = s; page <= n; page++) {
            // Set the page URL
            u.searchParams.set("page", page.toString());
            // Fetch HTML but not wait for it
            const promise = (0, network_helper_1.fetchHTML)(u.toString());
            pipeline.push(promise);
        }
        // Now that we have all the promises,
        // resolve them and return the HTML code
        // of the pages
        for (const p of pipeline) {
            const response = await p;
            if (response.isSuccess())
                yield response.value;
            else
                throw response.value;
        }
    }
    /**
     * Gets thread data starting from the source code of the page passed by parameter.
     */
    async fetchPageThreadElements(html) {
        // Local variables
        const $ = (0, cheerio_1.load)(html);
        function parseElement(el) {
            // Parse the URL
            const partialURL = findAttribute($(el), css_selector_1.WATCHED_THREAD.URL, "href");
            const url = new URL(partialURL.replace("unread", ""), url_1.urls.BASE).toString();
            return {
                url: url.toString(),
                unread: partialURL.endsWith("unread"),
                forum: $(el).find(css_selector_1.WATCHED_THREAD.FORUM).text().trim()
            };
        }
        return $(css_selector_1.WATCHED_THREAD.BODIES)
            .map((_idx, el) => parseElement(el))
            .get();
    }
    /**
     * Gets bookmarks data starting from the source code of the page passed by parameter.
     */
    async fetchBookmarkElements(html) {
        // Local variables
        const $ = (0, cheerio_1.load)(html);
        async function parseElement(el) {
            // Parse the URL
            const url = findAttribute($(el), css_selector_1.BOOKMARKED_POST.URL, "href");
            // Check if the URL contains a post ID and get it,
            // otherwise it represents the first post of a
            // thread so set the ID to 1
            const regex = new RegExp(/posts\/([0-9]+)/);
            const match = url.match(regex);
            let foundID = null;
            if (match) {
                const sid = match[0].replace("posts/", "");
                foundID = parseInt(sid, 10);
            }
            else {
                const post = await new thread_1.default(new URL(url)).getPost(1);
                foundID = post.id;
            }
            // Find the savedate
            const sDate = findAttribute($(el), css_selector_1.BOOKMARKED_POST.BOOKMARK_TIME, "datetime");
            // Find the owner ID
            const sOwnerID = findAttribute($(el), css_selector_1.BOOKMARKED_POST.OWNER_ID, "data-user-id");
            return {
                id: foundID,
                userid: parseInt(sOwnerID, 10),
                description: $(el).find(css_selector_1.BOOKMARKED_POST.DESCRIPTION).text().trim(),
                savedate: (0, iso_datestring_validator_1.isValidISODateString)(sDate) ? new Date(sDate) : new Date(generic_1.DEFAULT_DATE),
                labels: $(el)
                    .find(css_selector_1.BOOKMARKED_POST.LABELS)
                    .map((_, label) => $(label).text())
                    .toArray()
            };
        }
        const promises = $(css_selector_1.BOOKMARKED_POST.BODIES)
            .map((_idx, el) => parseElement(el))
            .get();
        return await Promise.all(promises);
    }
    /**
     * Fetch the game featured by the platform (if the option is enabled).
     *
     * The games are those highlighted in the carousel of the main page.
     */
    async fetchFeaturedGames() {
        // Local variables
        const url = new URL(url_1.urls.BASE).toString();
        // Fetch and parse page
        const response = await (0, network_helper_1.fetchHTML)(url);
        if (response.isSuccess()) {
            // Load page with cheerio
            const $ = (0, cheerio_1.load)(response.value);
            // Get all the <a> elements containing the featured game urls
            const slider = $(css_selector_1.GENERIC.FEATURED_GAMES).toArray();
            // Extract the URL from the attribute
            const partialURLs = slider
                .map((el) => $(el).attr("href")?.trim())
                .filter((url) => url !== undefined);
            // Prepare the unique URLs
            const gameURLs = [...new Set(partialURLs)].map((pu) => new URL(pu, url_1.urls.BASE).toString());
            // fetch the games
            const promises = gameURLs.map((url) => {
                return (0, handiwork_from_url_1.getHandiworkFromURL)(url, game_1.default);
            });
            return Promise.all(promises);
        }
        else
            throw response.value;
    }
}
exports.default = UserProfile;
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
