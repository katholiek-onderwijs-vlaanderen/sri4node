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

  describe('Using queryUtils', function () {
    describe('function filterILike', function () {
      it('should should match substrings case-insensitive', function () {
        return doGet(base + '/persons?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849' +
                     '&firstnameILike=NgRi', 'sabine@email.be', 'pwd')
          .then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 1);
        });
      });
    });

    describe('function filterILike', function () {
      it('should support matching on 2 possible values', function () {
        return doGet(base + '/persons?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849&' +
            'firstnameILike=NgRi,iCoL', 'sabine@email.be', 'pwd')
          .then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 2);
        });
      });
    });

    describe('function filterIn', function () {
      it('should match on exact values', function () {
        return doGet(base + '/persons?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849&' +
                     'firstnameIn=Ingrid', 'sabine@email.be', 'pwd').then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 1);
        });
      });
    });

    describe('function filterIn', function () {
      it('should ONLY match on exact values', function () {
        return doGet(base + '/persons?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849' +
                     '&firstnameIn=Gobeldigook', 'sabine@email.be', 'pwd').then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 0);
        });
      });
    });

    describe('function filterIn', function () {
      it('should support matching on 2 possible values', function () {
        return doGet(base + '/persons?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849' +
                     '&firstnameIn=Ingrid,Nicole', 'sabine@email.be', 'pwd').then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$meta.count, 2);
        });
      });
    });
  });

  describe('utils.addReferencingResources ', function () {
    describe('on afterread /persons', function () {
      it('should include related transactions', function () {
        return doGet(base + '/persons/9abe4102-6a29-4978-991e-2a30655030e6',
                     'sabine@email.be', 'pwd').then(function (response) {
          debug(response.body);
          assert.equal(response.statusCode, 200);
          assert.equal(response.body.$$transactions.length, 1);
        });
      });
    });
  });
};
