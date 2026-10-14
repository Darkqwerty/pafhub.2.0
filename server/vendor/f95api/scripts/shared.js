"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* c8 ignore start */
// Core modules
const os_1 = require("os");
const path_1 = require("path");
// Public modules from npm
const log4js_api_1 = __importDefault(require("@log4js-node/log4js-api"));
// Modules from file
const session_1 = __importDefault(require("./classes/session"));
/**
 * Class containing variables shared between modules.
 */
class Shared {
    //#region Fields
    static _isLogged = false;
    static _prefixes = {};
    static _logger = log4js_api_1.default.getLogger();
    static _session = new session_1.default((0, path_1.join)((0, os_1.tmpdir)(), "f95session.json"));
    //#endregion Fields
    //#region Getters
    /**
     * Indicates whether a user is logged in to the F95Zone platform or not.
     */
    static get isLogged() {
        return this._isLogged;
    }
    /**
     * List of platform prefixes and tags.
     */
    static get prefixes() {
        return this._prefixes;
    }
    /**
     * Logger object used to write to both file and console.
     */
    static get logger() {
        return this._logger;
    }
    /**
     * Path to the cache used by this module wich contains engines, statuses, tags...
     */
    static get cachePath() {
        return (0, path_1.join)((0, os_1.tmpdir)(), "f95cache.json");
    }
    /**
     * Session on the F95Zone platform.
     */
    static get session() {
        return this._session;
    }
    //#endregion Getters
    //#region Setters
    static setPrefixPair(key, val) {
        this._prefixes[key] = val;
    }
    static setIsLogged(val) {
        this._isLogged = val;
    }
}
exports.default = Shared;
/* c8 ignore stop */
