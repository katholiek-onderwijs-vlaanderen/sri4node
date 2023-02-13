import * as common from './common';
import { TOverloadProtection } from './typeDefinitions';

function overloadProtectionFactory(config: TOverloadProtection | undefined) {
  let usedPipelines = 0;
  let extraDrop = 0;
  return {
    canAccept: () => {
      if (config !== undefined) {
        common.debug('overloadProtection', `overloadProtection - canAccept ${extraDrop} - ${usedPipelines} - ${config.maxPipelines}`);
        if (extraDrop === 0) {
          return (usedPipelines < config.maxPipelines);
        }
        extraDrop -= 1;
        return false;
      }
      return true;
    },
    startPipeline: (nr = 1) => {
      if (config !== undefined) {
        const remainingCap = Math.max((config.maxPipelines - usedPipelines), 1);
        const nrServed = Math.min(nr, remainingCap);
        usedPipelines += nrServed;
        common.debug('overloadProtection', `overloadProtection - startPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`);
        return nrServed;
      }
      return null;
    },
    endPipeline: (nr = 1) => {
      if (config !== undefined) {
        usedPipelines -= nr;
        common.debug('overloadProtection', `overloadProtection - endPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`);
      }
    },
    addExtraDrops: (nr = 1) => {
      if (config !== undefined) {
        extraDrop += nr;
      }
    },
  };
}

export {
  overloadProtectionFactory,
};
