import * as pSettle from 'p-settle';
import * as pEvent from 'p-event';
import * as pMap from 'p-map';
import * as queue from 'emitter-queue';
import * as Emitter from 'events';
import * as _ from 'lodash';
import { SriError, TSriRequestHandlerForPhaseSyncer, TSriRequest, TResourceDefinition } from './typeDefinitions';
import { debug, error, getParentSriRequestFromRequestMap } from './common';
import { IDatabase } from 'pg-promise';
import { applyHooks } from './hooks';

const { v4: uuidv4 } = require('uuid');


const debug_log = (id, msg) => {
  debug('phaseSyncer', `PS -${id}- ${msg}`);
};

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
class PhaseSyncer {
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

  /**
   * SriRequest associated with the PhaseSyncer instance
   */
  #sriRequest: TSriRequest;

  constructor(
    fun: TSriRequestHandlerForPhaseSyncer,
    args: [IDatabase<unknown>, TSriRequest, TResourceDefinition],
    ctrlEmitter:Emitter,
  ) {
    this.ctrlEmitter = ctrlEmitter;
    this.id = uuidv4();
    this.phaseCntr = 0;
    this.jobEmitter = queue(new Emitter());
    this.#sriRequest = args[1];

    /**
     * A wrapper around the sri request handler dealing with sending synchronisation events.
     * @returns result of the sri request handler
     */
    const jobWrapperFun = async () => {
      try {
        const res = await fun(this, ...args);
        this.ctrlEmitter.queue('jobDone', this.id);
        this.sriRequest.ended = true;
        return res;
      } catch (err) {
        this.ctrlEmitter.queue('jobFailed', this.id);
        this.sriRequest.ended = true;
        throw err;
      }
    };
    this.jobPromise = jobWrapperFun();
    debug_log(this.id, 'PhaseSyncer constructed.');
  }

  /**
   * This function needs to be called by the sri request handler at the end of each phase 
   * (i.e. at each synchronisation point).
   */
  async phase() {
    debug_log(this.id, `STEP ${this.phaseCntr}`);
    if (this.phaseCntr > 0) {
      this.ctrlEmitter.queue('stepDone', this.id, this.phaseCntr);
    }
    this.phaseCntr += 1;

    const result:any = await pEvent(this.jobEmitter, ['sriError', 'ready']);
    if (result instanceof SriError || result?.__proto__?.constructor?.name === 'SriError') {
      throw result;
    }
  }

