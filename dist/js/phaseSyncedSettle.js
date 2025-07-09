"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _PhaseSyncer_sriRequest;
Object.defineProperty(exports, "__esModule", { value: true });
exports.phaseSyncedSettle = void 0;
const p_settle_1 = __importDefault(require("p-settle"));
const p_event_1 = __importDefault(require("p-event"));
const p_map_1 = __importDefault(require("p-map"));
const emitter_queue_1 = __importDefault(require("emitter-queue"));
const events_1 = __importDefault(require("events"));
const typeDefinitions_1 = require("./typeDefinitions");
const common_1 = require("./common");
const hooks_1 = require("./hooks");
const uuid_1 = require("uuid");
const debug_log = (id, msg) => {
    (0, common_1.debug)("phaseSyncer", `PS -${id}- ${msg}`);
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
    constructor(fun, args, ctrlEmitter) {
        /**
         * SriRequest associated with the PhaseSyncer instance
         */
        _PhaseSyncer_sriRequest.set(this, void 0);
        this.ctrlEmitter = ctrlEmitter;
        this.id = (0, uuid_1.v4)();
        this.phaseCntr = 0;
        this.jobEmitter = (0, emitter_queue_1.default)(new events_1.default());
        __classPrivateFieldSet(this, _PhaseSyncer_sriRequest, args[1], "f");
        /**
         * A wrapper around the sri request handler dealing with sending synchronisation events.
         * @returns result of the sri request handler
         */
        const jobWrapperFun = () => __awaiter(this, void 0, void 0, function* () {
            try {
                const res = yield fun(this, ...args);
                this.ctrlEmitter.queue("jobDone", this.id);
                this.sriRequest.ended = true;
                return res;
            }
            catch (err) {
                this.ctrlEmitter.queue("jobFailed", this.id);
                this.sriRequest.ended = true;
                throw err;
            }
        });
        this.jobPromise = jobWrapperFun();
        debug_log(this.id, "PhaseSyncer constructed.");
    }
    /**
     * This function needs to be called by the sri request handler at the end of each phase
     * (i.e. at each synchronisation point).
     */
    phase() {
        var _a, _b;
        return __awaiter(this, void 0, void 0, function* () {
            debug_log(this.id, `STEP ${this.phaseCntr}`);
            if (this.phaseCntr > 0) {
                this.ctrlEmitter.queue("stepDone", this.id, this.phaseCntr);
            }
            this.phaseCntr += 1;
            const result = yield (0, p_event_1.default)(this.jobEmitter, ["sriError", "ready"]);
            if (result instanceof typeDefinitions_1.SriError || ((_b = (_a = result === null || result === void 0 ? void 0 : result.__proto__) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name) === "SriError") {
                throw result;
            }
        });
    }
    get sriRequest() {
        return __classPrivateFieldGet(this, _PhaseSyncer_sriRequest, "f");
    }
}
_PhaseSyncer_sriRequest = new WeakMap();
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
function phaseSyncedSettle(jobList, { concurrency, beforePhaseHooks } = {}) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        /**
         * channel used to communicate between the controller process (this function) and the PhaseSyncer instances.
         */
        const ctrlEmitter = (0, emitter_queue_1.default)(new events_1.default());
        /**
         * With jobMap, PhaseSyncer instances can be retrieved by their PhaseSyncer IDs.
         */
        const jobMap = new Map(jobList
            .map(([fun, args]) => new PhaseSyncer(fun, args, ctrlEmitter))
            .map((phaseSyncer) => [phaseSyncer.id, phaseSyncer]));
        /**
         * The Set pendingJobs keep track of which jobs are still in progress (jobs which are terminated by
         *  error or which are finished are removed from this set).
         */
        const pendingJobs = new Set(jobMap.keys());
        /**
         * With sriRequestMap, sriRequest objects can be retrieved by the ID of the PhaseSyncer instance
         * associated with the sriRequest.
         */
        const sriRequestMap = new Map([...jobMap.entries()].map(([id, phaseSyncer]) => [
            id,
            phaseSyncer.sriRequest,
        ]));
        /**
         * With sriRequestIDToPhaseSyncerMap, PhaseSyncer instances can be retrieved by the ID of the sriRequest
         * associated with the PhaseSyncer instance.
         */
        const sriRequestIDToPhaseSyncerMap = new Map([...jobMap.entries()].map(([_id, phaseSyncer]) => [
            phaseSyncer.sriRequest.id,
            phaseSyncer,
        ]));
        /**
         * queuedJobs keeps tracks of ID's of jobs waiting to be started their phase. This is nescessary in case
         * a batch contains more jobs then the 'concurrency' allows to be running at the same time.
         * When a job finishes its phase, one from the queue will be started.
         */
        let queuedJobs;
        /**
         * The set phasePendingJobs keeps track of the jobs which did not yet complete the current phase. When a
         * job finishes his phase, it is removed from the set. When a new phase is started, phasePendingJobs is
         * set to the content of pendingJobs.
         */
        let phasePendingJobs;
        /**
         * In case of batches which consist not only of read items, it makes no sense to continue after failure of
         * an item  (as the transaction will be rolled back). In such case, the other items of the batch will be
         * when an error has encoutered. The boolean failureHasBeenBroadcasted is used to indicate wether the
         * notification is already happened or not.
         */
        let failureHasBeenBroadcasted = false;
        try {
            /**
             * This function will start a new phase, this means notifying all jobs they can start exectuting their
             * phase in case there are less jobs then concurrency allows. In case there are more jobs then allowed
             * to run concurrently, only notify as many as are allowed to run concurrently and put the remainder in
             * the jobQueue.
             */
            const startNewPhase = () => __awaiter(this, void 0, void 0, function* () {
                const pendingJobList = [...pendingJobs.values()];
                const [jobsToWake, jobsToQueue] = splitListAt(pendingJobList, concurrency || 1);
                queuedJobs = new Set(jobsToQueue);
                phasePendingJobs = new Set(pendingJobs);
                if (jobsToWake.length > 0) {
                    // Only handle beforePhaseHooks when there are jobs to wake - otherwise the phaseSyncer
                    // will be terminated
                    yield (0, hooks_1.applyHooks)("ps", beforePhaseHooks || [], (f) => f(sriRequestMap, jobMap, pendingJobs), (0, common_1.getParentSriRequestFromRequestMap)(sriRequestMap));
                }
                jobsToWake.forEach((id) => {
                    const job = jobMap.get(id);
                    if (job) {
                        job.jobEmitter.queue("ready");
                    }
                    else {
                        (0, common_1.error)("PhaseSyncer: job not found in jobMap");
                        throw new Error("PhaseSyncer: job not found in jobMap");
                    }
                });
            });
            /**
             * This function will notify next job in queue it can start with execution of his current phase
             * and remove the job from the queue.
             */
            const startQueuedJob = () => {
                if (phasePendingJobs.size - queuedJobs.size > (concurrency || 1)) {
                    (0, common_1.error)("ERROR: PhaseSyncer: unexpected startQueuedJob() call while max number of concurrent jobs is still running ! -> NOT starting queued job");
                }
                else {
                    if (queuedJobs.size > 0) {
                        const id = queuedJobs.values().next().value;
                        const job = jobMap.get(id);
                        if (job) {
                            job.jobEmitter.queue("ready");
                        }
                        else {
                            (0, common_1.error)("PhaseSyncer: job not found in jobMap");
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
            const errorHandlingWrapper = (fun) => (id, args) => __awaiter(this, void 0, void 0, function* () {
                var _c, _d, _e, _f;
                try {
                    yield fun(id, args);
                }
                catch (err) {
                    if (err instanceof typeDefinitions_1.SriError || ((_d = (_c = err === null || err === void 0 ? void 0 : err.__proto__) === null || _c === void 0 ? void 0 : _c.constructor) === null || _d === void 0 ? void 0 : _d.name) === "SriError") {
                        // If the SriError is generated in a beforePhaseHook (which is ran at 'global' level for all batch)
                        // we receive the id of the phaseSyncer who executed 'phase()' first, this is random and probably
                        // not the one which corresponds to the error.
                        // In such cases an id of the relevant (sub)sriRequest of the batch can be passed with the error, so
                        // we can retrieve the phaseSyncer of the relevant (sub)sriRequest.
                        if (err.sriRequestID && sriRequestIDToPhaseSyncerMap.get(err.sriRequestID)) {
                            (_e = sriRequestIDToPhaseSyncerMap.get(err.sriRequestID)) === null || _e === void 0 ? void 0 : _e.jobEmitter.queue("sriError", err);
                            return;
                        }
                        if (jobMap.get(id)) {
                            (_f = jobMap.get(id)) === null || _f === void 0 ? void 0 : _f.jobEmitter.queue("sriError", err);
                            return;
                        }
                    }
                    console.error(`\nERROR: ${err} - ${JSON.stringify(err)}\n`);
                }
            });
            ctrlEmitter.on("stepDone", errorHandlingWrapper((id, stepnr) => __awaiter(this, void 0, void 0, function* () {
                debug_log(id, `*step ${stepnr}* done.`);
                phasePendingJobs.delete(id);
                if ((0, common_1.getParentSriRequestFromRequestMap)(sriRequestMap).reqCancelled) {
                    throw new typeDefinitions_1.SriError({
                        status: 0,
                        errors: [{ code: "cancelled", msg: "Request cancelled by client." }],
                    });
                }
                if (phasePendingJobs.size === 0) {
                    debug_log(id, " Starting new phase.");
                    yield startNewPhase();
                }
                else {
                    debug_log(id, " Starting queued job.");
                    startQueuedJob();
                }
            })));
            ctrlEmitter.on("jobDone", errorHandlingWrapper((id) => __awaiter(this, void 0, void 0, function* () {
                debug_log(id, "*JOB* done.");
                pendingJobs.delete(id);
                queuedJobs.delete(id);
                phasePendingJobs.delete(id);
                if (phasePendingJobs.size === 0) {
                    yield startNewPhase();
                }
                else {
                    startQueuedJob();
                }
            })));
            ctrlEmitter.on("jobFailed", errorHandlingWrapper((id) => __awaiter(this, void 0, void 0, function* () {
                debug_log(id, "*JOB* failed.");
                pendingJobs.delete(id);
                queuedJobs.delete(id);
                phasePendingJobs.delete(id);
                if ((0, common_1.getParentSriRequestFromRequestMap)(sriRequestMap).readOnly === true) {
                    if (phasePendingJobs.size === 0) {
                        yield startNewPhase();
                    }
                    else {
                        startQueuedJob();
                    }
                }
                else if (!failureHasBeenBroadcasted) {
                    const parent = (0, common_1.getParentSriRequestFromRequestMap)(sriRequestMap);
                    failureHasBeenBroadcasted = true;
                    // failure of one job in batch leads to failure of the complete batch
                    //  --> notify the other jobs of the failure (only if they are not part
                    //      of a failed multi* operation)
                    yield (0, p_map_1.default)(pendingJobs, (id) => __awaiter(this, void 0, void 0, function* () {
                        var _g, _h, _j;
                        const job = jobMap.get(id);
                        if (job === undefined) {
                            throw new Error("[jobFailed] Job is undefined, which is unexpected...");
                        }
                        else if (job.sriRequest === undefined ||
                            (!(parent.multiInsertFailed && ((_g = parent.putRowsToInsertIDs) === null || _g === void 0 ? void 0 : _g.includes(job === null || job === void 0 ? void 0 : job.sriRequest.id))) &&
                                !(parent.multiUpdateFailed &&
                                    ((_h = parent.putRowsToUpdateIDs) === null || _h === void 0 ? void 0 : _h.includes(job === null || job === void 0 ? void 0 : job.sriRequest.id))) &&
                                !(parent.multiDeleteFailed && ((_j = parent.rowsToDeleteIDs) === null || _j === void 0 ? void 0 : _j.includes(job === null || job === void 0 ? void 0 : job.sriRequest.id))))) {
                            job === null || job === void 0 ? void 0 : job.jobEmitter.queue("sriError", new typeDefinitions_1.SriError({
                                status: 202,
                                errors: [
                                    {
                                        code: "cancelled",
                                        msg: "Request cancelled due to failure in accompanying request in batch.",
                                    },
                                ],
                            }));
                        }
                    }));
                }
                if (phasePendingJobs.size === 0) {
                    yield startNewPhase();
                }
                else {
                    yield startQueuedJob();
                }
            })));
            yield startNewPhase();
            return (0, p_settle_1.default)([...jobMap.values()].map((phaseSyncer) => phaseSyncer.jobPromise));
        }
        catch (err) {
            console.warn("WARN: error in phase syncer");
            console.warn(err);
            console.warn(JSON.stringify(err));
            let sriError;
            if (err instanceof typeDefinitions_1.SriError || ((_b = (_a = err === null || err === void 0 ? void 0 : err.__proto__) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name) === "SriError") {
                sriError = err;
            }
            else {
                sriError = new typeDefinitions_1.SriError({
                    status: 500,
                    errors: [{ code: "phase.synced.settle.failed", err: err.toString() }],
                });
            }
            pendingJobs.forEach((id) => {
                var _a;
                (_a = jobMap.get(id)) === null || _a === void 0 ? void 0 : _a.jobEmitter.queue("sriError", new typeDefinitions_1.SriError({
                    status: 202,
                    errors: [
                        {
                            code: "cancelled",
                            msg: "Request cancelled due to failure in accompanying request in batch.",
                        },
                    ],
                }));
            });
            yield (0, p_settle_1.default)([...jobMap.values()].map((phaseSyncer) => phaseSyncer.jobPromise));
            return [...jobMap.values()].map((_phaseSyncer) => ({ isFulfilled: false, reason: sriError }));
        }
    });
}
exports.phaseSyncedSettle = phaseSyncedSettle;
//# sourceMappingURL=phaseSyncedSettle.js.map