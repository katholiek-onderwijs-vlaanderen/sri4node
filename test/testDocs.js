// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Docs', function () {

    it('should return general API documentation', function () {
      return doGet(base + '/docs').then(function (response) {
        assert.equal(response.statusCode, 200);
      });
    });

    it('should return persons documentation', function () {
      return doGet(base + '/persons/docs').then(function (response) {
        assert.equal(response.statusCode, 200);
      });
    });

    it('should return alldatatypes documentation', function () {
      return doGet(base + '/alldatatypes/docs').then(function (response) {
        assert.equal(response.statusCode, 200);
      });
    });

    it('should return communities documentation', function () {
      return doGet(base + '/communities/docs').then(function (response) {
        assert.equal(response.statusCode, 200);
      });
    });

    it('should return jsonb documentation', function () {
      return doGet(base + '/jsonb/docs').then(function (response) {
        assert.equal(response.statusCode, 200);
      });
    });

    it('should return messages documentation', function () {
      return doGet(base + '/messages/docs').then(function (response) {
        assert.equal(response.statusCode, 200);
      });
    });

    it('should return selfreferential documentation', function () {
      return doGet(base + '/selfreferential/docs').then(function (response) {
        assert.equal(response.statusCode, 200);
      });
    });

    it('should return table documentation', function () {
      return doGet(base + '/table/docs').then(function (response) {
        assert.equal(response.statusCode, 200);
      });
    });

    it('should return transactions documentation', function () {
      return doGet(base + '/transactions/docs').then(function (response) {
        assert.equal(response.statusCode, 200);
      });
    });

  });
};
