// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Generic Filters', function () {

    describe('Less match', function () {
      describe('String fields', function () {

        // text
        it('should find resources of type text that are lower', function () {
          return doGet(base + '/alldatatypes?textLess=test', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 3);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should not find resources of type text that are equal', function () {
          return doGet(base + '/alldatatypes?textLess=A%20value%20with%20spaces', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveLess=Test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should not find resources of type text case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveLess=1', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text with a not match', function () {
          return doGet(base + '/alldatatypes?textNotLess=test', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources of type text with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveNotLess=yes', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        // varchar
        it('should find resources of type varchar that are lower', function () {
          return doGet(base + '/alldatatypes?textvarcharLess=test', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should not find resources of type varchar that are equal', function () {
          return doGet(base + '/alldatatypes?textvarcharLess=not%20a%20text%20varchar', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveLess=xyz', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should not find resources of type varchar case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveLess=char', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar with a not match', function () {
          return doGet(base + '/alldatatypes?textvarcharNotLess=test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should find resources of type varchar with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveNotLess=test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        // char
        it('should find resources of type char that are lower', function () {
          return doGet(base + '/alldatatypes?textcharLess=milk', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

        it('should not find resources of type char that are equal', function () {
          return doGet(base + '/alldatatypes?textcharLess=char', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveLess=not', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

        it('should not find resources of type char case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveLess=char', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char with a not match', function () {
          return doGet(base + '/alldatatypes?textcharNotLess=link', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should find resources of type char with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveNotLess=abc', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

      });

      describe('Numeric fields', function () {

        // numeric
        it('should find resources of type numeric that are lower', function () {
          return doGet(base + '/alldatatypes?numberLess=16', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

        it('should not find resources of type numeric that are equal', function () {
          return doGet(base + '/alldatatypes?numberLess=11', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type numeric with a not match', function () {
          return doGet(base + '/alldatatypes?numberNotLess=11', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 4);
            assert.equal(response.body.results[0].$$expanded.number, 16.11);
          });
        });

        // integer
        it('should find resources of type integer that are lower', function () {
          return doGet(base + '/alldatatypes?numberintLess=2000', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 1358);
          });
        });

        it('should not find resources of type integer that are equal', function () {
          return doGet(base + '/alldatatypes?numberintLess=1358', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type integer with a not match', function () {
          return doGet(base + '/alldatatypes?numberintNotLess=1500', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 2456);
          });
        });

        // bigint
        it('should find resources of type bigint that are lower', function () {
          return doGet(base + '/alldatatypes?numberbigintLess=1000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
          });
        });

        it('should not find resources of type bigint that are equal', function () {
          return doGet(base + '/alldatatypes?numberbigintLess=314159', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type bigint with a not match', function () {
          return doGet(base + '/alldatatypes?numberbigintNotLess=314159', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
          });
        });

        // smallint
        it('should find resources of type smallint that are lower', function () {
          return doGet(base + '/alldatatypes?numbersmallintLess=0', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
          });
        });

        it('should not find resources of type smallint that are equal', function () {
          return doGet(base + '/alldatatypes?numbersmallintLess=-4159', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type smallint with a not match', function () {
          return doGet(base + '/alldatatypes?numbersmallintNotLess=-100', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
          });
        });

        // decimal
        it('should find resources of type decimal that are lower', function () {
          return doGet(base + '/alldatatypes?numberdecimalLess=10', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
          });
        });

        it('should not find resources of type decimal that are equal', function () {
          return doGet(base + '/alldatatypes?numberdecimalLess=-3424.234', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type decimal with a not match', function () {
          return doGet(base + '/alldatatypes?numberdecimalNotLess=45', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
          });
        });

        // real
        it('should find resources of type real that are lower', function () {
          return doGet(base + '/alldatatypes?numberrealLess=10000', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
          });
        });

        it('should not find resources of type real that are equal', function () {
          return doGet(base + '/alldatatypes?numberrealLess=1200', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type real with a not match', function () {
          return doGet(base + '/alldatatypes?numberrealNotLess=1200', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
          });
        });

        // double precision
        it('should find resources of type double precision that are lower', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionLess=-12', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
          });
        });

        it('should not find resources of type double precision that are equal', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionLess=-12.121212', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type double precision with a not match', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionNotLess=-5', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
          });
        });

        // smallserial
        it('should find resources of type smallserial that are lower', function () {
          return doGet(base + '/alldatatypes?numbersmallserialLess=300', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
          });
        });

        it('should not find resources of type smallserial that are equal', function () {
          return doGet(base + '/alldatatypes?numbersmallserialLess=121', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
          });
        });

        it('should find resources of type smallserial with a not match', function () {
          return doGet(base + '/alldatatypes?numbersmallserialNotLess=200', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
          });
        });

        // serial
        it('should find resources of type serial that are lower', function () {
          return doGet(base + '/alldatatypes?numberserialLess=2000', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberserial, 1);
          });
        });

        it('should not find resources of type serial that are equal', function () {
          return doGet(base + '/alldatatypes?numberserialLess=1210', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
          });
        });

        it('should find resources of type serial with a not match', function () {
          return doGet(base + '/alldatatypes?numberserialNotLess=2000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberserial, 3680);
          });
        });

        // bigserial
        it('should find resources of type bigserial that are lower', function () {
          return doGet(base + '/alldatatypes?numberbigserialLess=20000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
          });
        });

        it('should not find resources of type bigserial that are equal', function () {
          return doGet(base + '/alldatatypes?numberbigserialLess=12100', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
          });
        });

        it('should find resources of type bigserial with a not match', function () {
          return doGet(base + '/alldatatypes?numberbigserialNotLess=20000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 36800);
          });
        });

      });

      describe('Timestamp fields', function () {
        it('should find resources that are lower', function () {
          return doGet(base + '/alldatatypes?publicationLess=2015-03-04T22:00:00-03:00', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?publicationLess=2015-01-01T00:00:00%2B02:00', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?publicationNotLess=2015-03-04T22:00:00-03:00', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });
      });
    });
  });
};
