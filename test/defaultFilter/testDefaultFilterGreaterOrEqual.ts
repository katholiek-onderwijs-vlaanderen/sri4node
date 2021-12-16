// Utility methods for calling the SRI interface
var assert = require('assert');
var util = require('util');

export = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function(...args) { return api.getRaw(...args) };

  const utils =  require('../utils')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }

  describe('Generic Filters', function () {

    describe('GreaterOrEqual (alias After) match', function () {

      describe('String fields', function () {

        // text
        it('should find resources of type text that are greater', async function () {
          const response = await doGet('/alldatatypes?textGreaterOrEqual=test', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type text that are equal', async function () {
          const response = await doGet('/alldatatypes?textGreaterOrEqual=Value', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type text that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?textAfter=Test', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type text case sensitive', async function () {
          const response = await doGet('/alldatatypes?textCaseSensitiveGreaterOrEqual=Value', null, authHdrObj)
          assert.equal(response.results.length, 3);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should not find resources of type text case sensitive', async function () {
          const response = await doGet('/alldatatypes?textCaseSensitiveGreaterOrEqual=test', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text with a not match', async function () {
          const response = await doGet('/alldatatypes?textNotGreaterOrEqual=value', null, authHdrObj)
          assert.equal(response.results.length, 4);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text with a not match case sensitive', async function () {
          const response = await doGet('/alldatatypes?textCaseSensitiveNotGreaterOrEqual=value', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        // varchar
        it('should find resources of type varchar that are greater', async function () {
          const response = await doGet('/alldatatypes?textvarcharGreaterOrEqual=test', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should find resources of type varchar that are equal', async function () {
          var q = '/alldatatypes?textvarcharGreaterOrEqual=Not%20a%20text%20varchar';
          const response = await doGet(q, null, authHdrObj)
            
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?textvarcharAfter=Test', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should find resources of type varchar case sensitive', async function () {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveGreaterOrEqual=varchar', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should not find resources of type varchar case sensitive', async function () {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveGreaterOrEqual=x', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar with a not match', async function () {
          const response = await doGet('/alldatatypes?textvarcharNotGreaterOrEqual=value', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar with a not match case sensitive', async function () {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveNotGreaterOrEqual=x', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        // char
        it('should find resources of type char that are greater', async function () {
          const response = await doGet('/alldatatypes?textcharGreaterOrEqual=link', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char that are equal', async function () {
          const response = await doGet('/alldatatypes?textcharGreaterOrEqual=Not%20a%20text%20char', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?textcharAfter=dos', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char case sensitive', async function () {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveGreaterOrEqual=char', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.results[1].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should not find resources of type char case sensitive', async function () {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveGreaterOrEqual=x', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char with a not match', async function () {
          const response = await doGet('/alldatatypes?textcharNotGreaterOrEqual=link', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should find resources of type char with a not match case sensitive', async function () {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveNotGreaterOrEqual=x', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.results[1].$$expanded.textchar.trim(), 'not a text char');
        });

      });

      describe('Numeric fields', function () {

        // numeric
        it('should find resources of type numeric that are greater', async function () {
          const response = await doGet('/alldatatypes?numberGreaterOrEqual=12', null, authHdrObj)
          assert.equal(response.results.length, 4);
          assert.equal(response.results[0].$$expanded.number, 16.11);
        });

        it('should find resources of type numeric that are equal', async function () {
          const response = await doGet('/alldatatypes?numberGreaterOrEqual=16.11', null, authHdrObj)
          assert.equal(response.results.length, 4);
          assert.equal(response.results[0].$$expanded.number, 16.11);
        });

        it('should find resources of type numeric that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?numberAfter=12', null, authHdrObj)
          assert.equal(response.results.length, 4);
          assert.equal(response.results[0].$$expanded.number, 16.11);
        });

        it('should find resources of type numeric with a not match', async function () {
          const response = await doGet('/alldatatypes?numberNotGreaterOrEqual=14', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.number, 11);
        });

        // integer
        it('should find resources of type integer that are greater', async function () {
          const response = await doGet('/alldatatypes?numberintGreaterOrEqual=1400', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 2456);
        });

        it('should find resources of type integer that are equal', async function () {
          const response = await doGet('/alldatatypes?numberintGreaterOrEqual=2456', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 2456);
        });

        it('should find resources of type integer that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?numberintAfter=1800', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 2456);
        });

        it('should find resources of type integer with a not match', async function () {
          const response = await doGet('/alldatatypes?numberintNotGreaterOrEqual=1400', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 1358);
        });

        // bigint
        it('should find resources of type bigint that are greater', async function () {
          const response = await doGet('/alldatatypes?numberbigintGreaterOrEqual=320000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 7500000000);
        });

        it('should find resources of type bigint that are equal', async function () {
          const response = await doGet('/alldatatypes?numberbigintGreaterOrEqual=7500000000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 7500000000);
        });

        it('should find resources of type bigint that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?numberbigintAfter=7500000000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 7500000000);
        });

        it('should find resources of type bigint with a not match', async function () {
          const response = await doGet('/alldatatypes?numberbigintNotGreaterOrEqual=750000000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 314159);
        });

        // smallint
        it('should find resources of type smallint that are greater', async function () {
          const response = await doGet('/alldatatypes?numbersmallintGreaterOrEqual=0', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, 7560);
        });

        it('should find resources of type smallint that are equal', async function () {
          const response = await doGet('/alldatatypes?numbersmallintGreaterOrEqual=7560', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, 7560);
        });

        it('should find resources of type smallint that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?numbersmallintAfter=-100', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, 7560);
        });

        it('should find resources of type smallint with a not match', async function () {
          const response = await doGet('/alldatatypes?numbersmallintNotGreaterOrEqual=1000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, -4159);
        });

        // decimal
        it('should find resources of type decimal that are greater', async function () {
          const response = await doGet('/alldatatypes?numberdecimalGreaterOrEqual=20', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, 456.222);
        });

        it('should find resources of type decimal that are equal', async function () {
          const response = await doGet('/alldatatypes?numberdecimalGreaterOrEqual=456.222', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, 456.222);
        });

        it('should find resources of type decimal that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?numberdecimalAfter=100', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, 456.222);
        });

        it('should find resources of type decimal with a not match', async function () {
          const response = await doGet('/alldatatypes?numberdecimalNotGreaterOrEqual=0', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, -3424.234);
        });

        // real
        it('should find resources of type real that are greater', async function () {
          const response = await doGet('/alldatatypes?numberrealGreaterOrEqual=10000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 12000);
        });

        it('should find resources of type real that are equal', async function () {
          const response = await doGet('/alldatatypes?numberrealGreaterOrEqual=12000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 12000);
        });

        it('should find resources of type real that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?numberrealAfter=12000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 12000);
        });

        it('should find resources of type real with a not match', async function () {
          const response = await doGet('/alldatatypes?numberrealNotGreaterOrEqual=10000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 1200);
        });

        // double precision
        it('should find resources of type double precision that are greater', async function () {
          const response = await doGet('/alldatatypes?numberdoubleprecisionGreaterOrEqual=-12', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        it('should find resources of type double precision that are equal', async function () {
          const response = await doGet('/alldatatypes?numberdoubleprecisionGreaterOrEqual=100.4545454', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        it('should find resources of type double precision that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?numberdoubleprecisionAfter=0', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        it('should find resources of type double precision with a not match', async function () {
          const response = await doGet('/alldatatypes?numberdoubleprecisionNotGreaterOrEqual=-12', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        // smallserial
        it('should find resources of type smallserial that are greater', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialGreaterOrEqual=200', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 368);
        });

        it('should find resources of type smallserial that are equal', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialGreaterOrEqual=368', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 368);
        });

        it('should find resources of type smallserial that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialAfter=130', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 368);
        });

        it('should find resources of type smallserial with a not match', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialNotGreaterOrEqual=300', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 1);
        });

        // serial
        it('should find resources of type serial that are greater', async function () {
          const response = await doGet('/alldatatypes?numberserialGreaterOrEqual=3000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberserial, 3680);
        });

        it('should find resources of type serial that are equal', async function () {
          const response = await doGet('/alldatatypes?numberserialGreaterOrEqual=3680', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberserial, 3680);
        });

        it('should find resources of type serial that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?numberserialAfter=1300', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberserial, 3680);
        });

        it('should find resources of type serial with a not match', async function () {
          const response = await doGet('/alldatatypes?numberserialNotGreaterOrEqual=3000', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberserial, 1);
        });

        // bigserial
        it('should find resources of type bigserial that are greater', async function () {
          const response = await doGet('/alldatatypes?numberbigserialGreaterOrEqual=30000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigserial, 36800);
        });

        it('should find resources of type bigserial that are equal', async function () {
          const response = await doGet('/alldatatypes?numberbigserialGreaterOrEqual=36800', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigserial, 36800);
        });

        it('should find resources of type bigserial that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?numberbigserialAfter=20000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigserial, 36800);
        });

        it('should find resources of type bigserial with a not match', async function () {
          const response = await doGet('/alldatatypes?numberbigserialNotGreaterOrEqual=20000', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberbigserial, 1);
        });

      });

      describe('Timestamp fields', function () {
        it('should find resources that are greater', async function () {
          var q = '/alldatatypes?publicationGreaterOrEqual=2015-02-01T00:00:00%2B02:00';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 5);
          response.results = response.results.filter( e => e['$$expanded'].publication !== null) // remove NULL results (= undefined in the future)
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
        });

        it('should find resources that are equal', async function () {
          var q = '/alldatatypes?publicationGreaterOrEqual=2015-03-04T22:00:00-03:00';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 5);
          response.results = response.results.filter( e => e['$$expanded'].publication !== null) // remove NULL results (= undefined in the future)
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
        });

        it('should find resources that are greater with operator After (alias)', async function () {
          const response = await doGet('/alldatatypes?publicationAfter=2015-02-01T00:00:00%2B02:00', null, authHdrObj)
          assert.equal(response.results.length, 5);
          response.results = response.results.filter( e => e['$$expanded'].publication !== null) // remove NULL results (= undefined in the future)
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
        });

        it('should find resources that are equal with operator After (alias)', async function () {
          var q = '/alldatatypes?publicationAfter=2015-03-04T22:00:00-03:00';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 5);
          response.results = response.results.filter( e => e['$$expanded'].publication !== null) // remove NULL results (= undefined in the future)
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
        });

        it('should find resources with a not match', async function () {
          const response = await doGet('/alldatatypes?publicationNotGreaterOrEqual=2015-02-01T00:00:00%2B02:00', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
        });

      });
    });

  });
};
