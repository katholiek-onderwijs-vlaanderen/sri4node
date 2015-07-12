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

  describe('query parameters', function () {
    describe('that use a CTE', function () {
      it('to limit to a single key, should only return 1 row.', function () {
        return doGet(base + '/messages?cteOneGuid=true', 'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 1);
        });
      });
    });

    // Test re-ordering of query parameters.
    describe('that use a CTE and other parameter', function () {
      it('to limit to a single key + another parameter, should handle re-sequencing of parameters well', function () {
        return doGet(base + '/messages?hrefs=/messages/d70c98ca-9559-47db-ade6-e5da590b2435&cteOneGuid=true',
                     'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 1);
        });
      });
    });

    // Test applying 2 CTEs
    describe('that use a TWO CTEs', function () {
      it('to limit to a single key, should handle both CTEs well', function () {
        return doGet(base + '/messages?cteOneGuid=true&cteOneGuid2=true',
                     'sabine@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 1);
        });
      });
    });

    // Test recursive CTE
    describe('that require recursion', function () {
      it('should find parents', function () {
        return doGet(base + '/selfreferential?allParentsOf=/selfreferential/ab142ea6-7e79-4f93-82d3-8866b0c8d46b')
          .then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 4);
        }).fail(function (e) {
          debug(e);
        });
      });
    });

    describe('that require recursion', function () {
      it('should find parents', function () {
        return doGet(base + '/selfreferential?allParentsOf=/selfreferential/b8c020bf-0505-407c-a8ad-88044d741712')
          .then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 2);
        }).fail(function (e) {
          debug(e);
        });
      });
    });
  });
};
