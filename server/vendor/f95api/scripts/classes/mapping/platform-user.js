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
// Modules from files
const url_1 = require("../../constants/url");
const network_helper_1 = require("../../network-helper");
const css_selector_1 = require("../../constants/css-selector");
const shared_1 = __importDefault(require("../../shared"));
const errors_1 = require("../errors");
const generic_1 = require("../../constants/generic");
/**
 * Represents a generic user registered on the platform.
 */
class PlatformUser {
    //#region Fields
    _id;
    _name = "";
    _title = "";
    _banners = [];
    _messages = 0;
    _reactionScore = 0;
    _points = 0;
    _ratingsReceived = 0;
    _joined = generic_1.DEFAULT_DATE;
    _lastSeen = generic_1.DEFAULT_DATE;
    _followed = false;
    _ignored = false;
    _private = false;
    _avatar = "";
    _amountDonated = 0;
    //#endregion Fields
    //#region Getters
    /* c8 ignore start */
    /**
     * Unique user ID.
     */
    get id() {
        return this._id;
    }
    /**
     * Username.
     */
    get name() {
        return this._name;
    }
    /**
     * Title assigned to the user by the platform.
     */
    get title() {
        return this._title;
    }
    /**
     * List of banners assigned by the platform.
     */
    get banners() {
        return this._banners;
    }
    /**
     * Number of messages written by the user.
     */
    get messages() {
        return this._messages;
    }
    /**
     * Total number of reactions received from other users.
     */
    get reactionScore() {
        return this._reactionScore;
    }
    /**
     * Total number of points received after the acquisition of trophies.
     */
    get points() {
        return this._points;
    }
    /**
     * Number of ratings received.
     */
    get ratingsReceived() {
        return this._ratingsReceived;
    }
    /**
     * Date of joining the platform.
     */
    get joined() {
        return this._joined;
    }
    /**
     * Date of the last connection to the platform.
     */
    get lastSeen() {
        return this._lastSeen;
    }
    /**
     * Indicates whether the user is followed by the currently logged in user.
     */
    get followed() {
        return this._followed;
    }
    /**
     * Indicates whether the user is ignored by the currently logged on user.
     */
    get ignored() {
        return this._ignored;
    }
    /**
     * Indicates that the profile is private and not viewable by the user.
     */
    get private() {
        return this._private;
    }
    /**
     * URL of the image used as the user's avatar.
     */
    get avatar() {
        return this._avatar;
    }
    /**
     * Value of donations made.
     */
    get donation() {
        return this._amountDonated;
    }
    /* c8 ignore stop */
    //#endregion Getters
    constructor(id) {
        this._id = id ?? -1;
    }
    //#region Public methods
    async fetch() {
        // Check login
        if (!shared_1.default.isLogged)
            throw new errors_1.UserNotLogged(errors_1.USER_NOT_LOGGED);
        // Check ID
        if (!this.id || this.id < 1)
            throw new errors_1.InvalidID(errors_1.INVALID_USER_ID);
        // Prepare the URL
        const url = new URL(this.id.toString(), `${url_1.urls.MEMBERS}/`).toString();
        // Fetch the page
        const response = await (0, network_helper_1.fetchHTML)(url);
        const result = response.applyOnSuccess((html) => this.elaborateResponse(html));
        if (result.isFailure())
            throw response.value;
    }
    //#endregion Public methods
    //#region Private methods
    /**
     * Process the HTML code received as an
     * answer and gets the data contained in it.
     */
    elaborateResponse(html) {
        // Prepare cheerio
        const $ = (0, cheerio_1.load)(html);
        // Check if the profile is private
        this._private =
            $(css_selector_1.GENERIC.ERROR_BANNER)?.text().trim() ===
                "This member limits who may view their full profile.";
        if (!this._private) {
            // Parse the elements
            this._name = $(css_selector_1.MEMBER.NAME).text();
            this._title = $(css_selector_1.MEMBER.TITLE).text();
            this._banners = $(css_selector_1.MEMBER.BANNERS)
                .toArray()
                .map((el) => $(el).text().trim())
                .filter((el) => el);
            this._avatar = new URL($(css_selector_1.MEMBER.AVATAR).attr("src"), url_1.urls.BASE).toString() ?? "";
            this._followed = $(css_selector_1.MEMBER.FOLLOWED).text() === "Unfollow";
            this._ignored = $(css_selector_1.MEMBER.IGNORED).text() === "Unignore";
            this._messages = parseInt($(css_selector_1.MEMBER.MESSAGES).text(), 10);
            this._reactionScore = parseInt($(css_selector_1.MEMBER.REACTION_SCORE).text(), 10);
            this._points = parseInt($(css_selector_1.MEMBER.POINTS).text(), 10);
            this._ratingsReceived = parseInt($(css_selector_1.MEMBER.RATINGS_RECEIVED).text(), 10);
            // Parse date
            const joined = $(css_selector_1.MEMBER.JOINED)?.attr("datetime");
            if (joined && (0, iso_datestring_validator_1.isValidISODateString)(joined))
                this._joined = new Date(joined);
            const lastSeen = $(css_selector_1.MEMBER.LAST_SEEN)?.attr("datetime");
            if (lastSeen && (0, iso_datestring_validator_1.isValidISODateString)(lastSeen))
                this._joined = new Date(lastSeen);
            // Parse donation
            const donation = $(css_selector_1.MEMBER.AMOUNT_DONATED)?.text().replace("$", "");
            this._amountDonated = donation ? parseInt(donation, 10) : 0;
        }
    }
}
exports.default = PlatformUser;
