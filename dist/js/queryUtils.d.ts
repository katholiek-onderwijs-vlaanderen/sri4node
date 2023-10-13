/// <reference types="node" />
import { TPreparedSql, TResourceDefinition } from './typeDefinitions';
import { defaultFilter } from './defaultFilter';
import { IDatabase } from 'pg-promise';
import { IClient } from 'pg-promise/typescript/pg-subset';
import { ParsedUrlQuery } from 'querystring';
/**
 *
 * @param href
 * @param query
 * @param parameter
 * @param mapping
 */
declare function filterHrefs(href: string, query: TPreparedSql, _parameter: string, _tx: IDatabase<unknown, IClient>, _doCount: boolean, mapping: TResourceDefinition, _urlParameters: ParsedUrlQuery): void;
declare function filterReferencedType(resourcetype: string, columnname: string): (value: any, query: any) => void;
declare function modifiedSince(value: string, query: TPreparedSql, _parameter: string, _tx: IDatabase<unknown, IClient>, _doCount: boolean, mapping: TResourceDefinition, _urlParameters: ParsedUrlQuery): TPreparedSql;
export { filterHrefs, filterReferencedType, modifiedSince, defaultFilter, };
