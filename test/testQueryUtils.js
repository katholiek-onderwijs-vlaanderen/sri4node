// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base, logverbose) {
  'use strict';

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('utils.addReferencingResources ', function () {
    describe('on afterread /persons', function () {
      it('should include related transactions', function () {
        return doGet(base + '/persons/9abe4102-6a29-4978-991e-2a30655030e6',
                     'sabine@email.be', 'pwd').then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$transactions.length, 1);
        });
      });
    });
  });
};
