// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;
var common = require('../js/common.js');
var cl = common.cl;

exports = module.exports = function (base, logdebug) {
  'use strict';

  function debug(x) {
    if (logdebug) {
      cl(x);
    }
  }

  describe('Custom routes', function () {
    it('should call multiple middleware functions.', function () {
      return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/multiple-middleware',
                   'kevin@email.be', 'pwd').then(function (response) {
        debug('response');
        debug(response.body);
        assert.equal(response.statusCode, 200);
      });
    });
  });
};