  get sriRequest() { return this.#sriRequest; }
}

const splitListAt = (list, index) => [list.slice(0, index), list.slice(index)];

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
async function phaseSyncedSettle(
  jobList,
  { concurrency, beforePhaseHooks }:
    { concurrency?:number, beforePhaseHooks?:any[] }
  = {},
) {
  /**
   * channel used to communicate between the controller process (this function) and the PhaseSyncer instances.
   */
  const ctrlEmitter = queue(new Emitter());

  /**
   * With jobMap, PhaseSyncer instances can be retrieved by their PhaseSyncer IDs.
   */
  const jobMap: Map<string, PhaseSyncer> = new Map(
    jobList
      .map(([fun, args]) => new PhaseSyncer(fun, args, ctrlEmitter))
      .map((phaseSyncer: PhaseSyncer) => [phaseSyncer.id, phaseSyncer]),
  );

  /**
   * The Set pendingJobs keep track of which jobs are still in progress (jobs which are terminated by
   *  error or which are finished are removed from this set).
   */
  const pendingJobs = new Set(jobMap.keys());

  /**
   * With sriRequestMap, sriRequest objects can be retrieved by the ID of the PhaseSyncer instance 
   * associated with the sriRequest.
   */
  const sriRequestMap = new Map(
    [...jobMap.entries()]
      .map(([id, phaseSyncer]: [string, PhaseSyncer]) => [id, phaseSyncer.sriRequest]),
  );

  /**
   * With sriRequestIDToPhaseSyncerMap, PhaseSyncer instances can be retrieved by the ID of the sriRequest
   * associated with the PhaseSyncer instance.
   */
  const sriRequestIDToPhaseSyncerMap = new Map(
    [...jobMap.entries()]
      .map(([_id, phaseSyncer]: [string, PhaseSyncer]) => [phaseSyncer.sriRequest.id, phaseSyncer]),
  );

  /**
   * queuedJobs keeps tracks of ID's of jobs waiting to be started their phase. This is nescessary in case
   * a batch contains more jobs then the 'concurrency' allows to be running at the same time.
   * When a job finishes its phase, one from the queue will be started.
   */
  let queuedJobs : Set<string>;

  /**
   * The set phasePendingJobs keeps track of the jobs which did not yet complete the current phase. When a
   * job finishes his phase, it is removed from the set. When a new phase is started, phasePendingJobs is
   * set to the content of pendingJobs.
   */
  let phasePendingJobs : Set<string>;

  /**
   * In case of batches which consist not only of read items, it makes no sense to continue after failure of 
   * an item  (as the transaction will be rolled back). In such case, the other items of the batch will be
   * when an error has encoutered. The boolean failureHasBeenBroadcasted is used to indicate wether the
   * notification is already happened or not.
   */
  let failureHasBeenBroadcasted : boolean = false;

  try {
    /**
     * This function will start a new phase, this means notifying all jobs they can start exectuting their
     * phase in case there are less jobs then concurrency allows. In case there are more jobs then allowed
     * to run concurrently, only notify as many as are allowed to run concurrently and put the remainder in
     * the jobQueue.
     */
    const startNewPhase = async () => {
      const pendingJobList = [...pendingJobs.values()];
      const [jobsToWake, jobsToQueue] = splitListAt(pendingJobList, concurrency || 1);

      queuedJobs = new Set(jobsToQueue);
      phasePendingJobs = new Set(pendingJobs);

      if (jobsToWake.length > 0) {
        // Only handle beforePhaseHooks when there are jobs to wake - otherwise the phaseSyncer 
        // will be terminated
        await applyHooks('ps',
          beforePhaseHooks || [],
          (f) => f(sriRequestMap, jobMap, pendingJobs),
          getParentSriRequestFromRequestMap(sriRequestMap));
      }

      jobsToWake.forEach((id) => {
        const job = jobMap.get(id);
        if (job) {
          job.jobEmitter.queue('ready');
        } else {
          error("PhaseSyncer: job not found in jobMap");
          throw new Error("PhaseSyncer: job not found in jobMap");
        }
      });
    };

    /**
     * This function will notify next job in queue it can start with execution of his current phase
     * and remove the job from the queue.
     */
    const startQueuedJob = () => {
      if ((phasePendingJobs.size - queuedJobs.size) > (concurrency || 1)) {
        error("ERROR: PhaseSyncer: unexpected startQueuedJob() call while max number of concurrent jobs is still running ! -> NOT starting queued job");
      } else {
        if (queuedJobs.size > 0) {
          const id : string = queuedJobs.values().next().value;
          const job = jobMap.get(id);
          if (job) {
            job.jobEmitter.queue('ready');
          } else {
            error("PhaseSyncer: job not found in jobMap");
            throw new Error("PhaseSyncer: job not found in jobMap");
          }
          queuedJobs.delete(id);
        }
      }
    };

    /**
     * A wrapper for around the functions handling events, as they all needs the same error handling.
     * @param fun function to wrap with error handling
     */
    const errorHandlingWrapper = (fun) => async (id: string, args) => {
      try {
        await fun(id, args);
      } catch (err) {
        if (err instanceof SriError || err?.__proto__?.constructor?.name === 'SriError') {
          // If the SriError is generated in a beforePhaseHook (which is ran at 'global' level for all batch)
          // we receive the id of the phaseSyncer who executed 'phase()' first, this is random and probably
          // not the one which corresponds to the error.
          // In such cases an id of the relevant (sub)sriRequest of the batch can be passed with the error, so
          // we can retrieve the phaseSyncer of the relevant (sub)sriRequest.
          if (err.sriRequestID && sriRequestIDToPhaseSyncerMap.get(err.sriRequestID)) {
            sriRequestIDToPhaseSyncerMap.get(err.sriRequestID)?.jobEmitter.queue('sriError', err);
            return;
          }
          if (jobMap.get(id)) {
            jobMap.get(id)?.jobEmitter.queue('sriError', err);
            return;
          }
        }
        console.error(`\nERROR: ${err} - ${JSON.stringify(err)}\n`);
      }
    };

    ctrlEmitter.on('stepDone', errorHandlingWrapper(async (id: string, stepnr) => {
      debug_log(id, `*step ${stepnr}* done.`);
      phasePendingJobs.delete(id);

      if (getParentSriRequestFromRequestMap(sriRequestMap).reqCancelled) {
        throw new SriError({ status: 0, errors: [{ code: 'cancelled', msg: 'Request cancelled by client.' }] });
      }

      if (phasePendingJobs.size === 0) {
        debug_log(id, ' Starting new phase.');
        await startNewPhase();
      } else {
        debug_log(id, ' Starting queued job.');
        startQueuedJob();
      }
    }));

    ctrlEmitter.on('jobDone', errorHandlingWrapper(async (id: string) => {
      debug_log(id, '*JOB* done.');

      pendingJobs.delete(id);
      queuedJobs.delete(id);
      phasePendingJobs.delete(id);

      if (phasePendingJobs.size === 0) {
        await startNewPhase();
      } else {
        startQueuedJob();
      }
    }));

    ctrlEmitter.on('jobFailed', errorHandlingWrapper(async (id: string) => {
      debug_log(id, '*JOB* failed.');

      pendingJobs.delete(id);
      queuedJobs.delete(id);
      phasePendingJobs.delete(id);

      if (getParentSriRequestFromRequestMap(sriRequestMap).readOnly === true) {
        if (phasePendingJobs.size === 0) {
          await startNewPhase();
        } else {
          startQueuedJob();
        }
      } else if (!failureHasBeenBroadcasted) {
        const parent = getParentSriRequestFromRequestMap(sriRequestMap);
        failureHasBeenBroadcasted = true;
        // failure of one job in batch leads to failure of the complete batch
        //  --> notify the other jobs of the failure (only if they are not part
        //      of a failed multi* operation)
        await pMap(pendingJobs, async (id) => {
          const job = jobMap.get(id);

          if (job === undefined) {
            throw new Error('[jobFailed] Job is undefined, which is unexpected...');
          } else if (
            job.sriRequest === undefined ||
            (
                 !(parent.multiInsertFailed && parent.putRowsToInsertIDs?.includes(job?.sriRequest.id))
              && !(parent.multiUpdateFailed && parent.putRowsToUpdateIDs?.includes(job?.sriRequest.id))
              && !(parent.multiDeleteFailed && parent.rowsToDeleteIDs?.includes(job?.sriRequest.id))
            )
          ) {
            job?.jobEmitter.queue(
              'sriError',
              new SriError({ status: 202, errors: [{ code: 'cancelled', msg: 'Request cancelled due to failure in accompanying request in batch.' }] }),
            );
          }
        });
      }
      if (phasePendingJobs.size === 0) {
        await startNewPhase();
      } else {
        await startQueuedJob();
      }
    }));

    await startNewPhase();
    return pSettle([...jobMap.values()].map((phaseSyncer) => phaseSyncer.jobPromise));
  } catch (err) {
    console.warn('WARN: error in phase syncer');
    console.warn(err);
    console.warn(JSON.stringify(err));
    let sriError;
    if (err instanceof SriError || err?.__proto__?.constructor?.name === 'SriError') {
      sriError = err;
    } else {
      sriError = new SriError({ status: 500, errors: [{ code: 'phase.synced.settle.failed', err: err.toString() }] });
    }
    pendingJobs.forEach((id) => {
      jobMap.get(id)?.jobEmitter.queue(
        'sriError',
        new SriError({
          status: 202,
          errors:
            [{ code: 'cancelled', msg: 'Request cancelled due to failure in accompanying request in batch.' }],
        }),
      );
    });
    await pSettle([...jobMap.values()].map((phaseSyncer) => phaseSyncer.jobPromise));
    return [...jobMap.values()].map((phaseSyncer) => ({ isFulfilled: false, reason: sriError }));
  }
}

export {
  phaseSyncedSettle,
};

export type { PhaseSyncer };