"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = getHandiworkInformation;
const thread_1 = __importDefault(require("../classes/mapping/thread"));
const shared_1 = __importDefault(require("../shared"));
const handiwork_1 = __importDefault(require("../classes/handiwork/handiwork"));
const network_helper_1 = require("../network-helper");
const ot_metadata_values_1 = require("../constants/ot-metadata-values");
const utils_1 = require("../utils");
/**
 * Gets information of a particular handiwork from its thread.
 *
 * If you don't want to specify the object type, use `HandiWork`.
 * @param {new () => T} type Handiwork class to use for casting the result.
 */
async function getHandiworkInformation(arg, type) {
    // Get thread
    const thread = await getThread(arg);
    shared_1.default.logger.info(`Obtaining handiwork from ${thread.url}`);
    // Obtains the prefixes from the thread
    const extracted = extractPrefixes(thread.prefixes, thread.category);
    // Fetch info from opening post
    const post = await thread.getPost(1);
    if (!post)
        throw new Error("Cannot find opening thread");
    const postData = extractPostData(post.body);
    // On older game template the version is not
    // specified in the OP, so we need to parse
    // it from the title
    if (!postData.version || postData.version === "") {
        const authors = postData.authors;
        const version = getVersionFromHeadline(thread.headline, authors);
        postData.version = version;
    }
    // Build the handiwork from the parsed and/or extracted data
    const hw = new handiwork_1.default({
        id: thread.id,
        url: thread.url,
        name: thread.title,
        category: thread.category,
        threadPublishingDate: thread.publication,
        lastThreadUpdate: thread.modified,
        tags: thread.tags,
        rating: thread.rating,
        prefixes: extracted.prefixes,
        status: extracted.status,
        engine: extracted.engine,
        version: postData.version,
        overview: postData.overview,
        os: postData.os,
        language: postData.language,
        installation: postData.installation,
        pages: postData.pages,
        resolution: postData.os,
        length: postData.length,
        genre: postData.genre,
        censored: postData.censored,
        lastRelease: postData.lastRelease,
        authors: postData.authors,
        changelog: postData.changelog,
        cover: postData.cover
    });
    // Cast and return the object
    const castingObject = new type();
    castingObject.cast(hw);
    return castingObject;
}
//#region Private methods
//#region Utilities
/**
 * Extracts the work's unique ID from its URL.
 */
/* c8 ignore start */
function extractIDFromURL(url) {
    shared_1.default.logger.trace("Extracting ID from URL...");
    // Validate URL
    if (!(0, network_helper_1.isStringAValidURL)(url))
        throw new URIError(`'${url}' is not a valid URL`);
    // URL are in the format https://f95zone.to/threads/GAMENAME-VERSION-DEVELOPER.ID/
    // or https://f95zone.to/threads/ID/
    const match = url.match(/((?<=\/|\.)(\d+)(?=\/{0,1}))(?!\w)/i);
    if (!match)
        return -1;
    // Parse and return number
    return parseInt(match[0], 10);
}
/* c8 ignore stop */
/**
 * Makes an array of strings uppercase.
 */
function toUpperCaseArray(a) {
    /**
     * Makes a string uppercase.
     */
    function toUpper(s) {
        return s.toUpperCase();
    }
    return a.map(toUpper);
}
/**
 * Check if the string `s` is in the dict `a`.
 *
 * Case insensitive.
 */
function stringInDict(s, a) {
    // Make uppercase all the strings in the array
    const values = toUpperCaseArray(Array.from(a.values()));
    return values.includes(s.toUpperCase());
}
/**
 * Convert a string to a boolean.
 *
 * Check also for `yes`/`no` and `1`/`0`.
 */
function stringToBoolean(s) {
    // Local variables
    const positiveTerms = ["true", "yes", "1"];
    const negativeTerms = ["false", "no", "0"];
    const cleanString = s.toLowerCase().trim();
    let result = Boolean(s);
    if (positiveTerms.includes(cleanString))
        result = true;
    else if (negativeTerms.includes(cleanString))
        result = false;
    return result;
}
/**
 * Gets the first non-null element having one of
 * the specified ones as a name or `undefined`.
 *
 * Case-insensitive.
 */
