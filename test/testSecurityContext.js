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

  describe('GET user security context /me', function () {
    describe('with authentication', function () {
      it('should return *me*', function () {
        return doGet(base + '/me', 'steven@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.firstname, 'Steven');
          assert.equal(response.body.lastname, 'Plas');
        });
      });
    });

    describe('without authentication', function () {
      it('should disallow access', function () {
        return doGet(base + '/me').then(function (response) {
          assert.equal(response.statusCode, 401);
        });
      });
    });

    describe('with invalid authentication - non-existing user', function () {
      it('should disallow access', function () {
        return doGet(base + '/me', 'invalid@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 401);
        });
      });
    });

    describe('with invalid authentication - wrong password', function () {
      it('should disallow access', function () {
        return doGet(base + '/me', 'steven@email.be', 'INVALID').then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 401);
        });
      });
    });
  });
};
