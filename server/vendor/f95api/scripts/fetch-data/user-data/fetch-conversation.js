"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = fetchPageConversations;
// Public modules from npm
const cheerio_1 = require("cheerio");
const iso_datestring_validator_1 = require("iso-datestring-validator");
// Modules from files
const css_selector_1 = require("../../constants/css-selector");
const url_1 = require("../../constants/url");
/**
 * Process a page containing a list of conversations
 * returning a list of elements that follow the
 * `IConversation` interface.
 * @param html HTML source code of a page that contains a list of conversations
 */
async function fetchPageConversations(html) {
    // Load the HTML string of the page
    const $ = (0, cheerio_1.load)(html);
    // Find the bodies of the conversations
    const bodies = $(css_selector_1.CONVERSATION.BODIES);
    // Parse every element in bodies
    return bodies.get().map((body) => parseConversationElement($(body)));
}
/**
 * Process a single node containing information
 * about a conversation by returning an element
 * that follows the `IConversation` interface.
 */
function parseConversationElement(e) {
    // Define the conversation element to return
    const conversation = {};
    // Check if the conversation has unread messages
    conversation.unread = e.attr("is-unread") !== undefined;
    // Find the URL of the conversation
    const partialURL = e.find(css_selector_1.CONVERSATION.TITLE).attr("href").trim();
    conversation.url = new URL(partialURL, url_1.urls.BASE).toString();
    conversation.title = e.find(css_selector_1.CONVERSATION.TITLE).text().trim();
    // Parse numeric data
    const sAuthorID = e.find(css_selector_1.CONVERSATION.AUTHOR).attr("data-user-id");
    conversation.authorid = parseInt(sAuthorID, 10);
    const sLastResponseUserID = e.find(css_selector_1.CONVERSATION.LAST_RESPONSE_USER).attr("data-user-id");
    conversation.lastResponseUser = parseInt(sLastResponseUserID, 10);
    conversation.lastRecipients = e
        .find(css_selector_1.CONVERSATION.LAST_RECIPIENTS)
        .get()
        .map((recipient) => recipient.attribs["data-user-id"])
        .map((s) => parseInt(s, 10));
    const sReplies = e.find(css_selector_1.CONVERSATION.REPLIES).text().trim();
    conversation.replies = parseInt(sReplies, 10);
    const sPartecipants = e.find(css_selector_1.CONVERSATION.PARTECIPANTS).text().trim();
    conversation.partecipants = parseInt(sPartecipants, 10);
    // Parse dates
    const sCreationDate = e.find(css_selector_1.CONVERSATION.START_DATE).attr("datetime");
    conversation.creation =
        sCreationDate && (0, iso_datestring_validator_1.isValidISODateString)(sCreationDate) ? new Date(sCreationDate) : null;
    const sLastResponseDate = e.find(css_selector_1.CONVERSATION.LAST_RESPONSE_TIME).attr("datetime");
    conversation.lastResponseTime =
        sLastResponseDate && (0, iso_datestring_validator_1.isValidISODateString)(sLastResponseDate)
            ? new Date(sLastResponseDate)
            : null;
    return conversation;
}
