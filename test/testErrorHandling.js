// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;
var doPut = sriclient.put;
var doDelete = sriclient.delete;
var uuid = require('node-uuid');

exports = module.exports = function (base) {
  'use strict';

  var communityDendermonde = '/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849';

  function generateRandomPerson(key, communityPermalink) {
    return {
      firstname: 'Sabine',
      lastname: 'Eeckhout',
      street: 'Stationstraat',
      streetnumber: '17',
      zipcode: '9280',
      city: 'Lebbeke',
      phone: '0492882277',
      email: key + '@email.com',
      balance: 0,
      mail4elas: 'weekly',
      community: {
        href: communityPermalink
      }
    };
  }

  describe('Error handling', function () {

    var key = uuid.v4();
    var p = generateRandomPerson(key, communityDendermonde);

    describe('After Read', function () {
      it('should return 500 (server error) when rejecting without an error object', function () {
        return doGet(base + '/persons/9abe4102-6a29-4978-991e-2a30655030e6', 'daniella@email.be', 'pwd').then(
          function (response) {
            assert.equal(response.statusCode, 500);
          });
      });

      it('should return 403 (forbidden) when rejecting with an error object', function () {
        return doGet(base + '/persons/9abe4102-6a29-4978-991e-2a30655030e6', 'ingrid@email.be', 'pwd').then(
          function (response) {
            assert.equal(response.statusCode, 403);
            assert.equal(response.body, '<h1>Forbidden</h1>');
          });
      });
    });

    describe('After Insert', function () {

      it('should return 500 (server error) when rejecting without an error object', function () {
        return doPut(base + '/persons/' + key, p, 'daniella@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 409);
        });
      });

      it('should return 403 (forbidden) when rejecting with an error object', function () {
        return doPut(base + '/persons/' + key, p, 'ingrid@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 403);
          assert.equal(response.body, '<h1>Forbidden</h1>');
        });
      });
    });

    describe('After Update', function () {

      before(function (done) {
        doPut(base + '/persons/' + key, p, 'sabine@email.be', 'pwd').then(function () {
          done();
        });
      });

      it('should return 500 (server error) when rejecting without an error object', function () {
        return doPut(base + '/persons/' + key, p, 'daniella@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 409);
        });
      });

      it('should return 403 (forbidden) when rejecting with an error object', function () {
        return doPut(base + '/persons/' + key, p, 'ingrid@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 403);
          assert.equal(response.body, '<h1>Forbidden</h1>');
        });
      });
    });

    describe('After Delete', function () {

      before(function (done) {
        doPut(base + '/persons/' + key, p, 'sabine@email.be', 'pwd').then(function () {
          done();
        });
      });

      it('should return 500 (server error) when rejecting without an error object', function () {
        return doDelete(base + '/persons/' + key, 'daniella@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 500);
        });
      });

      it('should return 403 (forbidden) when rejecting with an error object', function () {
        return doDelete(base + '/persons/' + key, 'ingrid@email.be', 'pwd').then(function (response) {
          assert.equal(response.statusCode, 403);
          assert.equal(response.body, '<h1>Forbidden</h1>');
        });
      });
    });

  });
};
