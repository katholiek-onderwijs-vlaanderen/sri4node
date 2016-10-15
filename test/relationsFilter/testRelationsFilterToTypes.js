// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Relations Filters', function () {

    describe('To types match', function () {

      it('should find relations where to resource is of type', function () {
        return doGet(base + '/relations?toTypes=offer', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 3);
          assert.equal(response.body.results[0].$$expanded.type, 'IS_RELATED');
          assert.equal(response.body.results[1].$$expanded.type, 'IS_RELATED');
          assert.equal(response.body.results[2].$$expanded.type, 'IS_PART_OF');
        });
      });

      it('should not find relations where to resource is not of type', function () {
        return doGet(base + '/relations?toTypes=response', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });
    });

  });
};
