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
declare function generateFlatQueryStringParserGrammar(flattenedJsonSchema: any): string;
export { generateFlatQueryStringParserGrammar, };
