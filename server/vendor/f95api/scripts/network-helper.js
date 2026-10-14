"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchHTML = fetchHTML;
exports.authenticate = authenticate;
exports.send2faCode = send2faCode;
exports.updateSession = updateSession;
exports.getF95Token = getF95Token;
exports.fetchGETResponse = fetchGETResponse;
exports.fetchPOSTResponse = fetchPOSTResponse;
exports.fetchHEADResponse = fetchHEADResponse;
exports.enforceHttpsUrl = enforceHttpsUrl;
exports.isF95URL = isF95URL;
exports.isStringAValidURL = isStringAValidURL;
exports.urlExists = urlExists;
exports.getUrlRedirect = getUrlRedirect;
const cheerio_1 = require("cheerio");
const await_semaphore_1 = require("await-semaphore");
// Modules from file
const shared_1 = __importDefault(require("./shared"));
const url_1 = require("./constants/url");
const css_selector_1 = require("./constants/css-selector");
const login_result_1 = __importDefault(require("./classes/login-result"));
const result_1 = require("./classes/result");
const errors_1 = require("./classes/errors");
const agent_1 = __importDefault(require("./agent"));
// Global variables
const MAX_CONCURRENT_REQUESTS = 15;
const AUTH_SUCCESSFUL_MESSAGE = "Authentication successful";
const INVALID_2FA_CODE_MESSAGE = "The two-step verification value could not be confirmed. Please try again";
const INCORRECT_CREDENTIALS_MESSAGE = "Incorrect password. Please try again.";
const REQUIRE_CAPTCHA_VERIFICATION = "You did not complete the CAPTCHA verification properly. Please try again.";
/**
 * Axios agent used to send requests.
 */
const agent = (0, agent_1.default)();
/**
 * Semaphore used to avoid flooding the platform.
 */
const semaphore = new await_semaphore_1.Semaphore(MAX_CONCURRENT_REQUESTS);
/**
 * Gets the HTML code of a page.
 */
async function fetchHTML(url) {
    // Secure (and validate) the URL
    const secureURL = enforceHttpsUrl(url);
    // Fetch the response of the platform
    const response = await fetchGETResponse(secureURL);
    if (response.isSuccess()) {
        // Check if the response is a HTML source code
        const contentType = String(response.value.headers["content-type"] ?? "");
        const isHTML = contentType.includes("text/html");
        const unexpectedResponseError = new errors_1.UnexpectedResponseContentType({
            id: errors_1.ERROR_CODE.UNEXPECTED_HTML_RESPONSE,
            message: `Expected HTML but received ${response.value["content-type"]}`,
            error: new Error(`Expected HTML but received ${response.value["content-type"]}`)
        });
        return isHTML ? (0, result_1.success)(response.value.data) : (0, result_1.failure)(unexpectedResponseError);
    }
    else
        return (0, result_1.failure)(response.value);
}
/**
 * It authenticates to the platform using the credentials
 * and token obtained previously. Save cookies on your
 * device after authentication.
 * @param {Credentials} credentials Platform access credentials
 * @param {String} captchaToken reCAPTCHA token returned from Google after the correct interaction with the widget
 * @param {Boolean} force Specifies whether the request should be forced, ignoring any saved cookies
 * @returns {Promise<LoginResult>} Result of the operation
 */
