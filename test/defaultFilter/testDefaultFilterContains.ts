// Utility methods for calling the SRI interface
import { assert } from 'chai';
import { THttpClient } from '../httpClient';

module.exports = function (httpClient: THttpClient) {
  describe('Generic Filters', () => {
    describe('Contains match', () => {
      describe('String fields', () => {
        // text
        it('should find resources of type text that contain a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textContains=lu', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text that start with a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textContains=va', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });

        it('should find resources of type text that end with a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textContains=Aces', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.text, 'A value with spaces');
        });

        it('should not find resources of type text that do not contain a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textContains=mor', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type text that contain a substring case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textCaseSensitiveContains=lu', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });

        it('should not find resources of type text that contain a substring case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textCaseSensitiveContains=LU', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type text that contain a substring with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textNotContains=LU', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
        });

        it('should find resources of type text that contain a substring with a not match case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textCaseSensitiveNotContains=LU', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });

        // varchar
        it('should find resources of type varchar that contain a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharContains=arch', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar that start with a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharContains=var', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should find resources of type varchar that end with a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharContains=char', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should not find resources of type varchar that do not contain a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharContains=mor', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type varchar that contain a substring case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharCaseSensitiveContains=arch', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textvarchar, 'varchar');
          assert.equal(response.body.results[1].$$expanded.textvarchar, 'not a text varchar');
        });

        it('should not find resources of type varchar that contain a substring case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharCaseSensitiveContains=ARCH', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type varchar that contain a substring with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharNotContains=not', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type varchar that contain a substring with a not match case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textvarcharCaseSensitiveNotContains=Not', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
          assert.equal(response.body.results[1].$$expanded.text, 'A value with spaces');
        });

        // char
        it('should find resources of type char that contain a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharContains=ha', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char that start with a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharContains=ch', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should find resources of type char that end with a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharContains=har', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'char');
          assert.equal(response.body.results[1].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should not find resources of type char that do not contain a substring', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharContains=mor', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type char that contain a substring case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharCaseSensitiveContains=not', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.textchar.trim(), 'not a text char');
        });

        it('should not find resources of type char that contain a substring case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharCaseSensitiveContains=CH', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find resources of type char that contain a substring with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharNotContains=var', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });

        it('should find resources of type char that contain a substring with a not match case sensitive', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textcharCaseSensitiveNotContains=NOT', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 5);
          assert.equal(response.body.results[0].$$expanded.text, 'Value');
        });
      });

      describe('Timestamp fields', () => {
        // TBD
      });

      describe('Array fields', () => {
        it('should find strings', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textsContains=Standard,interface', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 7);
        });

        it('should not find strings', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textsContains=Standard,definition', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find strings with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?textsNotContains=Standard,interface', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 8);
        });

        it('should find numbers', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbersContains=5,3', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.id, 9);
          assert.equal(response.body.results[1].$$expanded.id, 10);
        });

        it('should not find numbers', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbersContains=12', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find numbers with a not match', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?numbersNotContains=5,3', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find timestamps', async () => {
          let q = '/alldatatypes?publicationsContains=2015-04-01T00:00:00%2B02:00';
          q += ',2015-01-01T00:00:00%2B02:00';
          const response = await httpClient.get({ path:q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 11);
        });

        it('should not find timestamps', async () => {
          const response = await httpClient.get({ path:'/alldatatypes?publicationsContains=2012-01-01T00:00:00%2B02:00', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find timestamps with a not match', async () => {
          let q = '/alldatatypes?publicationsNotContains=2015-04-01T00:00:00%2B02:00';
          q += ',2015-01-01T00:00:00%2B02:00';
          const response = await httpClient.get({ path:q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 12);
        });
      });
    });
  });
};
