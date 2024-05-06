/// <reference types="node" />
import { IDatabase } from "pg-promise";
import { TPreparedSql, TResourceDefinitionInternal } from "./typeDefinitions";
declare function fromTypesFilter(value: string, select: TPreparedSql, _key: string, _database: IDatabase<unknown>, _doCount: boolean, mapping: TResourceDefinitionInternal, _urlParameters: URLSearchParams): void;
declare function toTypesFilter(value: string, select: TPreparedSql, _key: string, _database: IDatabase<unknown>, _doCount: boolean, mapping: TResourceDefinitionInternal, _urlParameters: URLSearchParams): void;
declare function fromsFilter(value: string, select: TPreparedSql, _key: string, _database: IDatabase<unknown>, _doCount: boolean, mapping: TResourceDefinitionInternal, _urlParameters: URLSearchParams): void;
declare function tosFilter(value: string, select: TPreparedSql, _key: string, _database: IDatabase<unknown>, _doCount: boolean, mapping: TResourceDefinitionInternal, _urlParameters: URLSearchParams): void;
export { fromTypesFilter as fromTypes, toTypesFilter as toTypes, tosFilter as tos, fromsFilter as froms, };
