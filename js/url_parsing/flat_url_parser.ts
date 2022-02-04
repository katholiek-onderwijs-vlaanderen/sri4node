/**
 * REMARK 2021-10-18: the current implementation can parse an entire (encoded)
 * but I think it might be more elegant to just parse the paramName (after decodeURIComponent)
 * and the value separately (write a parse function that gets 2 parameters and returns 1 object).
 * (URLSearchParams.entries() returns decoded [filtername, filtervalue] pairs)
 *
 * Generates a peggy grammar parser based on the flattened schema and the sriConfiog object
 * that can parse the entire query string (ideally it works whether characters are encoded or not).
 *
 * But for now we could assume that all characters in the string are escaped
 * (by escaping the defined propertyNames first, especially maybe the $ characters)?
 *
 * Currently the parser assumes that all the default filters are allowed on any property,
 * but the way sri4node config currently works is: if defaultFilter is not specified,
 * the defaultFilters won't work on that property
 * (although I think the default filters should ideally always work, because that's
 * what the sri-query spec explains).
 *
 * @param {Array<string>} existingProperties: a list of allowed properties
 * @param {TSriConfig} sriConfig
 * @returns {String} the peggy grammar
 */
export function generateFlatQueryStringParserGrammar(flattenedJsonSchema) {
  const allMultiValuedPropertyNamesSortedInReverse = Object.entries(flattenedJsonSchema)
    .filter(([k, v]) => k.endsWith('[*]'))
    .map(([k, v]) => encodeURIComponent(k))
    .sort()
    .reverse();
  const allSingleValuedPropertyNamesSortedInReverse = Object.entries(flattenedJsonSchema)
    .filter(([k, v]) => !k.endsWith('[*]'))
    .map(([k, v]) => encodeURIComponent(k))
    .sort()
    .reverse();
  const allPropertyNamesSortedInReverse = Object.entries(flattenedJsonSchema)
    .map(([k, v]) => encodeURIComponent(k))
    .sort().reverse();

  const hasMultiValuedProperties = allMultiValuedPropertyNamesSortedInReverse.length > 0;

  const hasSingleValuedProperties = allSingleValuedPropertyNamesSortedInReverse.length > 0;

  // A map to check if the field type is something else than string
  const propertyNameToOtherThanStringTypeMap = {
    ...Object.fromEntries(
      Object.entries(flattenedJsonSchema)
        .filter(([k, v]:[string, Record<string, unknown>]) => !v.enum && v.type !== 'string')
        .map(([k, v]:[string, Record<string, unknown>]) => [k, v.type]),
    ),
    '$$meta.deleted': 'boolean',
    '$$meta.version': 'integer',
    // [encodeURIComponent('$$meta.modified')]: 'string',
  };

  // const allPropertyNamesSortedInReverse = Object.keys(flattenedJsonSchema).sort().reverse();
  const grammar = `
    { //////// START OF JAVASCRIPT FUNCTIONS BLOCK ////////
      /** Turn _IN or In into IN, etc. for other operators
       */
      function normalizeOperator(o) {
        if (o === null || o === undefined) return 'IN';
        if (o.startsWith('_')) return o.substr(1).toUpperCase();
        return o.toUpperCase();
      }

      // both control and normal operators
      const multiValuedNormalizedOperators = new Set(["IN", "OVERLAPS", "CONTAINS", "LIST_ORDER_BY"]);

      /** returns true if the operator is 'multi-valued', that is: he expects
       * a comma-separated list as input
       */
      function operatorIsMultiValued(o) {
        return !o ? false : multiValuedNormalizedOperators.has(normalizeOperator(o));
      }

      const multiValuedProperties = new Set([${allMultiValuedPropertyNamesSortedInReverse.map((n) => `'${n}'`).join()}]);
      function propertyIsMultiValued(property) {
        return multiValuedProperties.has(property);
      }

      const operatorToTypeMap = { LIST_LIMIT: 'integer', OFFSET: 'integer', EXPANSION: 'string', KEY_OFFSET: 'integer', LIST_META_INCLUDE_COUNT: 'boolean', LIST_ORDER_BY: 'string', LIST_ORDER_DESCENDING: 'boolean' };


      /**
       * Makes sure the input string is propery converted to an actual JSON type.
       *
       * So convertValue('1', 'string') => '1'
       * and convertValue('1', 'number') => 1.0
       * and convertValue('1.3', 'integer') => parseInt exception
       *
       * convertValue('true', 'string') => 'true'
       * convertValue('true', 'boolean') => true
       * convertValue('false', 'boolean') => false
       * convertValue('hello', 'boolean') => true
       */
      function convertValue(value, type = 'string') {
        if (type === 'boolean') {
          return value === 'false' ? false : true;
        } else if (type === 'integer') {
          return parseInt(value);
        } else if (type === 'number') {
          return Number(value);
        }
        return value;
      }

      const propertyNameToOtherThanStringTypeMap = ${JSON.stringify(propertyNameToOtherThanStringTypeMap)}
      function translateValueType(property, operator, value) {
        // console.log('translateValueType(', property, operator, value, ')');
        const operatorType = operatorToTypeMap[operator];
        const propertyType = propertyNameToOtherThanStringTypeMap[property];
        // console.log('property = ', property, ' => ', value, 'should be of type', type || 'string');

        return convertValue(value, operatorType || propertyType);
      }

      /** should be smart enough to properly return an array or a single property
       * based on whether it is a multivalued property and if the operator is single- or multi-valued
       *
       */
      function produceValue(property, originalOperator, escapedUnparsedValue) {
        const operator = normalizeOperator(originalOperator);
        const value = decodeURIComponent(escapedUnparsedValue.replace(/\\+/g, ' '));
        const inputShouldBeArray = propertyIsMultiValued(property) || operatorIsMultiValued(originalOperator);
        const outputShouldBeArray = propertyIsMultiValued(property) || operatorIsMultiValued(operator);
        // console.log('======== input should be array', inputShouldBeArray, property, originalOperator, value);
        // console.log('======== output should be array', outputShouldBeArray, property, operator, value);
        const parsedValue = inputShouldBeArray ? value.split(',') : value;
        if (outputShouldBeArray) {
          return Array.isArray(parsedValue) ? parsedValue.map(v => translateValueType(property, operator, v)) : [translateValueType(property, operator, parsedValue)];
        } else {
          return translateValueType(
            property,
            operator,
            Array.isArray(parsedValue) ? value.join('') : parsedValue,
          );
        }
      }

      /**
       * should be smart enough to properly return an array or a single property
       * based on whether it is a multivalued property and if the operator is single- or multi-valued
       *
       * @returns an object that tells how to parse and which output to generate for the value
       */
      function produceExpectedValue(property, originalOperator) {
        const operator = normalizeOperator(originalOperator);
        return {
          inputShouldBeArray: propertyIsMultiValued(property) || operatorIsMultiValued(originalOperator),
          outputShouldBeArray: propertyIsMultiValued(property) || operatorIsMultiValued(operator),
          outputType: operatorToTypeMap[operator] || propertyNameToOtherThanStringTypeMap[property] || 'string',
        };
      }
    } //////// END OF JAVASCRIPT FUNCTIONS BLOCK ////////

    QueryString
      = p1:QueryStringPart
        p23etc:( ( "&" part:QueryStringPart { return part } )* )
        { return [p1, ...p23etc] }

    QueryStringPart
      = ( fn:FilterName "=" v:UnparsedValue { return { ...fn, operator: normalizeOperator(fn.operator), value: produceValue(fn.property, fn.operator, v) } } )
      / ( cp:ControlParameter "=" v:UnparsedValue { return { ...cp, operator: normalizeOperator(cp.operator), value: produceValue(cp.property, cp.operator, v) } } )


    // Missing operator is considered to mean equals (and thus translated to IN)
    FilterName
      =
        p:Property ne:Negator ? op:Operator ? ci:CaseInsensitive ? {
          const property = decodeURIComponent(p);
          return { property, operator: op, invertOperator: !!ne, caseInsensitive: ci === null ? true : ci, expectedValue: produceExpectedValue(property, op) };
        }
      / p:Property cs:CaseSensitive ? ne:Negator ? op:Operator ? {
          const property = decodeURIComponent(p);
          return { property, operator: op, invertOperator: !!ne, caseInsensitive: !cs, expectedValue: produceExpectedValue(property, op) };
        }

    // Missing operator is considered to mean equals (and thus translated to IN)
    // SingleValuedFilterName
    //   =
    //     // SingleValuedProperty with SingleValued operators are SingleValuedFilters
    //     p:SingleValuedProperty ne:Negator ? op:SingleValuedOperator ? ci:CaseInsensitive ? {
    //       return { property: p, caseInsensitive: ci === null ? true : ci, invertOperator: ne === null ? false : ne, operator: normalizeOperator(op) };
    //     }
    //   / p:SingleValuedProperty cs:CaseSensitive ? ne:Negator ? op:SingleValuedOperator ? {
    //       return { property: p, caseInsensitive: cs === null ? true : !cs, invertOperator: ne === null ? false : ne, operator: normalizeOperator(op) };
    //     }

    // all cases where the value can be a comma-separated list
    // both when the operator expects a list (like _IN)
    // or when the value is an array aliases=john,johnny
    // (we might need an operator to treat an array as a set so the order doesn't matter)
    // MultiValuedFilterName
    //   =
    //     // Any property with MultiValued operators are MultiValuedFilters
    //     p:Property ne:Negator ? op:MultiValuedOperator ? ci:CaseInsensitive ? {
    //       return { property: p, caseInsensitive: ci === null ? true : ci, invertOperator: ne === null ? false : ne, operator: normalizeOperator(op) };
    //     }
    //   / p:Property cs:CaseSensitive ? ne:Negator ? op:MultiValuedOperator ? {
    //       return { property: p, caseInsensitive: cs === null ? true : !cs, invertOperator: ne === null ? false : ne, operator: normalizeOperator(op) };
    //     }

    ControlParameter = op:ControlOperator { return { operator: normalizeOperator(op) } }

    CaseSensitive = "CaseSensitive" { return true }

    Negator
      = "_NOT" / "Not"

    Operator = MultiValuedOperator / SingleValuedOperator

    MultiValuedOperator
      = "_IN"i / "In"
      / "_OVERLAPS"i / "Overlaps"
      / "_CONTAINS"i / "Contains"
      // / "_NOT"i / "Not"

    SingleValuedOperator
      = "_GTE"i / "GreaterOrEqual"
      / "_LTE"i / "LessOrEqual"
      / "_GT"i / "Greater"
      / "_LT"i / "Less"
      / "_LIKE"i / "Like" / "Matches"
      // / "_NOT" / "Not"

    CaseInsensitive = "_I" { return true }

    UnparsedValue = v:([^&]+) { return v.join('') }

    // Hard to parse if separated by %2C
    MultiValue = v1:SingleValue v23etc:( ("," / "%2C") v2:SingleValue { return v2 } )*
      {return [v1, ...v23etc]}

    SingleValue = v:([^,&]+) { return v.join('') }

    // for the future when maybe we also have multi-valued control parameters
    ControlOperator = SingleValuedControlOperator / MultiValuedControlOperator

    SingleValuedControlOperator =
      // shouldn't this be _LIST_LIMIT ? 
      ( "_LIST_LIMIT" / "limit" ) { return 'LIST_LIMIT' }
      / ( "_EXPANSION" / "expand" ) { return 'EXPANSION' }
      // shouldn't this be _LIST_OFFSET ? 
      / ( "_LIST_OFFSET" / "offset" ) { return 'LIST_OFFSET' }
      // shouldn't this be _LIST_KEYOFFSET ?  
      / ( "_LIST_KEYOFFSET" / "keyOffset" )  { return 'KEY_OFFSET' }
      / ( "_LIST_META_INCLUDE_COUNT" / "%24%24includeCount" ) { return 'LIST_META_INCLUDE_COUNT' }
      / ( "_LIST_ORDER_DESCENDING" / "descending" ) { return 'LIST_ORDER_DESCENDING' }

    MultiValuedControlOperator =
      ( "_LIST_ORDER_BY" / "orderBy" ) { return 'LIST_ORDER_BY' }


    // important to list the longest properties first (if a shorter property's name is the start of a longer property's name) !!!
    // example: "firstNameCapital" / "firstName" / "lastName"
    Property = ${allPropertyNamesSortedInReverse.map((n) => `"${n}"`).join(' / ')}

    // if there are no multi-valued properties (simple 'non-object' arrays) we'll match on '\' because it should not be in any url
    // this keeps things simpler (as in: the grammar always has MultiValuedProperty defined but it should never match anything in real life)
    // WARNING:by splitting them up into MultiValuedProperty and SingleValuedProperty we could potentially get invalid matches
    //    if for example "data" would be a MultiValuedProperty and "database" a SingleValuedProperty
    //    the MultiValuedProperty would match first (the way it's currently written)
    MultiValuedProperty = ${hasMultiValuedProperties ? allMultiValuedPropertyNamesSortedInReverse.map((n) => `"${n}"`).join(' / ') : '"\\\\"'}

    SingleValuedProperty = ${hasSingleValuedProperties ? allSingleValuedPropertyNamesSortedInReverse.map((n) => `"${n}"`).join(' / ') : '"\\\\"'}
  `;

  // ${ allPropertyNamesSortedInReverse.map(n => `"${n}"`).join(' / ') }

  return grammar;
}

// module.exports = {
//  generateFlatQueryStringParserGrammar
// }
