import { JSONSchema4 } from 'json-schema';
import { FlattenedJsonSchema } from './typeDefinitions';

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
function flattenJsonSchema(jsonSchema:JSONSchema4, pathToCurrent:string[] = [])
:FlattenedJsonSchema {
  if (jsonSchema.type === 'object') {
    // old skool modification of an object is a bit easier to reason about in this case
    const retVal = {};
    Object.entries(jsonSchema.properties || {})
      .forEach(([pName, pSchema]) => {
        Object.assign(retVal, flattenJsonSchema(pSchema, [...pathToCurrent, pName]));
      });
    return retVal;
  }
  if (jsonSchema.type === 'array') {
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
  }
  const flattenedName = pathToCurrent.reduce((a, c) => {
    if (c === '[*]') {
      return `${a}${c}`;
    }
    return `${a}.${c}`;
  });
  return { [flattenedName]: jsonSchema };
}

function permalink(type: string, description: string): JSONSchema4 {
  const name = type.substring(1);

  return {
    type: 'object',
    properties: {
      href: {
        type: 'string',
        pattern: `^/${name}/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$`,
        description,
      },
    },
    required: ['href'],
  };
}

function string(description: string, min?:number, max?:number, pattern?:string|string[]): JSONSchema4 {
  const ret:JSONSchema4 = {
    type: 'string',
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
      ret.oneOf = pattern.map( p => ({pattern: p}))
    } else {
      ret.pattern = pattern;
    }
  }

  return ret;
}

function numeric(description: string, min?:number, max?:number): JSONSchema4 {
  const ret:JSONSchema4 = {
    type: 'number',
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

function integer(description: string, min?:number, max?:number): JSONSchema4 {
  const ret:JSONSchema4 = {
    type: 'integer',
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

// email fun is used in mailer-api; 
// sam-api creates its own schema part with pattern: "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$"
//   ==> add it here ?
function email(description: string): JSONSchema4 {
  return {
    type: 'string',
    format: 'email',
    minLength: 1,
    maxLength: 254,
    description,
  };
}

function url(description: string): JSONSchema4 {
  return {
    type: 'string',
    minLength: 1,
    maxLength: 2000,
    format: 'uri',
    description,
  };
}

function belgianzipcode(description: string): JSONSchema4 {
  return {
    type: 'string',
    pattern: '^[0-9][0-9][0-9][0-9]$',
    description,
  };
}

// seems to be only used in sri4node tests
function phone(description: string): JSONSchema4 {
  return {
    type: 'string',
    pattern: '^[0-9]*$',
    minLength: 9,
    maxLength: 10,
    description,
  };
}

function guid(description: string): JSONSchema4 {
  return {
    type: 'string',
    description,
    pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',

  };
}

function timestamp(description: string): JSONSchema4 {
  return {
    type: 'string',
    format: 'date-time',
    description,
  };
}

function boolean(description: string): JSONSchema4 {
  return {
    type: 'boolean',
    description,
  };
}

function array(description: string): JSONSchema4 {
  const ret:JSONSchema4 = {
    type: 'array',
    description,
  };
  return ret;
}

function enumeration(description: string, values: string[]): JSONSchema4 {
  const ret:JSONSchema4 = {
    type: 'string',
    description,
    enum: values,
  };
  return ret;
}


function patchSchemaToDisallowAdditionalProperties(schema) {
  const patchedSchema = { ...schema };
  if (patchedSchema.properties && patchedSchema.additionalProperties === undefined) {
    patchedSchema.additionalProperties = false;
    patchedSchema.properties = Object.fromEntries(
      Object.entries(patchedSchema.properties)
        .map((e) => [e[0], patchSchemaToDisallowAdditionalProperties(e[1])]),
    );
  }
  return patchedSchema;
}

export {
  flattenJsonSchema,
  permalink,
  string,
  numeric,
  integer,
  email,
  url,
  belgianzipcode,
  phone,
  guid,
  timestamp,
  boolean,
  array,
  enumeration,
  patchSchemaToDisallowAdditionalProperties,
}
