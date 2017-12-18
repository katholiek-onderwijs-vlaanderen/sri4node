const configuration = global.configuration 

const pMap = require('p-map'); 

const { errorAsCode, debug, SriError } = require('./common.js')

exports = module.exports = {

  applyHooks: async (type, functions, applyFun) => {
    debug(`applyHooks ${type}`);

    if (functions && functions.length > 0) {
      try {
        await pMap(functions, applyFun, {concurrency: 1})
        debug(`All ${type} functions resolved.`);
      } catch(err) {
        if (err instanceof SriError) {
          throw err
        } else {
          console.log('_______________________ H O O K S - E R R O R _____________________________________________') 
          console.log(err)
          console.log('___________________________________________________________________________________________')
          throw new SriError({status: 500, errors: [{code: errorAsCode(`${type} failed`), msg: err.toString()}] })
        }
      }
    } else {
      debug(`No ${type} functions registered.`);
    }
    return
  }

}