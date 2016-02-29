// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Generic Filters', function () {

    describe('Exact match', function () {

      describe('String fields', function () {

        // text
        it('should find resources of type text with an exact match', function () {
          return doGet(base + '/alldatatypes?text=Value', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources of type text with an exact match with spaces', function () {
          return doGet(base + '/alldatatypes?text=A%20value%20with%20spaces', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources of type text with a case insensitive match', function () {
          return doGet(base + '/alldatatypes?text=value', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources of type text with a value that does not match', function () {
          return doGet(base + '/alldatatypes?text=not-present', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text with a case sensitive match', function () {
          return doGet(base + '/alldatatypes?textCaseSensitive=Value', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources of type text with a case sensitive match', function () {
          return doGet(base + '/alldatatypes?textCaseSensitive=value', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text with a not match', function () {
          return doGet(base + '/alldatatypes?textNot=value', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 4);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources of type text with a not match and case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveNot=Value', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 4);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        // varchar
        it('should find resources of type varchar with an exact match', function () {
          return doGet(base + '/alldatatypes?textvarchar=Varchar', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should find resources of type varchar with an exact match with spaces', function () {
          return doGet(base + '/alldatatypes?textvarchar=not%20a%20text%20varchar', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should find resources of type varchar with a case insensitive match', function () {
          return doGet(base + '/alldatatypes?textvarchar=VARCHAR', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should not find resources of type varchar with a value that does not match', function () {
          return doGet(base + '/alldatatypes?textvarchar=not-present', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar with a case sensitive match', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitive=varchar', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should not find resources of type varchar with a case sensitive match', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitive=Varchar', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar with a not match', function () {
          return doGet(base + '/alldatatypes?textvarcharNot=varchar', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should find resources of type varchar with a not match and case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveNot=varchar', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        // char
        it('should find resources of type char with an exact match', function () {
          return doGet(base + '/alldatatypes?textchar=char', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim().trim(), 'char');
          });
        });

        it('should find resources of type char with an exact match with spaces', function () {
          return doGet(base + '/alldatatypes?textchar=not%20a%20text%20char', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should find resources of type char with a case insensitive match', function () {
          return doGet(base + '/alldatatypes?textchar=Char', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

        it('should not find resources of type char with a value that does not match', function () {
          return doGet(base + '/alldatatypes?textchar=not-present', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char with a case sensitive match', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitive=char', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

        it('should not find resources of type char with a case sensitive match', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitive=Char', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char with a not match', function () {
          return doGet(base + '/alldatatypes?textcharNot=char', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should find resources of type char with a not match and case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveNot=char', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

      });

      describe('Numeric fields', function () {

        // numeric
        it('should find resources of type numeric with an exact match', function () {
          return doGet(base + '/alldatatypes?number=16.11', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 16.11);
          });
        });

        it('should not find resources of type numeric with a value that does not match', function () {
          return doGet(base + '/alldatatypes?number=314', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type numeric with a not match', function () {
          return doGet(base + '/alldatatypes?numberNot=16.11', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 4);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

        // integer
        it('should find resources of type integer with an exact match', function () {
          return doGet(base + '/alldatatypes?numberint=2456', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 2456);
          });
        });

        it('should not find resources of type integer with a value that does not match', function () {
          return doGet(base + '/alldatatypes?numberint=314', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type integer with a not match', function () {
          return doGet(base + '/alldatatypes?numberintNot=2456', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 1358);
          });
        });

        // bigint
        it('should find resources of type bigint with an exact match', function () {
          return doGet(base + '/alldatatypes?numberbigint=7500000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
          });
        });

        it('should not find resources of type bigint with a value that does not match', function () {
          return doGet(base + '/alldatatypes?numberbigint=750000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type bigint with a not match', function () {
          return doGet(base + '/alldatatypes?numberbigintNot=7500000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
          });
        });

        // smallint
        it('should find resources of type smallint with an exact match', function () {
          return doGet(base + '/alldatatypes?numbersmallint=-4159', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
          });
        });

        it('should not find resources of type smallint with a value that does not match', function () {
          return doGet(base + '/alldatatypes?numbersmallint=75', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type smallint with a not match', function () {
          return doGet(base + '/alldatatypes?numbersmallintNot=-4159', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
          });
        });

        // decimal
        it('should find resources of type decimal with an exact match', function () {
          return doGet(base + '/alldatatypes?numberdecimal=-3424.234', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
          });
        });

        it('should not find resources of type decimal with a value that does not match', function () {
          return doGet(base + '/alldatatypes?numberdecimal=750000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type decimal with a not match', function () {
          return doGet(base + '/alldatatypes?numberdecimalNot=-3424.234', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
          });
        });

        // real
        it('should find resources of type real with an exact match', function () {
          return doGet(base + '/alldatatypes?numberreal=1200', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
          });
        });

        it('should not find resources of type real with a value that does not match', function () {
          return doGet(base + '/alldatatypes?numberreal=750000000', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type real with a not match', function () {
          return doGet(base + '/alldatatypes?numberrealNot=1200', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
          });
        });

        // doubleprecision
        it('should find resources of type doubleprecision with an exact match', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecision=-12.121212', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
          });
        });

        it('should not find resources of type doubleprecision with a value that does not match', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecision=750000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type doubleprecision with a not match', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionNot=-12.121212', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
          });
        });

        // smallserial
        it('should find resources of type smallserial with an exact match', function () {
          return doGet(base + '/alldatatypes?numbersmallserial=121', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 121);
          });
        });

        it('should not find resources of type smallserial with a value that does not match', function () {
          return doGet(base + '/alldatatypes?numbersmallserial=7000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type smallserial with a not match', function () {
          return doGet(base + '/alldatatypes?numbersmallserialNot=121', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
          });
        });

        // serial
        it('should find resources of type serial with an exact match', function () {
          return doGet(base + '/alldatatypes?numberserial=1210', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberserial, 1210);
          });
        });

        it('should not find resources of type serial with a value that does not match', function () {
          return doGet(base + '/alldatatypes?numberserial=750000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type serial with a not match', function () {
          return doGet(base + '/alldatatypes?numberserialNot=1210', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberserial, 1);
          });
        });

        // bigserial
        it('should find resources of type bigserial with an exact match', function () {
          return doGet(base + '/alldatatypes?numberbigserial=12100', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 12100);
          });
        });

        it('should not find resources of type bigserial with a value that does not match', function () {
          return doGet(base + '/alldatatypes?numberbigserial=750000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type bigserial with a not match', function () {
          return doGet(base + '/alldatatypes?numberbigserialNot=12100', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
          });
        });

      });

      describe('Timestamp fields', function () {

        it('should find resources with an exact match', function () {
          return doGet(base + '/alldatatypes?publication=2015-01-01T00:00:00%2B02:00', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
          });
        });

        it('should not find resources with a value that does not match', function () {
          return doGet(base + '/alldatatypes?publication=2015-01-01T00:00:00-03:00', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?publicationNot=2015-01-01T00:00:00%2B02:00', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
          });
        });

      });

      describe('Array fields', function () {

        it('should find strings with an exact match', function () {
          return doGet(base + '/alldatatypes?texts=Standard,interface,ROA', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 7);
          });
        });

        it('should not find strings with a partial match', function () {
          return doGet(base + '/alldatatypes?texts=Standard,interface', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find strings with a not match', function () {
          return doGet(base + '/alldatatypes?textsNot=Standard,interface,ROA', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 8);
          });
        });

        it('should not find strings with a value that does not match', function () {
          return doGet(base + '/alldatatypes?texts=another,thing', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find numbers with an exact match', function () {
          return doGet(base + '/alldatatypes?numbers=8,13,5,3', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 9);
          });
        });

        it('should not find numbers with a partial match', function () {
          return doGet(base + '/alldatatypes?numbers=3,5,8', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find numbers with a not match', function () {
          return doGet(base + '/alldatatypes?numbersNot=8,13,5,3', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 10);
          });
        });

        it('should find timestamps with an exact match', function () {
          var q = '/alldatatypes?publications=2015-01-01T00:00:00%2B02:00';
          q += ',2015-07-01T00:00:00%2B02:00,2015-04-01T00:00:00%2B02:00';
          return doGet(base + q, 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 11);
          });
        });

        it('should not find timestamps with a partial match', function () {
          return doGet(base + '/alldatatypes?publications=2015-01-01T00:00:00%2B02:00', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find timestamps with a not match', function () {
          var q = '/alldatatypes?publicationsNot=2015-01-01T00:00:00%2B02:00';
          q += ',2015-07-01T00:00:00%2B02:00,2015-04-01T00:00:00%2B02:00';
          return doGet(base + q, 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.id, 12);
          });
        });

      });
    });
  });

};
