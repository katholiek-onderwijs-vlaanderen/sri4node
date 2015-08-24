// Utility methods for calling the SRI interface
var assert = require('assert');
var sriclient = require('sri4node-client');
var doGet = sriclient.get;

exports = module.exports = function (base) {
  'use strict';

  describe('Generic Filters', function () {

    describe('GreaterOrEqual (alias After) match', function () {

      describe('String fields', function () {

        // text
        it('should find resources of type text that are greater', function () {
          return doGet(base + '/alldatatypes?textGreaterOrEqual=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources of type text that are equal', function () {
          return doGet(base + '/alldatatypes?textGreaterOrEqual=Value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources of type text that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?textAfter=Test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should find resources of type text case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveGreaterOrEqual=Value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 3);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
          });
        });

        it('should not find resources of type text case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveGreaterOrEqual=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type text with a not match', function () {
          return doGet(base + '/alldatatypes?textNotGreaterOrEqual=value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 4);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

        it('should find resources of type text with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textCaseSensitiveNotGreaterOrEqual=value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.text, 'Value');
            assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
          });
        });

        // varchar
        it('should find resources of type varchar that are greater', function () {
          return doGet(base + '/alldatatypes?textvarcharGreaterOrEqual=test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should find resources of type varchar that are equal', function () {
          return doGet(base + '/alldatatypes?textvarcharGreaterOrEqual=Not%20a%20text%20varchar')
            .then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
            assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should find resources of type varchar that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?textvarcharAfter=Test').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should find resources of type varchar case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveGreaterOrEqual=varchar').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          });
        });

        it('should not find resources of type varchar case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveGreaterOrEqual=x').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type varchar with a not match', function () {
          return doGet(base + '/alldatatypes?textvarcharNotGreaterOrEqual=value').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        it('should find resources of type varchar with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textvarcharCaseSensitiveNotGreaterOrEqual=x').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
            assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
          });
        });

        // char
        it('should find resources of type char that are greater', function () {
          return doGet(base + '/alldatatypes?textcharGreaterOrEqual=link').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should find resources of type char that are equal', function () {
          return doGet(base + '/alldatatypes?textcharGreaterOrEqual=Not%20a%20text%20char').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should find resources of type char that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?textcharAfter=dos').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should find resources of type char case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveGreaterOrEqual=char').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
            assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
          });
        });

        it('should not find resources of type char case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveGreaterOrEqual=x').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 0);
          });
        });

        it('should find resources of type char with a not match', function () {
          return doGet(base + '/alldatatypes?textcharNotGreaterOrEqual=link').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          });
        });

        it('should find resources of type char with a not match case sensitive', function () {
          return doGet(base + '/alldatatypes?textcharCaseSensitiveNotGreaterOrEqual=x').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 2);
            assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
            assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
          });
        });

      });

      describe('Numeric fields', function () {

        // numeric
        it('should find resources of type numeric that are greater', function () {
          return doGet(base + '/alldatatypes?numberGreaterOrEqual=12').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 4);
            assert.equal(response.body.results[0].$$expanded.number, 16.11);
          });
        });

        it('should find resources of type numeric that are equal', function () {
          return doGet(base + '/alldatatypes?numberGreaterOrEqual=16.11').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 4);
            assert.equal(response.body.results[0].$$expanded.number, 16.11);
          });
        });

        it('should find resources of type numeric that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?numberAfter=12').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 4);
            assert.equal(response.body.results[0].$$expanded.number, 16.11);
          });
        });

        it('should find resources of type numeric with a not match', function () {
          return doGet(base + '/alldatatypes?numberNotGreaterOrEqual=14').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.number, 11);
          });
        });

        // integer
        it('should find resources of type integer that are greater', function () {
          return doGet(base + '/alldatatypes?numberintGreaterOrEqual=1400').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 2456);
          });
        });

        it('should find resources of type integer that are equal', function () {
          return doGet(base + '/alldatatypes?numberintGreaterOrEqual=2456').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 2456);
          });
        });

        it('should find resources of type integer that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?numberintAfter=1800').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 2456);
          });
        });

        it('should find resources of type integer with a not match', function () {
          return doGet(base + '/alldatatypes?numberintNotGreaterOrEqual=1400').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberint, 1358);
          });
        });

        // bigint
        it('should find resources of type bigint that are greater', function () {
          return doGet(base + '/alldatatypes?numberbigintGreaterOrEqual=320000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
          });
        });

        it('should find resources of type bigint that are equal', function () {
          return doGet(base + '/alldatatypes?numberbigintGreaterOrEqual=7500000000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
          });
        });

        it('should find resources of type bigint that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?numberbigintAfter=7500000000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
          });
        });

        it('should find resources of type bigint with a not match', function () {
          return doGet(base + '/alldatatypes?numberbigintNotGreaterOrEqual=750000000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
          });
        });

        // smallint
        it('should find resources of type smallint that are greater', function () {
          return doGet(base + '/alldatatypes?numbersmallintGreaterOrEqual=0').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
          });
        });

        it('should find resources of type smallint that are equal', function () {
          return doGet(base + '/alldatatypes?numbersmallintGreaterOrEqual=7560').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
          });
        });

        it('should find resources of type smallint that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?numbersmallintAfter=-100').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
          });
        });

        it('should find resources of type smallint with a not match', function () {
          return doGet(base + '/alldatatypes?numbersmallintNotGreaterOrEqual=1000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
          });
        });

        // decimal
        it('should find resources of type decimal that are greater', function () {
          return doGet(base + '/alldatatypes?numberdecimalGreaterOrEqual=20').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
          });
        });

        it('should find resources of type decimal that are equal', function () {
          return doGet(base + '/alldatatypes?numberdecimalGreaterOrEqual=456.222').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
          });
        });

        it('should find resources of type decimal that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?numberdecimalAfter=100').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
          });
        });

        it('should find resources of type decimal with a not match', function () {
          return doGet(base + '/alldatatypes?numberdecimalNotGreaterOrEqual=0').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
          });
        });

        // real
        it('should find resources of type real that are greater', function () {
          return doGet(base + '/alldatatypes?numberrealGreaterOrEqual=10000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
          });
        });

        it('should find resources of type real that are equal', function () {
          return doGet(base + '/alldatatypes?numberrealGreaterOrEqual=12000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
          });
        });

        it('should find resources of type real that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?numberrealAfter=12000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
          });
        });

        it('should find resources of type real with a not match', function () {
          return doGet(base + '/alldatatypes?numberrealNotGreaterOrEqual=10000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
          });
        });

        // double precision
        it('should find resources of type double precision that are greater', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionGreaterOrEqual=-12').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
          });
        });

        it('should find resources of type double precision that are equal', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionGreaterOrEqual=100.4545454')
            .then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
            });
        });

        it('should find resources of type double precision that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionAfter=0').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
          });
        });

        it('should find resources of type double precision with a not match', function () {
          return doGet(base + '/alldatatypes?numberdoubleprecisionNotGreaterOrEqual=-12').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
          });
        });

        // smallserial
        it('should find resources of type smallserial that are greater', function () {
          return doGet(base + '/alldatatypes?numbersmallserialGreaterOrEqual=200').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
          });
        });

        it('should find resources of type smallserial that are equal', function () {
          return doGet(base + '/alldatatypes?numbersmallserialGreaterOrEqual=368').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
          });
        });

        it('should find resources of type smallserial that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?numbersmallserialAfter=130').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
          });
        });

        it('should find resources of type smallserial with a not match', function () {
          return doGet(base + '/alldatatypes?numbersmallserialNotGreaterOrEqual=300').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
          });
        });

        // serial
        it('should find resources of type serial that are greater', function () {
          return doGet(base + '/alldatatypes?numberserialGreaterOrEqual=3000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberserial, 3680);
          });
        });

        it('should find resources of type serial that are equal', function () {
          return doGet(base + '/alldatatypes?numberserialGreaterOrEqual=3680').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberserial, 3680);
          });
        });

        it('should find resources of type serial that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?numberserialAfter=1300').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberserial, 3680);
          });
        });

        it('should find resources of type serial with a not match', function () {
          return doGet(base + '/alldatatypes?numberserialNotGreaterOrEqual=3000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberserial, 1);
          });
        });

        // bigserial
        it('should find resources of type bigserial that are greater', function () {
          return doGet(base + '/alldatatypes?numberbigserialGreaterOrEqual=30000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 36800);
          });
        });

        it('should find resources of type bigserial that are equal', function () {
          return doGet(base + '/alldatatypes?numberbigserialGreaterOrEqual=36800').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 36800);
          });
        });

        it('should find resources of type bigserial that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?numberbigserialAfter=20000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 1);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 36800);
          });
        });

        it('should find resources of type bigserial with a not match', function () {
          return doGet(base + '/alldatatypes?numberbigserialNotGreaterOrEqual=20000').then(function (response) {
            assert.equal(response.statusCode, 200);
            assert.equal(response.body.results.length, 5);
            assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
          });
        });

      });

      describe('Timestamp fields', function () {
        it('should find resources that are greater', function () {
          return doGet(base + '/alldatatypes?publicationGreaterOrEqual=2015-02-01T00:00:00%2B02:00')
            .then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-03-04T22:00:00-03:00').getTime());
            });
        });

        it('should find resources that are equal', function () {
          return doGet(base + '/alldatatypes?publicationGreaterOrEqual=2015-03-04T22:00:00-03:00')
            .then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-03-04T22:00:00-03:00').getTime());
            });
        });

        it('should find resources that are greater with operator After (alias)', function () {
          return doGet(base + '/alldatatypes?publicationAfter=2015-02-01T00:00:00%2B02:00')
            .then(function (response) {
              assert.equal(response.statusCode, 200);
              assert.equal(response.body.results.length, 1);
              assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
                new Date('2015-03-04T22:00:00-03:00').getTime());
            });
        });

        it('should find resources with a not match', function () {
          return doGet(base + '/alldatatypes?publicationNotGreaterOrEqual=2015-02-01T00:00:00%2B02:00')
            .then(function (response) {
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
