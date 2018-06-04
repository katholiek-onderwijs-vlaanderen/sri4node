var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var context = require('./context.js');

exports = module.exports = function (logverbose) {
  'use strict';

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('Information Schema', function () {
    it('should correctly show text columns', async function () {
      var configuration = context.getConfiguration();
      const db = await common.pgConnect(configuration)
      const is = await require('../js/informationSchema.js')(db, configuration);
      const type = is['/communities'].zipcode.type;
      debug('type : ' + type);
      assert.equal(type, 'text');
    });
  });
};
