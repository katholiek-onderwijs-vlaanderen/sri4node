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
    describe('Exact match', () => {
      describe('String fields', () => {
        // text
        it('should find resources of type text with an exact match', async () => {
          const response = await doGet('/alldatatypes?text=Value', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type text with an exact match with spaces', async () => {
          const response = await doGet('/alldatatypes?text=A%20value%20with%20spaces', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text with a case insensitive match', async () => {
          const response = await doGet('/alldatatypes?text=value', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should not find resources of type text with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?text=not-present', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text with a case sensitive match', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitive=Value', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should not find resources of type text with a case sensitive match', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitive=value', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text with a not match', async () => {
          const response = await doGet('/alldatatypes?textNot=value', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text with a not match and case sensitive', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitiveNot=Value', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        // varchar
        it('should find resources of type varchar with an exact match', async () => {
          const response = await doGet('/alldatatypes?textvarchar=Varchar', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should find resources of type varchar with an exact match with spaces', async () => {
          const response = await doGet('/alldatatypes?textvarchar=not%20a%20text%20varchar', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar with a case insensitive match', async () => {
          const response = await doGet('/alldatatypes?textvarchar=VARCHAR', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should not find resources of type varchar with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?textvarchar=not-present', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar with a case sensitive match', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitive=varchar', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should not find resources of type varchar with a case sensitive match', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitive=Varchar', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar with a not match', async () => {
          const response = await doGet('/alldatatypes?textvarcharNot=varchar', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type varchar with a not match and case sensitive', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveNot=varchar', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        // char
        it('should find resources of type char with an exact match', async () => {
          const response = await doGet('/alldatatypes?textchar=char', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim().trim(), 'char');
        });

        it('should find resources of type char with an exact match with spaces', async () => {
          const response = await doGet('/alldatatypes?textchar=not%20a%20text%20char', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char with a case insensitive match', async () => {
          const response = await doGet('/alldatatypes?textchar=Char', null, authHdrObj);

          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should not find resources of type char with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?textchar=not-present', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char with a case sensitive match', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitive=char', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should not find resources of type char with a case sensitive match', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitive=Char', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char with a not match', async () => {
          const response = await doGet('/alldatatypes?textcharNot=char', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type char with a not match and case sensitive', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveNot=char', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });
      });

      describe('Numeric fields', () => {
        // numeric
        it('should find resources of type numeric with an exact match', async () => {
          const response = await doGet('/alldatatypes?number=16.11', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.number, 16.11);
        });

        it('should not find resources of type numeric with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?number=314', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type numeric with a not match', async () => {
          const response = await doGet('/alldatatypes?numberNot=16.11', null, authHdrObj);
          assert.equal(response.results.length, 4);
          assert.equal(response.results[0].$$expanded.number, 11);
        });

        // integer
        it('should find resources of type integer with an exact match', async () => {
          const response = await doGet('/alldatatypes?numberint=2456', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 2456);
        });

        it('should not find resources of type integer with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?numberint=314', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type integer with a not match', async () => {
          const response = await doGet('/alldatatypes?numberintNot=2456', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 1358);
        });

        // bigint
        it('should find resources of type bigint with an exact match', async () => {
          const response = await doGet('/alldatatypes?numberbigint=7500000000', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 7500000000);
        });

        it('should not find resources of type bigint with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?numberbigint=750000000', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type bigint with a not match', async () => {
          const response = await doGet('/alldatatypes?numberbigintNot=7500000000', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 314159);
        });

        // smallint
        it('should find resources of type smallint with an exact match', async () => {
          const response = await doGet('/alldatatypes?numbersmallint=-4159', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, -4159);
        });

        it('should not find resources of type smallint with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?numbersmallint=75', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type smallint with a not match', async () => {
          const response = await doGet('/alldatatypes?numbersmallintNot=-4159', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, 7560);
        });

        // decimal
        it('should find resources of type decimal with an exact match', async () => {
          const response = await doGet('/alldatatypes?numberdecimal=-3424.234', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, -3424.234);
        });

        it('should not find resources of type decimal with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?numberdecimal=750000000', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type decimal with a not match', async () => {
          const response = await doGet('/alldatatypes?numberdecimalNot=-3424.234', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, 456.222);
        });

        // real
        it('should find resources of type real with an exact match', async () => {
          const response = await doGet('/alldatatypes?numberreal=1200', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 1200);
        });

        it('should not find resources of type real with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?numberreal=750000000', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type real with a not match', async () => {
          const response = await doGet('/alldatatypes?numberrealNot=1200', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 12000);
        });

        // doubleprecision
        it('should find resources of type doubleprecision with an exact match', async () => {
          const response = await doGet('/alldatatypes?numberdoubleprecision=-12.121212', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        it('should not find resources of type doubleprecision with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?numberdoubleprecision=750000000', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type doubleprecision with a not match', async () => {
          const response = await doGet('/alldatatypes?numberdoubleprecisionNot=-12.121212', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        // smallserial
        it('should find resources of type smallserial with an exact match', async () => {
          const response = await doGet('/alldatatypes?numbersmallserial=121', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 121);
        });

        it('should not find resources of type smallserial with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?numbersmallserial=7000', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type smallserial with a not match', async () => {
          const response = await doGet('/alldatatypes?numbersmallserialNot=121', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 1);
        });

        // serial
        it('should find resources of type serial with an exact match', async () => {
          const response = await doGet('/alldatatypes?numberserial=1210', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberserial, 1210);
        });

        it('should not find resources of type serial with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?numberserial=750000000', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type serial with a not match', async () => {
          const response = await doGet('/alldatatypes?numberserialNot=1210', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberserial, 1);
        });

        // bigserial
        it('should find resources of type bigserial with an exact match', async () => {
          const response = await doGet('/alldatatypes?numberbigserial=12100', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigserial, 12100);
        });

        it('should not find resources of type bigserial with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?numberbigserial=750000000', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type bigserial with a not match', async () => {
          const response = await doGet('/alldatatypes?numberbigserialNot=12100', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberbigserial, 1);
        });
      });

      describe('Timestamp fields', () => {
        it('should find resources with an exact match', async () => {
          const response = await doGet('/alldatatypes?publication=2015-01-01T00:00:00%2B02:00', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
            new Date('2015-01-01T00:00:00+02:00').getTime());
        });

        it('should not find resources with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?publication=2015-01-01T00:00:00-03:00', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources with a not match', async () => {
          const response = await doGet('/alldatatypes?publicationNot=2015-01-01T00:00:00%2B02:00', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
            new Date('2015-03-04T22:00:00-03:00').getTime());
        });
      });

      describe('Array fields', () => {
        it('should find strings with an exact match', async () => {
          const response = await doGet('/alldatatypes?texts=Standard,interface,ROA', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.id, 7);
        });

        it('should not find strings with a partial match', async () => {
          const response = await doGet('/alldatatypes?texts=Standard,interface', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find strings with a not match', async () => {
          const response = await doGet('/alldatatypes?textsNot=Standard,interface,ROA', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.id, 8);
        });

        it('should not find strings with a value that does not match', async () => {
          const response = await doGet('/alldatatypes?texts=another,thing', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find numbers with an exact match', async () => {
          const response = await doGet('/alldatatypes?numbers=8,13,5,3', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.id, 9);
        });

        it('should not find numbers with a partial match', async () => {
          const response = await doGet('/alldatatypes?numbers=3,5,8', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find numbers with a not match', async () => {
          const response = await doGet('/alldatatypes?numbersNot=8,13,5,3', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.id, 10);
        });

        it('should find timestamps with an exact match', async () => {
          let q = '/alldatatypes?publications=2015-01-01T00:00:00%2B02:00';
          q += ',2015-07-01T00:00:00%2B02:00,2015-04-01T00:00:00%2B02:00';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.id, 11);
        });

        it('should not find timestamps with a partial match', async () => {
          const response = await doGet('/alldatatypes?publications=2015-01-01T00:00:00%2B02:00', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find timestamps with a not match', async () => {
          let q = '/alldatatypes?publicationsNot=2015-01-01T00:00:00%2B02:00';
          q += ',2015-07-01T00:00:00%2B02:00,2015-04-01T00:00:00%2B02:00';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.id, 12);
        });
      });
    });
  });
};
