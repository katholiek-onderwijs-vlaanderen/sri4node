// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Generic Filters', function () {

    describe('RegEx match', function () {

      describe('String fields', function () {

        // text
        it('should find resources of type text with a regex', function () {
          return doGet(base + '/alldatatypes?textRegEx=%5E(.*)%5Bv%7CV%5Dalue(.*)%24').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find only one resource of type text with a regex', function () {
          return doGet(base + '/alldatatypes?textRegEx=%5E(.%20)%5Bv%7CV%5Dalue(.*)%24').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should not find resources of type text with a regex', function () {
          return doGet(base + '/alldatatypes?textRegEx=%5E%5B0-9%5D*%24').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text with a regex case sensitive', function () {
          var q = '/alldatatypes?textCaseSensitiveRegEx=%5E(.*)Value(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources of type text with a regex case sensitive', function () {
          var q = '/alldatatypes?textCaseSensitiveRegEx=%5E(.*)VALUE(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text with a regex with a not match', function () {
          var q = '/alldatatypes?textNotRegEx=%5E(.*)value(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 3);
          });
        });

        it('should find resources of type text with a regex with a not match case sensitive', function () {
          var q = '/alldatatypes?textCaseSensitiveNotRegEx=%5E(.*)VALUE(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

        // varchar
        it('should find resources of type varchar with a regex', function () {
          return doGet(base + '/alldatatypes?textvarcharRegEx=%5E(.*)%5Bv%7CV%5Darc(.*)%24').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
            assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should find only one resource of type varchar with a regex', function () {
          return doGet(base + '/alldatatypes?textvarcharRegEx=%5E(.*)%5Bt%7CT%5Dext(.*)%24').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should not find resources of type varchar with a regex', function () {
          return doGet(base + '/alldatatypes?textvarcharRegEx=%5E%5B0-9%5D*%24').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar with a regex case sensitive', function () {
          var q = '/alldatatypes?textvarcharCaseSensitiveRegEx=%5E(.*)text(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should not find resources of type varchar with a regex case sensitive', function () {
          var q = '/alldatatypes?textvarcharCaseSensitiveRegEx=%5E(.*)Text(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar with a regex with a not match', function () {
          var q = '/alldatatypes?textvarcharNotRegEx=%5E(.*)text(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should find resources of type varchar with a regex with a not match case sensitive', function () {
          var q = '/alldatatypes?textvarcharCaseSensitiveNotRegEx=%5E(.*)Text(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
            assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        // char
        it('should find resources of type char with a regex', function () {
          return doGet(base + '/alldatatypes?textcharRegEx=%5E(.*)%5Bc%7CC%5Dha(.*)%24').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
            assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should find only one resource of type char with a regex', function () {
          return doGet(base + '/alldatatypes?textcharRegEx=%5E(.*)%5Bt%7CT%5Dext(.*)%24').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should not find resources of type char with a regex', function () {
          return doGet(base + '/alldatatypes?textcharRegEx=%5E%5B0-9%5D*%24').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char with a regex case sensitive', function () {
          var q = '/alldatatypes?textcharCaseSensitiveRegEx=%5E(.*)text(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should not find resources of type char with a regex case sensitive', function () {
          var q = '/alldatatypes?textcharCaseSensitiveRegEx=%5E(.*)Text(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char with a regex with a not match', function () {
          var q = '/alldatatypes?textcharNotRegEx=%5E(.*)text(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

        it('should find resources of type char with a regex with a not match case sensitive', function () {
          var q = '/alldatatypes?textcharCaseSensitiveNotRegEx=%5E(.*)Text(.*)%24';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
            assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
          });
        });
      });
    });
  });

};
