import peggy from 'peggy';
import { FlattenedJsonSchema, TResourceDefinition, TSriConfig } from '../typeDefinitions';
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
declare function generateNonFlatQueryStringParserGrammar(flattenedJsonSchema: FlattenedJsonSchema, sriConfigDefaults?: TSriConfig, sriConfigResourceDefinition?: TResourceDefinition): string;
interface SriParser extends peggy.Parser {
    origParse: typeof peggy.parser.parse;
}
declare function generateNonFlatQueryStringParser(sriConfigDefaults?: TSriConfig, sriConfigResourceDefinition?: TResourceDefinition, allowedStartRules?: string[] | undefined): SriParser;
export { SriParser, generateNonFlatQueryStringParserGrammar, generateNonFlatQueryStringParser, };
