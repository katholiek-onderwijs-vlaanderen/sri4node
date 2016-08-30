// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Generic Filters', function () {

    describe('Invalid parameter (non existent)', function () {

      it('should return 404 - not found', function () {
        return doGet(base + '/alldatatypes?wrongParameter=multiple', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 404);
          assert.equal(response.body.errors[0].code, 'invalid.query.parameter');
          assert.equal(response.body.errors[0].parameter, 'wrongParameter');
          assert.equal(response.body.errors[0].type, 'ERROR');
        });
      });

      it('should return the list of possible parameters', function () {
        return doGet(base + '/alldatatypes?wrongParameter=multiple', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 404);

          var possibleParameters = [
            "key", "id", "text", "text2", "texts", "publication", "publications", "number", "numbers", "numberint",
            "numberbigint", "numbersmallint", "numberdecimal", "numberreal", "numberdoubleprecision",
            "numbersmallserial", "numberserial", "numberbigserial", "textvarchar", "textchar", "$$meta.deleted",
            "$$meta.modified", "$$meta.created"
          ];

          assert.equal(response.body.errors[0].code, 'invalid.query.parameter');
          assert.equal(response.body.errors[0].parameter, 'wrongParameter');
          assert.equal(response.body.errors[0].type, 'ERROR');
          assert.deepEqual(response.body.errors[0].possibleParameters, possibleParameters);
        });
      });

    });
  });
};
