/// <reference types="node" />
import { TResourceDefinition, TSriRequest, TPreparedSql } from './typeDefinitions';
import { IDatabase } from 'pg-promise';
import { ParsedUrlQuery } from 'querystring';
declare function getSQLFromListResource(mapping: TResourceDefinition, parameters: ParsedUrlQuery, doCount: boolean, tx: IDatabase<unknown>, query: TPreparedSql): Promise<void>;
declare function getListResource(phaseSyncer: any, tx: any, sriRequest: TSriRequest, mapping: TResourceDefinition): Promise<{
    status: number;
    body: any;
}>;
declare function isPartOf(phaseSyncer: any, tx: any, sriRequest: any, mapping: any): Promise<{
    status: number;
    body: string[];
}>;
export { getListResource, getSQLFromListResource, isPartOf, };
