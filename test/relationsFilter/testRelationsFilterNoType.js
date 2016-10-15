// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Relations Filters', function () {

    describe('Persons resource referenced has no type property', function () {

      it('should fail with error message', function () {
        return doGet(base + '/personrelations?toTypes=ADULT', 'kevin@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 409);
          assert.equal(response.body.errors[0].code, 'invalid.query.parameter');
        });
      });
    });

  });
};
