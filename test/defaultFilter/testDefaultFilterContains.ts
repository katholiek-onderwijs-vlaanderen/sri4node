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
    describe('Contains match', () => {
      describe('String fields', () => {
        // text
        it('should find resources of type text that contain a substring', async () => {
          const response = await doGet('/alldatatypes?textContains=lu', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text that start with a substring', async () => {
          const response = await doGet('/alldatatypes?textContains=va', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text that end with a substring', async () => {
          const response = await doGet('/alldatatypes?textContains=Aces', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should not find resources of type text that do not contain a substring', async () => {
          const response = await doGet('/alldatatypes?textContains=mor', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text that contain a substring case sensitive', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitiveContains=lu', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        it('should not find resources of type text that contain a substring case sensitive', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitiveContains=LU', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text that contain a substring with a not match', async () => {
          const response = await doGet('/alldatatypes?textNotContains=LU', null, authHdrObj);
          assert.equal(response.results.length, 5);
        });

        it('should find resources of type text that contain a substring with a not match case sensitive', async () => {
          const response = await doGet('/alldatatypes?textCaseSensitiveNotContains=LU', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        // varchar
        it('should find resources of type varchar that contain a substring', async () => {
          const response = await doGet('/alldatatypes?textvarcharContains=arch', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar that start with a substring', async () => {
          const response = await doGet('/alldatatypes?textvarcharContains=var', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar that end with a substring', async () => {
          const response = await doGet('/alldatatypes?textvarcharContains=char', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should not find resources of type varchar that do not contain a substring', async () => {
          const response = await doGet('/alldatatypes?textvarcharContains=mor', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar that contain a substring case sensitive', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveContains=arch', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should not find resources of type varchar that contain a substring case sensitive', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveContains=ARCH', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar that contain a substring with a not match', async () => {
          const response = await doGet('/alldatatypes?textvarcharNotContains=not', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type varchar that contain a substring with a not match case sensitive', async () => {
          const response = await doGet('/alldatatypes?textvarcharCaseSensitiveNotContains=Not', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        // char
        it('should find resources of type char that contain a substring', async () => {
          const response = await doGet('/alldatatypes?textcharContains=ha', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.results[1].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char that start with a substring', async () => {
          const response = await doGet('/alldatatypes?textcharContains=ch', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.results[1].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char that end with a substring', async () => {
          const response = await doGet('/alldatatypes?textcharContains=har', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.results[1].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should not find resources of type char that do not contain a substring', async () => {
          const response = await doGet('/alldatatypes?textcharContains=mor', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char that contain a substring case sensitive', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveContains=not', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should not find resources of type char that contain a substring case sensitive', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveContains=CH', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char that contain a substring with a not match', async () => {
          const response = await doGet('/alldatatypes?textcharNotContains=var', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type char that contain a substring with a not match case sensitive', async () => {
          const response = await doGet('/alldatatypes?textcharCaseSensitiveNotContains=NOT', null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });
      });

      describe('Timestamp fields', () => {
        // TBD
      });

      describe('Array fields', () => {
        it('should find strings', async () => {
          const response = await doGet('/alldatatypes?textsContains=Standard,interface', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.id, 7);
        });

        it('should not find strings', async () => {
          const response = await doGet('/alldatatypes?textsContains=Standard,definition', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find strings with a not match', async () => {
          const response = await doGet('/alldatatypes?textsNotContains=Standard,interface', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.id, 8);
        });

        it('should find numbers', async () => {
          const response = await doGet('/alldatatypes?numbersContains=5,3', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.id, 9);
          assert.equal(response.results[1].$$expanded.id, 10);
        });

        it('should not find numbers', async () => {
          const response = await doGet('/alldatatypes?numbersContains=12', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find numbers with a not match', async () => {
          const response = await doGet('/alldatatypes?numbersNotContains=5,3', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find timestamps', async () => {
          let q = '/alldatatypes?publicationsContains=2015-04-01T00:00:00%2B02:00';
          q += ',2015-01-01T00:00:00%2B02:00';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.id, 11);
        });

        it('should not find timestamps', async () => {
          const response = await doGet('/alldatatypes?publicationsContains=2012-01-01T00:00:00%2B02:00', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find timestamps with a not match', async () => {
          let q = '/alldatatypes?publicationsNotContains=2015-04-01T00:00:00%2B02:00';
          q += ',2015-01-01T00:00:00%2B02:00';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.id, 12);
        });
      });
    });
  });
};
