/// <reference types="node" />
import { IDatabase } from 'pg-promise';
import { TPreparedSql, TResourceDefinition } from './typeDefinitions';
import { ParsedUrlQuery } from 'querystring';
declare function fromTypesFilter(value: string, select: TPreparedSql, _key: string, _database: IDatabase<unknown>, _doCount: boolean, mapping: TResourceDefinition, _urlParameters: ParsedUrlQuery): void;
declare function toTypesFilter(value: string, select: TPreparedSql, _key: string, _database: IDatabase<unknown>, _doCount: boolean, mapping: TResourceDefinition, _urlParameters: ParsedUrlQuery): void;
declare function fromsFilter(value: string, select: TPreparedSql, _key: string, _database: IDatabase<unknown>, _doCount: boolean, mapping: TResourceDefinition, _urlParameters: ParsedUrlQuery): void;
declare function tosFilter(value: string, select: TPreparedSql, _key: string, _database: IDatabase<unknown>, _doCount: boolean, mapping: TResourceDefinition, _urlParameters: ParsedUrlQuery): void;
export { fromTypesFilter as fromTypes, toTypesFilter as toTypes, tosFilter as tos, fromsFilter as froms, };
