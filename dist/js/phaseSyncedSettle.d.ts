/// <reference types="node" />
import pSettle from "p-settle";
import queue from "emitter-queue";
import Emitter from "events";
import { TSriRequestHandlerForPhaseSyncer, TResourceDefinitionInternal, TSriInternalUtils, TInformationSchema, TBeforePhaseHook, TSriInternalConfig, TSriRequest, TSriResult } from "./typeDefinitions";
import { IDatabase, ITask } from "pg-promise";
/**
 * "Phase syncing" is a way to control synchronization between multiple requests handlers (multiple items
 * of batch request). Jobs (sri request handlers) are divided into 'phases' (steps, subtasks) and jobs are
 * only allowed to go the next phase when all other handlers have also finished their current phase.
 *
 * This mechanism is used for handling parallel batch requests to be able to implements things like:
 *  - run all before before-* hooks before database changes
 *  - run all after-* hooks after all database changes
 *  - gathering data from all requests before handling this data in one sql command
 *  ...
 */
declare class PhaseSyncer {
    #private;
    /**
     * unique identifier of each PhaseSyncer instance
     */
    id: string;
    /**
     * indicates the number of the phase this PhaseSyncer instance is executing
     */
    phaseCntr: number;
    /**
     * channel for communication from the PhaseSyncer instance towards the controlling process
     */
    ctrlEmitter: any;
    /**
     * channel for communication from the controlling process towards the PhaseSyncer instance
     */
    jobEmitter: queue;
    /**
     * promise of the jobWrapperFun which runs the sri request handler
     */
    jobPromise: Promise<any>;
    constructor(fun: TSriRequestHandlerForPhaseSyncer, args: readonly [
        tx: IDatabase<unknown> | ITask<unknown>,
        sriRequest: TSriRequest,
        resourceDefinition: TResourceDefinitionInternal | null
    ], sriInternalUtils: TSriInternalUtils, informationSchema: TInformationSchema, resources: TResourceDefinitionInternal[], ctrlEmitter: Emitter);
    /**
     * This function needs to be called by the sri request handler at the end of each phase
     * (i.e. at each synchronisation point).
     */
    phase(): Promise<void>;
    get sriRequest(): TSriRequest;
}
/**
 * This function will create a new bunch of PhaseSyncer instances:
 * one for each job from the jobList (i.e. one for each item of a parallel batch[part]).
 *
 * It will then control the effective synchronisation between the PhaseSyncer instances (by keeping
 * track of state and passing events based on state).
 *
 * @param jobList
 * @param {Object} parameters - object containing optional parameters
 * @param {string} parameters.concurrency - the number of jobs which is allowed to run concurrent
 * @param {string} parameters.beforePhaseHooks - hooks which will be called before starting each new phase
 * @returns
 */
declare function phaseSyncedSettle(jobList: Array<readonly [
    TSriRequestHandlerForPhaseSyncer,
    readonly [
        IDatabase<unknown> | ITask<unknown>,
        TSriRequest,
        TResourceDefinitionInternal | null
    ]
]>, { concurrency, beforePhaseHooks, }: {
    concurrency?: number | undefined;
    beforePhaseHooks?: TBeforePhaseHook[] | undefined;
} | undefined, sriInternalConfig: TSriInternalConfig, sriInternalUtils: TSriInternalUtils): Promise<Array<pSettle.PromiseResult<TSriResult>>>;
export { phaseSyncedSettle };
export type { PhaseSyncer };