function getPostElementByName(elements, searchValue) {
    // Inside function used to find the element with the given name
    function findElement(es, name) {
        return es.find((e) => e.name.toUpperCase() === name.toUpperCase());
    }
    // Find the elements with the given names, filter
    // for "undefined" and return the first element or
    // "undefined" if no element is found
    return searchValue
        .map((name) => findElement(elements, name))
        .filter((post) => post !== undefined)
        .shift();
}
//#endregion Utilities
/**
 * Obtains the a `Thread` object from the argument.
 */
async function getThread(t) {
    // Local variable
    let thread = null;
    // Fetch thread data
    /* c8 ignore start */
    if (typeof t === "string") {
        const id = extractIDFromURL(t);
        thread = new thread_1.default(id);
        await thread.fetch();
    }
    else
        thread = t;
    /* c8 ignore stop */
    return thread;
}
/**
 * Given the headline of a thread, return the
 * version without the trailing `v` (if any).
 *
 * If no version is found, return an empty string.
 */
function getVersionFromHeadline(headline, authors) {
    // Find all the elements in the square brackets (version and author)
    const matches = headline.match(/(?<=\[)(.*?)(?=\])/g);
    if (!matches)
        return "";
    // Parse the matches to ignore the author
    let version = matches
        .map((match) => {
        const isAuthor = authors
            .map((a) => a.name.toUpperCase()) // Get all the author's names
            .some((name) => match.toUpperCase().includes(name)); // Check if the current match is an author
        return isAuthor ? null : match;
    })
        .filter((v) => v !== null)
        .shift();
    // Remove trailing "v" if any
    version = version ?? ""; // Avoid `null` version
    const hasTrailingV = version?.match(/^[v|V](?=\d)/i)?.length !== 0;
    version = hasTrailingV ? version : version.replace("v", "");
    return version;
}
/**
 * Parse the post prefixes.
 *
 * In particular, it elaborates the following prefixes for games:
 * `Engine`, `Status`, `Mod`.
 */
function extractPrefixes(prefixes, category) {
    shared_1.default.logger.trace("Parsing prefixes...");
    // Local variables
    let engine = null;
    let status = null;
    const parsedPrefixes = [];
    for (const item of prefixes) {
        // Remove the square brackets
        const prefix = item.replace("[", "").replace("]", "");
        // Check what the prefix indicates
        if (stringInDict(prefix, shared_1.default.prefixes["engines"]))
            engine = prefix;
        else if (stringInDict(prefix, shared_1.default.prefixes["statuses"]))
            status = prefix;
        // Anyway add the prefix to list
        parsedPrefixes.push(prefix);
    }
    // If the status is not set, then the game is in development (Ongoing)
    status = status && category === "games" ? status : "Ongoing";
    return {
        status: status,
        engine: engine,
        prefixes: parsedPrefixes
    };
}
/**
 * Extract HandiWork data from the main post of the HandiWork's page.
 *
 * The values that will be added are:
 * `Overview`, `OS`, `Language`, `Version`, `Installation`,
 * `Pages`, `Resolution`, `Lenght`, `Genre`, `Censored`,
 * `LastRelease`, `Authors`, `Changelog`, `Cover`.
 */
