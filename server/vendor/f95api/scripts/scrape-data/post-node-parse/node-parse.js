"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = parseCheerioNode;
// Modules from file
const css_selector_1 = require("../../constants/css-selector");
const node_type_1 = require("./node-type");
const node_utility_1 = require("./node-utility");
/**
 * Given a Cheerio node, it extracts the information into an IPostElement structure.
 */
function parseCheerioNode($, node) {
    // Function mapping
    const functionMap = {
        Text: (node) => parseCheerioTextNode(node),
        Spoiler: (node) => parseCheerioSpoilerNode(node),
        Link: (node) => parseCheerioLinkNode(node)
    };
    // Get the type of node
    const type = (0, node_type_1.nodeType)($, node);
    // Get the post based on the type of node
    const obj = Object.keys(functionMap).includes(type)
        ? functionMap[type]($(node))
        : (0, node_utility_1.createEmptyElement)();
    // Remove invisible characters from strings
    obj.text = (0, node_utility_1.cleanTextFromInvisibleCharacters)(obj.text);
    obj.name = (0, node_utility_1.cleanTextFromInvisibleCharacters)(obj.name);
    return obj;
}
/**
 * Process a spoiler element by getting its text broken
 * down by any other spoiler elements present.
 */
function parseCheerioSpoilerNode(node) {
    // A spoiler block is composed of a div with class "bbCodeSpoiler",
    // containing a div "bbCodeSpoiler-content" containing, in cascade,
    // a div with class "bbCodeBlock--spoiler" and a div with class "bbCodeBlock-content".
    // This last tag contains the required data.
    // Local variables
    const spoiler = {
        type: "Spoiler",
        name: "",
        text: "",
        content: []
    };
    // Find the title of the spoiler (contained in the button)
    const name = node.find(css_selector_1.POST.SPOILER_NAME)?.first();
    spoiler.name = name ? name.text().trim() /* c8 ignore next */ : "";
    return spoiler;
}
/**
 * Process a node that contains a link or image.
 */
function parseCheerioLinkNode(element) {
    // Local variable
    const link = {
        type: "Link",
        name: "",
        text: "",
        href: "",
        content: []
    };
    if (element.is("img")) {
        link.type = "Image";
        link.text = element.attr("alt") ?? "";
        link.href = element.attr("data-src");
    }
    else if (element.is("a")) {
        link.type = "Link";
        link.text = element.text().replace(/\s\s+/g, " ").trim();
        link.href = element.attr("href");
    }
    return link;
}
/**
 * Process a text only node.
 */
function parseCheerioTextNode(node) {
    const content = {
        type: "Text",
        name: "",
        text: getCheerioNonChildrenText(node),
        content: []
    };
    return content;
}
/**
 * Gets the text of the node only, excluding child nodes.
 * Also includes formatted text elements (i.e. `<b>`).
 */
function getCheerioNonChildrenText(node) {
    // Get text
    const text = node.first().text();
    // Clean and return the text
    return text.replace(/\s\s+/g, " ").trim();
}
