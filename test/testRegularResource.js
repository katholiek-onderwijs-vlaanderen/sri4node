// Utility methods for calling the SRI interface
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var sriclient = require('sri4node-client');
var doGet = sriclient.get;
var needle = require('needle');

exports = module.exports = function (base, logverbose) {
  'use strict';

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  describe('GET public regular resource', function () {
    describe('without authentication', function () {
      it('should return LETS Regio Dendermonde', function () {
        return doGet(base + '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849').then(function (response) {
          debug(response.body);
          assert.equal(response.body.name, 'LETS Regio Dendermonde');
        });
      });
    });

    describe('with authentication', function () {
      it('should return LETS Hamme', function () {
        return doGet(base + '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d',
                     'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.body.name, 'LETS Hamme');
        });
      });
    });

    describe('with invalid authentication - non-existing user', function () {
      it('should return LETS Hamme', function () {
        return doGet(base + '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d',
                     'unknown@email.be', 'pwd').then(function (response) {
          assert.equal(response.body.name, 'LETS Hamme');
        });
      });
    });

    describe('with invalid authentication - existing user, wrong password', function () {
      it('should return LETS Hamme', function () {
        return doGet(base + '/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d',
                     'sabine@email.be', 'INVALID').then(function (response) {
          assert.equal(response.body.name, 'LETS Hamme');
        });
      });
    });
  });

  describe('GET private regular resource', function () {
    describe('/persons/{key} from my community', function () {
      it('should return Kevin Boon', function () {
        return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d',
                     'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.firstname, 'Kevin');
          assert.equal(response.body.lastname, 'Boon');
        });
      });
    });

    describe('/persons/{key} from different community', function () {
      it('should be 403 Forbidden', function () {
        return doGet(base + '/persons/82565813-943e-4d1a-ac58-8b4cbc865bdb',
                     'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 403);
        });
      });
    });

    describe('two secure functions', function () {
      it('should disallow read on Ingrid Ohno', function () {
        return doGet(base + '/persons/da6dcc12-c46f-4626-a965-1a00536131b2',
                     'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 403);
        });
      });
    });

    describe('with invalid authentication - non-existing user', function () {
      it('should disallow read', function () {
        return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d',
                     'unknown@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 401);
        });
      });
    });

    describe('with invalid authentication - existing user, wrong password', function () {
      it('should disallow read', function () {
        return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d',
                     'sabine@email.be', 'INVALID').then(function (response) {
          assert.equal(response.statusCode, 401);
        });
      });
    });

    describe('without authentication', function () {
      it('should disallow read', function () {
        return doGet(base + '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d').then(function (response) {
          assert.equal(response.statusCode, 401);
        });
      });
    });
  });

  describe('CORS', function () {
    it('should mirror request origin', function () {
      var url = base + '/persons/9abe4102-6a29-4978-991e-2a30655030e6';
      var user = 'sabine@email.be';
      var pwd = 'pwd';
      var options = {username: user, password: pwd, headers: {Origin: 'localhost:5000'}};
      needle.get(url, options, function (error, response) {
        if (error) {
          assert.fail();
        }
        debug(response.headers);
        assert.equal(response.statusCode, 200);
        assert.equal(response.headers['access-control-allow-origin'], 'localhost:5000');
      });
    });
  });
};
