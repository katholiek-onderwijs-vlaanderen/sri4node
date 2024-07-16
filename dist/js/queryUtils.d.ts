/// <reference types="node" />
import { TPreparedSql, TResourceDefinitionInternal } from "./typeDefinitions";
import { defaultFilter } from "./defaultFilter";
import { IDatabase, ITask } from "pg-promise";
/**
 *
 * @param href
 * @param query
 * @param parameter
 * @param mapping
 */
declare function filterHrefs(href: string, query: TPreparedSql, _parameter: string, _tx: IDatabase<unknown> | ITask<unknown>, _doCount: boolean, mapping: TResourceDefinitionInternal, _urlParameters: URLSearchParams): void;
declare function filterReferencedType(resourcetype: string, columnname: string): (value: any, query: any) => void;
declare function modifiedSince(value: string, query: TPreparedSql, _parameter: string, _tx: IDatabase<unknown> | ITask<unknown>, _doCount: boolean, mapping: TResourceDefinitionInternal, _urlParameters: URLSearchParams): TPreparedSql;
export { filterHrefs, filterReferencedType, modifiedSince, defaultFilter };
