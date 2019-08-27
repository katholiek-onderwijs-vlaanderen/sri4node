// Utility methods for calling the SRI interface
var assert = require('assert');

exports = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function() { return api.getRaw(...arguments) };

  const utils =  require('../utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }

  describe('Generic Filters', function () {

    describe('Greater match', function () {

      describe('String fields', function () {

        // text
        it('should find resources of type text that are greater', async function () {
          const response = await doGet('/alldatatypes?textGreater=test', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should not find resources of type text that are equal', async function () {
          const response = await doGet('/alldatatypes?textGreater=X', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text case sensitive', async function () {
          const response = await doGet('/alldatatypes?textCaseSensitiveGreater=Test', null, authHdrObj)
          assert.equal(response.results.length, 4);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should not find resources of type text case sensitive', async function () {
          const response = await doGet('/alldatatypes?textCaseSensitiveGreater=test', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text with a not match', async function () {
          const response = await doGet('/alldatatypes?textNotGreater=Test', null, authHdrObj)
          assert.equal(response.results.length, 3);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text with a not match case sensitive', async function () {
          const response = await doGet('/alldatatypes?textCaseSensitiveNotGreater=test', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        // varchar
        it('should find resources of type varchar that are greater', async function () {
          const response = await doGet('/alldatatypes?textvarcharGreater=Pool', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should not find resources of type varchar that are equal', async function () {
          const response = await doGet('/alldatatypes?textvarcharGreater=varchar', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar case sensitive', async function () {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveGreater=pool', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should not find resources of type varchar case sensitive', async function () {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveGreater=varchar', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar with a not match', async function () {
          const response = await doGet('/alldatatypes?textvarcharNotGreater=pool', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar with a not match case sensitive', async function () {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveNotGreater=pool', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        // char
        it('should find resources of type char that are greater', async function () {
          const response = await doGet('/alldatatypes?textcharGreater=link', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should not find resources of type char that are equal', async function () {
          const response = await doGet('/alldatatypes?textcharGreater=not%20a%20text%20char', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char case sensitive', async function () {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveGreater=link', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should not find resources of type char case sensitive', async function () {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveGreater=pool', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char with a not match', async function () {
          const response = await doGet('/alldatatypes?textcharNotGreater=link', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should find resources of type char with a not match case sensitive', async function () {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveNotGreater=link', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

      });

      describe('Numeric fields', function () {

        // numeric
        it('should find resources of type numeric that are greater', async function () {
          const response = await doGet('/alldatatypes?numberGreater=15.4', null, authHdrObj)
          assert.equal(response.results.length, 4);
          assert.equal(response.results[0].$$expanded.number, 16.11);
        });

        it('should not find resources of type numeric that are equal', async function () {
          const response = await doGet('/alldatatypes?numberGreater=1000', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type numeric with a not match', async function () {
          const response = await doGet('/alldatatypes?numberNotGreater=15.7', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.number, 11);
        });

        // integer
        it('should find resources of type integer that are greater', async function () {
          const response = await doGet('/alldatatypes?numberintGreater=1400', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 2456);
        });

        it('should not find resources of type integer that are equal', async function () {
          const response = await doGet('/alldatatypes?numberintGreater=2456', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type integer with a not match', async function () {
          const response = await doGet('/alldatatypes?numberintNotGreater=2000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 1358);
        });

        // bigint
        it('should find resources of type bigint that are greater', async function () {
          const response = await doGet('/alldatatypes?numberbigintGreater=1000000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 7500000000);
        });

        it('should not find resources of type bigint that are equal', async function () {
          const response = await doGet('/alldatatypes?numberbigintGreater=7500000000', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type bigint with a not match', async function () {
          const response = await doGet('/alldatatypes?numberbigintNotGreater=750000000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 314159);
        });

        // smallint
        it('should find resources of type smallint that are greater', async function () {
          const response = await doGet('/alldatatypes?numbersmallintGreater=-100', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, 7560);
        });

        it('should not find resources of type smallint that are equal', async function () {
          const response = await doGet('/alldatatypes?numbersmallintGreater=7560', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type smallint with a not match', async function () {
          const response = await doGet('/alldatatypes?numbersmallintNotGreater=0', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, -4159);
        });

        // decimal
        it('should find resources of type decimal that are greater', async function () {
          const response = await doGet('/alldatatypes?numberdecimalGreater=-1200.5', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, 456.222);
        });

        it('should not find resources of type decimal that are equal', async function () {
          const response = await doGet('/alldatatypes?numberdecimalGreater=456.222', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type decimal with a not match', async function () {
          const response = await doGet('/alldatatypes?numberdecimalNotGreater=-1000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, -3424.234);
        });

        // real
        it('should find resources of type real that are greater', async function () {
          const response = await doGet('/alldatatypes?numberrealGreater=1500', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 12000);
        });

        it('should not find resources of type real that are equal', async function () {
          const response = await doGet('/alldatatypes?numberrealGreater=12000', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type real with a not match', async function () {
          const response = await doGet('/alldatatypes?numberrealNotGreater=10000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 1200);
        });

        // doubleprecision
        it('should find resources of type doubleprecision that are greater', async function () {
          const response = await doGet('/alldatatypes?numberdoubleprecisionGreater=0', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        it('should not find resources of type doubleprecision that are equal', async function () {
          const response = await doGet('/alldatatypes?numberdoubleprecisionGreater=100.4545454', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type doubleprecision with a not match', async function () {
          const response = await doGet('/alldatatypes?numberdoubleprecisionNotGreater=100', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        // smallserial
        it('should find resources of type smallserial that are greater', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialGreater=200', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 368);
        });

        it('should not find resources of type smallserial that are equal', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialGreater=368', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type smallserial with a not match', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialNotGreater=300', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 1);
        });

        // bigserial
        it('should find resources of type bigserial that are greater', async function () {
          const response = await doGet('/alldatatypes?numberbigserialGreater=20000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigserial, 36800);
        });

        it('should not find resources of type bigserial that are equal', async function () {
          const response = await doGet('/alldatatypes?numberbigserialGreater=36800', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type bigserial with a not match', async function () {
          const response = await doGet('/alldatatypes?numberbigserialNotGreater=3000', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberbigserial, 1);
        });

        // serial
        it('should find resources of type serial that are greater', async function () {
          const response = await doGet('/alldatatypes?numberserialGreater=2000', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberserial, 3680);
        });

        it('should not find resources of type serial that are equal', async function () {
          const response = await doGet('/alldatatypes?numberserialGreater=36800', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type serial with a not match', async function () {
          const response = await doGet('/alldatatypes?numberserialNotGreater=30000', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberserial, 1);
        });

      });

      describe('Timestamp fields', function () {
        it('should find resources that are greater', async function () {
          const response = await doGet('/alldatatypes?publicationGreater=2015-02-01T00:00:00%2B02:00', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
        });

        it('should not find resources that are equal', async function () {
          const response = await doGet('/alldatatypes?publicationGreater=2015-03-04T22:00:00-03:00', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find resources that are greater', async function () {
          const response = await doGet('/alldatatypes?publicationNotGreater=2015-02-01T00:00:00%2B02:00', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
        });

      });
    });
  });
};
