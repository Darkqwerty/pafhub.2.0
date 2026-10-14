"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
// Modules from file
const network_helper_1 = require("../network-helper");
/**
 * Represents the credentials used to access the platform.
 */
class Credentials {
    //#region Private fields
    _token = "";
    //#endregion Private fields
    /**
     * Username
     */
    username;
    /**
     * Password of the user.
     */
    password;
    /**
     * Token used in POST requests to the platform.
     */
    get token() {
        return this._token;
    }
    constructor(username, password) {
        this.username = username;
        this.password = password;
    }
    /**
     * Fetch and save the token used to log in to F95Zone.
     */
    async fetchToken() {
        this._token = await (0, network_helper_1.getF95Token)();
    }
}
exports.default = Credentials;
