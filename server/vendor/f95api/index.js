"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchHandiwork = exports.ThreadSearchQuery = exports.LatestSearchQuery = exports.HandiworkSearchQuery = exports.UserProfile = exports.Thread = exports.Post = exports.PlatformUser = exports.Handiwork = exports.Game = exports.Comic = exports.Asset = exports.Animation = exports.PrefixParser = void 0;
exports.isLogged = isLogged;
exports.loggerLevel = loggerLevel;
exports.setLoggerLevel = setLoggerLevel;
// Modules from file
const shared_1 = __importDefault(require("./scripts/shared"));
//#region Re-export classes
var prefix_parser_1 = require("./scripts/classes/prefix-parser");
Object.defineProperty(exports, "PrefixParser", { enumerable: true, get: function () { return __importDefault(prefix_parser_1).default; } });
var animation_1 = require("./scripts/classes/handiwork/animation");
Object.defineProperty(exports, "Animation", { enumerable: true, get: function () { return __importDefault(animation_1).default; } });
var asset_1 = require("./scripts/classes/handiwork/asset");
Object.defineProperty(exports, "Asset", { enumerable: true, get: function () { return __importDefault(asset_1).default; } });
var comic_1 = require("./scripts/classes/handiwork/comic");
Object.defineProperty(exports, "Comic", { enumerable: true, get: function () { return __importDefault(comic_1).default; } });
var game_1 = require("./scripts/classes/handiwork/game");
Object.defineProperty(exports, "Game", { enumerable: true, get: function () { return __importDefault(game_1).default; } });
var handiwork_1 = require("./scripts/classes/handiwork/handiwork");
Object.defineProperty(exports, "Handiwork", { enumerable: true, get: function () { return __importDefault(handiwork_1).default; } });
var platform_user_1 = require("./scripts/classes/mapping/platform-user");
Object.defineProperty(exports, "PlatformUser", { enumerable: true, get: function () { return __importDefault(platform_user_1).default; } });
var post_1 = require("./scripts/classes/mapping/post");
Object.defineProperty(exports, "Post", { enumerable: true, get: function () { return __importDefault(post_1).default; } });
var thread_1 = require("./scripts/classes/mapping/thread");
Object.defineProperty(exports, "Thread", { enumerable: true, get: function () { return __importDefault(thread_1).default; } });
var user_profile_1 = require("./scripts/classes/mapping/user-profile");
Object.defineProperty(exports, "UserProfile", { enumerable: true, get: function () { return __importDefault(user_profile_1).default; } });
var handiwork_search_query_1 = require("./scripts/classes/query/handiwork-search-query");
Object.defineProperty(exports, "HandiworkSearchQuery", { enumerable: true, get: function () { return __importDefault(handiwork_search_query_1).default; } });
var latest_search_query_1 = require("./scripts/classes/query/latest-search-query");
Object.defineProperty(exports, "LatestSearchQuery", { enumerable: true, get: function () { return __importDefault(latest_search_query_1).default; } });
var thread_search_query_1 = require("./scripts/classes/query/thread-search-query");
Object.defineProperty(exports, "ThreadSearchQuery", { enumerable: true, get: function () { return __importDefault(thread_search_query_1).default; } });
/**
 * Set the logger level for module debugging.
 */
function setLoggerLevel(level) {
    shared_1.default.logger.level = level;
}
/**
 * Indicates the current logging level.
 */
function loggerLevel() {
    return shared_1.default.logger.level;
}
/**
 * Indicates whether the current session is authenticated.
 */
function isLogged() {
    return shared_1.default.isLogged;
}
setLoggerLevel("warn"); // By default log only the warn messages
//#endregion Export properties
//#region Re-export methods
__exportStar(require("./scripts/handiwork-from-url"), exports);
__exportStar(require("./scripts/login"), exports);
__exportStar(require("./scripts/updates"), exports);
var search_1 = require("./scripts/search");
Object.defineProperty(exports, "searchHandiwork", { enumerable: true, get: function () { return __importDefault(search_1).default; } });
//#endregion Re-export methods
