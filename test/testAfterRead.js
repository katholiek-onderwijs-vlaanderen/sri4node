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

  describe('Afterread methods', function () {
    describe('should be executed on regular resources', function () {
      it('should have a correct messagecount.', function () {
        return doGet(base + '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849').then(function (response) {
          assert.equal(response.statusCode, 200);
          if (!response.body.$$messagecount || response.body.$$messagecount < 5) {
            assert.fail('Should have at least 5 messages for community LETS Regio Dendermonde');
          }
        });
      });
    });

    describe('should be executed on list resources', function () {
      it('should have a correct messagecount.', function () {
        return doGet(base + '/communities?hrefs=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849')
          .then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 1);
          assert.equal(response.body.results[0].$$expanded.$$messagecount, 5);
        });
      });
    });

    describe('should be executed on lists with many resources', function () {
      it('should have correct messagecounts on all items', function () {
        return doGet(base + '/communities?limit=4').then(function (response) {
          debug('response body');
          debug(response.body);
          debug(response.body.results[2].$$expanded);
          debug(response.body.results[3].$$expanded);
          assert.equal(response.statusCode, 200);
          if (response.body.results[0].$$expanded.$$messagecount === null) {
            assert.fail('should have $$messagecount');
          }
          if (response.body.results[1].$$expanded.$$messagecount === null) {
            assert.fail('should have $$messagecount');
          }
          if (response.body.results[2].$$expanded.$$messagecount === null) {
            assert.fail('should have $$messagecount');
          }
          if (response.body.results[3].$$expanded.$$messagecount === null) {
            assert.fail('should have $$messagecount');
          }
        });
      });
    });

    describe('Should be able to modify response headers', function () {
      it('should have a test header when reading a resource', function () {
        return doGet(base + '/alldatatypes/fd7e38e1-26c3-425e-9443-8a80722dfb16').
        then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.headers.test, 'TestHeader');
        });
      });
    });
  });
};
