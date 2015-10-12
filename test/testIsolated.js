// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
//var sriclient = require('sri4node-client');
//var doGet = sriclient.get;
var needle = require('needle');
var Q = require('q');

exports = module.exports = function (base, logverbose) {
  'use strict';

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('CORS', function () {
    it('should mirror request origin', function () {
      var url = base + '/persons/9abe4102-6a29-4978-991e-2a30655030e6';
      var user = 'sabine@email.be';
      var pwd = 'pwd';
      var options = {
        username: user,
        password: pwd,
        headers: {
          Origin: 'localhost:5000'
        }
      };
      var deferred = Q.defer();
      needle.get(url, options, function (error, response) {
        if (error) {
          assert.fail();
          deferred.reject();
        } else {
          debug(response.headers);
          assert.equal(response.statusCode, 200);
          assert.equal(response.headers['access-control-allow-origin'], 'localhost:5000');
          deferred.resolve();
        }
      });
      return deferred.promise;
    });
  });
};
