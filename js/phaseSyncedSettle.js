const pSettle = require('p-settle')
const pFinally = require('p-finally');
const pEvent = require('p-event');
const uuidv1 = require('uuid/v1');
const EventEmitter = require('events');
const { debug, SriError } = require('./common.js');
const hooks = require('./hooks.js');

debug_log = (id, msg) => {
	debug(`PS -${id}- ${msg}`)
};


PhaseSyncer = class { 
    constructor(fun, args, ctrlEmitter) {
    	this.ctrlEmitter = ctrlEmitter,
     	this.id = uuidv1()
     	this.phaseCntr = 0
		this.jobEmitter = new EventEmitter()
		this.sriRequest = args[1];
		args.unshift(this)

		const jobWrapperFun = async () => {
			try {
				const res = await fun(...args)
				this.ctrlEmitter.emit('jobDone', this.id)				
				this.sriRequest.ended = true;
				return res
			} catch (err) {
				this.ctrlEmitter.emit('jobFailed', this.id)	
				this.sriRequest.ended = true;
				throw err;
			}
		}
		this.jobPromise = jobWrapperFun()
		debug_log(this.id, 'PhaseSyncer constructed.')
    }

    async phase() {
    	debug_log(this.id, `STEP ${this.phaseCntr}`); 
    	// Need to construct pEvent promise before sending stepDone, otherwise event 'ready'
    	// might be sent before event handler waiting for 'ready' is set up. 
    	const promise = pEvent(this.jobEmitter, 'ready')
		if (this.phaseCntr > 0) {
  			this.ctrlEmitter.emit('stepDone', this.id, this.phaseCntr)
    	}  	   	
  		this.phaseCntr += 1    	

    	const result = await promise;
    	if (result instanceof SriError) {
    		throw result;
    	}
  	}  
}


const splitListAt = (list, index) => [list.slice(0, index), list.slice(index)]
exports = module.exports = async (jobList, {maxNrConcurrentJobs = 1, beforePhaseHooks} = {}) => {
	const ctrlEmitter = new EventEmitter()
	const jobMap = new Map(jobList.map( ([fun, args]) => new PhaseSyncer(fun, args, ctrlEmitter) )
							      .map( phaseSyncer => [ phaseSyncer.id, phaseSyncer ] ))
	const pendingJobs = new Set(jobMap.keys())
	const sriRequestMap = new Map(Array.from( jobMap ).map( ([ id, phaseSyncer ]) =>
														 [ id, phaseSyncer.sriRequest ] ));

	let queuedJobs;
	let phasePendingJobs;


	const startNewPhase = async () => {
	    await hooks.applyHooks('phaseSyncer - before new phase'
	                          , beforePhaseHooks
	                          , f => f(sriRequestMap, jobMap, pendingJobs));

		const pendingJobList = [...pendingJobs.values()];
		const [ jobsToWake, jobsToQueue ] = splitListAt(pendingJobList, maxNrConcurrentJobs);

		jobsToWake.forEach( id => jobMap.get(id).jobEmitter.emit('ready') );
		queuedJobs = new Set(jobsToQueue);
		phasePendingJobs = new Set(pendingJobs)
	}

	const startQueuedJob = () => {
		if (queuedJobs.size > 0) {
			const id = queuedJobs.values().next().value
			jobMap.get(id).jobEmitter.emit('ready') 
			queuedJobs.delete(id)
		}
	}

	ctrlEmitter.on('stepDone', listener = async function (id, stepnr) {
		debug_log(id,`*step ${stepnr}* done.`)
		phasePendingJobs.delete(id)

		if (phasePendingJobs.size === 0) {
			debug_log(id,` Starting new phase.`)
			await startNewPhase()
		} else {
			debug_log(id,` Starting queued job.`)
			startQueuedJob()
		}
	});

	ctrlEmitter.on('jobDone', listener = async function (id) {
		debug_log(id, `*JOB* done.`)

		pendingJobs.delete(id)
		queuedJobs.delete(id)
		phasePendingJobs.delete(id)

		if (phasePendingJobs.size === 0) {
			await startNewPhase()
		} else {
			startQueuedJob()
		}
	});

	ctrlEmitter.on('jobFailed', listener = function (id) {
		debug_log(id, `*JOB* failed.`)
		try {
			pendingJobs.delete(id)
			queuedJobs.delete(id)
			phasePendingJobs.delete(id)
		} catch (err) {
			console.log('WARNING:')
			console.log(err)
		}

		// failure of one job in batch leads to failure of the complete batch
		//  --> notify the other jobs of the failure
		pendingJobs.forEach( id => jobMap.get(id).jobEmitter.emit(
			'ready',
			new SriError({status: 202, errors: [{code: 'cancelled', msg: 'Request cancelled due to failure in accompanying request in batch.'}]})) );
	});


	await startNewPhase();

	return pSettle( [...jobMap.values()].map( phaseSyncer => phaseSyncer.jobPromise ) )
}