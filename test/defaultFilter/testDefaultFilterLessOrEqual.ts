// Utility methods for calling the SRI interface
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from '../utils';

const assert = require('assert');

export = module.exports = function (base) {
  const sriClientConfig = {
    baseUrl: base,
  };

  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } };

  describe('Generic Filters', () => {
    describe('LessOrEqual (alias Before) match', () => {
      describe('String fields', () => {
        // text
        it('should find resources of type text that are lower', async () => {
          const response = await doGet('/alldatatypes?textLessOrEqual=test', null, authHdrObj);
          assert.equal(response.results.length, 3);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should not find resources of type text that are equal', async () => {
          const response = await doGet('/alldatatypes?textLessOrEqual=A%20value%20with%20spaces', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?textBefore=candidate', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text case sensitive', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitiveLessOrEqual=Test', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should not find resources of type text case sensitive', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitiveLessOrEqual=1', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text with a not match', async () => {
          const response = await doGet('/alldatatypes?textNotLessOrEqual=test', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type text with a not match case sensitive', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitiveNotLessOrEqual=test', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        // varchar
        it('should find resources of type varchar that are lower', async () => {
          const response = await doGet('/alldatatypes?textvarcharLessOrEqual=test', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar that are equal', async () => {
          const response = await doGet('/alldatatypes?textvarcharLessOrEqual=not%20a%20text%20varchar', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?textvarcharBefore=var', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar case sensitive', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveLessOrEqual=xyz', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should not find resources of type varchar case sensitive', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveLessOrEqual=char', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar with a not match', async () => {
          const response = await doGet('/alldatatypes?textvarcharNotLessOrEqual=test', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should find resources of type varchar with a not match case sensitive', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveNotLessOrEqual=test', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        // char
        it('should find resources of type char that are lower', async () => {
          const response = await doGet('/alldatatypes?textcharLessOrEqual=milk', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should find resources of type char that are equal', async () => {
          const response = await doGet('/alldatatypes?textcharLessOrEqual=char', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should find resources of type char that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?textcharBefore=link', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should find resources of type char case sensitive', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveLessOrEqual=not', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should not find resources of type char case sensitive', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveLessOrEqual=boolean', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char with a not match', async () => {
          const response = await doGet('/alldatatypes?textcharNotLessOrEqual=link', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char with a not match case sensitive', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveNotLessOrEqual=abc', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });
      });

      describe('Numeric fields', () => {
        // numeric
        it('should find resources of type numeric that are lower', async () => {
          const response = await doGet('/alldatatypes?numberLessOrEqual=16', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.number, 11);
        });

        it('should find resources of type numeric that are equal', async () => {
          const response = await doGet('/alldatatypes?numberLessOrEqual=11', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.number, 11);
        });

        it('should find resources of type numeric that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?numberBefore=15', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.number, 11);
        });

        it('should find resources of type numeric with a not match', async () => {
          const response = await doGet('/alldatatypes?numberNotLessOrEqual=11', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.number, 16.11);
        });

        // integer
        it('should find resources of type integer that are lower', async () => {
          const response = await doGet('/alldatatypes?numberintLessOrEqual=2000', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 1358);
        });

        it('should find resources of type integer that are equal', async () => {
          const response = await doGet('/alldatatypes?numberintLessOrEqual=1358', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 1358);
        });

        it('should find resources of type integer that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?numberintBefore=1500', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 1358);
        });

        it('should find resources of type integer with a not match', async () => {
          const response = await doGet('/alldatatypes?numberintNotLessOrEqual=1500', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 2456);
        });

        // bigint
        it('should find resources of type bigint that are lower', async () => {
          const response = await doGet('/alldatatypes?numberbigintLessOrEqual=1000000', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 314159);
        });

        it('should find resources of type bigint that are equal', async () => {
          const response = await doGet('/alldatatypes?numberbigintLessOrEqual=314159', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 314159);
        });

        it('should find resources of type bigint that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?numberbigintBefore=900000', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 314159);
        });

        it('should find resources of type bigint with a not match', async () => {
          const response = await doGet('/alldatatypes?numberbigintNotLessOrEqual=314160', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 7500000000);
        });

        // smallint
        it('should find resources of type smallint that are lower', async () => {
          const response = await doGet('/alldatatypes?numbersmallintLessOrEqual=0', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, -4159);
        });

        it('should find resources of type smallint that are equal', async () => {
          const response = await doGet('/alldatatypes?numbersmallintLessOrEqual=-4159', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, -4159);
        });

        it('should find resources of type smallint that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?numbersmallintBefore=30', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, -4159);
        });

        it('should find resources of type smallint with a not match', async () => {
          const response = await doGet('/alldatatypes?numbersmallintNotLessOrEqual=-100', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, 7560);
        });

        // decimal
        it('should find resources of type decimal that are lower', async () => {
          const response = await doGet('/alldatatypes?numberdecimalLessOrEqual=10', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, -3424.234);
        });

        it('should find resources of type decimal that are equal', async () => {
          const response = await doGet('/alldatatypes?numberdecimalLessOrEqual=-3424.234', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, -3424.234);
        });

        it('should find resources of type decimal that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?numberdecimalBefore=100', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, -3424.234);
        });

        it('should find resources of type decimal with a not match', async () => {
          const response = await doGet('/alldatatypes?numberdecimalNotLessOrEqual=45', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, 456.222);
        });

        // real
        it('should find resources of type real that are lower', async () => {
          const response = await doGet('/alldatatypes?numberrealLessOrEqual=10000', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 1200);
        });

        it('should find resources of type real that are equal', async () => {
          const response = await doGet('/alldatatypes?numberrealLessOrEqual=1200', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 1200);
        });

        it('should find resources of type real that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?numberrealBefore=1800', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 1200);
        });

        it('should find resources of type real with a not match', async () => {
          const response = await doGet('/alldatatypes?numberrealNotLessOrEqual=1400', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 12000);
        });

        // double precision
        it('should find resources of type double precision that are lower', async () => {
          const response = await doGet('/alldatatypes?numberdoubleprecisionLessOrEqual=-12', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        it('should find resources of type double precision that are equal', async () => {
          const response = await doGet('/alldatatypes?numberdoubleprecisionLessOrEqual=-12.121212', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        it('should find resources of type double precision that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?numberdoubleprecisionBefore=0', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        it('should find resources of type double precision with a not match', async () => {
          const response = await doGet('/alldatatypes?numberdoubleprecisionNotLessOrEqual=0', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        // smallserial
        it('should find resources of type smallserial that are lower', async () => {
          const response = await doGet('/alldatatypes?numbersmallserialLessOrEqual=300', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 1);
        });

        it('should find resources of type smallserial that are equal', async () => {
          const response = await doGet('/alldatatypes?numbersmallserialLessOrEqual=121', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 1);
        });

        it('should find resources of type smallserial that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?numbersmallserialBefore=200', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 1);
        });

        it('should find resources of type smallserial with a not match', async () => {
          const response = await doGet('/alldatatypes?numbersmallserialNotLessOrEqual=200', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 368);
        });

        // serial
        it('should find resources of type serial that are lower', async () => {
          const response = await doGet('/alldatatypes?numberserialLessOrEqual=3000', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberserial, 1);
        });

        it('should find resources of type serial that are equal', async () => {
          const response = await doGet('/alldatatypes?numberserialLessOrEqual=1210', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberserial, 1);
        });

        it('should find resources of type serial that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?numberserialBefore=3000', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberserial, 1);
        });

        it('should find resources of type serial with a not match', async () => {
          const response = await doGet('/alldatatypes?numberserialNotLessOrEqual=1000', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numberserial, 1210);
        });

        // bigserial
        it('should find resources of type bigserial that are lower', async () => {
          const response = await doGet('/alldatatypes?numberbigserialLessOrEqual=30000', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberbigserial, 1);
        });

        it('should find resources of type bigserial that are equal', async () => {
          const response = await doGet('/alldatatypes?numberbigserialLessOrEqual=12100', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberbigserial, 1);
        });

        it('should find resources of type bigserial that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?numberbigserialBefore=30000', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberbigserial, 1);
        });

        it('should find resources of type bigserial with a not match', async () => {
          const response = await doGet('/alldatatypes?numberbigserialNotLessOrEqual=10000', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numberbigserial, 12100);
        });
      });

      describe('Timestamp fields', () => {
        it('should find resources that are lower', async () => {
          const response = await doGet('/alldatatypes?publicationLessOrEqual=2015-02-01T00:00:00-02:00', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
            new Date('2015-01-01T00:00:00+02:00').getTime());
        });

        it('should find resources that are equal', async () => {
          const q = '/alldatatypes?publicationLessOrEqual=2015-01-01T00:00:00%2B02:00';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
            new Date('2015-01-01T00:00:00+02:00').getTime());
        });

        it('should find resources that are lower with operator Before (alias)', async () => {
          const response = await doGet('/alldatatypes?publicationBefore=2015-02-01T00:00:00-02:00', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
            new Date('2015-01-01T00:00:00+02:00').getTime());
        });

        it('should find resources with a not match', async () => {
          const q = '/alldatatypes?publicationNotLessOrEqual=2015-02-01T00:00:00-02:00';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 5);
          response.results = response.results.filter((e) => e.$$expanded.publication !== null); // remove NULL results (= undefined in the future)
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
            new Date('2015-03-04T22:00:00-03:00').getTime());
        });
      });
    });
  });
};
