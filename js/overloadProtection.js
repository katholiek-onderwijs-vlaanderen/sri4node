exports = module.exports = (config) => {
	let usedPipelines = 0;
	return {
		canAccept: () => (config===undefined) ? true : (usedPipelines < config.maxPipelines),
		startPipeline: (nr = 1) => { 
			if (config!==undefined) { 
				const remainingCap = Math.max((config.maxPipelines - usedPipelines), 1);
				const nrServed = Math.min(nr, remainingCap);
				usedPipelines += nrServed;
				console.log(`startPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`);
				return nrServed;
			} 			
		},
		endPipeline: (nr = 1) => { 
			if (config!==undefined) { 
				usedPipelines -= nr 
				console.log(`endPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`);
			} 
		}
	}
};