import { TSriRequestExternal, TBeforePhaseHook, TInformationSchema, TSriInternalUtils, TResourceDefinitionInternal } from "./typeDefinitions";
import { PhaseSyncer } from "./phaseSyncedSettle";
import { IDatabase } from "pg-promise";
declare const beforePhaseQueryByKey: TBeforePhaseHook;
declare function getRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequestExternal, mapping: TResourceDefinitionInternal, sriInternalUtils: TSriInternalUtils, _informationSchema: TInformationSchema, resources: Array<TResourceDefinitionInternal>): Promise<{
    status: number;
    body: any;
}>;
declare const beforePhaseInsertUpdateDelete: TBeforePhaseHook;
declare function createOrUpdateRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequestExternal, mapping: TResourceDefinitionInternal, sriInternalUtils: TSriInternalUtils, informationSchema: TInformationSchema): Promise<{
    status: number;
}>;
declare function patchRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequestExternal, mapping: TResourceDefinitionInternal, sriInternalUtils: TSriInternalUtils, informationSchema: TInformationSchema): Promise<{
    status: number;
}>;
declare function deleteRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequestExternal, mapping: TResourceDefinitionInternal, sriInternalUtils: TSriInternalUtils): Promise<{
    status: number;
}>;
export { getRegularResource, createOrUpdateRegularResource, patchRegularResource, deleteRegularResource, beforePhaseQueryByKey, beforePhaseInsertUpdateDelete, };
