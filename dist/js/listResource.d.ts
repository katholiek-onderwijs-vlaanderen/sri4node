/// <reference types="node" />
import url from "url";
import { TResourceDefinitionInternal, TSriRequestExternal, TPreparedSql, TInformationSchema, TSriInternalUtils } from "./typeDefinitions";
import { IDatabase } from "pg-promise";
import { PhaseSyncer } from "./phaseSyncedSettle";
import { IClient } from "pg-promise/typescript/pg-subset";
declare function getSQLFromListResource(mapping: TResourceDefinitionInternal, parameters: url.URLSearchParams, doCount: boolean, tx: IDatabase<unknown>, query: TPreparedSql, informationSchema: TInformationSchema): Promise<void>;
declare function getListResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown, IClient>, sriRequest: TSriRequestExternal, mapping: TResourceDefinitionInternal, sriInternalUtils: TSriInternalUtils, informationSchema: TInformationSchema, resources: Array<TResourceDefinitionInternal>): Promise<{
    status: number;
    body: any;
}>;
declare function isPartOf(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown, IClient>, sriRequest: TSriRequestExternal, mapping: TResourceDefinitionInternal, _sriInternalUtils: TSriInternalUtils, informationSchema: TInformationSchema): Promise<{
    status: number;
    body: string[];
}>;
export { getListResource, getSQLFromListResource, isPartOf };
