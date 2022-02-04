import * as peggy from 'peggy';
import { flattenJsonSchema } from '../schemaUtils';
import {
  FlattenedJsonSchema, ParseTree, ParseTreeFilter, ParseTreeOperator, ParseTreeProperty,
  TResourceDefinition,
  TSriConfig,
} from '../typeDefinitions';

/// /////////////////////////////////////////////////////////////////////////////
// The following functions are needed as a helper inside the grammar
/// /////////////////////////////////////////////////////////////////////////////

/**
 * From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
 * To be more stringent in adhering to RFC 3986 (which reserves !, ', (, ), and *),
 * even though these characters have no formalized URI delimiting uses,
 * the following function can be safely used instead of encodeURIComponent.
 *
 * cfr. https://datatracker.ietf.org/doc/html/rfc3986
 *
 * @param uriComp
 * @returns an encoded URI component where ! ' ( ) * will also be percent-encoded
 */
function encodeURIComponentStrict(uriComp) {
  return encodeURIComponent(uriComp).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16)}`,
  );
}

/**
 * Used to sort an array of parseTree objects (column, row or listControl)
 *
 * @param {*} a
 * @param {*} b
 * @returns -1 if a should be before b, 1 if b should be before a, 0 if they are equivalent
 */
function parseTreeSortFunction(a: ParseTreeFilter, b: ParseTreeFilter) {
  return ([
    [() => a.property && !b.property, -1],
    [() => !a.property && b.property, +1],
    [() => a.property && b.property && a.property.name > b.property.name, 1],
    [() => a.property && b.property && a.property.name < b.property.name, -1],
    [() => a.operator && !b.property, -1],
    [() => !a.operator && b.operator, +1],
    [() => a.operator && b.operator && a.operator.name > b.operator.name, 1],
    [() => a.operator && b.operator && a.operator.name < b.operator.name, -1],
  ] as [() => boolean, number][]).reduce(
    (acc, [test, response]) => (acc !== null || !test() ? acc : response),
    0, // we consider them 'equal' (don't change the order)
  );
}

/**
 * Should turn EQ into IN, but also NOT_LT into GTE etc. ???
 * And then also translate the value from an array into a single value sometimes
 * or the other way around?
 */
function normalizeRowFilter(rowFilter:ParseTreeFilter) {
  const retVal = { ...rowFilter };
  if (rowFilter.operator.name === 'EQ') {
    // translate EQ to IN
    retVal.operator = { ...rowFilter.operator, name: 'IN', multiValued: true };
    retVal.value = [rowFilter.value];
  } else if (rowFilter.invertOperator) {
    // translate some inverted operators to their non-inverted equivalent
    const invertedOperatorMap:{ [key: string]: string } = {
      LT: 'GTE',
      GT: 'LTE',
      LTE: 'GT',
      GTE: 'LT',
    };

    const invertedOperatorName = invertedOperatorMap[rowFilter.operator.name];
    if (invertedOperatorName) {
      retVal.operator = { ...rowFilter.operator, name: invertedOperatorName };
      retVal.invertOperator = false;
    }
  }

  return retVal;
}

/**
 * Should turn OMIT into the opposite to list exactly all the fields required fields.
 */
function normalizeColumnFilter(columnFilter:ParseTreeFilter) {
  const retVal = { ...columnFilter };
  // if (columnFilter.operator.name === 'EQ') {
  //   // translate EQ to IN
  //   retVal.operator = { ...columnFilter.operator, name: 'IN', multiValued: true };
  //   retVal.value = [ columnFilter.value ];
  // } else if (columnFilter.invertOperator) {
  //   // translate some inverted operators to their non-inverted equivalent
  //   const invertedOperatorMap = {
  //     'LT': 'GTE',
  //     'GT': 'LTE',
  //     'LTE': 'GT',
  //     'GTE': 'LT',
  //   }

  //   const invertedOperatorName = invertedOperatorMap[columnFilter.operator.name];
  //   if (invertedOperatorName) {
  //     retVal.operator = { ...columnFilter.operator, name: invertedOperatorName };
  //     retVal.invertOperator = false;
  //   }
  // }

  return retVal;
}

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
function convertValue(value:string, type = 'string') {
  if (type === 'boolean') {
    return value !== 'false';
  } if (type === 'integer') {
    return parseInt(value, 10);
  } if (type === 'number') {
    return Number(value);
  }
  return value;
}

function translateValueType(
  property:ParseTreeProperty | { type?: never } = { },
  operator:ParseTreeOperator | { type?: never } = {},
  value,
) {
  // console.log('translateValueType(', property, operator, value, ')');
  return convertValue(value, operator.type || property.type);
}

/** should be smart enough to properly return an array or a single property
 * based on whether it is a multivalued property and if the operator is single- or multi-valued
 *
 */
function produceValue(
  property:ParseTreeProperty | { multiValued?: never, type?: never } = {},
  operator:ParseTreeOperator | { multiValued?: never, type?: never } = {},
  escapedUnparsedValue:string,
) {
  const value = decodeURIComponent(escapedUnparsedValue.replace(/\\+/g, ' '));
  // console.log('[produceValue]', JSON.stringify(property), JSON.stringify(operator), escapedUnparsedValue);
  const safeProperty = property || null;
  const safeOperator = operator || null;
  const inputShouldBeArray = safeProperty.multiValued || safeOperator.multiValued;
  const outputShouldBeArray = inputShouldBeArray;
  const parsedValue = inputShouldBeArray ? value.split(',') : value;
  if (outputShouldBeArray) {
    return Array.isArray(parsedValue)
      ? parsedValue.map((v) => translateValueType(safeProperty, safeOperator, v))
      : [translateValueType(safeProperty, safeOperator, parsedValue)];
  }
  return translateValueType(
    safeProperty,
    safeOperator,
    Array.isArray(parsedValue) ? value : parsedValue,
  );
}

/**
 * Retunrs the 2 arrays merged, based on a compareFunction that can tell us
 * whether 2 elements are considered equivalent or not.
 * Elements will always be taken from the first array, unless the element is
 * missing from the first array, in which case the element from the second array
 * will be returned.
 *
 * Example:
 *  * mergeArrays([1, 2], [2, 3]) => [1, 2, 3]
 *  * mergeArrays(
 *      [ { id: 1, comment: 'one' }, { id: 2, comment: 'two' } ],
 *      [ { id: 2, comment: 'TWO' }, { id: 3, comment: 'THREE' } ],
 *      (a,b) => a.id === b.id
 *    ) => [ { id: 1, comment: 'one' }, { id: 2, comment: 'two' }, { id: 3, comment: 'THREE' } ],
 *
 * @param {*} mainArray the array whose results will be returned
 * @param {*} backupArray the array whose elements will be added to the output ONLY when mainArray
 *                        doesn't contain that element
 * @param {*} compareFunction
 */
function mergeArrays(
  mainArray: any[],
  backupArray: any[],
  compareFunction:(a, b) => boolean = (a, b) => a === b,
) {
  const retVal = backupArray.reduce(
    (acc, cur) => {
      // only add the element from the default tree if none like it is present
      const found = acc.findIndex((item) => compareFunction(item, cur)) >= 0;
      return found ? acc : [...acc, cur];
    },
    mainArray,
  );
  // console.debug('[mergeArrays]', mainArray, backupArray, compareFunction, retVal);
  return retVal;
}

/**
 * Will take the parseTree and return a new one where all the missing defaults
 * as specified in the second argument will be applied.
 *
 * @param {*} flatParseTree
 * @param {*} defaultParseTree
 * @returns
 */
function parsedQueryStringToParseTreeWithDefaults(
  flatParseTree:{ [k:string]: object },
  defaultParseTree:{ [k:string]: any } = {},
) {
  //   console.log(`[parsedQueryStringToParseTreeWithDefaults] current parseTree:
  // ${JSON.stringify(parseTree, null, 2)}
  // default parseTree:
  // ${JSON.stringify(defaultParseTree, null, 2)}`
  //   );
  const typeToSubTreeNameMap = {
    ROW_FILTER: 'rowFilters',
    COLUMN_FILTER: 'columnFilters',
    LIST_CONTROL: 'listControl',
  };

  // as a first step, simply copy all the defaults
  const retVal = { ...defaultParseTree };
  // then for each subtree, take everything from parsed, and add all defaults that are missing
  Object.entries(typeToSubTreeNameMap).forEach(([type, subTreeName]) => {
    const flatParseTreeOfCurrentType = Object.values(flatParseTree)
      .filter((item) => (item as any).type === type)
      .map((item) => {
        const { type: itemType, ...restOfTheItem } = item as any;
        return restOfTheItem;
      });
    retVal[subTreeName] = mergeArrays(
      flatParseTreeOfCurrentType,
      defaultParseTree[subTreeName],
      (a, b) => a.property === b.property && a.operator.name === b.operator.name,
    );
  });

  return retVal;
}

