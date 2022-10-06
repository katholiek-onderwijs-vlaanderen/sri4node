// Utility methods for calling the SRI interface
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from '../utils';

const assert = require('assert');

module.exports = function (base) {
  const sriClientConfig = {
    baseUrl: base,
  };

  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } };

  describe('Generic Filters', () => {
    describe('Less match', () => {
      describe('String fields', () => {
        // text
        it('should find resources of type text that are lower', async () => {
          const response = await doGet('/alldatatypes?textLess=test', null, authHdrObj);
          assert.equal(response.results.length, 3);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should not find resources of type text that are equal', async () => {
          const response = await doGet('/alldatatypes?textLess=A%20value%20with%20spaces', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text case sensitive', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitiveLess=Test', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should not find resources of type text case sensitive', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitiveLess=1', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text with a not match', async () => {
          const response = await doGet('/alldatatypes?textNotLess=test', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type text with a not match case sensitive', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitiveNotLess=yes', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        // varchar
        it('should find resources of type varchar that are lower', async () => {
          const response = await doGet('/alldatatypes?textvarcharLess=test', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should not find resources of type varchar that are equal', async () => {
          const response = await doGet('/alldatatypes?textvarcharLess=not%20a%20text%20varchar', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar case sensitive', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveLess=xyz', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should not find resources of type varchar case sensitive', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveLess=char', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar with a not match', async () => {
          const response = await doGet('/alldatatypes?textvarcharNotLess=test', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should find resources of type varchar with a not match case sensitive', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveNotLess=test', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        // char
        it('should find resources of type char that are lower', async () => {
          const response = await doGet('/alldatatypes?textcharLess=milk', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should not find resources of type char that are equal', async () => {
          const response = await doGet('/alldatatypes?textcharLess=char', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char case sensitive', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveLess=not', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should not find resources of type char case sensitive', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveLess=char', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char with a not match', async () => {
          const response = await doGet('/alldatatypes?textcharNotLess=link', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char with a not match case sensitive', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveNotLess=abc', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });
      });

      describe('Numeric fields', () => {
        // numeric
        it('should find resources of type numeric that are lower', async () => {
          const response = await doGet('/alldatatypes?numberLess=16', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.number, 11);
        });

        it('should not find resources of type numeric that are equal', async () => {
          const response = await doGet('/alldatatypes?numberLess=11', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type numeric with a not match', async () => {
          const response = await doGet('/alldatatypes?numberNotLess=11', null, authHdrObj);
          assert.equal(response.results.length, 4);
          assert.equal(response.results[0].$$expanded.number, 16.11);
        });

        // integer
        it('should find resources of type integer that are lower', async () => {
          const response = await doGet('/alldatatypes?numberintLess=2000', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 1358);
        });

        it('should not find resources of type integer that are equal', async () => {
          const response = await doGet('/alldatatypes?numberintLess=1358', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type integer with a not match', async () => {
          const response = await doGet('/alldatatypes?numberintNotLess=1500', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 2456);
        });

        // bigint
        it('should find resources of type bigint that are lower', async () => {
          const response = await doGet('/alldatatypes?numberbigintLess=1000000', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 314159);
        });

        it('should not find resources of type bigint that are equal', async () => {
          const response = await doGet('/alldatatypes?numberbigintLess=314159', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type bigint with a not match', async () => {
          const response = await doGet('/alldatatypes?numberbigintNotLess=314159', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 7500000000);
        });

        // smallint
        it('should find resources of type smallint that are lower', async () => {
          const response = await doGet('/alldatatypes?numbersmallintLess=0', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, -4159);
        });

        it('should not find resources of type smallint that are equal', async () => {
          const response = await doGet('/alldatatypes?numbersmallintLess=-4159', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type smallint with a not match', async () => {
          const response = await doGet('/alldatatypes?numbersmallintNotLess=-100', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, 7560);
        });

        // decimal
        it('should find resources of type decimal that are lower', async () => {
          const response = await doGet('/alldatatypes?numberdecimalLess=10', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, -3424.234);
        });

        it('should not find resources of type decimal that are equal', async () => {
          const response = await doGet('/alldatatypes?numberdecimalLess=-3424.234', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type decimal with a not match', async () => {
          const response = await doGet('/alldatatypes?numberdecimalNotLess=45', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, 456.222);
        });

        // real
        it('should find resources of type real that are lower', async () => {
          const response = await doGet('/alldatatypes?numberrealLess=10000', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 1200);
        });

        it('should not find resources of type real that are equal', async () => {
          const response = await doGet('/alldatatypes?numberrealLess=1200', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type real with a not match', async () => {
          const response = await doGet('/alldatatypes?numberrealNotLess=1200', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 12000);
        });

        // double precision
        it('should find resources of type double precision that are lower', async () => {
          const response = await doGet('/alldatatypes?numberdoubleprecisionLess=-12', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        it('should not find resources of type double precision that are equal', async () => {
          const response = await doGet('/alldatatypes?numberdoubleprecisionLess=-12.121212', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type double precision with a not match', async () => {
          const response = await doGet('/alldatatypes?numberdoubleprecisionNotLess=-5', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        // smallserial
        it('should find resources of type smallserial that are lower', async () => {
          const response = await doGet('/alldatatypes?numbersmallserialLess=300', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 1);
        });

        it('should not find resources of type smallserial that are equal', async () => {
          const response = await doGet('/alldatatypes?numbersmallserialLess=121', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 1);
        });

        it('should find resources of type smallserial with a not match', async () => {
          const response = await doGet('/alldatatypes?numbersmallserialNotLess=200', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 368);
        });

        // serial
        it('should find resources of type serial that are lower', async () => {
          const response = await doGet('/alldatatypes?numberserialLess=2000', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberserial, 1);
        });

        it('should not find resources of type serial that are equal', async () => {
          const response = await doGet('/alldatatypes?numberserialLess=1210', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberbigserial, 1);
        });

        it('should find resources of type serial with a not match', async () => {
          const response = await doGet('/alldatatypes?numberserialNotLess=2000', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberserial, 3680);
        });

        // bigserial
        it('should find resources of type bigserial that are lower', async () => {
          const response = await doGet('/alldatatypes?numberbigserialLess=20000', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberbigserial, 1);
        });

        it('should not find resources of type bigserial that are equal', async () => {
          const response = await doGet('/alldatatypes?numberbigserialLess=12100', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberbigserial, 1);
        });

        it('should find resources of type bigserial with a not match', async () => {
          const response = await doGet('/alldatatypes?numberbigserialNotLess=20000', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigserial, 36800);
        });
      });

      describe('Timestamp fields', () => {
        it('should find resources that are lower', async () => {
          const response = await doGet('/alldatatypes?publicationLess=2015-03-04T22:00:00-03:00', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
            new Date('2015-01-01T00:00:00+02:00').getTime());
        });

        it('should not find resources that are equal', async () => {
          const response = await doGet('/alldatatypes?publicationLess=2015-01-01T00:00:00%2B02:00', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources with a not match', async () => {
          const response = await doGet('/alldatatypes?publicationNotLess=2015-03-04T22:00:00-03:00', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });
      });
    });
  });
};
