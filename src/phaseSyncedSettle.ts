// import * as pSettle from 'p-settle';
import * as pSettle from 'p-settle';
import * as pFinally from 'p-finally';
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
 * PhaseSyncer is a way to control synchronization between multiple
 * requests handlers, that can only go to the next phase
 * when all others have finished their 'step' from the same phase.
 *
 *
 */
class PhaseSyncer {
  ctrlEmitter: any;

  id: any;

  phaseCntr: number;

  jobEmitter: queue;

  jobPromise: Promise<any>;

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
 *
 *
 * @param jobList
 * @param param1
 * @returns
 */
async function phaseSyncedSettle(
  jobList,
  { concurrency, beforePhaseHooks }:
    { concurrency?:number, beforePhaseHooks?:any[] }
  = {},
) {
  const ctrlEmitter = queue(new Emitter());
  const jobMap: Map<string, PhaseSyncer> = new Map(
    jobList
      .map(([fun, args]) => new PhaseSyncer(fun, args, ctrlEmitter))
      .map((phaseSyncer: PhaseSyncer) => [phaseSyncer.id, phaseSyncer]),
  );
  const pendingJobs = new Set(jobMap.keys());
  const sriRequestMap = new Map(
    [...jobMap.entries()]
      .map(([id, phaseSyncer]: [string, PhaseSyncer]) => [id, phaseSyncer.sriRequest]),
  );

  const sriRequestIDToPhaseSyncerMap = new Map(
    [...jobMap.entries()]
      .map(([_id, phaseSyncer]: [string, PhaseSyncer]) => [phaseSyncer.sriRequest.id, phaseSyncer]),
  );

  let queuedJobs;
  let phasePendingJobs;
  let failureHasBeenBroadcasted = false;

  try {
    const startNewPhase = async () => {
      const pendingJobList = [...pendingJobs.values()];
      const [jobsToWake, jobsToQueue] = splitListAt(pendingJobList, concurrency || 1);

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
          // debug('phaseSyncer', 'emitting "ready"');
          job.jobEmitter.queue('ready');
        } else {
          error("PhaseSyncer: job not found in jobMap");
          throw new Error("PhaseSyncer: job not found in jobMap");
        }
      });
      queuedJobs = new Set(jobsToQueue);
      phasePendingJobs = new Set(pendingJobs);
    };

    const startQueuedJob = () => {
      if (queuedJobs.size > 0) {
        const id = queuedJobs.values().next().value;
        const job = jobMap.get(id);
        if (job) {
          // debug('phaseSyncer', 'emitting "ready"');
          job.jobEmitter.queue('ready');
        } else {
          error("PhaseSyncer: job not found in jobMap");
          throw new Error("PhaseSyncer: job not found in jobMap");
        }
        queuedJobs.delete(id);
      }
    };

    const errorHandlingWrapper = (fun) => async (id, args) => {
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

    ctrlEmitter.on('stepDone', errorHandlingWrapper(async (id, stepnr) => {
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

    ctrlEmitter.on('jobDone', errorHandlingWrapper(async (id) => {
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

    ctrlEmitter.on('jobFailed', errorHandlingWrapper(async (id) => {
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
        pMap(pendingJobs, async (id) => {
          const job = jobMap.get(id);
          if (!(parent.multiInsertFailed && parent.PutRowsToInsertIDs?.includes(job?.sriRequest.id))
              && !(parent.multiUpdateFailed && parent.PutRowsToUpdateIDs?.includes(job?.sriRequest.id))
              && !(parent.multiDeleteFailed && parent.rowsToDeleteIDs?.includes(job?.sriRequest.id))) {
            job?.jobEmitter.queue(
              'sriError',
              new SriError({ status: 202, errors: [{ code: 'cancelled', msg: 'Request cancelled due to failure in accompanying request in batch.' }] }),
            );
          } else if (phasePendingJobs.size === 0) {
            await startNewPhase();
          } else {
            startQueuedJob();
          }
        });
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
  PhaseSyncer,
};
