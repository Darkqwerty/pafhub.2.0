"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Modules from files
const generic_1 = require("../../constants/generic");
const basic_1 = __importDefault(require("./basic"));
class Game extends basic_1.default {
    //#region Properties
    censored = false;
    engine = "Ren'Py";
    genre = [];
    installation = "";
    language = [];
    lastRelease = generic_1.DEFAULT_DATE;
    os = [];
    status = "Ongoing";
    version = "";
    //#endregion Properties
    constructor(init) {
        super();
        Object.assign(this, init);
    }
}
exports.default = Game;