async function authenticate(credentials, captchaToken) {
    shared_1.default.logger.info(`Authenticating with user ${credentials.username}`);
    if (!credentials.token)
        throw new errors_1.InvalidF95Token(`Invalid token for auth: ${credentials.token}`);
    const loginForm = await getLoginFormData();
    const secureURL = enforceHttpsUrl(loginForm.actionUrl);
    // Prepare the parameters to send to the platform to authenticate
    const params = {
        ...loginForm.hiddenFields,
        login: credentials.username,
        password: credentials.password,
        remember: "1",
        _xfRedirect: "https://f95zone.to/",
        _xfToken: credentials.token,
        "g-recaptcha-response": captchaToken ?? ""
    };
    // Try to log-in
    let authResult = null;
    // Fetch the response to the login request
    const response = await fetchPOSTResponse(secureURL, params, {
        Origin: url_1.urls.BASE,
        Referer: loginForm.pageUrl
    });
    // Parse the response
    const result = response.applyOnSuccess((r) => manageLoginPOSTResponse(r));
    // Manage result
    if (result.isFailure()) {
        const message = `Error ${result.value.message} occurred while authenticating`;
        shared_1.default.logger.error(message);
        authResult = new login_result_1.default(false, login_result_1.default.UNKNOWN_ERROR, message);
    }
    else
        authResult = result.value;
    return authResult;
}
/**
 * Send an OTP code if the login procedure requires it.
 * @param code OTP code.
 * @param token Unique token for the session associated with the credentials in use.
 * @param provider Provider used to generate the access code.
 * @param trustedDevice If the device in use is trusted, 2FA authentication is not required for 30 days.
 */
async function send2faCode(code, token, provider = "auto", trustedDevice = false) {
    // Prepare the parameters to send via POST request
    const params = {
        _xfRedirect: url_1.urls.BASE,
        _xfRequestUri: "/login/two-step?_xfRedirect=https%3A%2F%2Ff95zone.to%2F&remember=1",
        _xfResponseType: "json",
        _xfToken: token,
        _xfWithData: "1",
        code: code.toString(),
        confirm: "1",
        provider: provider,
        remember: "1",
        trust: trustedDevice ? "1" : "0"
    };
    // Send 2FA params
    const response = await fetchPOSTResponse(url_1.urls.LOGIN_2FA, params);
    // Check if the authentication is valid
    const validAuth = response.applyOnSuccess((r) => manage2faResponse(r));
    if (validAuth.isSuccess() && validAuth.value.isSuccess()) {
        // Valid login
        return (0, result_1.success)(validAuth.value.value);
    }
    else if (validAuth.isSuccess() && validAuth.value.isFailure()) {
        // Wrong provider, try with another
        const expectedProvider = validAuth.value.value;
        return await send2faCode(code, token, expectedProvider, trustedDevice);
    }
    else
        (0, result_1.failure)(validAuth.value);
}
/**
 * Updates session cookies and the token used
 * for POST requests which depends on them.
 */
async function updateSession() {
    /*
      Without this update, an xfToken token not synchronized
      with the xf_csrf cookie generates a 400 Bad Request
      (security error) in response to any POST.
    */
    // Check if the user had already authenticated in a previous session
    const cookies = await shared_1.default.session.cookieJar.getCookies(url_1.urls.BASE);
    const xfUser = cookies.find((c) => c.key === "xf_user");
    if (!xfUser)
        throw new errors_1.NoPreviousSession(errors_1.PREVIOUS_SESSION_NOT_EXISTENT);
    // First get the xf_session and xf_csrf cookies from F95Zone
    shared_1.default.logger.info("Updating session cookies...");
    await getSessionCookies();
    // Then update the local _xfToken.
    // This value depends on the current xf_csrf cookie value
    shared_1.default.logger.info("Updating _xfToken...");
    const token = await getF95Token();
    shared_1.default.session.updateToken(token);
}
/**
 * Obtain the token used to authenticate the user to the platform.
 */
async function getF95Token() {
    const loginForm = await getLoginFormData();
    return loginForm.token;
}
//#region Utility methods
/**
 * Performs a GET request to a specific URL and returns the response.
 */