/**
 *
 * @param {*} parseTreeObject can contain property and operator objects that define what to expect
 *                            behind the = sign
 * @param {*} typeDescription something like boolean[] or string or integer[] to express single
 *                            values or an array of a certain data type
 *
 */
function checkType({ property, operator }
:{ property:ParseTreeProperty, operator: ParseTreeOperator }, typeDescription:string) {
  const safeProperty = property || {};
  const safeOperator = operator || {};
  const parseTreeExpectsArray = safeProperty.multiValued || safeOperator.multiValued;
  const parseTreeExpectedType = operator.type || property.type;

  const parsedTypeDescription = typeDescription.split('[');
  const describedType = parsedTypeDescription[0];
  const describedIsArray = !!parsedTypeDescription[1];

  const typesMatch = describedType === parseTreeExpectedType;
  const isArrayMatches = parseTreeExpectsArray === describedIsArray;

  // console.log('[checkType]', property, operator, 'returns', typesMatch && isArrayMatches);

  return typesMatch && isArrayMatches;
}

/**
 * Given a parseTreeObject (which can contain property and operator objects that define what to
 * expect behind the = sign)
 * will generate a string like 'boolean', 'integer[]', etc.
 *
 * Should probably later on also be smart enough (and thus schema-aware) to
 * return if it's expecting an enum on the right side, so that we can properly parse
 * if an inexistent value is given to an enum field filter.
 *
 * @param {*} parseTreeObject can contain property and operator objects that define
 *                            what to expect behind the = sign
 * @returns a string expressing the expected type like 'boolean', 'integer[]', ...
 */
