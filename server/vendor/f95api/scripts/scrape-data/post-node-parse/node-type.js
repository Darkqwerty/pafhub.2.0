"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.nodeType = nodeType;
const domelementtype_1 = require("domelementtype");
/**
 * Identify the type of node passed by parameter.
 */
function nodeType($, node) {
    // !!! Cheerio Element type is a Node type with children !!!
    const element = node;
    // Function map
    const functionMap = {
        Text: (node) => isTextNode(node) && !isFormattingNode(node) && !isImageTextNode(node),
        Formatted: (node) => isFormattingNode(node),
        Spoiler: (node) => isSpoilerNode($(node)),
        Link: (node) => isLinkNode(node),
        List: (node) => isListNode(node),
        Noscript: (node) => isNoScriptNode(node)
    };
    // Parse and return the type of the node
    const result = Object.keys(functionMap).find((e) => functionMap[e](element));
    return result ? result : "Unknown";
}
//#region Utility
/**
 * Check if the node passed as a parameter is a formatting one (i.e. `<b>`).
 */
function isFormattingNode(node) {
    const formattedTags = ["b", "i"];
    return node.type === domelementtype_1.ElementType.Tag && formattedTags.includes(node.name);
}
/**
 * Check if the node passed as a parameter is of text type.
 */
function isTextNode(node) {
    return node.type === domelementtype_1.ElementType.Text;
}
/**
 * Check if the node is a spoiler.
 */
function isSpoilerNode(node) {
    return node.attr("class") === "bbCodeSpoiler";
}
/**
 * Check if the node is a link or a image.
 */
function isLinkNode(node) {
    return node.type === domelementtype_1.ElementType.Tag && (node.name === "a" || node.name === "img");
}
/**
 * Check if the node is a `noscript` tag.
 */
function isNoScriptNode(node) {
    return node.type === domelementtype_1.ElementType.Tag && node.name === "noscript";
}
/**
 * Check if the node is a list element, i.e. `<li>` or `<ul>` tag.
 */
function isListNode(node) {
    return node.type === domelementtype_1.ElementType.Tag && (node.name === "ul" || node.name === "li");
}
/**
 * Check if the element is textual and nestled in a `noscript` tag.
 */
function isImageTextNode(node) {
    return node.type === domelementtype_1.ElementType.Text && isNoScriptNode(node.parent);
}
//#endregion Utility
