const pMap = require('p-map'); 

const { errorAsCode, debug, SriError, stringifyError } = require('./common.js')

exports = module.exports = {

  applyHooks: async (type, functions, applyFun) => {
    debug(`applyHooks ${type}`);

    if (functions && functions.length > 0) {
      try {
        debug(`${functions.length} functions`);
        await pMap(functions, applyFun, {concurrency: 1})
        debug(`All ${type} functions resolved.`);
      } catch(err) {
        if (err instanceof SriError) {
          throw err
        } else {
          console.log('_______________________ H O O K S - E R R O R _____________________________________________') 
          console.log(err)
          console.log(err.stack)
          console.log(Object.prototype.toString.call(err))
          console.log('___________________________________________________________________________________________')
          throw new SriError({status: 500, errors: [{code: errorAsCode(`${type} failed`), msg: stringifyError(err)}] })
        }
      }
    } else {
      debug(`No ${type} functions registered.`);
    }
    return
  }

}