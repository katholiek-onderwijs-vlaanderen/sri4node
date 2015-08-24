// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Generic Filters', function () {

    describe('Contains match', function () {

      describe('String fields', function () {

        // text
        it('should find resources of type text that contain a substring', function () {
          return doGet(base + '/alldatatypes?textContains=lu').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources of type text that start with a substring', function () {
          return doGet(base + '/alldatatypes?textContains=va').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources of type text that end with a substring', function () {
          return doGet(base + '/alldatatypes?textContains=Aces').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should not find resources of type text that do not contain a substring', function () {
          return doGet(base + '/alldatatypes?textContains=mor').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text that contain a substring case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveContains=lu').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

        it('should not find resources of type text that contain a substring case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveContains=LU').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text that contain a substring with a not match', function () {
          return doGet(base + '/alldatatypes?textNotContains=LU').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 3);
          });
        });

        it('should find resources of type text that contain a substring with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveNotContains=LU').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

        // varchar
        it('should find resources of type varchar that contain a substring', function () {
          return doGet(base + '/alldatatypes?textvarcharContains=arch').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
            assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should find resources of type varchar that start with a substring', function () {
          return doGet(base + '/alldatatypes?textvarcharContains=var').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
            assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should find resources of type varchar that end with a substring', function () {
          return doGet(base + '/alldatatypes?textvarcharContains=char').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
            assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should not find resources of type varchar that do not contain a substring', function () {
          return doGet(base + '/alldatatypes?textvarcharContains=mor').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar that contain a substring case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveContains=arch').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
            assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should not find resources of type varchar that contain a substring case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveContains=ARCH').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar that contain a substring with a not match', function () {
          return doGet(base + '/alldatatypes?textvarcharNotContains=not').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should find resources of type varchar that contain a substring with a not match case sensitive',
          function () {
            return doGet(base + '/alldatatypes?textvarcharCaseSensitiveNotContains=Not').then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 2);
              assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
              assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
            });
          });

        // char
        it('should find resources of type char that contain a substring', function () {
          return doGet(base + '/alldatatypes?textcharContains=ha').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
            assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should find resources of type char that start with a substring', function () {
          return doGet(base + '/alldatatypes?textcharContains=ch').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
            assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should find resources of type char that end with a substring', function () {
          return doGet(base + '/alldatatypes?textcharContains=har').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
            assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should not find resources of type char that do not contain a substring', function () {
          return doGet(base + '/alldatatypes?textcharContains=mor').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char that contain a substring case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveContains=not').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should not find resources of type char that contain a substring case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveContains=CH').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char that contain a substring with a not match', function () {
          return doGet(base + '/alldatatypes?textcharNotContains=var').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
            assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should find resources of type char that contain a substring with a not match case sensitive',
          function () {
            return doGet(base + '/alldatatypes?textcharCaseSensitiveNotContains=NOT').then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 2);
              assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
              assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
            });
          });

      });

      describe('Timestamp fields', function () {
        // TBD
      });

      describe('Array fields', function () {

        it('should find strings', function () {
          return doGet(base + '/alldatatypes?textsContains=Standard,interface').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 7);
          });
        });

        it('should not find strings', function () {
          return doGet(base + '/alldatatypes?textsContains=Standard,definition').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find strings with a not match', function () {
          return doGet(base + '/alldatatypes?textsNotContains=Standard,interface').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 8);
          });
        });

        it('should find numbers', function () {
          return doGet(base + '/alldatatypes?numbersContains=5,3').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.id, 9);
            assert.equal(response.body.results[1].$$expanded.id, 10);
          });
        });

        it('should not find numbers', function () {
          return doGet(base + '/alldatatypes?numbersContains=12').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find numbers with a not match', function () {
          return doGet(base + '/alldatatypes?numbersNotContains=5,3').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find timestamps', function () {
          var q = '/alldatatypes?publicationsContains=2015-04-01T00:00:00%2B02:00';
          q += ',2015-01-01T00:00:00%2B02:00';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 11);
          });
        });

        it('should not find timestamps', function () {
          return doGet(base + '/alldatatypes?publicationsContains=2012-01-01T00:00:00%2B02:00')
            .then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 0);
            });
        });

        it('should find timestamps with a not match', function () {
          var q = '/alldatatypes?publicationsNotContains=2015-04-01T00:00:00%2B02:00';
          q += ',2015-01-01T00:00:00%2B02:00';
          return doGet(base + q).then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 12);
          });
        });

      });

    });

  });
};
