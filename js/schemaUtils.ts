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
export function flattenJsonSchema(jsonSchema:JSONSchema4, pathToCurrent:string[] = [])
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

export function permalink(type, description) {
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

export function string(description, min?:number, max?:number) {
  const ret:any = {
    type: 'string',
    description,
  };
  if (min) {
    ret.minLength = min;
  }
  if (max) {
    ret.maxLength = max;
  }

  return ret;
}

export function numeric(description, min?:number, max?:number) {
  const ret:any = {
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

export function email(description) {
  return {
    type: 'string',
    format: 'email',
    minLength: 1,
    maxLength: 254,
    description,
  };
}

export function url(description) {
  return {
    type: 'string',
    minLength: 1,
    maxLength: 2000,
    format: 'uri',
    description,
  };
}

export function belgianzipcode(description) {
  return {
    type: 'string',
    pattern: '^[0-9][0-9][0-9][0-9]$',
    description,
  };
}

export function phone(description) {
  return {
    type: 'string',
    pattern: '^[0-9]*$',
    minLength: 9,
    maxLength: 10,
    description,
  };
}

export function guid(description) {
  return {
    type: 'string',
    description,
    pattern: '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$',

  };
}

export function timestamp(description) {
  return {
    type: 'string',
    format: 'date-time',
    description,
  };
}

export function boolean(description) {
  return {
    type: 'boolean',
    description,
  };
}

export function array(description) {
  const ret = {
    type: 'array',
    description,
  };
  return ret;
};

export function patchSchemaToDisallowAdditionalProperties(schema) {
  const patchedSchema = { ...schema };
  if (patchedSchema.properties && patchedSchema.additionalProperties === undefined) {
    patchedSchema.additionalProperties = false;
    // patchedSchema.properties = {};
    // Object.entries(schema.properties)
    //   .forEach((e) => {
    //     patchedSchema.properties[e[0]] = patchSchemaToDisallowAdditionalProperties(e[1])
    //   });

    // from NodeJS 12 and up could be something like
    patchedSchema.properties = Object.fromEntries(
      Object.entries(patchedSchema.properties)
        .map((e) => [e[0], patchSchemaToDisallowAdditionalProperties(e[1])]),
    );
  }
  return patchedSchema;
}
