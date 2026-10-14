"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
// Modules from files
const generic_1 = require("../../constants/generic");
class Basic {
    //#region Properties
    authors = [];
    category = "games";
    changelog = [];
    cover = "";
    id = -1;
    lastThreadUpdate = generic_1.DEFAULT_DATE;
    name = "";
    overview = "";
    prefixes = [];
    rating = undefined;
    tags = [];
    threadPublishingDate = generic_1.DEFAULT_DATE;
    url = "";
    //#endregion Properties
    constructor(init) {
        Object.assign(this, init);
    }
    cast(src) {
        Object.entries(src) // Obtains all the key from the source object
            .filter(([key]) => key in this) // Get all the keys that are in both the objects
            .map(([key, val]) => (this[key] = val)); // Save the key in this object
        return this;
    }
}
exports.default = Basic;
