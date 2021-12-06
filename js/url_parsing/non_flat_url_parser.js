////////////////////////////////////////////////////////////////////////////////
// The following functions are needed as a helper inside the grammar
////////////////////////////////////////////////////////////////////////////////

/**
 * Should turn EQ into IN, but also NOT_LT into GTE etc. ???
 * And then also translate the value from an array into a single value sometimes or the other way around?
 */
function normalizeRowFilter(rowFilter) {

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

function translateValueType(property = {}, operator = {}, value) {
  // console.log('translateValueType(', property, operator, value, ')');
  return convertValue(value, operator.type || property.type);
}

/** should be smart enough to properly return an array or a single property
 * based on whether it is a multivalued property and if the operator is single- or multi-valued
 *
 */
function produceValue(property = {}, operator = {}, escapedUnparsedValue) {
  const value = decodeURIComponent(escapedUnparsedValue.replace(/\\+/g, ' '));
  // console.log('[produceValue]', JSON.stringify(property), JSON.stringify(operator), escapedUnparsedValue);
  const safeProperty = property || {};
  const safeOperator = operator || {};
  const inputShouldBeArray = safeProperty.multiValued || safeOperator.multiValued;
  const outputShouldBeArray = inputShouldBeArray;
  const parsedValue = inputShouldBeArray ? value.split(',') : value;
  if (outputShouldBeArray) {
    return Array.isArray(parsedValue) 
      ? parsedValue.map(v => translateValueType(safeProperty, safeOperator, v)) 
      : [translateValueType(safeProperty, safeOperator, parsedValue)];
  } else {
    return translateValueType(
      safeOperator,
      safeOperator,
      Array.isArray(parsedValue) ? value.join('') : parsedValue,
    );
  }
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
 * @param {*} backupArray the array whose elements will be added to the output ONLY when mainArray doesn't contain that element
 * @param {*} compareFunction 
 */
function mergeArrays(mainArray, backupArray, compareFunction = (a, b) => a === b) {
  const retVal =  backupArray.reduce(
    (acc, cur) => {
      // only add the element from the default tree if none like it is present
      const found = acc.findIndex(item => compareFunction(item, cur)) >= 0;
      return found ? acc : [ ...acc, cur ];
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
function parsedQueryStringToParseTreeWithDefaults(flatParseTree, defaultParseTree = {}) {
//   console.log(`[parsedQueryStringToParseTreeWithDefaults] current parseTree:
// ${JSON.stringify(parseTree, null, 2)}
// default parseTree:
// ${JSON.stringify(defaultParseTree, null, 2)}`
//   );
  const typeToSubTreeNameMap = {
    'ROW_FILTER': 'rowFilters',
    'COLUMN_FILTER': 'columnFilters',
    'LIST_CONTROL': 'listControl',
  }

  // as a first step, simply copy all the defaults
  let retVal = { ...defaultParseTree };
  // then for each subtree, take everything from parsed, and add all defaults that are missing
  Object.entries(typeToSubTreeNameMap).forEach(([type, subTreeName]) => {
    const flatParseTreeOfCurrentType = flatParseTree
      .filter(item => item.type === type)
      .map(item => {
        const { type, ...restOfTheItem } = item;
        return restOfTheItem;
      });
    retVal[subTreeName] = mergeArrays(
      flatParseTreeOfCurrentType,
      defaultParseTree[subTreeName],
      (a, b) => a.property === b.property && a.operator.name === b.operator.name,
    );
  });

  return retVal;
};


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
 *  listControl: [] // _LIST_META_INCLUDE=count/_LIST_LIMIT/_LIST_ORDER_BY/_LIST_ORDER_DESCENDING etc.
 * }
 * 
 * WHAT WITH EXPAND=NONE,FULL,... is this listControl, or propertyMapping, or yet another category?
 * 
 * Also: all propertyFilters shoul start with the name of a property and then some operator,
 * all other filters should start with and underscore to distinguish them from the propertyFilters
 * all listControl filters should start with _LIST_ (like _LIST_LIMIT, _LIST_ORDER_BY, ...)
 * and all propertyMappings should start with _MAP_ (like _MAP_E)
 *
 * Generates a peg js grammar parser based on the flattened schema and the sriConfiog object
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
 * @param {SriConfig} sriConfig
 * @returns {String} the pegjs grammar
 */
function generateNonFlatQueryStringParserGrammar(flattenedJsonSchema, sriConfigResourceMapping = {}) {
  // const allMultiValuedPropertyNamesSortedInReverse = Object.entries(flattenedJsonSchema)
  //   .filter(([k, v]) => k.endsWith('[*]'))
  //   .map(([k, v]) => encodeURIComponent(k))
  //   .sort().reverse();
  const allMultiValuedPropertyNamesSortedInReverse = Object.keys(flattenedJsonSchema)
    .filter((k) => k.endsWith('[*]'))
    .sort().reverse();
  // const allSingleValuedPropertyNamesSortedInReverse = Object.entries(flattenedJsonSchema)
  //   .filter(([k, v]) => !k.endsWith('[*]'))
  //   .map(([k, v]) => encodeURIComponent(k))
  //   .sort().reverse();
  const allSingleValuedPropertyNamesSortedInReverse = Object.keys(flattenedJsonSchema)
    .filter((k) => !k.endsWith('[*]'))
    .sort().reverse();
  // const allPropertyNamesSortedInReverse = Object.entries(flattenedJsonSchema)
  //   .map(([k, v]) => encodeURIComponent(k))
  // .sort().reverse();
  const allPropertyNamesSortedInReverse = Object.keys(flattenedJsonSchema).sort().reverse();

  const hasMultiValuedProperties = allMultiValuedPropertyNamesSortedInReverse.length > 0;

  const hasSingleValuedProperties = allSingleValuedPropertyNamesSortedInReverse.length > 0;

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
      { operator: { name: 'RESOURCE_PROPERTYNAME_IN', type: 'string', multiValued: true }, value: allPropertyNamesSortedInReverse }, // not count
      // OR
      // { metaProperty: 'RESOURCE_PROPERTYNAME', operator: 'IN', value: allPropertyNamesSortedInReverse }, // not count
    ], // OMIT/PROPERTYNAME_IN but also expansion could belong here ????
    listControl: [
      // $$includeCount=false
      { operator: { name: 'LIST_META_PROPERTYNAME_IN', type: 'string', multiValued: true }, value: ['created', 'modified', 'schema'] }, // not count
      // a more generic LIST_INCLUDE thing (not limited to the $$meta section) would partly
      // solve the default 'expand=FULL' issue, otherwise this would need to be yet another operator
      { operator: { name: 'LIST_PROPERTYNAME_IN', type: 'string', multiValued: true }, value: ['$$meta.created', '$$meta.modified', 'results[*].href', 'results[*].$$expanded'] }, // not count
      // OR
      // { metaProperty: 'LIST_PROPERTYNAME', operator: 'IN', value: value: ['$$meta.created', '$$meta.modified', 'results[*].href', 'results[*].$$expanded'] }, // not count

      { operator: { name: 'LIST_LIMIT', type: 'integer', multiValued: false }, value: sriConfig.defaultlimit || (sriConfig.defaultlimit ? Math.min(30, sriConfig.maxlimit) : 30) }, // not count
      { operator: { name: 'LIST_ORDER_BY', type: 'string', multiValued: true }, value: ['$$meta.created', 'key'] },
      { operator: { name: 'LIST_ORDER_DESCENDING', type: 'boolean', multiValued: false }, value: false },
    ] // _LIST_META_INCLUDE=count/_LIST_LIMIT/_LIST_ORDER_BY/_LIST_ORDER_DESCENDING etc.
  }

  // const allPropertyNamesSortedInReverse = Object.keys(flattenedJsonSchema).sort().reverse();
  const grammar = `
    { //////// START OF JAVASCRIPT FUNCTIONS BLOCK ////////
      // everything that is not overwritten will be set to the default
      const defaultParseTree = ${JSON.stringify(defaultParseTree, null, 2)};

      ${normalizeRowFilter.toString()};

      ${convertValue.toString()};

      ${translateValueType.toString()};

      ${produceValue.toString()}

      ${mergeArrays.toString()}

      ${parsedQueryStringToParseTreeWithDefaults.toString()}

    } //////// END OF JAVASCRIPT FUNCTIONS BLOCK ////////


    // ParsedQueryStringWithDefaultsAppliedAndNormalizedAndSorted = pqs:ParsedQueryStringWithDefaultsApplied {
    //   let retVal = {
    //     ...pqs,
    //     rowFilters: pqs.rowFilters.map((rowFilter) => normalizeRowFilter(rowFilter)),
    //     columnFilters: [ ...pqs.columnFilters ].sort((a, b) => );
    //     listControl: [ ...pqs.listControl ].sort((a, b) => );
    //   };

    //   return retVal;
    // }


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
      = ( fn:RowFilter "=" v:UnparsedValue {
          return { type: 'ROW_FILTER', ...fn, value: produceValue(fn.property, fn.operator, v) }
        } )
      / ( lcp:ListControlParameter "=" v:UnparsedValue {
          return { type: 'LIST_CONTROL', ...lcp, value: produceValue(lcp.property, lcp.operator, v) } 
        } )


    // Missing operator is considered to mean equals (and thus translated to IN)
    RowFilter
        = p:Property ne:OperatorNegator ? op:RowFilterOperator ? ci:CaseInsensitive ? {
          return { property: p, operator: op || { name: 'EQ', multiValued: false }, invertOperator: !!ne, caseInsensitive: ci === null ? true : ci /*, expectedValue: produceExpectedValue(property, op)*/ };
        }
      / p:Property cs:OperatorCaseSensitive ? ne:OperatorNegator ? op:RowFilterOperator ? {
          return { property: p, operator: op || { name: 'EQ', multiValued: false }, invertOperator: !!ne, caseInsensitive: !cs /*, expectedValue: produceExpectedValue(property, op)*/ };
        }

    ListControlParameter = op:ListControlOperator { return { operator: op } }

    OperatorCaseSensitive = "CaseSensitive" { return true }

    OperatorNegator
      = "_NOT" / "Not"

    RowFilterOperator = MultiValuedOperator / SingleValuedOperator

    MultiValuedOperator = operatorName:(
        ( "_IN"i / "In" ) { return 'IN' }
        / ( "_OVERLAPS"i / "Overlaps" ) { return 'OVERLAPS' }
        / ( "_CONTAINS"i / "Contains" ) { return 'CONTAINS' }
        // ( / "_NOT"i / "Not" ) { return 'NOT' }
      ) { return { name: operatorName, multiValued: true } }

    SingleValuedOperator = operatorName:(
        ( "_GTE"i / "GreaterOrEqual" ) { return 'GTE' }
        / ( "_LTE"i / "LessOrEqual" ) { return 'LTE' }
        / ( "_GT"i / "Greater" ) { return 'GT' }
        / ( "_LT"i / "Less" ) { return 'LT' }
        / ( "_LIKE"i / "Like" / "Matches" ) { return 'LIKE' }
        // ( / "_NOT" / "Not" ) { return 'NOT' }
      ) { return { name: operatorName, multiValued: false } }

    CaseInsensitive = "_I" { return true }

    UnparsedValue = v:([^&]+) { return v.join('') /* decodeURIComponent(v.join('').replace(/\\+/g, ' ')) */ }

    // TODO: make sure we can properly parse an encoded value,
    // so we can put the intelligence of understanding arrays (or arrays of arrays with parentheses)
    // in here for example!
    MultiValue = sv1:(SingleValue) v23etc:( CommmaCharacter sv2:SingleValue { return sv2 } )*
      // { return [v1, ...v23etc] }

    SingleValue = $( SingleValueCharacter* )

    SingleValueCharacter = !(CommmaCharacter / '&') (
         SpaceCharacter / PercentEncodedCharacter / [^&,]
      )

    CommmaCharacter = ',' / '%2C' { return ',' }

    SpaceCharacter = '+' / '%20' / ' ' { return ' ' }

    PercentEncodedCharacter = c:('%' [0-9A-F] [0-9A-F]) { return decodeURIComponent(c) }


    // for the future when maybe we also have multi-valued control parameters
    ListControlOperator = 
      // shouldn't this be _LIST_LIMIT ?
      ( "_LIMIT" / "limit" ) { return { name: 'LIST_LIMIT', type: 'integer', multiValued: false } }
      / ( "_EXPANSION" / "expand" ) { return { name: 'EXPANSION', type: 'string', multiValued: true } }
      // shouldn't this be _LIST_OFFSET ?
      / ( "_OFFSET" / "offset" ) { return { name: 'LIST_OFFSET', type: 'integer', multiValued: false } }
      // shouldn't this be _LIST_KEYOFFSET ?
      / ( "_KEYOFFSET" / "keyOffset" )  { return { name: 'LIST_KEY_OFFSET', type: 'string', multiValued: true } }
      / ( "_LIST_META_INCLUDE_COUNT" / "%24%24includeCount" ) { return { name: 'LIST_META_INCLUDE_COUNT', type: 'boolean', multiValued: false } }
      / ( "_LIST_ORDER_BY" / "orderBy" ) { return { name: 'LIST_ORDER_BY', type: 'string', multiValued: true } }
      / ( "_LIST_ORDER_DESCENDING" / "descending" ) { return { name: 'LIST_ORDER_DESCENDING', type: 'boolean', multiValued: false } }

    // important to list the longest properties first (if a shorter property's name is the start of a longer property's name) !!!
    // example: "firstNameCapital" / "firstName" / "lastName"
    Property = ${
        allPropertyNamesSortedInReverse.map(n => {
          const type = flattenedJsonSchema[n].type || 'string';
          return `p:"${encodeURIComponent(n)}" { return { name: '${decodeURIComponent(n)}', type: '${type}', multiValued: ${n.endsWith('[*]')} } }`;
        })
        .join(' / ')
      }

    // if there are no multi-valued properties (simple 'non-object' arrays) we'll match on '\' because it should not be in any url
    // this keeps things simpler (as in: the grammar always has MultiValuedProperty defined but it should never match anything in real life)
    // WARNING:by splitting them up into MultiValuedProperty and SingleValuedProperty we could potentially get invalid matches
    //    if for example "data" would be a MultiValuedProperty and "database" a SingleValuedProperty
    //    the MultiValuedProperty would match first (the way it's currently written)
    MultiValuedProperty =
        ${ hasMultiValuedProperties
            ? `p:(
              ${allMultiValuedPropertyNamesSortedInReverse.map(n => `"${encodeURIComponent(n)}"`).join(' / ')}
              ) { return decodeURIComponent(p) }
            `
            : '"\\\\"'
        }
      

    SingleValuedProperty =
      ${ hasSingleValuedProperties
        ? `p:(
          ${allSingleValuedPropertyNamesSortedInReverse.map(n => `"${encodeURIComponent(n)}"`).join(' / ')}
          ) { return decodeURIComponent(p) }
        `
        : '"\\\\"'
      }
  `;

  // ${ allPropertyNamesSortedInReverse.map(n => `"${n}"`).join(' / ') }

  return grammar;
}



module.exports = {
  generateNonFlatQueryStringParserGrammar,
  mergeArrays,
}