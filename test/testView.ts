// Utility methods for calling the SRI interface
import assert from 'assert';
import { THttpClient } from './httpClient';

module.exports = function (httpClient: THttpClient) {

  describe('public view resource', function () {
      it('GET should return requested data', async function () {
        const response = await httpClient.get({ path: '/messages_with_person_and_communities/cf328c0a-7793-4b01-8544-bea8854147ab' });
        assert.equal(response.status, 200);
        assert.equal(response.body.personFirstname, 'Sabine');
        assert.equal(response.body.personLastname, 'De Waele');
        assert.equal(response.body.title, 'Wie kent Windows (versie 7) goed ?');
        assert.equal(response.body.communityName, 'LETS Regio Dendermonde');
      });

    it('PUT (create) should return error status code', async function () {
      const response = await httpClient.put({ path: '/messages_with_person_and_communities/cf328c0a-7793-4b01-8544-bea8854147ab', body: {
        key: 'a5a6de30-a16a-4d99-b396-f6f5f801a1c2',
        personFirstname: 'Sabine',
        personLastname: 'De Waele',
        title: 'Wie kent Windows (versie 7) goed ?',
        communityName: 'LETS Regio Dendermonde',
      }, auth: 'sabine' });
      assert.equal(response.status, 405);
    });

    it('PUT (update) should return error status code', async function () {
      const response = await httpClient.delete({ path: '/messages_with_person_and_communities/cf328c0a-7793-4b01-8544-bea8854147ab', body: {
        key: 'cf328c0a-7793-4b01-8544-bea8854147ab',
        personFirstname: 'Sabine',
        personLastname: 'De Waele',
        title: 'Wie kent Windows (versie 7) goed ?',
        communityName: 'LETS Regio Dendermonde',
      }, auth: 'sabine' });
      assert.equal(response.status, 405);
    });

    it('DELETE should return error status code', async function () {
      const response = await httpClient.delete({ path: '/messages_with_person_and_communities/cf328c0a-7793-4b01-8544-bea8854147ab', auth: 'sabine' });
      assert.equal(response.status, 405);
    });

    it('PATCH should return error status code', async function () {
      const p = [{ op: 'replace', path: 'communityName', value: 'LETS Regio Zele' }];
      const response = await httpClient.patch({ path: '/messages_with_person_and_communities/cf328c0a-7793-4b01-8544-bea8854147ab', body: p, auth: 'sabine' });
      assert.equal(response.status, 405);
    });

    it('GET of list should work', async function () {
      const response = await httpClient.get({ path: '/messages_with_person_and_communities' })
      if (!response.body.$$meta.count) {
        assert.fail();
      }
    });

  });

  describe('Key errors', function () {
    it('invalid key should return "invalid key" error', async function () {
        const response = await httpClient.get({ path: '/messages_with_person_and_communities/abc' })
        assert.equal(response.status, 400);
        assert.equal(response.body.errors[0].code, 'key.invalid');
    });
    it('unknown key should "not found" return error', async function () {
      const response = await httpClient.get({ path: '/messages_with_person_and_communities/cf328c0a-7793-4b01-8544-bea885414700' })
      assert.equal(response.status, 404);
      assert.equal(response.body.errors[0].code, 'not.found');
  });
  });
};
