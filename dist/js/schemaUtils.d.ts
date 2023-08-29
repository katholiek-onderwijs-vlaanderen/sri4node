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
declare function flattenJsonSchema(jsonSchema: JSONSchema4, pathToCurrent?: string[]): FlattenedJsonSchema;
declare function permalink(type: string, description: string): JSONSchema4;
declare function string(description: string, min?: number, max?: number, pattern?: string | string[]): JSONSchema4;
declare function numeric(description: string, min?: number, max?: number): JSONSchema4;
declare function integer(description: string, min?: number, max?: number): JSONSchema4;
declare function email(description: string): JSONSchema4;
declare function url(description: string): JSONSchema4;
declare function belgianzipcode(description: string): JSONSchema4;
declare function phone(description: string): JSONSchema4;
declare function guid(description: string): JSONSchema4;
declare function timestamp(description: string): JSONSchema4;
declare function boolean(description: string): JSONSchema4;
declare function array(description: string): JSONSchema4;
declare function enumeration(description: string, values: string[]): JSONSchema4;
declare function patchSchemaToDisallowAdditionalProperties(schema: any): any;
export { flattenJsonSchema, permalink, string, numeric, integer, email, url, belgianzipcode, phone, guid, timestamp, boolean, array, enumeration, patchSchemaToDisallowAdditionalProperties, };
