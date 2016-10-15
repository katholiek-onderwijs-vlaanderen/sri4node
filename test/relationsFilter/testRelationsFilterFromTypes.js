// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Relations Filters', function () {

    describe('From types match', function () {

      it('should find relations where from resource is of type', function () {
        return doGet(base + '/relations?fromTypes=request', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.type, 'IS_RELATED');
          assert.equal(response.body.results[1].$$expanded.type, 'IS_RELATED');
        });
      });

      it('should find relations where from resource is one of types', function () {
        return doGet(base + '/relations?fromTypes=request,offer', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 4);
        });
      });

      it('should not find relations where from resource is not of type', function () {
        return doGet(base + '/relations?fromTypes=response', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });
    });

  });
};