async function fetchGETResponse(url) {
    // Validate URL
    if (!isStringAValidURL(url))
        throw new URIError(`'${url}' is not a valid URL`);
    // Get a token from the semaphore
    const release = await semaphore.acquire();
    try {
        // Fetch and return the response
        const response = await agent.get(url, {
            jar: shared_1.default.session.cookieJar
        });
        return (0, result_1.success)(response);
    }
    catch (e) {
        const err = e;
        const message = `(GET) Error "${err.message}" occurred while trying to fetch ${url}`;
        shared_1.default.logger.error(message);
        const genericError = new errors_1.GenericAxiosError({
            id: errors_1.ERROR_CODE.CANNOT_FETCH_GET_RESPONSE,
            message: message,
            error: err
        });
        return (0, result_1.failure)(genericError);
    }
    finally {
        // Release the token
        release();
    }
}
/**
 * Performs a POST request through Axios.
 * @param url URL to request
 * @param params List of value pairs to send with the request
 */
async function fetchPOSTResponse(url, params, headers = {}) {
    // Validate URL
    if (!isStringAValidURL(url))
        throw new URIError(`'${url}' is not a valid URL`);
    // Prepare the parameters for the POST request
    const urlParams = new URLSearchParams();
    Object.entries(params).map(([key, value]) => urlParams.append(key, value));
    // Get a token from the semaphore
    const release = await semaphore.acquire();
    // Send the POST request and await the response
    try {
        const response = await agent.post(url, urlParams, {
            jar: shared_1.default.session.cookieJar,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                ...headers
            }
        });
        return (0, result_1.success)(response);
    }
    catch (e) {
        const err = `(POST) Error "${e.message}" occurred while trying to fetch ${url}`;
        shared_1.default.logger.error(err);
        const genericError = new errors_1.GenericAxiosError({
            id: errors_1.ERROR_CODE.CANNOT_FETCH_POST_RESPONSE,
            message: err,
            error: e
        });
        return (0, result_1.failure)(genericError);
    }
    finally {
        // Release the token
        release();
    }
}
/**
 * Performs a HEAD request to a specific URL and returns the response.
 */
async function fetchHEADResponse(url) {
    // Validate URL
    if (!isStringAValidURL(url))
        throw new URIError(`'${url}' is not a valid URL`);
    // Get a token from the semaphore
    const release = await semaphore.acquire();
    try {
        const response = await agent.head(url, {
            jar: shared_1.default.session.cookieJar
        });
        return (0, result_1.success)(response);
    }
    catch (e) {
        const err = `(HEAD) Error "${e.message}" occurred while trying to fetch ${url}`;
        shared_1.default.logger.error(err);
        const genericError = new errors_1.GenericAxiosError({
            id: errors_1.ERROR_CODE.CANNOT_FETCH_HEAD_RESPONSE,
            message: err,
            error: e
        });
        return (0, result_1.failure)(genericError);
    }
    finally {
        // Release the token
        release();
    }
}
/**
 * Enforces the scheme of the URL is https and returns the new URL.
 */
