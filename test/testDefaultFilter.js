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

  describe('Generic Filters', function () {

    describe('Exact match', function () {

      describe('String fields', function () {

        it('should find resources with an exact match', function () {
          return doGet(base + '/alldatatypes?text=Value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources with an exact match with spaces', function () {
          return doGet(base + '/alldatatypes?text=A%20value%20with%20spaces').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources with a case insensitive match', function () {
          return doGet(base + '/alldatatypes?text=value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources with a value that does not match', function () {
          return doGet(base + '/alldatatypes?text=not-present').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

      });

      describe('Numeric fields', function () {

        it('should find resources with an exact match', function () {
          return doGet(base + '/alldatatypes?number=1611').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 1611);
          });
        });

        it('should not find resources with a value that does not match', function () {
          return doGet(base + '/alldatatypes?number=314').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

      });

      describe('Timestamp fields', function () {

        it('should find resources with an exact match', function () {
          return doGet(base + '/alldatatypes?publication=2015-01-01T00:00:00%2B02:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
          });
        });

        it('should not find resources with a value that does not match', function () {
          return doGet(base + '/alldatatypes?publication=2015-01-01T00:00:00-03:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

      });

      describe('Array fields', function () {

        it('should find resources with an exact match', function () {
          return doGet(base + '/alldatatypes?texts=Standard,interface,ROA').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.texts.length, 3);
          });
        });

        it('should not find resources with a partial match', function () {
          return doGet(base + '/alldatatypes?texts=Standard,interface').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should not find resources with a value that does not match', function () {
          return doGet(base + '/alldatatypes?texts=another,thing').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

      });
    });

    describe('Greater match', function () {
      describe('String fields', function () {
        it('should find resources that are greater', function () {
          return doGet(base + '/alldatatypes?textGreater=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?textGreater=Value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

      });

      describe('Numeric fields', function () {
        it('should find resources that are greater', function () {
          return doGet(base + '/alldatatypes?numberGreater=1000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 1611);
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?numberGreater=1611').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

      });

      describe('Timestamp fields', function () {
        it('should find resources that are greater', function () {
          return doGet(base + '/alldatatypes?publicationGreater=2015-02-01T00:00:00%2B02:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?publicationGreater=2015-03-04T22:00:00-03:00').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

      });
    });
  });
};
