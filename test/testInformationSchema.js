const assert = require('assert');
const { debug, pgConnect } = require('../js/common.js');
const context = require('./context.js');

exports = module.exports = function () {
  'use strict';

  describe('Information Schema', function () {
    it('should correctly show text columns', async function () {
      var configuration = context.getConfiguration();
      const db = await pgConnect(configuration)
      const is = await require('../js/informationSchema.js')(db, configuration);
      const type = is['/communities'].zipcode.type;
      debug('mocha', 'type : ' + type);
      assert.equal(type, 'text');
    });
  });
};
