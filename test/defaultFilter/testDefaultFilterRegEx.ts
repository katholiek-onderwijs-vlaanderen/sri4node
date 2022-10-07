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
    describe('RegEx match', () => {
      describe('String fields', () => {
        // text
        it('should find resources of type text with a regex', async () => {
          const response = await doGet('/alldatatypes?textRegEx=%5E(.*)%5Bv%7CV%5Dalue(.*)%24', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        it('should find only one resource of type text with a regex', async () => {
          const response = await doGet('/alldatatypes?textRegEx=%5E(.%20)%5Bv%7CV%5Dalue(.*)%24', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should not find resources of type text with a regex', async () => {
          const response = await doGet('/alldatatypes?textRegEx=%5E%5B0-9%5D*%24', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text with a regex case sensitive', async () => {
          const q = '/alldatatypes?textCaseSensitiveRegEx=%5E(.*)Value(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.text, 'Value');
        });

        it('should not find resources of type text with a regex case sensitive', async () => {
          const q = '/alldatatypes?textCaseSensitiveRegEx=%5E(.*)VALUE(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type text with a regex with a not match', async () => {
          const q = '/alldatatypes?textNotRegEx=%5E(.*)value(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 3);
        });

        it('should find resources of type text with a regex with a not match case sensitive', async () => {
          const q = '/alldatatypes?textCaseSensitiveNotRegEx=%5E(.*)VALUE(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 5);
          assert.equal(response.results[0].$$expanded.text, 'Value');
          assert.equal(response.results[1].$$expanded.text, 'A value with spaces');
        });

        // varchar
        it('should find resources of type varchar with a regex', async () => {
          const response = await doGet('/alldatatypes?textvarcharRegEx=%5E(.*)%5Bv%7CV%5Darc(.*)%24', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find only one resource of type varchar with a regex', async () => {
          const response = await doGet('/alldatatypes?textvarcharRegEx=%5E(.*)%5Bt%7CT%5Dext(.*)%24', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should not find resources of type varchar with a regex', async () => {
          const response = await doGet('/alldatatypes?textvarcharRegEx=%5E%5B0-9%5D*%24', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar with a regex case sensitive', async () => {
          const q = '/alldatatypes?textvarcharCaseSensitiveRegEx=%5E(.*)text(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should not find resources of type varchar with a regex case sensitive', async () => {
          const q = '/alldatatypes?textvarcharCaseSensitiveRegEx=%5E(.*)Text(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type varchar with a regex with a not match', async () => {
          const q = '/alldatatypes?textvarcharNotRegEx=%5E(.*)text(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
        });

        it('should find resources of type varchar with a regex with a not match case sensitive', async () => {
          const q = '/alldatatypes?textvarcharCaseSensitiveNotRegEx=%5E(.*)Text(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        // char
        it('should find resources of type char with a regex', async () => {
          const response = await doGet('/alldatatypes?textcharRegEx=%5E(.*)%5Bc%7CC%5Dha(.*)%24', null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.results[1].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find only one resource of type char with a regex', async () => {
          const response = await doGet('/alldatatypes?textcharRegEx=%5E(.*)%5Bt%7CT%5Dext(.*)%24', null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should not find resources of type char with a regex', async () => {
          const response = await doGet('/alldatatypes?textcharRegEx=%5E%5B0-9%5D*%24', null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char with a regex case sensitive', async () => {
          const q = '/alldatatypes?textcharCaseSensitiveRegEx=%5E(.*)text(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should not find resources of type char with a regex case sensitive', async () => {
          const q = '/alldatatypes?textcharCaseSensitiveRegEx=%5E(.*)Text(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 0);
        });

        it('should find resources of type char with a regex with a not match', async () => {
          const q = '/alldatatypes?textcharNotRegEx=%5E(.*)text(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 1);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
        });

        it('should find resources of type char with a regex with a not match case sensitive', async () => {
          const q = '/alldatatypes?textcharCaseSensitiveNotRegEx=%5E(.*)Text(.*)%24';
          const response = await doGet(q, null, authHdrObj);
          assert.equal(response.results.length, 2);
          assert.equal(response.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.results[1].$$expanded.textchar.trim(), 'not a text char');
        });
      });
    });
  });
};