function extractPostData(elements) {
    /**
     * Groups the values extracted from the post.
     */
    const extracted = {};
    // Helper methods
    const getTextFromElement = (metadata) => getPostElementByName(elements, metadata)?.text ?? "";
    const parseArrayOfStrings = (metadata, separator = ",") => getTextFromElement(metadata)
        ?.split(separator)
        .map((s) => s.trim())
        .filter((s) => s !== "") ?? [];
    // First fill the "simple" elements
    extracted.cover = getPostElementByName(elements, ot_metadata_values_1.metadata.COVER)?.href;
    extracted.version = getTextFromElement(ot_metadata_values_1.metadata.VERSION);
    extracted.installation = getTextFromElement(ot_metadata_values_1.metadata.INSTALLATION);
    extracted.pages = getTextFromElement(ot_metadata_values_1.metadata.PAGES);
    extracted.length = getTextFromElement(ot_metadata_values_1.metadata.LENGTH);
    extracted.overview = getTextFromElement(ot_metadata_values_1.metadata.OVERVIEW);
    extracted.os = parseArrayOfStrings(ot_metadata_values_1.metadata.OS);
    extracted.language = parseArrayOfStrings(ot_metadata_values_1.metadata.LANGUAGE);
    extracted.resolution = parseArrayOfStrings(ot_metadata_values_1.metadata.RESOLUTION);
    extracted.genre = parseArrayOfStrings(ot_metadata_values_1.metadata.GENRE);
    // Parse the censorship
    const censored = getTextFromElement(ot_metadata_values_1.metadata.CENSORED);
    if (censored)
        extracted.censored = stringToBoolean(censored);
    // Get the release date
    const releaseDateText = getTextFromElement(ot_metadata_values_1.metadata.RELEASE);
    const releaseDate = (0, utils_1.getDateFromString)(releaseDateText);
    if (releaseDate)
        extracted.lastRelease = releaseDate;
    // Get the author
    extracted.authors = parseAuthor(elements);
    // Get the changelog
    extracted.changelog = parseChangelog(elements);
    return extracted;
}
/**
 * Parse the author from the post's data.
 */
function parseAuthor(elements) {
    // Local variables
    const author = {
        name: "",
        platforms: []
    };
    // Fetch the authors from the post data
    const authorElement = getPostElementByName(elements, ot_metadata_values_1.metadata.AUTHOR);
    if (authorElement) {
        // Set the author name
        author.name = authorElement.text;
        // Add the found platforms
        authorElement.content
            .filter((e) => e.href)
            .forEach((e) => {
            // Create and push the new platform
            const platform = {
                name: e.text,
                link: e.href
            };
            author.platforms.push(platform);
        });
        // Sometimes the author has a profile on F95Zone and
        // it will be saved under platforms, not in name.
        const f95Profile = author.platforms.filter((p) => (0, network_helper_1.isF95URL)(p.link)).shift();
        if (author.name === "" && f95Profile)
            author.name = f95Profile.name;
        // Sometimes there are multiple "support" platform but no name of the author.
        // In these case, usually, the name of the first platform is the author's name.
        /* c8 ignore next */
        if (author.name === "" && author.platforms.length >= 1)
            author.name = author.platforms[0].name;
        // Clean the author name from special chars at the end
        const regex = /(?<=\w\b)[\s-/]+$/gi;
        if (regex.test(author.name))
            author.name = author.name.replace(regex, "");
    }
    return [author];
}
/**
 * Parse the changelog from the post's data.
 */
function parseChangelog(elements) {
    // Local variables
    const changelog = [];
    const changelogElement = getPostElementByName(elements, ot_metadata_values_1.metadata.CHANGELOG);
    if (changelogElement) {
        // Regex used to match version tags
        const versionRegex = /^v[0-9]+\.[0-9]+.*/;
        // Get the indexes of the version tags
        const indexesVersion = changelogElement.content
            .filter((e) => e.type === "Text" && versionRegex.test(e.text))
            .map((e) => changelogElement.content.indexOf(e));
        const results = indexesVersion.map((i, j) => {
            // In-loop variable
            const versionChangelog = {
                version: "",
                information: []
            };
            // Get the difference in indexes between this and the next version tag
            const diff = indexesVersion[j + 1] ?? changelogElement.content.length;
            // Fetch the group of data of this version tag
            const group = changelogElement.content.slice(i, diff);
            const hasElements = group.length !== 0;
            versionChangelog.version = hasElements ? group[0].text.replace("v", "").trim() : "";
            // Parse the data
            group.forEach((e) => {
                if (e.type === "Empty" || e.type === "Spoiler") {
                    // This element is a collection of element so we
                    // need to parse all the textes inside this element
                    const textes = e.content.map((c) => c.text);
                    versionChangelog.information.push(...textes);
                }
                else
                    versionChangelog.information.push(e.text);
            });
            return versionChangelog;
        });
        changelog.push(...results);
    }
    return changelog;
}
//#endregion Private methods
