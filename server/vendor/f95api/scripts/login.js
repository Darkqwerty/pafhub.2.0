"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.logout = logout;
// Modules from file
const errors_1 = require("./classes/errors");
const fetch_platform_data_1 = __importDefault(require("./fetch-data/fetch-platform-data"));
const network_helper_1 = require("./network-helper");
const shared_1 = __importDefault(require("./shared"));
// Classes from file
const login_result_1 = __importDefault(require("./classes/login-result"));
const credentials_1 = __importDefault(require("./classes/credentials"));
//#region Public methods
/**
 * Log in to the F95Zone platform.
 *
 * This **must** be the first operation performed before accessing any other script functions.
 *
 * @param cbRecaptcha
 * Callback used to get the verification token released by a
 * Recaptcha widget after the interaction with the user
 *
 * @param cb2fa
 * Callback used if two-factor authentication is required for the profile.
 * It must return he OTP code to use for the login.
 */
async function login(username, password, captchaToken, cb2fa) {
    // Login result
    let loginResult = null;
    // Try to load a previous session
    await shared_1.default.session.load();
    // If the session is valid, login from it
    if (shared_1.default.session.isValid(username, password)) {
        loginResult = loginFromLocalSession(username);
        // We need to update cookies and token, otherwise no POST request will work
        await (0, network_helper_1.updateSession)();
    }
    // Otherwise login from the F95Zone platform
    else {
        const creds = await createCredentials(username, password);
        loginResult = await loginInTheRemotePlatform(creds, captchaToken, cb2fa);
        // Recreate the session, overwriting the old one
        if (loginResult.success) {
            shared_1.default.session.create(username, password, creds.token);
            await shared_1.default.session.save();
        }
    }
    /* c8 ignore start*/
    if (loginResult.success) {
        // Load platform data
        await (0, fetch_platform_data_1.default)();
        shared_1.default.logger.info("User logged in through the platform");
    }
    else {
        shared_1.default.logger.warn(`Error during authentication: ${loginResult.message}`);
    }
    /* c8 ignore stop */
    // Set login status
    shared_1.default.setIsLogged(loginResult.success);
    return loginResult;
}
/**
 * Close the currently open session.
 *
 * You **must** be logged in to the portal before calling this method.
 */
async function logout() {
    // Check if the user is logged
    if (!shared_1.default.isLogged)
        throw new errors_1.UserNotLogged(errors_1.USER_NOT_LOGGED);
    await shared_1.default.session.delete();
    shared_1.default.setIsLogged(false);
}
//#endregion Public methods
//#region Private methods
/**
 * Create login result used if there is a valid local session.
 */
function loginFromLocalSession(username) {
    shared_1.default.logger.info(`Loading previous session for ${username}`);
    return new login_result_1.default(true, login_result_1.default.ALREADY_AUTHENTICATED, `${username} already authenticated (session)`);
}
/**
 * Create user credentials for login.
 */
async function createCredentials(username, password) {
    // Creating credentials and fetch unique platform token
    const creds = new credentials_1.default(username, password);
    shared_1.default.logger.trace("Fetching token...");
    await creds.fetchToken();
    return creds;
}
/**
 * Login into the remote platform.
 */
async function loginInTheRemotePlatform(creds, captchaToken, cb2fa) {
    shared_1.default.logger.trace(`Authentication for ${creds.username}`);
    let result = await (0, network_helper_1.authenticate)(creds);
    // Captcha is required, ask for token
    if (result.code === login_result_1.default.REQUIRE_CAPTCHA) {
        const token = await captchaToken();
        result = await (0, network_helper_1.authenticate)(creds, token);
    }
    // 2FA Authentication is required, fetch OTP
    if (result.code === login_result_1.default.REQUIRE_2FA) {
        const code = await cb2fa();
        const response2fa = await (0, network_helper_1.send2faCode)(code, creds.token);
        if (response2fa.isSuccess())
            result = response2fa.value;
        else
            throw response2fa.value;
    }
    return result;
}
//#endregion Private methods
