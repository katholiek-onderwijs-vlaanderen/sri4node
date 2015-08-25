// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Generic Filters', function () {

    describe('Invalid parameter (non existent)', function () {

      it('should return 400 - bad request', function () {
        return doGet(base + '/alldatatypes?wrongParameter=multiple').then(function (response) {
          assert.equal(response.statusCode, 400);
          assert.equal(response.body.errors[0].code, 'invalid.query.parameter');
          assert.equal(response.body.errors[0].parameter, 'wrongParameter');
          assert.equal(response.body.errors[0].type, 'ERROR');
        });
      });

    });
  });
};
