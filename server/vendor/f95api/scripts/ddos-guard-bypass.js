"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = addDDoSSupport;
// Public modules from npm
const axios_1 = __importDefault(require("axios"));
const tough_cookie_1 = require("tough-cookie");
// Modules from file
const errors_1 = require("./classes/errors");
const url_1 = require("./constants/url");
const shared_1 = __importDefault(require("./shared"));
/**
 * Allows `agent` to bypass the DDOS Guard protection service (https://ddos-guard.net/)
 */
function addDDoSSupport(agent) {
    agent.interceptors.request.use(async (config) => {
        // Check if the guard was already bypassed
        const bypassed = await checkIfAlreadyBypassed(config);
        if (!bypassed) {
            try {
                // Try to bypass the guard
                const result = await bypass(config.url);
                // Add header and cookies used to bypass DDoS Guard
                config.headers.referer = result.referer;
                result.cookies.map((c) => config.jar.setCookie(c, url_1.urls.BASE));
            }
            catch (e) {
                shared_1.default.logger.warn(`[DDoS Guard] Bypass skipped: ${e.message}`);
            }
        }
        return config;
    }, 
    /* c8 ignore start */
    (e) => {
        const message = `"${e.message}" occurred while trying to bypass DDoS Guard`;
        shared_1.default.logger.error(message);
        const error = new errors_1.GenericAxiosError({
            id: errors_1.ERROR_CODE.INTERCEPTOR_ERROR,
            message: message,
            error: e
        });
        return Promise.reject(error);
    }
    /* c8 ignore stop */
    );
}
/**
 * Connect to the URL protected by DDoS Guard obtaining the
 * bypass cookies and the referer url for the requested `url`
 */
async function bypass(url) {
    // Find referer URL and cookies
    const referer = await generateURLforReferer(url);
    // Using the referer url, find the ID of this user for the requested url
    const id = await getDDoSGuardID(referer.url, referer.cookies);
    // Obtains the cookies used to bypass the protection
    const bypassCookies = await getBypassCookies(referer.url, id, referer.cookies);
    // Add cookies used for the bypass to the list of cookies of the request
    const cookies = referer.cookies;
    cookies.push(...bypassCookies);
    return {
        referer: referer.url,
        cookies: cookies
    };
}
/**
 * Obtains the top domain for the requested `url` and the response cookies from DDoS Guard
 */
async function generateURLforReferer(url) {
    // Start by contacting the request page
    const response = await (0, axios_1.default)({
        url: url,
        validateStatus: function (status) {
            return [200, 403].includes(status);
        },
        headers: {
            Accept: "text/html",
            "Accept-Language": "en-US",
            Connection: "keep-alive",
            "Sec-Fetch-Dest": "document",
            "Sec-Fetch-Mode": "navigate",
            "Sec-Fetch-Site": "none",
            "Sec-Fetch-User": "?1",
            TE: "trailers",
            DNT: "1"
        }
    });
    // Get the response cookies from the request
    const cookies = response.headers["set-cookie"].map((c) => tough_cookie_1.Cookie.parse(c));
    shared_1.default.logger.trace("[DDoS Guard] Parsed cookies of first request");
    // Find referer URL
    const endSlice = url.includes("://") ? 3 : 1;
    const domain = url.split("/").slice(0, endSlice).join("/");
    shared_1.default.logger.trace(`[DDoS Guard] Extracted domain to refer "${domain}"`);
    return {
        url: domain,
        cookies: cookies
    };
}
/**
 * For the specified `url` obtains the one-time associated ID.
 */
async function getDDoSGuardID(url, cookies) {
    // Contact the company page to get the ID requested
    const response = await (0, axios_1.default)({
        url: "https://check.ddos-guard.net/check.js",
        headers: {
            Accept: "*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            Referer: url,
            Cookie: cookieString(cookies),
            "Sec-Fetch-Dest": "script",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site"
        }
    });
    // Gets the user ID for the search page
    const id = response.data.split(`'/.well-known/ddos-guard/id/`)[1].split(`'`)[0];
    shared_1.default.logger.trace(`[DDoS Guard] Retrived id for this URL: "${id}"`);
    return id;
}
/**
 * Obtains cookies that define the agent as "reliable"
 */
async function getBypassCookies(url, id, cookies) {
    // Contact the URL generated to obtain cookies needed for protection bypass
    const response = await (0, axios_1.default)({
        url: new URL(`/.well-known/ddos-guard/id/${id}`, url).toString(),
        validateStatus: function (status) {
            return [200, 404].includes(status);
        },
        headers: {
            Accept: "image/webp,*/*",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "Cache-Control": "no-cache",
            Referer: url,
            Cookie: cookieString(cookies),
            "Sec-Fetch-Dest": "script",
            "Sec-Fetch-Mode": "no-cors",
            "Sec-Fetch-Site": "cross-site"
        }
    });
    if (response.status === 404) {
        shared_1.default.logger.warn("[DDoS Guard] ID endpoint returned 404, continuing without extra bypass cookies");
        return [];
    }
    shared_1.default.logger.trace(`[DDoS Guard] Retrived final cookies from id request`);
    return (response.headers["set-cookie"] ?? []).map((c) => tough_cookie_1.Cookie.parse(c));
}
/**
 * COnvert an array of cookies into a string.
 */
function cookieString(cookies) {
    return cookies.map((c) => c.cookieString()).join(" ");
}
/**
 * Check if a request already contains cookies used to bypass DDoS Guard protection.
 * @param config Configuration of the request
 */
async function checkIfAlreadyBypassed(config) {
    // Constant used to determine if the agent has already
    // done at least one connection to bypass the DDoS Guard
    const BYPASS_STRING = "DDOS_GUARD_BYPASSED";
    // Check the cookies, if present
    if (!config[BYPASS_STRING]) {
        // Get all cookies referred to f95zone.to domain
        const cookies = await config.jar.getCookies(url_1.urls.BASE);
        // Get the DDoS cookies
        const ddgCookies = cookies.filter((c) => c.key.startsWith("__ddg"));
        // Check if the cookies are expired
        const expired = (cookie) => cookie.TTL() === 0;
        const invalid = ddgCookies.some(expired);
        // Set the bypass string if all the cookies are valid
        if (!invalid && ddgCookies.length > 0)
            config[BYPASS_STRING] = true;
    }
    return config[BYPASS_STRING] ?? false;
}
