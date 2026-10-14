"use strict";
// Copyright (c) 2022 MillenniumEarl
//
// This software is released under the MIT License.
// https://opensource.org/licenses/MIT
Object.defineProperty(exports, "__esModule", { value: true });
exports.success = exports.failure = exports.Success = exports.Failure = void 0;
class Failure {
    value;
    constructor(value) {
        this.value = value;
    }
    isFailure() {
        return true;
    }
    isSuccess() {
        return false;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    applyOnSuccess(_) {
        return this;
    }
}
exports.Failure = Failure;
class Success {
    value;
    constructor(value) {
        this.value = value;
    }
    isFailure() {
        return false;
    }
    isSuccess() {
        return true;
    }
    applyOnSuccess(func) {
        return new Success(func(this.value));
    }
}
exports.Success = Success;
const failure = (l) => {
    return new Failure(l);
};
exports.failure = failure;
const success = (a) => {
    return new Success(a);
};
exports.success = success;
/* c8 ignore stop */
