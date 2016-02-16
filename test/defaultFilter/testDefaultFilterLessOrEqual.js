// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Generic Filters', function () {

    describe('LessOrEqual (alias Before) match', function () {

      describe('String fields', function () {

        // text
        it('should find resources of type text that are lower', function () {
          return doGet(base + '/alldatatypes?textLessOrEqual=test', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 3);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should not find resources of type text that are equal', function () {
          return doGet(base + '/alldatatypes?textLessOrEqual=A%20value%20with%20spaces', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources of type text that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?textBefore=candidate', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources of type text case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveLessOrEqual=Test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should not find resources of type text case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveLessOrEqual=1', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text with a not match', function () {
          return doGet(base + '/alldatatypes?textNotLessOrEqual=test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources of type text with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveNotLessOrEqual=test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        // varchar
        it('should find resources of type varchar that are lower', function () {
          return doGet(base + '/alldatatypes?textvarcharLessOrEqual=test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should find resources of type varchar that are equal', function () {
          return doGet(base + '/alldatatypes?textvarcharLessOrEqual=not%20a%20text%20varchar', 'kevin@email.be', 'pwd')
            .then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
            });
        });

        it('should find resources of type varchar that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?textvarcharBefore=var', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should find resources of type varchar case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveLessOrEqual=xyz', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should not find resources of type varchar case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveLessOrEqual=char', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar with a not match', function () {
          return doGet(base + '/alldatatypes?textvarcharNotLessOrEqual=test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should find resources of type varchar with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveNotLessOrEqual=test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        // char
        it('should find resources of type char that are lower', function () {
          return doGet(base + '/alldatatypes?textcharLessOrEqual=milk', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

        it('should find resources of type char that are equal', function () {
          return doGet(base + '/alldatatypes?textcharLessOrEqual=char', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

        it('should find resources of type char that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?textcharBefore=link', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

        it('should find resources of type char case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveLessOrEqual=not', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

        it('should not find resources of type char case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveLessOrEqual=boolean', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char with a not match', function () {
          return doGet(base + '/alldatatypes?textcharNotLessOrEqual=link', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should find resources of type char with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveNotLessOrEqual=abc', 'kevin@email.be', 'pwd')
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
          return doGet(base + '/alldatatypes?numberLessOrEqual=16', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

        it('should find resources of type numeric that are equal', function () {
          return doGet(base + '/alldatatypes?numberLessOrEqual=11', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

        it('should find resources of type numeric that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?numberBefore=15', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

        it('should find resources of type numeric with a not match', function () {
          return doGet(base + '/alldatatypes?numberNotLessOrEqual=11', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.number, 16.11);
          });
        });

        // integer
        it('should find resources of type integer that are lower', function () {
          return doGet(base + '/alldatatypes?numberintLessOrEqual=2000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 1358);
          });
        });

        it('should find resources of type integer that are equal', function () {
          return doGet(base + '/alldatatypes?numberintLessOrEqual=1358', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 1358);
          });
        });

        it('should find resources of type integer that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?numberintBefore=1500', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 1358);
          });
        });

        it('should find resources of type integer with a not match', function () {
          return doGet(base + '/alldatatypes?numberintNotLessOrEqual=1500', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 2456);
          });
        });

        // bigint
        it('should find resources of type bigint that are lower', function () {
          return doGet(base + '/alldatatypes?numberbigintLessOrEqual=1000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
          });
        });

        it('should find resources of type bigint that are equal', function () {
          return doGet(base + '/alldatatypes?numberbigintLessOrEqual=314159', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
          });
        });

        it('should find resources of type bigint that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?numberbigintBefore=900000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
          });
        });

        it('should find resources of type bigint with a not match', function () {
          return doGet(base + '/alldatatypes?numberbigintNotLessOrEqual=314160', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
          });
        });

        // smallint
        it('should find resources of type smallint that are lower', function () {
          return doGet(base + '/alldatatypes?numbersmallintLessOrEqual=0', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
          });
        });

        it('should find resources of type smallint that are equal', function () {
          return doGet(base + '/alldatatypes?numbersmallintLessOrEqual=-4159', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
          });
        });

        it('should find resources of type smallint that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?numbersmallintBefore=30', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
          });
        });

        it('should find resources of type smallint with a not match', function () {
          return doGet(base + '/alldatatypes?numbersmallintNotLessOrEqual=-100', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
          });
        });

        // decimal
        it('should find resources of type decimal that are lower', function () {
          return doGet(base + '/alldatatypes?numberdecimalLessOrEqual=10', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
          });
        });

        it('should find resources of type decimal that are equal', function () {
          return doGet(base + '/alldatatypes?numberdecimalLessOrEqual=-3424.234', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
          });
        });

        it('should find resources of type decimal that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?numberdecimalBefore=100', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
          });
        });

        it('should find resources of type decimal with a not match', function () {
          return doGet(base + '/alldatatypes?numberdecimalNotLessOrEqual=45', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
          });
        });

        // real
        it('should find resources of type real that are lower', function () {
          return doGet(base + '/alldatatypes?numberrealLessOrEqual=10000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
          });
        });

        it('should find resources of type real that are equal', function () {
          return doGet(base + '/alldatatypes?numberrealLessOrEqual=1200', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
          });
        });

        it('should find resources of type real that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?numberrealBefore=1800', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
          });
        });

        it('should find resources of type real with a not match', function () {
          return doGet(base + '/alldatatypes?numberrealNotLessOrEqual=1400', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
          });
        });

        // double precision
        it('should find resources of type double precision that are lower', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionLessOrEqual=-12', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
          });
        });

        it('should find resources of type double precision that are equal', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionLessOrEqual=-12.121212', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
          });
        });

        it('should find resources of type double precision that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionBefore=0', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
          });
        });

        it('should find resources of type double precision with a not match', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionNotLessOrEqual=0', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
          });
        });

        // smallserial
        it('should find resources of type smallserial that are lower', function () {
          return doGet(base + '/alldatatypes?numbersmallserialLessOrEqual=300', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
          });
        });

        it('should find resources of type smallserial that are equal', function () {
          return doGet(base + '/alldatatypes?numbersmallserialLessOrEqual=121', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
          });
        });

        it('should find resources of type smallserial that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?numbersmallserialBefore=200', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
          });
        });

        it('should find resources of type smallserial with a not match', function () {
          return doGet(base + '/alldatatypes?numbersmallserialNotLessOrEqual=200', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
          });
        });

        // serial
        it('should find resources of type serial that are lower', function () {
          return doGet(base + '/alldatatypes?numberserialLessOrEqual=3000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberserial, 1);
          });
        });

        it('should find resources of type serial that are equal', function () {
          return doGet(base + '/alldatatypes?numberserialLessOrEqual=1210', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberserial, 1);
          });
        });

        it('should find resources of type serial that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?numberserialBefore=3000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberserial, 1);
          });
        });

        it('should find resources of type serial with a not match', function () {
          return doGet(base + '/alldatatypes?numberserialNotLessOrEqual=1000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.numberserial, 1210);
          });
        });

        // bigserial
        it('should find resources of type bigserial that are lower', function () {
          return doGet(base + '/alldatatypes?numberbigserialLessOrEqual=30000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
          });
        });

        it('should find resources of type bigserial that are equal', function () {
          return doGet(base + '/alldatatypes?numberbigserialLessOrEqual=12100', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
          });
        });

        it('should find resources of type bigserial that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?numberbigserialBefore=30000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
          });
        });

        it('should find resources of type bigserial with a not match', function () {
          return doGet(base + '/alldatatypes?numberbigserialNotLessOrEqual=10000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 12100);
          });
        });

      });

      describe('Timestamp fields', function () {
        it('should find resources that are lower', function () {
          return doGet(base + '/alldatatypes?publicationLessOrEqual=2015-02-01T00:00:00-02:00', 'kevin@email.be', 'pwd')
          .then(
            function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-01-01T00:00:00+02:00').getTime());
            });
        });

        it('should find resources that are equal', function () {
          var q = '/alldatatypes?publicationLessOrEqual=2015-01-01T00:00:00%2B02:00';
          return doGet(base + q, 'kevin@email.be', 'pwd')
          .then(
            function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-01-01T00:00:00+02:00').getTime());
            });
        });

        it('should find resources that are lower with operator Before (alias)', function () {
          return doGet(base + '/alldatatypes?publicationBefore=2015-02-01T00:00:00-02:00', 'kevin@email.be', 'pwd')
          .then(
            function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-01-01T00:00:00+02:00').getTime());
            });
        });

        it('should find resources with a not match', function () {
          var q = '/alldatatypes?publicationNotLessOrEqual=2015-02-01T00:00:00-02:00';
          return doGet(base + q, 'kevin@email.be', 'pwd')
          .then(
            function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-03-04T22:00:00-03:00').getTime());
            });
        });
      });
    });

  });
};
