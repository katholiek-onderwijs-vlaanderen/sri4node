"use strict";
/*
External utility functions for mapping from/to the postgres database.
Use in the 'map' section of yout sri4node configuration
*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.base64enc = exports.stringify = exports.parse = exports.value = exports.now = exports.remove = exports.removeifnull = void 0;
function removeifnull(key, e) {
    if (e[key] == null) {
        delete e[key];
    }
}
exports.removeifnull = removeifnull;
function remove(key, e) {
    delete e[key];
}
exports.remove = remove;
function now(key, e) {
    e[key] = new Date().toISOString();
}
exports.now = now;
function value(value) {
    return function (key, e) {
        e[key] = value;
    };
}
exports.value = value;
function parse(key, e) {
    e[key] = JSON.parse(e[key]);
}
exports.parse = parse;
function stringify(key, e) {
    e[key] = JSON.stringify(e[key]);
}
exports.stringify = stringify;
function base64enc(key, e) {
    if (e[key] !== null) {
        e[key] = e[key].toString("base64");
    }
}
exports.base64enc = base64enc;
//# sourceMappingURL=mapUtils.js.map