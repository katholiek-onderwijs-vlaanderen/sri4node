// Utility methods for calling the SRI interface
var assert = require('assert');

exports = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = api.get;

  const utils =  require('../utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }


  describe('Generic Filters', function () {

    describe('In match', function () {

      describe('String fields', function () {

        // text
        it('should find one resource of type text among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?textIn=value,another,thing', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find all the resources of type text that match', async function () {
          const response = await doGet('/alldatatypes?textIn=test,Value,A%20value%20with%20spaces', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        it('should not find resources of type text with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?textIn=not-present,nothing,no', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type text case sensitive', async function () {
          var q = '/alldatatypes?textCaseSensitiveIn=test,Value,A%20value%20with%20spaces';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        it('should not find all the resources of type text case sensitive', async function () {
          var q = '/alldatatypes?textCaseSensitiveIn=test,value,a%20value%20with%20spaces';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type text with a not match', async function () {
          var q = '/alldatatypes?textNotIn=test,a%20value%20with%20spaces';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find all the resources of type text with a not match case sensitive', async function () {
          var q = '/alldatatypes?textCaseSensitiveNotIn=test,value';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        // varchar
        it('should find one resource of type varchar among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?textvarcharIn=value,Varchar,thing', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should find all the resources of type varchar that match', async function () {
          var q = '/alldatatypes?textvarcharIn=test,Varchar,Not%20a%20text%20varchar';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should not find resources of type varchar with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?textvarcharIn=not-present,nothing,no', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type varchar case sensitive', async function () {
          var q = '/alldatatypes?textvarcharCaseSensitiveIn=test,varchar,Not%20a%20text%20varchar';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should not find all the resources of type varchar case sensitive', async function () {
          var q = '/alldatatypes?textvarcharCaseSensitiveIn=test,Varchar,Not%20a%20text%20varchar';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type varchar with a not match', async function () {
          var q = '/alldatatypes?textvarcharNotIn=test,Not%20a%20text%20varchar';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find all the resources of type varchar with a not match case sensitive', async function () {
          var q = '/alldatatypes?textvarcharCaseSensitiveNotIn=test,Varchar';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        // char
        it('should find one resource of type char among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?textcharIn=value,Char,thing', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should find all the resources of type char that match', async function () {
          const response = await doGet('/alldatatypes?textcharIn=test,Char,Not%20a%20text%20char', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.results[1].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should not find resources of type char with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?textcharIn=not-present,nothing,no', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type char case sensitive', async function () {
          var q = '/alldatatypes?textcharCaseSensitiveIn=test,char,Not%20a%20text%20char';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should not find all the resources of type char case sensitive', async function () {
          var q = '/alldatatypes?textcharCaseSensitiveIn=test,Char,Not%20a%20text%20char';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type char with a not match', async function () {
          var q = '/alldatatypes?textcharNotIn=test,Not%20a%20text%20char';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find all the resources of type char with a not match case sensitive', async function () {
          var q = '/alldatatypes?textcharCaseSensitiveNotIn=test,Char';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

      });

      describe('Numeric fields', function () {

        // numeric
        it('should find one resource of type numeric among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?numberIn=16.11,413,45', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.number, 16.11);
        });

        it('should find all the resources of type numeric that match', async function () {
          const response = await doGet('/alldatatypes?numberIn=0,16.11,34,11', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.number, 16.11);
          assert.equal(response.results[1].$$expanded.number, 11);
        });

        it('should not find resources of type numeric with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?numberIn=1511,413,45', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type numeric with a not match', async function () {
          const response = await doGet('/alldatatypes?numberNotIn=16.11,413,45', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        // integer
        it('should find one resource of type integer among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?numberintIn=1611,2456,-34', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberint, 2456);
        });

        it('should find all the resources of type integer that match', async function () {
          const response = await doGet('/alldatatypes?numberintIn=0,1611,2456,-23,1358,10', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numberint, 2456);
          assert.equal(response.results[1].$$expanded.numberint, 1358);
        });

        it('should not find resources of type integer with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?numberintIn=1511,413,45', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type integer with a not match', async function () {
          const response = await doGet('/alldatatypes?numberintNotIn=1611,413,45', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        // bigint
        it('should find one resource of type bigint among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?numberbigintIn=1611,314159,-34', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberbigint, 314159);
        });

        it('should find all the resources of type bigint that match', async function () {
          const response = await doGet('/alldatatypes?numberbigintIn=0,314159,-23,7500000000,10', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numberbigint, 314159);
          assert.equal(response.results[1].$$expanded.numberbigint, 7500000000);
        });

        it('should not find resources of type bigint with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?numberbigintIn=1511,413,45', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type bigint with a not match', async function () {
          const response = await doGet('/alldatatypes?numberbigintNotIn=1611,413,45', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        // smallint
        it('should find one resource of type smallint among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?numbersmallintIn=1611,-4159,-34', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numbersmallint, -4159);
        });

        it('should find all the resources of type smallint that match', async function () {
          const response = await doGet('/alldatatypes?numbersmallintIn=-4159,3159,-23,7560,10', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numbersmallint, -4159);
          assert.equal(response.results[1].$$expanded.numbersmallint, 7560);
        });

        it('should not find resources of type smallint with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?numbersmallintIn=1511,413,45', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type smallint with a not match', async function () {
          const response = await doGet('/alldatatypes?numbersmallintNotIn=1611,413,45', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        // decimal
        it('should find one resource of type decimal among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?numberdecimalIn=16.11,-4159,-3424.234', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdecimal, -3424.234);
        });

        it('should find all the resources of type decimal that match', async function () {
          const response = await doGet('/alldatatypes?numberdecimalIn=-3424.234,314159,456.222,7560,10', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numberdecimal, -3424.234);
          assert.equal(response.results[1].$$expanded.numberdecimal, 456.222);
        });

        it('should not find resources of type decimal with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?numberdecimalIn=1511,413,45', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type decimal with a not match', async function () {
          const response = await doGet('/alldatatypes?numberdecimalNotIn=16.11,413,45', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        // real
        it('should find one resource of type real among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?numberrealIn=16.11,1200,-3424.234', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberreal, 1200);
        });

        it('should find all the resources of type real that match', async function () {
          const response = await doGet('/alldatatypes?numberrealIn=-3424.234,314159,1200,7560,12000', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numberreal, 1200);
          assert.equal(response.results[1].$$expanded.numberreal, 12000);
        });

        it('should not find resources of type real with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?numberrealIn=1511,413,45', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type real with a not match', async function () {
          const response = await doGet('/alldatatypes?numberrealNotIn=16.11,413,45', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        // double precision
        it('should find one resource of type double precision among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?numberdoubleprecisionIn=100.454545,-12.121212,-3424.234', null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, -12.121212);
        });

        it('should find all the resources of type double precision that match', async function () {
          var q = '/alldatatypes?numberdoubleprecisionIn=-3424.234,-12.121212,1200,100.4545454,12000';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numberdoubleprecision, -12.121212);
          assert.equal(response.results[1].$$expanded.numberdoubleprecision, 100.4545454);
        });

        it('should not find resources of type double precision with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?numberdoubleprecisionIn=1511,413,45', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type double precision with a not match', async function () {
          const response = await doGet('/alldatatypes?numberdoubleprecisionNotIn=16.11,413,45', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        // smallserial
        it('should find one resource of type smallserial among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialIn=100,121,36', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 121);
        });

        it('should find all the resources of type smallserial that match', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialIn=-121,-12,36,368,12000', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 368);
        });

        it('should not find resources of type smallserial with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialIn=1511,413,45', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type smallserial with a not match', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialNotIn=1611,413,45', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numbersmallserial, 1);
        });

        // serial
        it('should find one resource of type serial among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?numberserialIn=100,1210,36', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numberserial, 1210);
        });

        it('should find all the resources of type serial that match', async function () {
          const response = await doGet('/alldatatypes?numberserialIn=-1210,-12,36,3680,12000', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numberserial, 3680);
        });

        it('should not find resources of type serial with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?numberserialIn=1511,413,45', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type serial with a not match', async function () {
          const response = await doGet('/alldatatypes?numberserialNotIn=1611,413,45', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberserial, 1);
        });

        // bigserial
        it('should find one resource of type bigserial among options that do not exist', async function () {
          const response = await doGet('/alldatatypes?numberbigserialIn=100,12100,36', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numberbigserial, 12100);
        });

        it('should find all the resources of type bigserial that match', async function () {
          const response = await doGet('/alldatatypes?numberbigserialIn=-12100,-12,36,36800,12000', null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.numberbigserial, 36800);
        });

        it('should not find resources of type bigserial with a value that does not match', async function () {
          const response = await doGet('/alldatatypes?numberbigserialIn=1511,413,45', null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources of type smallserial with a not match', async function () {
          const response = await doGet('/alldatatypes?numbersmallserialNotIn=1, 1611,413,45', null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.numberbigserial, 2);
        });

      });

      describe('Timestamp fields', function () {

        it('should find one resource among options that do not exist', async function () {
          var q = '/alldatatypes?publicationIn=2015-01-01T00:00:00%2B02:00,2014-01-01T00:00:00%2B02:00';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 1);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
        });

        it('should find all the resources that match', async function () {
          var q = '/alldatatypes?publicationIn=2015-01-01T00:00:00-03:00,2015-01-01T00:00:00%2B02:00,';
          q += '2015-03-04T22:00:00-03:00';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 2);
          assert.equal(new Date(response.results[0].$$expanded.publication).getTime(),
              new Date('2015-01-01T00:00:00+02:00').getTime());
          assert.equal(new Date(response.results[1].$$expanded.publication).getTime(),
              new Date('2015-03-04T22:00:00-03:00').getTime());
        });

        it('should not find resources with a value that does not match', async function () {
          var q = '/alldatatypes?publicationIn=2015-01-21T00:00:00%2B02:00,2014-01-01T00:00:00%2B02:00';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 0);
        });

        it('should find all the resources with a not match', async function () {
          var q = '/alldatatypes?publicationNotIn=2015-01-01T00:00:00%2B02:00';
          const response = await doGet(q, null, authHdrObj)
          assert.equal(response.results.length, 5);
          assert.equal(new Date(response.results[4].$$expanded.publication).getTime(),
              new Date('2015-03-05T01:00:00.000Z').getTime());
        });

      });

    });
  });

};
