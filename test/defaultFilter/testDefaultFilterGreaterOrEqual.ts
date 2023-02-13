// Utility methods for calling the SRI interface
import { assert } from 'chai';
import { THttpClient } from '../httpClient';

module.exports = function (httpClient: THttpClient) {
  describe('Generic Filters', () => {
    describe('GreaterOrEqual (alias After) match', () => {
      describe('String fields', () => {
        // text
        it('should find resources of type text that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textGreaterOrEqual=test', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type text that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textGreaterOrEqual=Value', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type text that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textAfter=Test', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type text case sensitive', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textCaseSensitiveGreaterOrEqual=Value', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 3);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        it('should not find resources of type text case sensitive', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textCaseSensitiveGreaterOrEqual=test', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type text with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textNotGreaterOrEqual=value', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 4);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text with a not match case sensitive', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textCaseSensitiveNotGreaterOrEqual=value', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });

        // varchar
        it('should find resources of type varchar that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textvarcharGreaterOrEqual=test', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should find resources of type varchar that are equal', async () => {
          const q = '/alldatatypes?textvarcharGreaterOrEqual=Not%20a%20text%20varchar';
          const response = await httpClient.get({ path: q, auth: 'kevin' });
          assert.equal(response.status, 200);

          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textvarcharAfter=Test', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should find resources of type varchar case sensitive', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textvarcharCaseSensitiveGreaterOrEqual=varchar', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should not find resources of type varchar case sensitive', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textvarcharCaseSensitiveGreaterOrEqual=x', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type varchar with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textvarcharNotGreaterOrEqual=value', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar with a not match case sensitive', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textvarcharCaseSensitiveNotGreaterOrEqual=x', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        // char
        it('should find resources of type char that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textcharGreaterOrEqual=link', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textcharGreaterOrEqual=Not%20a%20text%20char', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textcharAfter=dos', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char case sensitive', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textcharCaseSensitiveGreaterOrEqual=char', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should not find resources of type char case sensitive', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textcharCaseSensitiveGreaterOrEqual=x', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type char with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textcharNotGreaterOrEqual=link', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should find resources of type char with a not match case sensitive', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textcharCaseSensitiveNotGreaterOrEqual=x', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
        });
      });

      describe('Numeric fields', () => {
        // numeric
        it('should find resources of type numeric that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberGreaterOrEqual=12', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 4);
          assert.equal(response.body.results[0].$$expanded.number, 16.11);
        });

        it('should find resources of type numeric that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberGreaterOrEqual=16.11', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 4);
          assert.equal(response.body.results[0].$$expanded.number, 16.11);
        });

        it('should find resources of type numeric that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberAfter=12', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 4);
          assert.equal(response.body.results[0].$$expanded.number, 16.11);
        });

        it('should find resources of type numeric with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberNotGreaterOrEqual=14', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.number, 11);
        });

        // integer
        it('should find resources of type integer that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberintGreaterOrEqual=1400', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 2456);
        });

        it('should find resources of type integer that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberintGreaterOrEqual=2456', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 2456);
        });

        it('should find resources of type integer that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberintAfter=1800', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 2456);
        });

        it('should find resources of type integer with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberintNotGreaterOrEqual=1400', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberint, 1358);
        });

        // bigint
        it('should find resources of type bigint that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberbigintGreaterOrEqual=320000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
        });

        it('should find resources of type bigint that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberbigintGreaterOrEqual=7500000000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
        });

        it('should find resources of type bigint that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberbigintAfter=7500000000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 7500000000);
        });

        it('should find resources of type bigint with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberbigintNotGreaterOrEqual=750000000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigint, 314159);
        });

        // smallint
        it('should find resources of type smallint that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersmallintGreaterOrEqual=0', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
        });

        it('should find resources of type smallint that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersmallintGreaterOrEqual=7560', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
        });

        it('should find resources of type smallint that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersmallintAfter=-100', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, 7560);
        });

        it('should find resources of type smallint with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersmallintNotGreaterOrEqual=1000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallint, -4159);
        });

        // decimal
        it('should find resources of type decimal that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberdecimalGreaterOrEqual=20', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
        });

        it('should find resources of type decimal that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberdecimalGreaterOrEqual=456.222', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
        });

        it('should find resources of type decimal that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberdecimalAfter=100', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, 456.222);
        });

        it('should find resources of type decimal with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberdecimalNotGreaterOrEqual=0', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdecimal, -3424.234);
        });

        // real
        it('should find resources of type real that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberrealGreaterOrEqual=10000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
        });

        it('should find resources of type real that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberrealGreaterOrEqual=12000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
        });

        it('should find resources of type real that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberrealAfter=12000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 12000);
        });

        it('should find resources of type real with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberrealNotGreaterOrEqual=10000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberreal, 1200);
        });

        // double precision
        it('should find resources of type double precision that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberdoubleprecisionGreaterOrEqual=-12', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        it('should find resources of type double precision that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberdoubleprecisionGreaterOrEqual=100.4545454', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        it('should find resources of type double precision that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberdoubleprecisionAfter=0', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, 100.4545454);
        });

        it('should find resources of type double precision with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberdoubleprecisionNotGreaterOrEqual=-12', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        // smallserial
        it('should find resources of type smallserial that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersmallserialGreaterOrEqual=200', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
        });

        it('should find resources of type smallserial that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersmallserialGreaterOrEqual=368', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
        });

        it('should find resources of type smallserial that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersmallserialAfter=130', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 368);
        });

        it('should find resources of type smallserial with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersmallserialNotGreaterOrEqual=300', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numbersmallserial, 1);
        });

        // serial
        it('should find resources of type serial that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberserialGreaterOrEqual=3000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberserial, 3680);
        });

        it('should find resources of type serial that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberserialGreaterOrEqual=3680', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberserial, 3680);
        });

        it('should find resources of type serial that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberserialAfter=1300', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberserial, 3680);
        });

        it('should find resources of type serial with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberserialNotGreaterOrEqual=3000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberserial, 1);
        });

        // bigserial
        it('should find resources of type bigserial that are greater', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberbigserialGreaterOrEqual=30000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 36800);
        });

        it('should find resources of type bigserial that are equal', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberbigserialGreaterOrEqual=36800', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 36800);
        });

        it('should find resources of type bigserial that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberbigserialAfter=20000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 36800);
        });

        it('should find resources of type bigserial with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numberbigserialNotGreaterOrEqual=20000', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.numberbigserial, 1);
        });
      });

      describe('Timestamp fields', () => {
        it('should find resources that are greater', async () => {
          const q = '/alldatatypes?publicationGreaterOrEqual=2015-02-01T00:00:00%2B02:00';
          const response = await httpClient.get({ path: q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          response.body.results = response.body.results.filter((e) => e.$$expanded.publication !== null); // remove NULL results (= undefined in the future)
          assert.equal(response.body.results.length, 1);
          assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date('2015-03-04T22:00:00-03:00').getTime());
        });

        it('should find resources that are equal', async () => {
          const q = '/alldatatypes?publicationGreaterOrEqual=2015-03-04T22:00:00-03:00';
          const response = await httpClient.get({ path: q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          response.body.results = response.body.results.filter((e) => e.$$expanded.publication !== null); // remove NULL results (= undefined in the future)
          assert.equal(response.body.results.length, 1);
          assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date('2015-03-04T22:00:00-03:00').getTime());
        });

        it('should find resources that are greater with operator After (alias)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?publicationAfter=2015-02-01T00:00:00%2B02:00', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          response.body.results = response.body.results.filter((e) => e.$$expanded.publication !== null); // remove NULL results (= undefined in the future)
          assert.equal(response.body.results.length, 1);
          assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date('2015-03-04T22:00:00-03:00').getTime());
        });

        it('should find resources that are equal with operator After (alias)', async () => {
          const q = '/alldatatypes?publicationAfter=2015-03-04T22:00:00-03:00';
          const response = await httpClient.get({ path: q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          response.body.results = response.body.results.filter((e) => e.$$expanded.publication !== null); // remove NULL results (= undefined in the future)
          assert.equal(response.body.results.length, 1);
          assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date('2015-03-04T22:00:00-03:00').getTime());
        });

        it('should find resources with a not match', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?publicationNotGreaterOrEqual=2015-02-01T00:00:00%2B02:00', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(new Date(response.body.results[0].$$expanded.publication).getTime(),
            new Date('2015-01-01T00:00:00+02:00').getTime());
        });
      });
    });
  });
};
