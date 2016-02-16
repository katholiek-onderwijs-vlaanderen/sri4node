// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Generic Filters', function () {

    describe('Greater match', function () {

      describe('String fields', function () {

        // text
        it('should find resources of type text that are greater', function () {
          return doGet(base + '/alldatatypes?textGreater=test', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources of type text that are equal', function () {
          return doGet(base + '/alldatatypes?textGreater=X', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveGreater=Test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 4);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources of type text case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveGreater=test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text with a not match', function () {
          return doGet(base + '/alldatatypes?textNotGreater=Test', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 3);
            assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources of type text with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveNotGreater=test', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

        // varchar
        it('should find resources of type varchar that are greater', function () {
          return doGet(base + '/alldatatypes?textvarcharGreater=Pool', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should not find resources of type varchar that are equal', function () {
          return doGet(base + '/alldatatypes?textvarcharGreater=varchar', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveGreater=pool', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should not find resources of type varchar case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveGreater=varchar', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar with a not match', function () {
          return doGet(base + '/alldatatypes?textvarcharNotGreater=pool', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should find resources of type varchar with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveNotGreater=pool', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        // char
        it('should find resources of type char that are greater', function () {
          return doGet(base + '/alldatatypes?textcharGreater=link', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should not find resources of type char that are equal', function () {
          return doGet(base + '/alldatatypes?textcharGreater=not%20a%20text%20char', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveGreater=link', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should not find resources of type char case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveGreater=pool', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char with a not match', function () {
          return doGet(base + '/alldatatypes?textcharNotGreater=link', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

        it('should find resources of type char with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveNotGreater=link', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

      });

      describe('Numeric fields', function () {

        // numeric
        it('should find resources of type numeric that are greater', function () {
          return doGet(base + '/alldatatypes?numberGreater=15.4', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 4);
            assert.equal(response.body.results[0].$$expanded.number, 16.11);
          });
        });

        it('should not find resources of type numeric that are equal', function () {
          return doGet(base + '/alldatatypes?numberGreater=1000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type numeric with a not match', function () {
          return doGet(base + '/alldatatypes?numberNotGreater=15.7', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

        // integer
        it('should find resources of type integer that are greater', function () {
          return doGet(base + '/alldatatypes?numberintGreater=1400', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 2456);
          });
        });

        it('should not find resources of type integer that are equal', function () {
          return doGet(base + '/alldatatypes?numberintGreater=2456', 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type integer with a not match', function () {
          return doGet(base + '/alldatatypes?numberintNotGreater=2000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 1358);
          });
        });

        // bigint
        it('should find resources of type bigint that are greater', function () {
          return doGet(base + '/alldatatypes?numberbigintGreater=1000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
          });
        });

        it('should not find resources of type bigint that are equal', function () {
          return doGet(base + '/alldatatypes?numberbigintGreater=7500000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type bigint with a not match', function () {
          return doGet(base + '/alldatatypes?numberbigintNotGreater=750000000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
          });
        });

        // smallint
        it('should find resources of type smallint that are greater', function () {
          return doGet(base + '/alldatatypes?numbersmallintGreater=-100', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
          });
        });

        it('should not find resources of type smallint that are equal', function () {
          return doGet(base + '/alldatatypes?numbersmallintGreater=7560', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type smallint with a not match', function () {
          return doGet(base + '/alldatatypes?numbersmallintNotGreater=0', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
          });
        });

        // decimal
        it('should find resources of type decimal that are greater', function () {
          return doGet(base + '/alldatatypes?numberdecimalGreater=-1200.5', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
          });
        });

        it('should not find resources of type decimal that are equal', function () {
          return doGet(base + '/alldatatypes?numberdecimalGreater=456.222', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type decimal with a not match', function () {
          return doGet(base + '/alldatatypes?numberdecimalNotGreater=-1000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
          });
        });

        // real
        it('should find resources of type real that are greater', function () {
          return doGet(base + '/alldatatypes?numberrealGreater=1500', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
          });
        });

        it('should not find resources of type real that are equal', function () {
          return doGet(base + '/alldatatypes?numberrealGreater=12000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type real with a not match', function () {
          return doGet(base + '/alldatatypes?numberrealNotGreater=10000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
          });
        });

        // doubleprecision
        it('should find resources of type doubleprecision that are greater', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionGreater=0', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
          });
        });

        it('should not find resources of type doubleprecision that are equal', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionGreater=100.4545454', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type doubleprecision with a not match', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionNotGreater=100', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
          });
        });

        // smallserial
        it('should find resources of type smallserial that are greater', function () {
          return doGet(base + '/alldatatypes?numbersmallserialGreater=200', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
          });
        });

        it('should not find resources of type smallserial that are equal', function () {
          return doGet(base + '/alldatatypes?numbersmallserialGreater=368', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type smallserial with a not match', function () {
          return doGet(base + '/alldatatypes?numbersmallserialNotGreater=300', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
          });
        });

        // bigserial
        it('should find resources of type bigserial that are greater', function () {
          return doGet(base + '/alldatatypes?numberbigserialGreater=20000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 36800);
          });
        });

        it('should not find resources of type bigserial that are equal', function () {
          return doGet(base + '/alldatatypes?numberbigserialGreater=36800', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type bigserial with a not match', function () {
          return doGet(base + '/alldatatypes?numberbigserialNotGreater=3000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
          });
        });

        // serial
        it('should find resources of type serial that are greater', function () {
          return doGet(base + '/alldatatypes?numberserialGreater=2000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberserial, 3680);
          });
        });

        it('should not find resources of type serial that are equal', function () {
          return doGet(base + '/alldatatypes?numberserialGreater=36800', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type serial with a not match', function () {
          return doGet(base + '/alldatatypes?numberserialNotGreater=30000', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberserial, 1);
          });
        });

      });

      describe('Timestamp fields', function () {
        it('should find resources that are greater', function () {
          return doGet(base + '/alldatatypes?publicationGreater=2015-02-01T00:00:00%2B02:00', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
          });
        });

        it('should not find resources that are equal', function () {
          return doGet(base + '/alldatatypes?publicationGreater=2015-03-04T22:00:00-03:00', 'kevin@email.be', 'pwd')
          .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources that are greater', function () {
          var q = '/alldatatypes?publicationNotGreater=2015-02-01T00:00:00%2B02:00';
          return doGet(base + q, 'kevin@email.be', 'pwd').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
          });
        });

      });
    });
  });
};