function generateExpectedType(
  { property, operator }:{ property:ParseTreeProperty, operator: ParseTreeOperator },
) {
  const safeProperty = property || {};
  const safeOperator = operator || {};
  const parseTreeExpectsArray = safeProperty.multiValued || safeOperator.multiValued;
  const parseTreeExpectedType = operator.type || property.type;

  return `${parseTreeExpectedType}${parseTreeExpectsArray ? '[]' : ''}`;
}

/**
 * This grammar should generate a parseTree that is non-flat, so different 'types' of filters
 * are put together in one subtree.
 * This would help in comparing whether 1 url is a subset of another because the 'special'
 * query params can be ignored (like limit, offset, orderBy, ...)
 * The parseTree used to be a simple array, but we want to split it up further like this:
 * parseTree: {
 *  propertyFilters: [] // key_IN/firstName_MATCHES/labels_OVERLAPS/...
 *  // do we need to split defaultFilters and customFilters, because customFilters can be anything
 *  // (I mean hard to know whether a customfilter is a propertyFilter or a resultMapping filter
 *  // unless that is part of the config)?
 *  propertyMapping: [] // OMIT/PROPERTYNAME_IN but also expansion could belong here ????
 *  listControl: [] // _LIST_META_INCLUDE=count / _LIST_LIMIT / _LIST_ORDER_BY / _LIST_ORDER_DESCENDING etc.
 *                  // other ideas
 *                  // _LIST_RESPONSE_STYLE: single/results/line-by-line GET /persons/<key> === /persons?key=<key> === /persons?keyIn=<key>
 *                  // _LIST_LISTEN=true (to keep connected and listening for changes on the list later on can only be combined with line-by-line???)
 * }
 *
 * WHAT WITH EXPAND=NONE,FULL,... is this listControl, or propertyMapping, or yet another category?
 *
 * Also: all propertyFilters should start with the name of a property and then some operator,
 * all other filters should start with and underscore to distinguish them from the propertyFilters
 * all listControl filters should start with _LIST_ (like _LIST_LIMIT, _LIST_ORDER_BY, ...)
 * and all propertyMappings should start with _MAP_ (like _MAP_E)
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
export function generateNonFlatQueryStringParserGrammar(
  flattenedJsonSchema:FlattenedJsonSchema,
  sriConfigDefaults?:TSriConfig,
  sriConfigResourceDefinition?:TResourceDefinition,
) {
  const allPropertyNamesSorted = Object.keys(flattenedJsonSchema).sort();
  const allPropertyNamesSortedInReverse = Object.keys(flattenedJsonSchema).sort().reverse();

  /**
   * If not overwritten by actual query params, this should be the default parseTree
   * of an empty url.
   */
  const defaultParseTree = {
    // key_IN/firstName_MATCHES/labels_OVERLAPS/...
    // * related to ROWS: propertyFilters/listFilters/listConditions/rowFilters
    rowFilters: [], // empty by default, entirely controlled by the url params
    // do we need to split defaultFilters and customFilters, because customFilters can be anything
    // (I mean hard to know whether a customfilter is a propertyFilter or a resultMapping filter
    // unless that is part of the config)?

    // * related to COLUMNS: resourceConditions/resourceMapping/columnFilters (EXPANSION also part of this I guess??)
    // if we call it columnFilters, can we assume sri4node's configuration complete enough to
    // know which expansions are possible? Because in that case any expansion of related resources
    // can be a case of propertyName in (where the expanded ones will start with $$)
    // That would make it very generic. I guess it should be deductible from the config,
    // but not 100% sure how (I guess we'd have to parse the regex behind the href, which is annoyingly indirect)
    // Better would be to be able to have it specified specifically in the config, and that the
    // JSON-schema would be deducted from this.
    // But that would make the current configs kind of invalid? Not really, because most will
    // be using the schemaUtils functions to generate the schema, so if we'd rewrite some of these
    // functions it could be done + we can add our own properties in the json schema next to
    // type & description.
    // for example: if something is a 'foreign key' to another resource in the same API, we could
    // create JSON schema like this (I surrouned our 'own' JSON schema meta-data with _)
    // "parent": {
    //             "type": "object",
    //             "description": "a permalink to the parent. either another activity or the plan",
    //             "_references_type_": [ '/llinkid/activityplanning/activity', '/llinkid/activityplanning/activityplan' ],
    //             "properties": {
    //               "href": {
    //                 "type": "string",
    //                 "pattern": "^/[a-zA-Z/]+/[-0-9a-f].*$"
    //               }
    //             }
    columnFilters: [
      // expand=SUMMARY should be translated to PROPERTYNAME_IN with fewer properties, omit is the same (pick could be a good antonym for omit, also used by typescript)
      // (but do we know from the config what these properties are???)
      { operator: { name: 'RESOURCE_PROPERTYNAME_IN', type: 'string', multiValued: true }, value: allPropertyNamesSorted }, // not count
      // OR
      // { metaProperty: 'RESOURCE_PROPERTYNAME', operator: 'IN', value: ${allPropertyNamesSortedInReverse} }, // not count
    ], // OMIT/PROPERTYNAME_IN but also expansion could belong here ????
    listControl: [
      // $$includeCount=false
      { operator: { name: 'LIST_META_PROPERTYNAME_IN', type: 'string', multiValued: true }, value: ['created', 'modified', 'schema'] }, // not count
      // a more generic LIST_INCLUDE thing (not limited to the $$meta section) would partly
      // solve the default 'expand=FULL' issue, otherwise this would need to be yet another operator
      { operator: { name: 'LIST_PROPERTYNAME_IN', type: 'string', multiValued: true }, value: ['$$meta.created', '$$meta.modified', 'results[*].href', 'results[*].$$expanded'] }, // not count
      // OR
      // { metaProperty: 'LIST_PROPERTYNAME', operator: 'IN', value: value: ['$$meta.created', '$$meta.modified', 'results[*].href', 'results[*].$$expanded'] }, // not count

      { operator: { name: 'LIST_LIMIT', type: 'integer', multiValued: false }, value: sriConfigDefaults?.defaultlimit || (sriConfigResourceDefinition?.maxlimit ? Math.min(30, sriConfigResourceDefinition.maxlimit) : 30) }, // not count
      { operator: { name: 'LIST_ORDER_BY', type: 'string', multiValued: true }, value: ['$$meta.created', 'key'] },
      { operator: { name: 'LIST_ORDER_DESCENDING', type: 'boolean', multiValued: false }, value: false },
    ], // _LIST_META_INCLUDE=count/_LIST_LIMIT/_LIST_ORDER_BY/_LIST_ORDER_DESCENDING etc.
  };

  // const allPropertyNamesSortedInReverse = Object.keys(flattenedJsonSchema).sort().reverse();
  const grammar = `
    { //////// START OF JAVASCRIPT FUNCTIONS BLOCK ////////
      // everything that is not overwritten will be set to the default
      const defaultParseTree = ${JSON.stringify(defaultParseTree, null, 2)};

      const flattenedJsonSchema = ${JSON.stringify(flattenedJsonSchema, null, 2)};

      // Simply putting these functions in here by adding \${functionName.toString()}
      // doesn't work well with typescript because then I get the compiled version
      // which might have typescript specific dependencies that will then not be available
      // when actually running the parser.
      // So we have to pass them on every call to parse, in the options object
      const {
        parseTreeSortFunction,
        normalizeRowFilter,
        normalizeColumnFilter,
        convertValue,
        translateValueType,
        produceValue,
        mergeArrays,
        parsedQueryStringToParseTreeWithDefaults,
        checkType,
        generateExpectedType,
      } = options;

    } //////// END OF JAVASCRIPT FUNCTIONS BLOCK ////////


    ParsedQueryStringWithDefaultsAppliedAndNormalizedAndSorted = pqs:ParsedQueryStringWithDefaultsApplied {
      let retVal = {
        ...pqs,
        rowFilters: pqs.rowFilters.map((rowFilter) => normalizeRowFilter(rowFilter)).sort(parseTreeSortFunction),
        columnFilters: pqs.columnFilters.map((rowFilter) => normalizeColumnFilter(rowFilter)).sort(parseTreeSortFunction),
        listControl: [ ...pqs.listControl ].sort(parseTreeSortFunction),
      };

      return retVal;
    }


    ParsedQueryStringWithDefaultsApplied = qs:QueryString {
      return parsedQueryStringToParseTreeWithDefaults(qs, defaultParseTree);
    }

    QueryString
      = p1:QueryStringPart p23etc:( ( "&" part:QueryStringPart { return part } )* )
        {
          return [p1, ...p23etc]
        }
      / "" { return [] }

    QueryStringPart
      = fn:RowFilter "="
        et:( "" { return generateExpectedType(fn) })
        v:(
            v2:(
                ( & { return et === 'integer[]' } @IntegerArray )
              / ( & { return et === 'integer'   } @IntegerValue )
              / ( & { return et === 'number[]'  } @NumberArray )
              / ( & { return et === 'number'    } @NumberValue )
              / ( & { return et === 'boolean[]' } @BooleanArray )
              / ( & { return et === 'boolean'   } @BooleanValue )
              / ( & { return et === 'string[]'  } @StringArray )
              / ( & { return et === 'string'    } @StringValue )
            ) {
              const { enum: enumValues, pattern, minLength, maxLength, multipleOf, minimum, maximum, exclusiveMinimum, exclusiveMaximum } = flattenedJsonSchema[fn.property.name];
              const regexp = pattern ? RegExp(pattern) : null;

              function doCheck(value, isInvalidFunction, msg) {
                if (Array.isArray(value)) {
                  value
                    .filter(isInvalidFunction)
                    .forEach((e) => doCheck(e, isInvalidFunction, msg));
                } else {
                  if (isInvalidFunction(value)) {
                    expected(msg);
                  }
                }
              }

              if (minLength) {
                doCheck(v2, (e) => ('' + e).length < minLength, 'a value having at least ' + minLength + ' characters');
              }
              if (maxLength) {
                doCheck(v2, (e) => ('' + e).length > maxLength, 'a value having at most ' + maxLength + ' characters');
              }
              // multipleOf, minimum, maximum, exclusiveMinimum, exclusiveMaximum
              if ( et.includes('integer') || et.includes('number') ) {
                if ( multipleOf ) {
                  doCheck(v2, (e) => e % multipleOf !== 0, 'a multiple of ' + multipleOf);
                }
                if (minimum) {
                  doCheck(v2, (e) => e < minimum, 'a value that is at least ' + minimum);
                }
                if (exclusiveMinimum) {
                  doCheck(v2, (e) => e <= exclusiveMinimum, 'a value that is more than ' + exclusiveMinimum);
                }
                if (maximum) {
                  doCheck(v2, (e) => e > maximum, 'a value that is at most ' + maximum);
                }
                if (exclusiveMaximum) {
                  doCheck(v2, (e) => e >= exclusiveMaximum, 'a value that is less than ' + exclusiveMaximum);
                }
              }
              if (enumValues) {
                const enumValuesSet = new Set(enumValues);
                doCheck(v2, (e) => !enumValuesSet.has(e), 'one of ' + enumValues.join());
              }
              if (regexp) {
                doCheck(v2, (e) => !regexp.test(e), 'a value matching the regular expression ' + pattern);
              }

              return v2;
            }
        )
        {
          // console.log("        -------- RowFilter value of type", et, v);
          // First check if the format is correct and throw a parse error otherwise (with error(...) or expected(...))!!!

          return { type: 'ROW_FILTER', ...fn, value: v }
        }
      // / ( fn:RowFilter "=" v:UnparsedValue {
      //     console.log("        -------- RowFilter UnparsedValue", v);
      //     return { type: 'ROW_FILTER', ...fn, value: produceValue(fn.property, fn.operator, v) }
      //   } )
      / ( fn:ColumnFilter "=" v:UnparsedValue {
          return { type: 'COLUMN_FILTER', ...fn, value: produceValue(fn.property, fn.operator, v) }
        } )
      / ( lcp:ListControlParameter "=" v:UnparsedValue {
          return { type: 'LIST_CONTROL', ...lcp, value: produceValue(lcp.property, lcp.operator, v) } 
        } )


    // Property name without an operator is considered to mean 'equals' (and thus translated to IN)
    RowFilter
      = p:Property ne:OperatorNegator ? op:RowFilterOperator ? ci:CaseInsensitive ? {
          return { type: 'ROW_FILTER', property: p, operator: op || { name: 'EQ', multiValued: false }, invertOperator: !!ne, caseInsensitive: ci === null ? true : ci /*, expectedValue: produceExpectedValue(property, op)*/ };
        }
      / p:Property cs:OperatorCaseSensitive ? ne:OperatorNegator ? op:RowFilterOperator ? {
          return { type: 'ROW_FILTER', property: p, operator: op || { name: 'EQ', multiValued: false }, invertOperator: !!ne, caseInsensitive: !cs /*, expectedValue: produceExpectedValue(property, op)*/ };
        }

    ColumnFilter
      = op:ColumnFilterOperator { return { type: 'COLUMN_FILTER', operator: op } }
        // "=" v:UnparsedValue

    ColumnFilterOperator = ( "omit" / "_COLUMN_OMIT" ) { return { name: "COLUMN_OMIT", type: "string", multiValued: true } }

    ListControlParameter
      = op:ListControlOperator { return { operator: op } }
      // translate $$includeCount to LIST_INCLUDE with property value $$meta.count (${encodeURIComponent('$$')}meta.count)
      / "%24%24includeCount" { return { operator: op } }


    OperatorCaseSensitive = "CaseSensitive" { return true }

    OperatorNegator
      = "_NOT" / "Not"

    RowFilterOperator = MultiValuedRowFilterOperator / SingleValuedRowFilterOperator

    MultiValuedRowFilterOperator = operatorName:(
        ( "_IN"i / "In" ) { return 'IN' }
        / ( "_OVERLAPS"i / "Overlaps" ) { return 'OVERLAPS' }
        / ( "_CONTAINS"i / "Contains" ) { return 'CONTAINS' }
        // ( / "_NOT"i / "Not" ) { return 'NOT' }
      ) { return { name: operatorName, multiValued: true } }

    SingleValuedRowFilterOperator = operatorName:(
        ( "_GTE"i / "GreaterOrEqual" ) { return 'GTE' }
        / ( "_LTE"i / "LessOrEqual" ) { return 'LTE' }
        / ( "_GT"i / "Greater" ) { return 'GT' }
        / ( "_LT"i / "Less" ) { return 'LT' }
        / ( "_LIKE"i / "Like" / "Matches" ) { return 'LIKE' }
        // ( / "_NOT" / "Not" ) { return 'NOT' }
      ) { return { name: operatorName, multiValued: false } }

    CaseInsensitive = "_I" { return true }

    UnparsedValue = $([^&]*) { return decodeURIComponent(text().replace(/\\+/g, ' ')) }


    // TODO: make sure we can properly parse an encoded value,
    // so we can put the intelligence of understanding arrays (or arrays of arrays with parentheses)
    // in here for example!
    MultiValue = sv1:(SingleValue) v23etc:( CommmaCharacter sv2:SingleValue { return sv2 } )*
      // { return [v1, ...v23etc] }

    StringArray
      = result:(
          (LeftParenthesis @( ( @StringValue CommmaCharacter?)* ) RightParenthesis )
          /
            @( ( @StringValue CommmaCharacter? )*)
        )
        { console.log("TRANSLATED STRING ARRAY TO", JSON.stringify(result)); return result }

    IntegerArray
      = LeftParenthesis? result:( ( v:IntegerValue CommmaCharacter ? { return v } )* ) RightParenthesis?
        { return result }

    NumberArray
      = LeftParenthesis? result:( ( v:NumberValue CommmaCharacter ? { return v } )*) RightParenthesis?
        { return result }

    BooleanArray
      = LeftParenthesis? result:( ( v:BooleanValue CommmaCharacter ? { return v } )*) RightParenthesis?
        { return result }

    SingleValue = $( SingleValueCharacter* )

    SingleValueCharacter = !(CommmaCharacter / '&') (
         SpaceCharacter / PercentEncodedCharacter / [^&,]
      )

    // only allow old-school notation like limit or expand when no such properties exist on the resource !!!
    ListControlOperator = 
      ( "_LIST_LIMIT" ${!allPropertyNamesSorted.includes('limit') ? '/ "limit"' : ''} ) { return { name: 'LIST_LIMIT', type: 'integer', multiValued: false } }
      / ( "_EXPANSION" ${!allPropertyNamesSorted.includes('expand') ? '/ "expand"' : ''} ) { return { name: 'EXPANSION', type: 'string', multiValued: true } }
      / ( "_LIST_OFFSET" ${!allPropertyNamesSorted.includes('offset') ? '/ "offset"' : ''} ) { return { name: 'LIST_OFFSET', type: 'integer', multiValued: false } }
      / ( "_LIST_KEYOFFSET" ${!allPropertyNamesSorted.includes('keyOffset') ? '/ "keyOffset"' : ''} )  { return { name: 'LIST_KEY_OFFSET', type: 'string', multiValued: true } }
      / ( "_LIST_META_INCLUDE" ${!allPropertyNamesSorted.includes('%24%24includeCount') ? '/ "%24%24includeCount"' : ''} ) { return { name: 'LIST_META_INCLUDE_COUNT', type: 'boolean', multiValued: false } }
      // _LIST_PROPERTY_EXCLUDE or OMIT ??? This could replace expand=none and list_meta_include (to include or exclude the count)
      // the frustrating thing is we want to exclude the count by default and include the expanded results by default
      // of course, if we would change that default (not expanding by default) we wouldn't have a problem
      // / ( "_LIST_PROPERTY_EXCLUDE" ${!allPropertyNamesSorted.includes('omit') ? '/ "omit"' : ''} ) { return { name: 'LIST_PROPERTY_EXCLUDE', type: 'boolean', multiValued: false } }
      / ( "_LIST_ORDER_BY" ${!allPropertyNamesSorted.includes('orderBy') ? '/ "orderBy"' : ''} ) { return { name: 'LIST_ORDER_BY', type: 'string', multiValued: true } }
      / ( "_LIST_ORDER_DESCENDING" ${!allPropertyNamesSorted.includes('descending') ? '/ "descending"' : ''} ) { return { name: 'LIST_ORDER_DESCENDING', type: 'boolean', multiValued: false } }

    // important to list the longest properties first (if a shorter property's name is the start of a longer property's name) !!!
    // example: "firstNameCapital" / "firstName" / "lastName"
    Property = ${
  allPropertyNamesSortedInReverse.map((n) => {
    const type = flattenedJsonSchema[n].type || 'string';
    return `p:"${encodeURIComponent(n)}" { return { name: '${decodeURIComponent(n)}', type: '${type}', multiValued: ${n.endsWith('[*]')} } }`;
  })
    .join(' / ')
}

    // 1 string element from what can potentially be an array
    StringValue "string"
      = $( ! Comma ! LeftParenthesis ! RightParenthesis
          @( SpaceCharacter / BackslashEscapedCharacter / PercentEncodedCharacter / UnencodedCharacter )
        )+

    BooleanValue "boolean (true or false)"
      = "true" { return true }
      / "false" { return false }

    IntegerValue "integer"
      = $([0-9]+) { return parseInt(text()) }

    NumberValue "number"
      = $( [0-9]+ ( "." [0-9]+ )? ) { return Number(text()) }

    UnencodedCharacter = ! "%" c:. { return c }

    BackslashEscapedCharacter
      = Backslash c:(PercentEncodedCharacter / UnencodedCharacter)
        { return c }

    PercentEncodedCharacter = c:$('%' [0-9A-F] [0-9A-F]) { return decodeURIComponent(c) }

    Comma = c:( "${encodeURIComponentStrict(',')}" / "," ) { return ',' }

    Dollar = c:( "${encodeURIComponentStrict('$')}" / "$" ) { return '$' }

    LeftParenthesis = c:( "${encodeURIComponentStrict('(')}" / "(" ) { return '(' }

    RightParenthesis = c:( "${encodeURIComponentStrict(')')}" / ")" ) { return ')' }

    LeftSquareBracket = c:( "${encodeURIComponentStrict('[')}" / "[" ) { return '[' }

    RightSquareBracket = c:( "${encodeURIComponentStrict(']')}" / "]" ) { return ']' }

    Backslash = c:( "${encodeURIComponentStrict('\\')}" / "\\\\" ) { return '\\\\'; }

    CommmaCharacter = ( "," / "%2C" ) { return ',' }

    SpaceCharacter = ( "+" / "%20" / " " ) { return ' ' }

  `;

  // ${ allPropertyNamesSortedInReverse.map(n => `"${n}"`).join(' / ') }

  return grammar;
}

