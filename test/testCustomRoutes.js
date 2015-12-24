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

    it('should return the response for the custom route', function () {
      return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple',
                   'kevin@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.body.firstname, 'Kevin');
        assert.equal(response.body.lastname, 'Boon');
      });
    });

    it('should forbid the custom route because of a secure function', function () {
      return doGet(base + '/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simple',
                   'sabine@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 403);
      });
    });

    it('should return a server error for a problematic custom handler', function () {
      return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/wrong-handler',
                   'kevin@email.be', 'pwd').then(function (response) {
        assert.equal(response.statusCode, 500);
      });
    });

    it('should call multiple middleware functions.', function () {
      return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/multiple-middleware',
                   'kevin@email.be', 'pwd').then(function (response) {
        debug('response');
        debug(response.body);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, '1');
      });
    });

    it('should a single multiple middleware functions.', function () {
      return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/single-middleware',
                   'kevin@email.be', 'pwd').then(function (response) {
        debug('response');
        debug(response.body);
        assert.equal(response.statusCode, 200);
        assert.equal(response.body, '0');
      });
    });
  });
};
