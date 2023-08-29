import { TSriRequest, TBeforePhase, TResourceDefinition } from './typeDefinitions';
import { PhaseSyncer } from './phaseSyncedSettle';
import { IDatabase } from 'pg-promise';
declare const beforePhaseQueryByKey: TBeforePhase;
declare function getRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequest, mapping: TResourceDefinition): Promise<{
    status: number;
    body: any;
}>;
declare function beforePhaseInsertUpdateDelete(sriRequestMap: any, _jobMap: any, _pendingJobs: any): Promise<void>;
declare function createOrUpdateRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequest, mapping: TResourceDefinition): Promise<{
    status: number;
}>;
declare function patchRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequest, mapping: TResourceDefinition): Promise<{
    status: number;
}>;
declare function deleteRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequest, mapping: TResourceDefinition): Promise<{
    status: number;
}>;
export { getRegularResource, createOrUpdateRegularResource, patchRegularResource, deleteRegularResource, beforePhaseQueryByKey, beforePhaseInsertUpdateDelete, };
