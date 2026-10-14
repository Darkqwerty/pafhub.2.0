"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createAxiosAgent;
// Core modules
const package_json_1 = require("../package.json");
// Local modules
const shared_1 = __importDefault(require("./shared"));
// Public modules from npm
const axios_1 = __importDefault(require("axios"));
const axios_retry_1 = __importDefault(require("axios-retry"));
const axios_cookiejar_support_1 = require("axios-cookiejar-support");
const url_1 = require("./constants/url");
/**
 * Explicit the HTTP adapter otherwise on Electron the XHR adapter
 * is used which is not supported by `axios-cookiejar-support`
 *
 * From v1.0, the adapters are not exposed to API, waiting for patch...
 */
axios_1.default.defaults.adapter = require("axios/lib/adapters/http");
/**
 * User agent string used to describe this API.
 */
const USER_AGENT = `Mozilla/5.0 (compatible; F95API/${package_json_1.version}; MillenniumEarl@f95zone; https://github.com/MillenniumEarl/F95API)`;
/**
 * Common configuration used to send request via Axios.
 */
const commonConfig = {
    /**
     * This URL will be used as a base for every request to a non-complete URL.
     */
    baseURL: url_1.urls.BASE,
    /**
     * Headers to add to the request.
     */
    headers: {
        "User-Agent": USER_AGENT,
        Connection: "keep-alive",
        "Upgrade-Insecure-Requests": "1"
    },
    /**
     * Specify if send credentials along the request.
     */
    withCredentials: true,
    /**
     * Jar of cookies to send along the request.
     */
    jar: shared_1.default.session.cookieJar,
    validateStatus: function (status) {
        return status < 500; // Resolve only if the status code is less than 500
    },
    /**
     * Maximum number of milliseconds to wait for a response.
     */
    timeout: 30000
};
/**
 * Create a custom Axios agent already configurated.
 */
function createAxiosAgent() {
    // Create the agent with the custom configuration
    let agent = axios_1.default.create(commonConfig);
    // Add support for cookies with tough-cookies
    agent = (0, axios_cookiejar_support_1.wrapper)(agent);
    // Enable Axios to retry a request in case of errors
    (0, axios_retry_1.default)(agent, {
        retryDelay: axios_retry_1.default.exponentialDelay, // Use exponential back-off retry delay
        shouldResetTimeout: true // Timer resets after every retry
    });
    return agent;
}
