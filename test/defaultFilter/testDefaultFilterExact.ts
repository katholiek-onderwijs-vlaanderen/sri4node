// Utility methods for calling the SRI interface
import { assert } from 'chai';
import { THttpClient } from '../httpClient';

module.exports = function (httpClient: THttpClient) {
  describe('Generic Filters', () => {
    describe('Exact match', () => {
      describe('String fields', () => {
        // text
        it('should find resources of type text with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?text=Value', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type text with an exact match with spaces', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?text=A%20value%20with%20spaces', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text with a case insensitive match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?text=value', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        it('should not find resources of type text with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?text=not-present', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type text with a case sensitive match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textCaseSensitive=Value', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        it('should not find resources of type text with a case sensitive match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textCaseSensitive=value', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type text with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textNot=value', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text with a not match and case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textCaseSensitiveNot=Value', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
        });

        // varchar
        it('should find resources of type varchar with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarchar=Varchar', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should find resources of type varchar with an exact match with spaces', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarchar=not%20a%20text%20varchar', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar with a case insensitive match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarchar=VARCHAR', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should not find resources of type varchar with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarchar=not-present', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type varchar with a case sensitive match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharCaseSensitive=varchar', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should not find resources of type varchar with a case sensitive match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharCaseSensitive=Varchar', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type varchar with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharNot=varchar', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type varchar with a not match and case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharCaseSensitiveNot=varchar', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        // char
        it('should find resources of type char with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textchar=char', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim().trim(), 'char');
        });

        it('should find resources of type char with an exact match with spaces', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textchar=not%20a%20text%20char', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char with a case insensitive match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textchar=Char', auth: 'kevin' });
          assert.equal(response.status, 200);

          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should not find resources of type char with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textchar=not-present', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type char with a case sensitive match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharCaseSensitive=char', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should not find resources of type char with a case sensitive match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharCaseSensitive=Char', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type char with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharNot=char', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type char with a not match and case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharCaseSensitiveNot=char', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });
      });

      describe('Numeric fields', () => {
        // numeric
        it('should find resources of type numeric with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?number=16.11', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.number, 16.11);
        });

        it('should not find resources of type numeric with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?number=314', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type numeric with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberNot=16.11', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 4);
          assert.equal(response.body.results[0].$$expanded.number, 11);
        });

        // integer
        it('should find resources of type integer with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberint=2456', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 2456);
        });

        it('should not find resources of type integer with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberint=314', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type integer with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberintNot=2456', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 1358);
        });

        // bigint
        it('should find resources of type bigint with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberbigint=7500000000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
        });

        it('should not find resources of type bigint with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberbigint=750000000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type bigint with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberbigintNot=7500000000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
        });

        // smallint
        it('should find resources of type smallint with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbersmallint=-4159', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
        });

        it('should not find resources of type smallint with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbersmallint=75', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type smallint with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbersmallintNot=-4159', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
        });

        // decimal
        it('should find resources of type decimal with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberdecimal=-3424.234', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
        });

        it('should not find resources of type decimal with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberdecimal=750000000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type decimal with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberdecimalNot=-3424.234', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
        });

        // real
        it('should find resources of type real with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberreal=1200', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
        });

        it('should not find resources of type real with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberreal=750000000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type real with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberrealNot=1200', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
        });

        // doubleprecision
        it('should find resources of type doubleprecision with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberdoubleprecision=-12.121212', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        it('should not find resources of type doubleprecision with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberdoubleprecision=750000000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type doubleprecision with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberdoubleprecisionNot=-12.121212', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        // smallserial
        it('should find resources of type smallserial with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbersmallserial=121', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 121);
        });

        it('should not find resources of type smallserial with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbersmallserial=7000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type smallserial with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbersmallserialNot=121', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
        });

        // serial
        it('should find resources of type serial with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberserial=1210', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberserial, 1210);
        });

        it('should not find resources of type serial with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberserial=750000000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type serial with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberserialNot=1210', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberserial, 1);
        });

        // bigserial
        it('should find resources of type bigserial with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberbigserial=12100', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 12100);
        });

        it('should not find resources of type bigserial with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberbigserial=750000000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type bigserial with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numberbigserialNot=12100', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
        });
      });

      describe('Timestamp fields', () => {
        it('should find resources with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?publication=2015-01-01T00:00:00%2B02:00', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date('2015-01-01T00:00:00+02:00').getTime());
        });

        it('should not find resources with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?publication=2015-01-01T00:00:00-03:00', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?publicationNot=2015-01-01T00:00:00%2B02:00', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date('2015-03-04T22:00:00-03:00').getTime());
        });
      });

      describe('Array fields', () => {
        it('should find strings with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?texts=Standard,interface,ROA', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 7);
        });

        it('should not find strings with a partial match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?texts=Standard,interface', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find strings with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textsNot=Standard,interface,ROA', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 8);
        });

        it('should not find strings with a value that does not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?texts=another,thing', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find numbers with an exact match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbers=8,13,5,3', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 9);
        });

        it('should not find numbers with a partial match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbers=3,5,8', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find numbers with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbersNot=8,13,5,3', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 10);
        });

        it('should find timestamps with an exact match', async () => {
          let q = '/alldatatypes?publications=2015-01-01T00:00:00%2B02:00';
          q += ',2015-07-01T00:00:00%2B02:00,2015-04-01T00:00:00%2B02:00';
          const response = await httpClient.get({ path:q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 11);
        });

        it('should not find timestamps with a partial match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?publications=2015-01-01T00:00:00%2B02:00', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find timestamps with a not match', async () => {
          let q = '/alldatatypes?publicationsNot=2015-01-01T00:00:00%2B02:00';
          q += ',2015-07-01T00:00:00%2B02:00,2015-04-01T00:00:00%2B02:00';
          const response = await httpClient.get({ path:q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1, 'length is not 1');
          assert.equal(response.body.results[0].$$expanded.id, 12, 'first result id is not 12');
        });
      });
    });
  });
};