export interface SriParser extends peggy.Parser {
  origParse: typeof peggy.parser.parse,
}

export function generateNonFlatQueryStringParser(
  sriConfigDefaults?:TSriConfig,
  sriConfigResourceDefinition?:TResourceDefinition,
  allowedStartRules:string[] | undefined = undefined,
):SriParser {
  const grammar = generateNonFlatQueryStringParserGrammar(
    flattenJsonSchema(sriConfigResourceDefinition?.schema || {}),
    sriConfigDefaults,
    sriConfigResourceDefinition,
  );

  const options = {
    parseTreeSortFunction,
    normalizeRowFilter,
    normalizeColumnFilter,
    convertValue,
    translateValueType,
    produceValue,
    mergeArrays,
    parsedQueryStringToParseTreeWithDefaults,
    checkType,
    generateExpectedType,
    cache: true,
  };

  const pegConf = allowedStartRules
    ? {
      // Array of rules the parser will be allowed to start parsing from
      // (default: the first rule in the grammar).
      allowedStartRules,
      options,
      cache: true,
    }
    : {};
  const parser = peggy.generate(grammar, pegConf);

  // I don't really like this, but it works (I'd love to be able to put them on the global pegConf)
  // requiring external libraries from inside the grammar is too cumbersome for what I'm using
  // and putting these functions inside the grammar I would have to write them in plain javascript
  // AND without any code completion (because they are inside a string)
  // which also makes them hard to test...

  // parser.origParse = parser.parse;
  // parser.parse = (input:string, moreOptions:object = {}):ParseTree => parser.origParse(
  //   input, { ...moreOptions, ...options },
  // );
  return {
    ...parser,
    origParse: parser.parse,
    parse: (input:string, moreOptions:object = {}):ParseTree => parser.parse(
      input, { ...moreOptions, ...options },
    ),
  };
}
