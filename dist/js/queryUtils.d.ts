import { TPreparedSql, TResourceDefinition } from './typeDefinitions';
import { defaultFilter } from './defaultFilter';
/**
 *
 * @param href
 * @param query
 * @param parameter
 * @param mapping
 */
declare function filterHrefs(href: string, query: TPreparedSql, _parameter: string, mapping: TResourceDefinition): void;
declare function filterReferencedType(resourcetype: string, columnname: string): (value: any, query: any) => void;
declare function modifiedSince(value: any, query: TPreparedSql, mapping: TResourceDefinition): TPreparedSql;
export { filterHrefs, filterReferencedType, modifiedSince, defaultFilter, };
