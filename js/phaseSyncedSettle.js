const pSettle = require('p-settle')
const pFinally = require('p-finally');
const pEvent = require('p-event');
const uuidv1 = require('uuid/v1');
const EventEmitter = require('events');


debug_log = (debug, x) => {
    if (debug) {
      console.log(x);
    }
};



PhaseSyncer = class {
    constructor(fun, args, ctrlEmitter, debug ) {
    	this.ctrlEmitter = ctrlEmitter,
    	this.debug = debug,
     	this.id = uuidv1()
     	this.phaseCntr = 0
		this.jobEmitter = new EventEmitter()
		args.unshift(this)
		this.jobPromise = pFinally( fun(...args), () => { ctrlEmitter.emit('jobDone', this.id) } )
    }

    phase() {
    	debug_log(this.debug, `STEP ${this.phaseCntr} - ID ${this.id}`); 
    	const p = pEvent(this.jobEmitter, 'ready')
    	if (this.phaseCntr > 0) {
  			this.ctrlEmitter.emit('stepDone', this.id)
    	}
  		this.phaseCntr += 1    	
  		return p
  	}
}


exports = module.exports = (jobList, {concurrency = 1, debug = false} = {}) => {

	const ctrlEmitter = new EventEmitter()
	const jobMap = new Map(jobList.map( ([fun, args]) => new PhaseSyncer(fun, args, ctrlEmitter, debug) )
							      .map( phaseSyncer => [ phaseSyncer.id, phaseSyncer ] ))
	const jobs = new Set(jobMap.keys())

	let queuedJobs;
	let phasePendingJobs;


	const startNewPhase = () => {
		debug_log(debug, 'START A NEW PHASE')
		const jobList = [...jobs.values()]
		jobList.slice(0, concurrency).forEach( id => jobMap.get(id).jobEmitter.emit('ready') )
		queuedJobs = new Set(jobList.slice(concurrency))
		phasePendingJobs = new Set(jobs)
	}

	const startQueuedJob = () => {
		if (queuedJobs.size > 0) {
			const id = queuedJobs.values().next().value
			jobMap.get(id).jobEmitter.emit('ready') 
			queuedJobs.delete(id)
		}
	}



	ctrlEmitter.on('stepDone', listener = function (id) {
		debug_log(debug,`Step of job ${id} done.`)
		phasePendingJobs.delete(id)

		if (phasePendingJobs.size === 0) {
			startNewPhase()
		} else {
			startQueuedJob()
		}
	});

	ctrlEmitter.on('jobDone', listener = function (id) {
		debug_log(debug, `JOB ${id} done.`)

		jobs.delete(id)
		queuedJobs.delete(id)
		phasePendingJobs.delete(id)

		if (phasePendingJobs.size === 0) {
			startNewPhase()
		} else {
			startQueuedJob()
		}
	});


	startNewPhase()

	return pSettle( [...jobMap.values()].map( phaseSyncer => phaseSyncer.jobPromise ) )
}