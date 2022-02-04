const assert = require('assert');
import { debug, pgConnect } from '../js/common';
const context = require('./context');

export = module.exports = function () {
  'use strict';

  describe('Information Schema', function () {
    it('should correctly show text columns', async function () {
      var configuration = context.getConfiguration();
      const db = await pgConnect(configuration)
      const is = await require('../js/informationSchema')(db, configuration);
      const type = is['/communities'].zipcode.type;
      debug('mocha', 'type : ' + type);
      assert.equal(type, 'text');
    });
  });
};
