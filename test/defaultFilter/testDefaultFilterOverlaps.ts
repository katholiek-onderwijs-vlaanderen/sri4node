// Utility methods for calling the SRI interface
import { assert } from 'chai';
import { THttpClient } from '../httpClient';

module.exports = function (httpClient: THttpClient) {
  describe('Generic Filters', () => {
    describe('Overlaps', () => {
      describe('Array fields', () => {
        it('should find strings(1)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textsOverlaps=Standard', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 7);
        });

        it('should find strings(2)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textsOverlaps=interface', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 7);
        });

        it('should find strings(3)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textsOverlaps=Standard,interface', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 7);
        });

        it('should not find strings', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textsOverlaps=foo', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find strings with a not match(1)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textsNotOverlaps=Standard,interface', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 8);
        });

        it('should find strings with a not match(2)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textsNotOverlaps=interface', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 8);
        });

        it('should find strings with a not match(3)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?textsNotOverlaps=Standard', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 8);
        });

        it('should find numbers(1)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersOverlaps=5,3', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.id, 9);
          assert.equal(response.body.results[1].$$expanded.id, 10);
        });

        it('should find numbers(2)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersOverlaps=5', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.id, 9);
          assert.equal(response.body.results[1].$$expanded.id, 10);
        });

        it('should find numbers(3)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersOverlaps=3', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 2);
          assert.equal(response.body.results[0].$$expanded.id, 9);
          assert.equal(response.body.results[1].$$expanded.id, 10);
        });

        it('should not find numbers', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersOverlaps=12', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find numbers with a not match(1)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersNotOverlaps=5,3', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });
        it('should find numbers with a not match(2)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersNotOverlaps=3', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });
        it('should find numbers with a not match(3)', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?numbersNotOverlaps=5', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find timestamps(1)', async () => {
          const q = '/alldatatypes?publicationsOverlaps=2015-04-01T00:00:00%2B02:00,2015-01-01T00:00:00%2B02:00';
          const response = await httpClient.get({ path: q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 11);
        });

        it('should find timestamps(2)', async () => {
          const q = '/alldatatypes?publicationsOverlaps=2015-01-01T00:00:00%2B02:00';
          const response = await httpClient.get({ path: q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 11);
        });

        it('should find timestamps(3)', async () => {
          const q = '/alldatatypes?publicationsOverlaps=2015-04-01T00:00:00%2B02:00';
          const response = await httpClient.get({ path: q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 11);
        });

        it('should not find timestamps', async () => {
          const response = await httpClient.get({ path: '/alldatatypes?publicationsOverlaps=2012-01-01T00:00:00%2B02:00', auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 0);
        });

        it('should find timestamps with a not match(1)', async () => {
          const q = '/alldatatypes?publicationsNotOverlaps=2015-04-01T00:00:00%2B02:00,2015-01-01T00:00:00%2B02:00';
          const response = await httpClient.get({ path: q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 12);
        });

        it('should find timestamps with a not match(2)', async () => {
          const q = '/alldatatypes?publicationsNotOverlaps=2015-01-01T00:00:00%2B02:00';
          const response = await httpClient.get({ path: q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 12);
        });

        it('should find timestamps with a not match(3)', async () => {
          const q = '/alldatatypes?publicationsNotOverlaps=2015-04-01T00:00:00%2B02:00';
          const response = await httpClient.get({ path: q, auth: 'kevin' });
          assert.equal(response.status, 200);
          assert.equal(response.body.results.length, 1);
          assert.equal(response.body.results[0].$$expanded.id, 12);
        });
      });
    });
  });
};
