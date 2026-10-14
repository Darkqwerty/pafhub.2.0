"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.isPostElementUnknown = isPostElementUnknown;
exports.isPostElementEmpty = isPostElementEmpty;
exports.cleanElement = cleanElement;
exports.cleanTextFromInvisibleCharacters = cleanTextFromInvisibleCharacters;
exports.createEmptyElement = createEmptyElement;
/**
 * Check if the node has non empty `name` and `text`.
 */
function isPostElementUnknown(node) {
    return node.name.trim() === "" && node.text.trim() === "";
}
/**
 * Check if the node is defined and has a non empty
 * property between `name`, `text` and `content`.
 */
function isPostElementEmpty(node) {
    return node && node.content.length === 0 && isPostElementUnknown(node);
}
/**
 * Clean the element `name` and `text` removing initial and final special characters.
 */
function cleanElement(element) {
    // Local variables
    const shallow = Object.assign({}, element);
    const specialCharSet = /[-!$%^&*()_+|~=`{}[\]:";'<>?,./]+/;
    const startsWithSpecialCharsRegex = new RegExp("^" + specialCharSet.source);
    const endsWithSpecialCharsRegex = new RegExp(specialCharSet.source + "$");
    shallow.name = shallow.name
        .replace(startsWithSpecialCharsRegex, "")
        .replace(endsWithSpecialCharsRegex, "")
        .trim();
    shallow.text = shallow.text
        .replace(startsWithSpecialCharsRegex, "")
        .replace(endsWithSpecialCharsRegex, "")
        .trim();
    return shallow;
}
/**
 * Removes all invisible characters from the string,
 * such as control characters or the Zero Width Space.
 */
function cleanTextFromInvisibleCharacters(s) {
    // eslint-disable-next-line no-control-regex
    return s.replace(/[\u0000-\u001F\u007F-\u009F\u200B]/gmu, "");
}
/**
 * Create a `IPostElement` without name, text or content.
 */
function createEmptyElement() {
    return {
        type: "Empty",
        name: "",
        text: "",
        content: []
    };
}
