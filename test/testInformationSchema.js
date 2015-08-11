var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var postgres = require('pg');
var context = require('./context.js');

exports = module.exports = function (logverbose) {
  'use strict';

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('Information Schema', function () {
    it('should correctly show text columns', function () {
      var configuration = context.getConfiguration();
      return common.pgConnect(postgres, configuration).then(function (database) {
        return require('../js/informationSchema.js')(database, configuration);
      }).then(function (is) {
        var type = is['/communities'].zipcode.type;
        debug('type : ' + type);
        assert.equal(type, 'text');
      });
    });
  });
};
