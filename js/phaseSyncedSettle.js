const pSettle = require('p-settle')
const pFinally = require('p-finally');
const pEvent = require('p-event');
const { v4: uuidv4 } = require('uuid');
const queue = require('emitter-queue');
const Emitter = require('events')
const _ = require('lodash')

const { debug, SriError, getParentSriRequestFromRequestMap } = require('./common.js');
const hooks = require('./hooks.js');

debug_log = (id, msg) => {
    debug('phaseSyncer', `PS -${id}- ${msg}`)
};

PhaseSyncer = class {
    constructor(fun, args, ctrlEmitter) {
        this.ctrlEmitter = ctrlEmitter;
        this.id = uuidv4();
        this.phaseCntr = 0;
        this.jobEmitter = queue(new Emitter);
        this.sriRequest = args[1];
        args.unshift(this)

        const jobWrapperFun = async () => {
            try {
                const res = await fun(...args)
                this.ctrlEmitter.queue('jobDone', this.id)
                this.sriRequest.ended = true;
                return res
            } catch (err) {
                this.ctrlEmitter.queue('jobFailed', this.id)
                this.sriRequest.ended = true;
                throw err;
            }
        }
        this.jobPromise = jobWrapperFun()
        debug_log(this.id, 'PhaseSyncer constructed.')
    }

    async phase() {
        debug_log(this.id, `STEP ${this.phaseCntr}`);
        if (this.phaseCntr > 0) {
            this.ctrlEmitter.queue('stepDone', this.id, this.phaseCntr)
        }
        this.phaseCntr += 1

        const result = await pEvent(this.jobEmitter, ['sriError', 'ready'])
        if (result instanceof SriError) {
            throw result;
        }
    }
}


const splitListAt = (list, index) => [list.slice(0, index), list.slice(index)]

