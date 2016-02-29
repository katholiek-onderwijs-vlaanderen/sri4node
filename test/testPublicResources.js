// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;
//var needle = require('needle');
//var Q = require('q');

exports = module.exports = function (base) {
  'use strict';

  describe('GET public resource', function () {

    describe('List', function () {

      describe('without authentication', function () {
        it('should return resource', function () {
          return doGet(base + '/alldatatypes?textIn=value').
          then(function (response) {
            assert.equal(response.statusCode, 200);
          });
        });
      });

      describe('with authentication', function () {
        it('should return resource', function () {
          return doGet(base + '/alldatatypes?textIn=value',
            'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
          });
        });
      });

    });

    describe('Regular resource', function () {
      describe('without authentication', function () {
        it('should return resource', function () {
          return doGet(base + '/alldatatypes/fd7e38e1-26c3-425e-9443-8a80722dfb16').
          then(function (response) {
            assert.equal(response.statusCode, 200);
          });
        });
      });

      describe('with authentication', function () {
        it('should return resource', function () {
          return doGet(base + '/alldatatypes/fd7e38e1-26c3-425e-9443-8a80722dfb16',
            'nicole@email.be', 'pwd').then(function (response) {
              assert.equal(response.statusCode, 200);
            });
        });
      });

    });


  });

  describe('GET private resource', function () {
    describe('List', function () {

      describe('without authentication', function () {
        it('should return 401', function () {
          return doGet(base + '/alldatatypes').
          then(function (response) {
            assert.equal(response.statusCode, 401);
          });
        });
      });

      describe('with authentication', function () {
        it('should return resource', function () {
          return doGet(base + '/alldatatypes', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
          });
        });
      });

    });

    describe('Regular resource', function () {
      describe('without authentication', function () {
        it('should return 401', function () {
          return doGet(base + '/alldatatypes/de3d49e0-70df-4cf1-ad1e-6e8645049977').
          then(function (response) {
            assert.equal(response.statusCode, 401);
          });
        });
      });

      describe('with authentication', function () {
        it('should return resource', function () {
          return doGet(base + '/alldatatypes/de3d49e0-70df-4cf1-ad1e-6e8645049977', 'nicole@email.be', 'pwd')
          .then(function (response) {
              assert.equal(response.statusCode, 200);
            });
        });
      });

    });
  });

};
