// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Generic Filters', function () {

    describe('Q query', function () {

      it('should find resources with a general match', function () {
        return doGet(base + '/alldatatypes?q=multiple', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.id, 13);
          assert.equal(response.body.results[1].$$expanded.id, 14);
        });
      });

      it('should find resources of type varchar and char with a general match', function () {
        return doGet(base + '/alldatatypes?q=char', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 4);
          assert.equal(response.body.results[0].$$expanded.id, 34);
          assert.equal(response.body.results[1].$$expanded.id, 35);
          assert.equal(response.body.results[2].$$expanded.id, 36);
          assert.equal(response.body.results[3].$$expanded.id, 37);
        });
      });

      it('should find resources with a general match and multiple values', function () {
        return doGet(base + '/alldatatypes?q=MULTIPLE+vsko', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 13);
        });
      });

      it('should not find resources with a general match', function () {
        return doGet(base + '/alldatatypes?q=general', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.results.length, 0);
        });
      });

    });
  });
};