exports = module.exports = async (jobList, { maxNrConcurrentJobs = 1, beforePhaseHooks } = {}) => {
    const ctrlEmitter = queue(new Emitter);
    const jobMap = new Map(jobList.map(([fun, args]) => new PhaseSyncer(fun, args, ctrlEmitter))
        .map(phaseSyncer => [phaseSyncer.id, phaseSyncer]))
    const pendingJobs = new Set(jobMap.keys())
    const sriRequestMap = new Map(Array.from(jobMap).map(([id, phaseSyncer]) =>
        [id, phaseSyncer.sriRequest]));

    const sriRequestIDToPhaseSyncerMap = new Map(Array.from(jobMap).map(([_id, phaseSyncer]) =>
        [phaseSyncer.sriRequest.id, phaseSyncer]));

    let queuedJobs;
    let phasePendingJobs;
    let failureHasBeenBroadcasted = false;

    try {

        const startNewPhase = async () => {
            const pendingJobList = [...pendingJobs.values()];
            const [jobsToWake, jobsToQueue] = splitListAt(pendingJobList, maxNrConcurrentJobs);

            if (jobsToWake.length > 0) {
                // Only handle beforePhaseHooks when there are jobs to wake - otherwise the phaseSyncer will be terminated
                await hooks.applyHooks('ps'
                    , beforePhaseHooks
                    , f => f(sriRequestMap, jobMap, pendingJobs)
                    , getParentSriRequestFromRequestMap(sriRequestMap)
                    );
            }

            jobsToWake.forEach(id => jobMap.get(id).jobEmitter.queue('ready'));
            queuedJobs = new Set(jobsToQueue);
            phasePendingJobs = new Set(pendingJobs)
        }

        const startQueuedJob = () => {
            if (queuedJobs.size > 0) {
                const id = queuedJobs.values().next().value
                jobMap.get(id).jobEmitter.queue('ready')
                queuedJobs.delete(id)
            }
        }

        const errorHandlingWrapper = (fun) => async (id, args) => {
            try {
                await fun(id, args);
            } catch (err) {
                if (err instanceof SriError) {
                    // If the SriError is generated in a beforePhaseHook (which is ran at 'global' level for all batch)
                    // we receive the id of the phaseSyncer who executed 'phase()' first, this is random and probably
                    // not the one which corresponds to the error.
                    // In such cases an id of the relevant (sub)sriRequest of the batch can be passed with the error, so 
                    // we can retrieve the phaseSyncer of the relevant (sub)sriRequest.
                    if (err.sriRequestID && sriRequestIDToPhaseSyncerMap.get(err.sriRequestID)) {
                        sriRequestIDToPhaseSyncerMap.get(err.sriRequestID).jobEmitter.queue('sriError', err);
                        return;
                    } else if (jobMap.get(id)) {
                        jobMap.get(id).jobEmitter.queue('sriError', err);
                        return;
                    }
                }
                console.error(`\nERROR: ${err} - ${JSON.stringify(err)}\n`)
            }
        }

        ctrlEmitter.on('stepDone', listener = errorHandlingWrapper(async function (id, stepnr) {
            debug_log(id, `*step ${stepnr}* done.`)
            phasePendingJobs.delete(id)

            if (getParentSriRequestFromRequestMap(sriRequestMap).reqCancelled) {
                throw new SriError({ status: 0, errors: [{ code: 'cancelled', msg: 'Request cancelled by client.' }] });
            }

            if (phasePendingJobs.size === 0) {
                debug_log(id, ` Starting new phase.`)
                await startNewPhase()
            } else {
                debug_log(id, ` Starting queued job.`)
                startQueuedJob()
            }
        }));

        ctrlEmitter.on('jobDone', listener = errorHandlingWrapper(async function (id) {
            debug_log(id, `*JOB* done.`)

            pendingJobs.delete(id)
            queuedJobs.delete(id)
            phasePendingJobs.delete(id)

            if (phasePendingJobs.size === 0) {
                await startNewPhase()
            } else {
                startQueuedJob()
            }
        }));

        ctrlEmitter.on('jobFailed', listener = errorHandlingWrapper(async function (id) {
            debug_log(id, `*JOB* failed.`)

            pendingJobs.delete(id)
            queuedJobs.delete(id)
            phasePendingJobs.delete(id)

            if (getParentSriRequestFromRequestMap(sriRequestMap).readOnly === true) {
                if (phasePendingJobs.size === 0) {
                    await startNewPhase()
                } else {
                    startQueuedJob()
                }
            } else {
                if (!failureHasBeenBroadcasted) {
                    failureHasBeenBroadcasted = true;
                    // failure of one job in batch leads to failure of the complete batch
                    //  --> notify the other jobs of the failure
                    pendingJobs.forEach(id => jobMap.get(id).jobEmitter.queue(
                        'sriError',
                        new SriError({ status: 202, errors: [{ code: 'cancelled', msg: 'Request cancelled due to failure in accompanying request in batch.' }] })));
                }
            }
        }));

        await startNewPhase();
        return pSettle([...jobMap.values()].map(phaseSyncer => phaseSyncer.jobPromise))
    } catch (err) {
        console.warn('WARN: error in phase syncer')
        console.warn(err)
        console.warn(JSON.stringify(err));
        let sriError;
        if (err instanceof SriError) {
            sriError = err
        } else {
            sriError = new SriError({ status: 500, errors: [{ code: 'phase.synced.settle.failed', err: err.toString() }] })
        }
        pendingJobs.forEach(id => {
            jobMap.get(id).jobEmitter.queue(
                'sriError',
                new SriError({
                    status: 202, errors:
                        [{ code: 'cancelled', msg: 'Request cancelled due to failure in accompanying request in batch.' }]
                }));
        });
        await pSettle([...jobMap.values()].map(phaseSyncer => phaseSyncer.jobPromise))
        return [...jobMap.values()].map(phaseSyncer => ({ isFulfilled: false, reason: sriError }));
    }
}
