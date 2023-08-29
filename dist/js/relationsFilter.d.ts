import { IDatabase } from 'pg-promise';
import { TPreparedSql, TResourceDefinition } from './typeDefinitions';
declare function fromTypesFilter(value: string, select: TPreparedSql, _key: string, _database: IDatabase<unknown>, _count: number, mapping: TResourceDefinition): void;
declare function toTypesFilter(value: string, select: TPreparedSql, _key: string, _database: IDatabase<unknown>, _count: number, mapping: TResourceDefinition): void;
declare function fromsFilter(value: string, select: TPreparedSql, _key: any, _database: IDatabase<unknown>, _count: any, mapping: any): void;
declare function tosFilter(value: string, select: TPreparedSql, _key: any, _database: IDatabase<unknown>, _count: any, mapping: any): void;
export { fromTypesFilter as fromTypes, toTypesFilter as toTypes, tosFilter as tos, fromsFilter as froms, };
