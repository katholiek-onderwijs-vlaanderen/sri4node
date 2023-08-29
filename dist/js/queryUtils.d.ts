import { TPreparedSql, TResourceDefinition } from './typeDefinitions';
import { defaultFilter } from './defaultFilter';
declare function filterHrefs(href: string, query: TPreparedSql, mapping: TResourceDefinition): void;
declare function filterReferencedType(resourcetype: string, columnname: string): (value: any, query: any) => void;
declare function modifiedSince(value: any, query: TPreparedSql, mapping: TResourceDefinition): TPreparedSql;
export { filterHrefs, filterReferencedType, modifiedSince, defaultFilter, };
