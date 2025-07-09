"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.patchSchemaToDisallowAdditionalProperties = exports.enumeration = exports.array = exports.boolean = exports.timestamp = exports.guid = exports.phone = exports.belgianzipcode = exports.url = exports.email = exports.integer = exports.numeric = exports.string = exports.permalink = exports.flattenJsonSchema = void 0;
/**
 * This will make sure we can easily find all possible dot-separated property names
 * by going through the keys in the object, because it will create a non-nested version
 * of the json schema where all the keys are dot-separated.
 * In case of a an array, the 'key' should become something like myobj.myarray[*] to indicate
 * all array elements, and thus myobj.myarray[*].arrayelementproperty if the array contains objects
 * (cfr. JSONPath)
 *
 * so
 * {
 *  type: 'object',
 *  properties: {
 *    a: {
 *      type: 'object',
 *      properties: {
 *        b: { type: 'string' }
 *        cs: { type: 'array', items: { type: 'number' } }
 *      }
 *    }
 *  }
 * }
 * would become:
 * {
 *  'a.b': { type: 'string' }
 *  'a.cs[*]': { type: 'number' }
 * }
 *
 * @param {object} jsonSchema
 * @param {Array<string>} pathToCurrent
 * @returns a version of the json schema where every property name if on the top-level
 *          but with dot notation
 */
function flattenJsonSchema(jsonSchema, pathToCurrent = []) {
    var _a;
    // TODO: support oneOf, anyOf, allOf !!!
    if (jsonSchema.type === "object") {
        // old skool modification of an object is a bit easier to reason about in this case
        const retVal = {};
        Object.entries(jsonSchema.properties || {}).forEach(([pName, pSchema]) => {
            Object.assign(retVal, flattenJsonSchema(pSchema, [...pathToCurrent, pName]));
        });
        return retVal;
    }
    if (jsonSchema.type === "array") {
        // return Object.fromEntries(flattenJsonSchema(jsonSchema.items, [...pathToCurrent, '[*]']);
        const retVal = {};
        if (Array.isArray(jsonSchema.items)) {
            (_a = jsonSchema.items) === null || _a === void 0 ? void 0 : _a.forEach((pSchema) => {
                Object.assign(retVal, flattenJsonSchema(pSchema, [...pathToCurrent, "[*]"]));
            });
        }
        else if (jsonSchema.items) {
            Object.assign(retVal, flattenJsonSchema(jsonSchema.items, [...pathToCurrent, "[*]"]));
        }
        return retVal;
    }
    const flattenedName = pathToCurrent.reduce((a, c) => {
        if (c === "[*]") {
            return `${a}${c}`;
        }
        return `${a}.${c}`;
    });
    return { [flattenedName]: jsonSchema };
}
exports.flattenJsonSchema = flattenJsonSchema;
function permalink(type, description) {
    const name = type.substring(1);
    return {
        type: "object",
        properties: {
            href: {
                type: "string",
                pattern: `^/${name}/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$`,
                description,
            },
        },
        required: ["href"],
    };
}
exports.permalink = permalink;
function string(description, min, max, pattern) {
    const ret = {
        type: "string",
        description,
    };
    if (min) {
        ret.minLength = min;
    }
    if (max) {
        ret.maxLength = max;
    }
    if (pattern) {
        if (Array.isArray(pattern)) {
            ret.oneOf = pattern.map((p) => ({ pattern: p }));
        }
        else {
            ret.pattern = pattern;
        }
    }
    return ret;
}
exports.string = string;
function numeric(description, min, max) {
    const ret = {
        type: "number",
        description,
    };
    if (min || min === 0) {
        ret.minimum = min;
    }
    if (max) {
        ret.maximum = max;
    }
    return ret;
}
exports.numeric = numeric;
function integer(description, min, max) {
    const ret = {
        type: "integer",
        description,
    };
    if (min || min === 0) {
        ret.minimum = min;
    }
    if (max) {
        ret.maximum = max;
    }
    return ret;
}
exports.integer = integer;
// email fun is used in mailer-api;
// sam-api creates its own schema part with pattern: "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$"
//   ==> add it here ?
function email(description) {
    return {
        type: "string",
        format: "email",
        minLength: 1,
        maxLength: 254,
        description,
    };
}
exports.email = email;
function url(description) {
    return {
        type: "string",
        minLength: 1,
        maxLength: 2000,
        format: "uri",
        description,
    };
}
exports.url = url;
function belgianzipcode(description) {
    return {
        type: "string",
        pattern: "^[0-9][0-9][0-9][0-9]$",
        description,
    };
}
exports.belgianzipcode = belgianzipcode;
// seems to be only used in sri4node tests
function phone(description) {
    return {
        type: "string",
        pattern: "^[0-9]*$",
        minLength: 9,
        maxLength: 10,
        description,
    };
}
exports.phone = phone;
function guid(description) {
    return {
        type: "string",
        description,
        pattern: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$",
    };
}
exports.guid = guid;
function timestamp(description) {
    return {
        type: "string",
        format: "date-time",
        description,
    };
}
exports.timestamp = timestamp;
function boolean(description) {
    return {
        type: "boolean",
        description,
    };
}
exports.boolean = boolean;
function array(description, type) {
    const ret = {
        type: "array",
        description,
    };
    if (type !== undefined) {
        if (type instanceof Object) {
            ret.items = Object.assign({}, type);
        }
        else {
            ret.items = { type };
        }
    }
    return ret;
}
exports.array = array;
function enumeration(description, values) {
    const ret = {
        type: "string",
        description,
        enum: values,
    };
    return ret;
}
exports.enumeration = enumeration;
function patchSchemaToDisallowAdditionalProperties(schema) {
    // TODO: support oenOf, allOf, anyOf
    const patchedSchema = Object.assign({}, schema);
    if (patchedSchema.properties && patchedSchema.additionalProperties === undefined) {
        patchedSchema.additionalProperties = false;
        patchedSchema.properties = Object.fromEntries(Object.entries(patchedSchema.properties).map((e) => [
            e[0],
            patchSchemaToDisallowAdditionalProperties(e[1]),
        ]));
    }
    return patchedSchema;
}
exports.patchSchemaToDisallowAdditionalProperties = patchSchemaToDisallowAdditionalProperties;
//# sourceMappingURL=schemaUtils.js.map