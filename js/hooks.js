const configuration = global.configuration  

const { errorAsCode, debug } = require('./common.js')

exports = module.exports = {

  // TODO: apply in order ? one-by-one?
  applyHooks: async (type, functions, applyFun) => {
    debug(`applyHooks ${type}`);

    if (functions && functions.length > 0) {
      try {
        const promises = functions.map( applyFun )
        await Q.all(promises)
        debug(`All ${type} functions resolved.`);
      } catch(err) {
        debug('Error during one of the ${type} functions.');
        if (err instanceof SriError) {
          throw err
        } else {
          throw new SriError(500, [{code: errorAsCode(`${type} failed`), msg: err}])
        }
      }
    } else {
      debug(`No ${type} functions registered.`);
    }
    return
  }

}