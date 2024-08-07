const { debug } = require('./common.js');

exports = module.exports = (config) => {
	let usedPipelines = 0;
	let extraDrop = 0
	return {
		canAccept: () => {
			if (config!==undefined) {
				debug(`canAccept ${extraDrop} - ${usedPipelines} - ${config.maxPipelines}`)
				if (extraDrop === 0) {
					return (usedPipelines < config.maxPipelines);
				} else {
					extraDrop -= 1;
					return false;
				}
			} else {
				return true;
			}
		},
		startPipeline: (nr = 1) => { 
			if (config!==undefined) { 
				const remainingCap = Math.max((config.maxPipelines - usedPipelines), 1);
				const nrServed = Math.min(nr, remainingCap);
				usedPipelines += nrServed;
				debug(`startPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`);
				return nrServed;
			} 			
		},
		endPipeline: (nr = 1) => { 
			if (config!==undefined) { 
				usedPipelines -= nr 
				debug(`endPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`);
			} 
		},
		addExtraDrops: (nr = 1) => {
			if (config!==undefined) { 
				extraDrop += nr;
			}
		}
	}
};