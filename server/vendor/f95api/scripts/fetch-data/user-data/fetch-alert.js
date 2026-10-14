"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = fetchAlertElements;
// Public modules from npm
const cheerio_1 = require("cheerio");
const css_selector_1 = require("../../constants/css-selector");
const url_1 = require("../../constants/url");
const network_helper_1 = require("../../network-helper");
/**
 * Gets alert data starting from the source code of the page passed by parameter.
 */
async function fetchAlertElements(html) {
    // Local variables
    const $ = (0, cheerio_1.load)(html);
    // Find all the bodies of the alerts in the page
    const bodies = $(css_selector_1.ALERT.BODIES).toArray();
    // Now find all the summarized alerts and parse them
    const summarizedPosts = bodies.filter((el) => isSummarized($, el));
    /* c8 ignore next */
    const summarizedPromises = summarizedPosts.map((el) => {
        // Find the URL
        const partialURL = $(el).find(css_selector_1.ALERT.SUMMARIZED_SEPARATE_ALERTS).attr("href");
        return fetchSummarizedAlerts(partialURL);
    });
    // Find all the NON summarized alerts
    const alerts = bodies
        .filter((el) => !summarizedPosts.includes(el))
        .map((el) => parseAlertElement($, el));
    // Wait for all the promises to finish then flat the list
    const listToFlatten = await Promise.all(summarizedPromises);
    return [].concat(...listToFlatten).concat(alerts);
}
/**
 * Indicates whether the requested element is summarized,
 * ie if it is a grouping of other alerts.
 */
function isSummarized($, el) {
    return $(el).find(css_selector_1.ALERT.SUMMARIZED_BUTTON).length === 1;
}
/**
 * Given the partial URL of a summarized alert, it obtains the data of all summarized alerts.
 */
/* c8 ignore start */
async function fetchSummarizedAlerts(partialURL) {
    // Find the URL
    const url = new URL(partialURL, url_1.urls.BASE);
    // Fetch the new page
    const response = await (0, network_helper_1.fetchHTML)(url.toString());
    // Fetch the alerts
    if (response.isSuccess())
        return await fetchAlertElements(response.value);
    else
        throw response.value;
}
/* c8 ignore stop */
/**
 * Given the text message identifies the type of alert.
 */
function parseAlertType(text) {
    // Keywords to define alert types
    const RATING = "RATED";
    const REPLY = "REPLIED";
    const REACTION = "REACTED";
    const QUOTE = "QUOTED";
    const TROPHY = "YOU HAVE BEEN AWARDED A TROPHY";
    // Prepare the text
    const t = text.trim().toUpperCase();
    // Function map
    /* c8 ignore next */
    const functionMap = {
        Rating: (t) => t.includes(RATING),
        Reply: (t) => t.includes(REPLY),
        Reaction: (t) => t.includes(REACTION),
        Quote: (t) => t.includes(QUOTE),
        Award: (t) => t.includes(TROPHY)
    };
    // Parse and return the type of the node
    const result = Object.keys(functionMap).find((e) => functionMap[e](t));
    return result ? result : "Unknown";
}
/**
 * Given the text value of the reaction to a post returns
 * the value suitable for the `TAlertReactionType` type.
 */
function parseReactionTypeFromAlert(text) {
    // Keywords to define reaction types
    const LIKE = "LIKE";
    const HEY_THERE = "HEY THERE";
    const LOVE = "LOVE";
    const JIZZED = "I JUST JIZZED MY PANTS";
    const HEARTH = "HEARTH";
    const YAY = "YAY, NEW UPDATE!";
    const HAHA = "HAHA";
    const SAD = "SAD";
    const THINKING = "THINKING FACE";
    const FACEPALM = "FACEPALM";
    const WOW = "WOW";
    // Prepare the text
    const t = text.trim().toUpperCase();
    // Function map
    /* c8 ignore next */
    const functionMap = {
        Like: (t) => t.includes(LIKE),
        HeyThere: (t) => t.includes(HEY_THERE),
        Love: (t) => t.includes(LOVE),
        Jizzed: (t) => t.includes(JIZZED),
        Hearth: (t) => t.includes(HEARTH),
        Yay: (t) => t.includes(YAY),
        Haha: (t) => t.includes(HAHA),
        Sad: (t) => t.includes(SAD),
        Thinking: (t) => t.includes(THINKING),
        Facepalm: (t) => t.includes(FACEPALM),
        Wow: (t) => t.includes(WOW)
    };
    // Parse and return the type of the node
    const result = Object.keys(functionMap).find((e) => functionMap[e](t));
    return result ? result : null;
}
/**
 * Parse a Cheerio node containing an alert in order to obtains its data.
 * @param $ Cheerio root identifing the page where the element is in
 * @param el Element to parse
 */
function parseAlertElement($, el) {
    // Find the ID of the user that caused the alert
    const sid = $(el).find(css_selector_1.ALERT.ACTOR).attr("data-user-id");
    // Find the referenced URL
    const partial = $(el).find(css_selector_1.ALERT.REFERENCE_PAGE).attr("href");
    const url = new URL(partial, url_1.urls.BASE).toString();
    // Find the reaction type (if any)
    const reactionText = $(el).find(css_selector_1.ALERT.REACTION).text();
    // Find the alert date
    const isotime = $(el).find(css_selector_1.ALERT.ALERT_TIME).attr("datetime");
    // Return as array so if there are summarized alerts we can flatten at the end
    return {
        type: parseAlertType($(el).text()),
        userid: parseInt(sid, 10),
        linkedURL: url,
        reaction: reactionText ? parseReactionTypeFromAlert(reactionText) : null,
        date: new Date(isotime),
        read: $(el).find(css_selector_1.ALERT.MARK_UNREAD_BUTTON).length === 1
    };
}
