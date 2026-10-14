"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
// Core modules
const fs_1 = require("fs");
// Public modules from npm
const js_sha256_1 = require("js-sha256");
const tough_cookie_1 = require("tough-cookie");
const errors_1 = require("./errors");
const url_1 = require("../constants/url");
const generic_1 = require("../constants/generic");
class Session {
    //#region Fields
    /**
     * Max number of days the session is valid.
     */
    SESSION_TIME = 30;
    _path;
    _isMapped;
    _created;
    _hash;
    _token;
    _cookieJar;
    _serializedCookieJar;
    //#endregion Fields
    //#region Getters
    /**
     * Path of the session map file on disk.
     */
    get path() {
        return this._path;
    }
    /**
     * Indicates if the session is mapped on disk.
     */
    get isMapped() {
        return this._isMapped;
    }
    /**
     * Date of creation of the session.
     */
    get created() {
        return this._created;
    }
    /**
     * MD5 hash of the username and the password.
     */
    get hash() {
        return this._hash;
    }
    /**
     * Token used for POST requests to the platform.
     */
    get token() {
        return this._token;
    }
    /**
     * Cookie holder.
     */
    get cookieJar() {
        return this._cookieJar;
    }
    //#endregion Getters
    /**
     * Initializes the session by setting the path for saving information to disk.
     */
    constructor(p) {
        if (!p || p === "")
            throw new errors_1.ParameterError("Invalid path for the session file");
        this._path = p;
        this._isMapped = (0, fs_1.existsSync)(this.path);
        this._created = new Date(Date.now());
        this._hash = null;
        this._token = null;
        this._cookieJar = new tough_cookie_1.CookieJar();
    }
    //#region Private Methods
    /**
     * Get the difference in days between two dates.
     */
    dateDiffInDays(a, b) {
        const MS_PER_DAY = 1000 * 60 * 60 * 24;
        // Discard the time and time-zone information.
        const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
        const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
        return Math.abs(Math.floor((utc2 - utc1) / MS_PER_DAY));
    }
    /**
     * Convert the object to a dictionary serializable in JSON.
     */
    toJSON() {
        return {
            _created: this._created,
            _hash: this._hash,
            _token: this._token,
            _serializedCookieJar: this._serializedCookieJar
        };
    }
    //#endregion Private Methods
    //#region Public Methods
    /**
     * Create a new session.
     */
    create(username, password, token) {
        // First, create the _hash of the credentials
        const value = `${username}%%%${password}`;
        this._hash = (0, js_sha256_1.sha256)(value);
        // Set the token
        this._token = token;
        // Update the creation date
        this._created = new Date(Date.now());
    }
    /**
     * Save the session to disk.
     */
    async save() {
        // Update the creation date
        this._created = new Date(Date.now());
        // Set the session as mapped on file
        this._isMapped = true;
        // Serialize the cookiejar
        this._serializedCookieJar = await this._cookieJar.serialize();
        // Convert data
        const json = this.toJSON();
        const data = JSON.stringify(json);
        // Write data
        await fs_1.promises.writeFile(this.path, data);
    }
    /**
     * Load the session from disk.
     */
    async load() {
        if (this.isMapped) {
            // Read data
            const data = await fs_1.promises.readFile(this.path, {
                encoding: "utf-8",
                flag: "r"
            });
            const json = JSON.parse(data);
            // Assign values
            this._created = new Date(json._created);
            this._hash = json._hash;
            this._token = json._token;
            // Load cookiejar
            this._cookieJar = await tough_cookie_1.CookieJar.deserialize(json._serializedCookieJar);
            // Remove session cookies
            await this.deleteSessionCookies();
        }
    }
    /**
     * Delete the session from disk.
     */
    async delete() {
        // Delete the session data
        if (this.isMapped)
            await fs_1.promises.unlink(this.path);
    }
    /**
     * Removes from memory the session cookies which
     * will have to be recreated to each session.
     */
    async deleteSessionCookies() {
        // Get all the stored cookies
        const cookies = await this._cookieJar.getCookies(url_1.urls.BASE);
        // Get the user cookie, the only not session-based
        const userCookie = cookies.find((cookie) => cookie.key === "xf_user");
        // Remove all the cookies from the store and re-add the user cookie
        await this._cookieJar.removeAllCookies();
        if (userCookie)
            await this._cookieJar.setCookie(userCookie, url_1.urls.BASE);
    }
    /**
     * Check if the session is valid.
     */
    isValid(username, password) {
        // Local variables
        const now = new Date(Date.now());
        // Get the number of days from the file creation
        const sessionDateDiff = this.dateDiffInDays(now, this.created);
        // The session is valid if the number of days is minor than SESSION_TIME
        const sessionDateValid = sessionDateDiff < this.SESSION_TIME;
        // Check the hash
        const value = `${username}%%%${password}`;
        const hashValid = (0, js_sha256_1.sha256)(value) === this._hash;
        // Verify if the user cookie is valid
        const xfUser = this._cookieJar.getCookiesSync(url_1.urls.BASE).find((c) => c.key === "xf_user");
        const cookieCreation = xfUser && xfUser.creation instanceof Date ? xfUser.creation : generic_1.DEFAULT_DATE;
        const cookieDateDiff = this.dateDiffInDays(now, cookieCreation);
        // The cookie has a validity of one year, however it is limited to SESSION_TIME
        const cookieDateValid = cookieDateDiff < this.SESSION_TIME;
        return sessionDateValid && hashValid && cookieDateValid;
    }
    /**
     * Update the `_xfToken` token.
     */
    updateToken(token) {
        this._token = token;
    }
}
exports.default = Session;