function enforceHttpsUrl(url) {
    if (isStringAValidURL(url))
        return url.replace(/^(https?:)?\/\//, "https://");
    else
        throw new URIError(`'${url}' is not a valid URL`);
}
/**
 * Check if the url belongs to the domain of the F95 platform.
 */
function isF95URL(url) {
    // Validate URL
    if (!isStringAValidURL(url))
        throw new URIError(`'${url}' is not a valid URL`);
    return url.startsWith(url_1.urls.BASE);
}
/**
 * Checks if the string passed by parameter has a
 * properly formatted and valid path to a URL (HTTP/HTTPS).
 *
 * @author Daveo
 * @see https://preview.tinyurl.com/y2f2e2pc
 */
function isStringAValidURL(url) {
    // Many thanks to Daveo at StackOverflow (https://preview.tinyurl.com/y2f2e2pc)
    const regex = /((https|http){0,1}:\/\/){0,1}(www\.){0,1}[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)/;
    return regex.test(url);
}
/**
 * Check if a particular URL is valid and reachable on the web.
 * @param {string} url URL to check
 * @param {boolean} [checkRedirect]
 * If `true`, the function will consider redirects a violation and return `false`.
 * Default: `false`
 */
async function urlExists(url, checkRedirect = false) {
    // Local variables
    let valid = false;
    if (isStringAValidURL(url)) {
        valid = await axiosUrlExists(url);
        if (valid && checkRedirect) {
            const redirectUrl = await getUrlRedirect(url);
            valid = redirectUrl === url;
        }
    }
    return valid;
}
/**
 * Check if the URL has a redirect to another page.
 * @param {String} url URL to check for redirect
 * @returns {Promise<String>} Redirect URL or the passed URL
 */
async function getUrlRedirect(url) {
    // Validate URL
    if (!isStringAValidURL(url))
        throw new URIError(`'${url}' is not a valid URL`);
    const response = await fetchHEADResponse(url);
    if (response.isSuccess()) {
        const r = response.value.request;
        const redirect = new URL(r.path, `${r.protocol}//${r.host}`);
        return redirect.toString();
    }
    else
        throw response.value;
}
//#endregion Utility methods
//#region Private methods
/**
 * Makes a GET request to the platform to obtain
 * the `xf_session` and `xf_csrf` session cookies.
 *
 * For the `xf_session` token, the `xf_user` cookie
 * must be present, generated after successful authentication.
 */
async function getSessionCookies() {
    try {
        // Send a GET request to fetch the cookies
        // and save them in the jar
        await agent.get(url_1.urls.BASE, {
            jar: shared_1.default.session.cookieJar,
            headers: {
                Cookie: await getUserCookieString() // Force cookie header
            }
        });
    }
    catch (e) {
        const err = `(GET) Error "${e.message}" occurred while trying to fetch session cookies`;
        shared_1.default.logger.error(err);
        const genericError = new errors_1.GenericAxiosError({
            id: errors_1.ERROR_CODE.CANNOT_FETCH_SESSION_TOKENS,
            message: err,
            error: e
        });
        throw genericError;
    }
}
async function getLoginFormData() {
    const candidates = [url_1.urls.LOGIN_PAGE, url_1.urls.BASE, url_1.urls.LOGIN];
    let lastError = null;
    for (const candidate of candidates) {
        const response = await fetchGETResponse(candidate);
        if (response.isFailure()) {
            lastError = response.value;
            continue;
        }
        const html = response.value.data;
        const $ = (0, cheerio_1.load)(html);
        const token = $("body").find(css_selector_1.GENERIC.GET_REQUEST_TOKEN).first().attr("value")?.trim();
        const form = $('form[action*="login"]').first().length !== 0
            ? $('form[action*="login"]').first()
            : $("form").has(css_selector_1.GENERIC.GET_REQUEST_TOKEN).first();
        const action = form.attr("action")?.trim();
        const hiddenFields = form
            .find('input[type="hidden"][name]')
            .get()
            .reduce((acc, input) => {
            const field = $(input);
            const name = field.attr("name")?.trim();
            const value = field.attr("value")?.trim() ?? "";
            if (name) {
                acc[name] = value;
            }
            return acc;
        }, {});
        if (token) {
            const actionUrl = action ? new URL(action, candidate).toString() : url_1.urls.LOGIN;
            return { token, actionUrl, pageUrl: candidate, hiddenFields };
        }
    }
    if (lastError)
        throw lastError;
    throw new Error("Unable to locate login form token on F95Zone");
}
/**
 * Gets the string of the `xf_user` cookie to be
 * sent to the platform via the `Cookie` header.
 *
 * This feature is temporary and will be removed
 * once `axios-cookiejar-support` is fixed.
 */
async function getUserCookieString() {
    const cookies = await shared_1.default.session.cookieJar.getCookies(url_1.urls.BASE);
    const userCookie = cookies.find((cookie) => cookie.key === "xf_user");
    return userCookie ? userCookie.cookieString() : "";
}
/**
 * Check with Axios if a URL exists.
 */
async function axiosUrlExists(url) {
    // Validate URL
    if (!isStringAValidURL(url))
        throw new URIError(`'${url}' is not a valid URL`);
    // Local variables
    const ERROR_CODES = ["ENOTFOUND", "ETIMEDOUT"];
    let valid = false;
    // Send a HEAD request
    const r = await fetchHEADResponse(url);
    // Parse response
    const status = r.value.status;
    const error = r.value.error;
    const errorCode = error?.code ?? "";
    if (r.isSuccess())
        valid = r.value && !/4\d\d/.test(status.toString());
    else if (r.isFailure() && !ERROR_CODES.includes(errorCode))
        throw r.value.error;
    return valid;
}
/**
 * Manages the response obtained from the server after requesting authentication.
 */
function manageLoginPOSTResponse(response) {
    // Parse the response HTML
    const $ = (0, cheerio_1.load)(response.data);
    // Check if 2 factor authentication is required
    if (response.config.url?.startsWith(url_1.urls.LOGIN_2FA)) {
        return new login_result_1.default(false, login_result_1.default.REQUIRE_2FA, "Two-factor authentication is needed to continue");
    }
    // Get the error message (if any) and remove the new line chars
    const genericError = $("body").find(css_selector_1.GENERIC.LOGIN_MESSAGE_ERROR).text().replace(/\n/g, "");
    // Check if there is a security error (in another css block)
    const securityError = $("body")
        .find(css_selector_1.GENERIC.LOGIN_SECURITY_MESSAGE_ERROR)
        .text()
        .replace(/\n\t/g, "");
    let errorMessage = genericError !== "" ? genericError : securityError;
    // Check if the user ID is available
    const availableUserID = $("body").find(css_selector_1.GENERIC.CURRENT_USER_ID).length !== 0;
    if (!availableUserID && !errorMessage)
        errorMessage = "Successful request but user not logged in";
    // Return the result of the authentication
    const result = errorMessage.trim().length === 0 && availableUserID;
    const message = result ? AUTH_SUCCESSFUL_MESSAGE : errorMessage;
    const code = messageToCode(message);
    return new login_result_1.default(result, code, message.trim());
}
/**
 * Given the login message response of the
 * platform, return the login result code.
 */
function messageToCode(message) {
    // Prepare the lookup dict
    const mapDict = [
        {
            code: login_result_1.default.AUTH_SUCCESSFUL,
            message: AUTH_SUCCESSFUL_MESSAGE
        },
        {
            code: login_result_1.default.INCORRECT_CREDENTIALS,
            message: INCORRECT_CREDENTIALS_MESSAGE
        },
        {
            code: login_result_1.default.INCORRECT_2FA_CODE,
            message: INVALID_2FA_CODE_MESSAGE
        },
        {
            code: login_result_1.default.REQUIRE_CAPTCHA,
            message: REQUIRE_CAPTCHA_VERIFICATION
        }
    ];
    const result = mapDict.find((e) => e.message === message);
    return result ? result.code : login_result_1.default.UNKNOWN_ERROR;
}
/**
 * Manage the response given by the platform when the 2FA is required.
 */
function manage2faResponse(r) {
    // The html property exists only if the provider is wrong
    const rightProvider = !("html" in r.data);
    // Wrong provider!
    if (!rightProvider) {
        const $ = (0, cheerio_1.load)(r.data.html.content);
        const expectedProvider = $(css_selector_1.GENERIC.EXPECTED_2FA_PROVIDER).attr("value");
        return (0, result_1.failure)(expectedProvider);
    }
    // r.data.status is 'ok' if the authentication is successful
    const result = r.data.status === "ok";
    const message = result ? AUTH_SUCCESSFUL_MESSAGE : r.data.errors.join(",");
    const loginCode = messageToCode(message);
    return (0, result_1.success)(new login_result_1.default(result, loginCode, message));
}
//#endregion
