"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const basic_1 = __importDefault(require("./basic"));
class Animation extends basic_1.default {
    //#region Properties
    censored = false;
    genre = [];
    installation = "";
    language = [];
    length = "";
    pages = "";
    resolution = [];
    //#endregion Properties
    constructor(init) {
        super();
        Object.assign(this, init);
    }
}
exports.default = Animation;
