import { JSONSchema4 } from "json-schema";
import { FlattenedJsonSchema } from "./typeDefinitions";

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
 * @returns a version of the json schema where every property name if on the top-level but with dot notation
 */
 function flattenJsonSchema(jsonSchema:JSONSchema4, pathToCurrent:string[] = []):FlattenedJsonSchema {
  if (jsonSchema.type === 'object') {
    // old skool modification of an object is a bit easier to reason about in this case
    const retVal = {};
    Object.entries(jsonSchema.properties || {})
      .forEach(([pName, pSchema]) => {
        Object.assign(retVal, flattenJsonSchema(pSchema, [...pathToCurrent, pName]));
      });
    return retVal;
  } else if (jsonSchema.type === 'array') {
    // return Object.fromEntries(flattenJsonSchema(jsonSchema.items, [...pathToCurrent, '[*]']);
    const retVal = {};
    if (Array.isArray(jsonSchema.items)) {
      jsonSchema.items?.forEach((pSchema) => {
        Object.assign(retVal, flattenJsonSchema(pSchema, [...pathToCurrent, '[*]']));
      });
    } else if (jsonSchema.items) {
      Object.assign(retVal, flattenJsonSchema(jsonSchema.items, [...pathToCurrent, '[*]']));
    }
    return retVal;
  } else {
    const flattenedName = pathToCurrent.reduce((a, c) => {
      if (c === '[*]') {
        return `${a}${c}`;
      }
      return `${a}.${c}`;
    });
    return { [flattenedName]: jsonSchema };
  }
}



export = module.exports = {

  permalink: function (type, description) {
    'use strict';
    var name = type.substring(1);

    return {
      type: 'object',
      properties: {
        href: {
          type: 'string',
          pattern: '^\/' + name + '\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',
          description: description
        }
      },
      required: ['href']
    };
  },

  string: function (description, min, max) {
    'use strict';
    var ret:any = {
      type: 'string',
      description: description
    };
    if (min) {
      ret.minLength = min;
    }
    if (max) {
      ret.maxLength = max;
    }

    return ret;
  },

  numeric: function (description, min, max) {
    'use strict';
    const ret:any = {
      type: 'number',
      description: description
    };
    if (min || min == 0) {
      ret.minimum = min;
    }
    if (max) {
      ret.maximum = max;
    }

    return ret;
  },

  email: function (description) {
    'use strict';
    return {
      type: 'string',
      format: 'email',
      minLength: 1,
      maxLength: 254,
      description: description
    };
  },

  url: function (description) {
    'use strict';
    return {
      type: 'string',
      minLength: 1,
      maxLength: 2000,
      format: 'uri',
      description: description
    };
  },

  belgianzipcode: function (description) {
    'use strict';
    return {
      type: 'string',
      pattern: '^[0-9][0-9][0-9][0-9]$',
      description: description
    };
  },

  phone: function (description) {
    'use strict';
    return {
      type: 'string',
      pattern: '^[0-9]*$',
      minLength: 9,
      maxLength: 10,
      description: description
    };
  },

  guid: function (description) {
    'use strict';
    return {
      type: 'string',
      description: description,
      pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'

    };
  },

  timestamp: function (description) {
    'use strict';
    return {
      type: 'string',
      format: 'date-time',
      description: description
    };
  },

  'boolean': function (description) { //eslint-disable-line
    return {
      type: 'boolean',
      description: description
    };
  },

  array: function (description) {
    'use strict';
    var ret = {
      type: 'array',
      description: description
    };
    return ret;
  },

  patchSchemaToDisallowAdditionalProperties: function patchSchemaToDisallowAdditionalProperties(schema) {
    'use strict';
    const patchedSchema = { ...schema };
    if (patchedSchema.properties && patchedSchema.additionalProperties === undefined) {
      patchedSchema.additionalProperties = false;
      patchedSchema.properties = {}
      Object.entries(schema.properties)
          .forEach(e => patchedSchema.properties[e[0]] = patchSchemaToDisallowAdditionalProperties(e[1]))

      /* from NodeJS 12 and up could be something like
      patchedSchema.properties = Object.fromEntries(
        Object.entries(patchedSchema.properties)
          .map(e => [e[0], patchSchemaToDisallowAdditionalProperties(e[1])])
      );
      */
    }
    return patchedSchema;
  },

  flattenJsonSchema,
};
