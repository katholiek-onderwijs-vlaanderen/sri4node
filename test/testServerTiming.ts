const assert = require('assert');
const { Client } = require('undici');

const sleep = require('await-sleep');

export = module.exports = function (base) {
  const client = new Client(base);

  const utils = require('./utils')(null);
  const { makeBasicAuthHeader } = utils;

  describe('ServerTiming', () => {
    it('single get', async () => {
      const {
        headers,
        body,
      } = await client.request({
        path: '/cities/38002',
        method: 'GET',
        headers: {
          'Request-Server-Timing': true,
          authorization: makeBasicAuthHeader('sabine@email.be', 'pwd'),
        },
      });

      const bufArr: unknown[] = [];
      for await (const data of body) {
        bufArr.push(data);
      }

      assert.strictEqual(headers['server-timing'] !== undefined, true, 'Server-Timing header is missing in headers.');
    });

    it('list get', async () => {
      const {
        headers,
        body,
      } = await client.request({
        path: '/cities',
        method: 'GET',
        headers: {
          'Request-Server-Timing': true,
          authorization: makeBasicAuthHeader('sabine@email.be', 'pwd'),
        },
      });

      const bufArr: any[] = [];
      for await (const data of body) {
        bufArr.push(data);
      }

      assert.strictEqual(headers['server-timing'] !== undefined, true, 'Server-Timing header is missing in headers.');
    });

    it('batch', async () => {
      const batch = [
        [{
          href: '/cities/38002',
          verb: 'GET',
        }],
      ];

      const {
        headers,
        body,
      } = await client.request({
        path: '/batch',
        method: 'PUT',
        headers: {
          'Content-type': 'application/json; charset=utf-8',
          'Request-Server-Timing': true,
          authorization: makeBasicAuthHeader('sabine@email.be', 'pwd'),
        },
        body: JSON.stringify(batch),
      });

      const bufArr: any[] = [];
      for await (const data of body) {
        bufArr.push(data);
      }

      assert.strictEqual(headers['server-timing'] !== undefined, true, 'Server-Timing header is missing in headers.');
    });

    it('batch - streaming', async () => {
      const batch = [
        [{
          href: '/cities/38002',
          verb: 'GET',
        }],
      ];

      const {
        trailers,
        body,
      } = await client.request({
        path: '/batch_streaming',
        method: 'PUT',
        headers: {
          'Content-type': 'application/json; charset=utf-8',
          'Request-Server-Timing': true,
          authorization: makeBasicAuthHeader('sabine@email.be', 'pwd'),
        },
        body: JSON.stringify(batch),
      });

      const bufArr: any[] = [];
      for await (const data of body) {
        bufArr.push(data);
      }

      assert.strictEqual(trailers['server-timing'] !== undefined, true, 'Server-Timing header is missing in trailers.');
    });
  });
};
