"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.MissingOrInvalidParsingAttribute = exports.InvalidResponseParsing = exports.ParameterError = exports.InvalidID = exports.NoPreviousSession = exports.UserNotLogged = exports.InvalidF95Token = exports.UnexpectedResponseContentType = exports.AxiosResponseError = exports.AxiosRequestError = exports.GenericAxiosError = exports.BaseAPIError = exports.INVALID_ERROR_ERROR = exports.INVALID_ERROR_MESSAGE = exports.INVALID_ERROR_ID = exports.INVALID_TOKEN_NUMBER = exports.INVALID_THREAD_CONSTRUCTOR_ARGUMENT = exports.INVALID_THREAD_ID = exports.INVALID_POST_ID = exports.INVALID_USER_ID = exports.PREVIOUS_SESSION_NOT_EXISTENT = exports.USER_NOT_LOGGED = exports.ERROR_CODE = void 0;
exports.ERROR_CODE = {
    UNEXPECTED_ERROR: 100,
    CANNOT_DELETE_FILE: 200,
    CANNOT_FETCH_GET_RESPONSE: 300,
    CANNOT_FETCH_POST_RESPONSE: 301,
    CANNOT_FETCH_HEAD_RESPONSE: 302,
    CANNOT_FETCH_SESSION_TOKENS: 304,
    UNEXPECTED_HTML_RESPONSE: 305,
    INTERCEPTOR_ERROR: 306
};
exports.USER_NOT_LOGGED = "User not authenticated, unable to continue";
exports.PREVIOUS_SESSION_NOT_EXISTENT = "There is no reference to a previous session, please log in to continue";
exports.INVALID_USER_ID = "Invalid user ID";
exports.INVALID_POST_ID = "Invalid post ID";
exports.INVALID_THREAD_ID = "Invalid thread ID";
exports.INVALID_THREAD_CONSTRUCTOR_ARGUMENT = "The ID or URL of the thread cannnot be null";
exports.INVALID_TOKEN_NUMBER = "The number of tokens must be at least 1";
exports.INVALID_ERROR_ID = "The error ID cannot be null and must be greater than zero";
exports.INVALID_ERROR_MESSAGE = "The error message cannot be null or empty";
exports.INVALID_ERROR_ERROR = "The reporting error cannot be null";
class BaseAPIError extends Error {
    id;
    message;
    error;
    constructor(args) {
        super();
        // Check arguments
        if (!args.id || args.id < 0)
            throw new ParameterError(exports.INVALID_ERROR_ID);
        if (!args.message || args.message === "")
            throw new ParameterError(exports.INVALID_ERROR_MESSAGE);
        if (!args.error)
            throw new ParameterError(exports.INVALID_ERROR_ERROR);
        // Assign arguments
        this.id = args.id;
        this.message = args.message;
        this.error = args.error;
    }
}
exports.BaseAPIError = BaseAPIError;
class GenericAxiosError extends BaseAPIError {
    constructor(args) {
        super(args);
    }
}
exports.GenericAxiosError = GenericAxiosError;
class AxiosRequestError extends BaseAPIError {
    constructor(args) {
        super(args);
    }
}
exports.AxiosRequestError = AxiosRequestError;
class AxiosResponseError extends BaseAPIError {
    constructor(args) {
        super(args);
    }
}
exports.AxiosResponseError = AxiosResponseError;
class UnexpectedResponseContentType extends BaseAPIError {
    constructor(args) {
        super(args);
    }
}
exports.UnexpectedResponseContentType = UnexpectedResponseContentType;
class InvalidF95Token extends Error {
}
exports.InvalidF95Token = InvalidF95Token;
class UserNotLogged extends Error {
}
exports.UserNotLogged = UserNotLogged;
class NoPreviousSession extends Error {
}
exports.NoPreviousSession = NoPreviousSession;
class InvalidID extends Error {
}
exports.InvalidID = InvalidID;
class ParameterError extends Error {
}
exports.ParameterError = ParameterError;
class InvalidResponseParsing extends Error {
}
exports.InvalidResponseParsing = InvalidResponseParsing;
class MissingOrInvalidParsingAttribute extends Error {
}
exports.MissingOrInvalidParsingAttribute = MissingOrInvalidParsingAttribute;
