var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var postgres = require('pg');
var context = require('./context.js');

exports = module.exports = function (logverbose) {
  'use strict';
  var configuration = context.getConfiguration();
  return common.pgConnect(postgres, configuration).then(function (database) {
    var is = require('../js/informationSchema.js')(database, configuration, logverbose);

    function debug(x) {
      if (logverbose) {
        cl(x);
      }
    }

    describe('Information Schema', function () {
      it('should correctly show text columns', function () {
        var type = is['/communities'].zipcode;
        debug('type : ' + type);
        assert.equal(type, 'text');
      });
    });
  });
};
