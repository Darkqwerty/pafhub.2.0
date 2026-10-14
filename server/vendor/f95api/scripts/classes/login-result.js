"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Object obtained in response to an attempt to login to the portal.
 */
class LoginResult {
    //#region Login result codes
    static REQUIRE_2FA = 100;
    static REQUIRE_CAPTCHA = 101;
    static AUTH_SUCCESSFUL = 200;
    static AUTH_SUCCESSFUL_2FA = 201;
    static ALREADY_AUTHENTICATED = 202;
    static UNKNOWN_ERROR = 400;
    static INCORRECT_CREDENTIALS = 401;
    static INCORRECT_2FA_CODE = 402;
    //#endregion Login result codes
    //#region Properties
    /**
     * Result of the login operation
     */
    success;
    /**
     * Code associated with the result of the login operation.
     */
    code;
    /**
     * Login response message
     */
    message;
    //#endregion Properties
    /**
     * @param success Result of the login
     * @param code ID code of the result event
     * @param message Message associated with the result
     */
    constructor(success, code, message) {
        this.success = success;
        this.code = code;
        this.message = message ?? /* c8 ignore next */ "";
    }
}
exports.default = LoginResult;
