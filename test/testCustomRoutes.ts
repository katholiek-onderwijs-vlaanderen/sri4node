// Utility methods for calling the SRI interface
import * as assert from 'assert';
import * as request from 'request';
import * as sleep from 'await-sleep';
import * as pEvent from 'p-event';
import * as JSONStream from 'JSONStream';
import * as fs from 'fs';
import * as streamEqual from 'stream-equal';
import * as util from 'util';
// import * as expect from 'expect.js';
import * as zlib from 'zlib';
import * as sriClientFactory from '@kathondvla/sri-client/node-sri-client';
import utilsFactory from './utils';

const { performance } = require('perf_hooks');

const { Client } = require('undici');

module.exports = function (base) {
  const client = new Client(base);
  const sriClientConfig = {
    baseUrl: base,
  };
  const api = sriClientFactory(sriClientConfig);

  const doGet = function (...args) { return api.getRaw(...args); };
  const doPut = function (...args) { return api.put(...args); };
  const doPost = function (...args) { return api.post(...args); };

  const utils = utilsFactory(api);
  const { makeBasicAuthHeader } = utils;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } };
  const authHdrObjIngrid = { headers: { authorization: makeBasicAuthHeader('ingrid@email.be', 'pwd') } };
  const authHdrObjEddy = { headers: { authorization: makeBasicAuthHeader('eddy@email.be', 'pwd') } };

  describe('Custom routes', () => {
    it('should return the response for the custom route', async () => {
      const response = await doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple', null, authHdrObj);
      assert.equal(response.firstname, 'Kevin');
      assert.equal(response.lastname, 'Boon');
    });

    it('should forbid the custom route because of a secure function', async () => {
      await utils.testForStatusCode(
        async () => {
          await doGet('/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simple', null, authHdrObjIngrid);
        },
        (error) => {
          assert.equal(error.status, 403);
        },
      );
    });

    it('should return a server error for a problematic custom handler', async () => {
      await utils.testForStatusCode(
        async () => {
          const auth = makeBasicAuthHeader('kevin@email.be', 'pwd');
          await doGet('/persons/00000000-0000-0000-0000-000000000000/simple', null, { headers: { authorization: auth }, maxAttempts: 1 });
        },
        (error) => {
          assert.equal(error.status, 500);
        },
      );
    });

    it('should return the response for the custom \'like\' route', async () => {
      const response = await doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike', null, authHdrObj);
      assert.equal(Object.keys(response).length, 2);
      assert.equal(response.firstname, 'Kevin');
      assert.equal(response.lastname, 'Boon');
    });

    it('should return the response for the custom \'like\' route for forbidden user in \'original\' route', async () => {
      await doGet('/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simpleLike', null, authHdrObjIngrid);
    });

    it('no auth should be forbidden for the custom \'like\' route', async () => {
      await utils.testForStatusCode(
        async () => {
          await doGet('/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simpleLike', null, {});
        },
        (error) => {
          assert.equal(error.status, 401);
        },
      );
    });

    it('streaming is not allowed in batch', async () => {
      // create a batch array
      const batch = [
        {
          href: '/persons/downStreamJSON',
          verb: 'GET',
        },
      ];
      await utils.testForStatusCode(
        async () => {
          await doPut('/persons/batch', batch, authHdrObj);
        },
        (error) => {
          assert.equal(error.status, 400);
          assert.equal(error.body[0].body.errors[0].code, 'streaming.not.allowed.in.batch');
        },
      );
    });

    it('streamingHandler JSON stream should work', async function () {
      this.timeout(4000);
      const r = request.get(`${base}/persons/downStreamJSON`, authHdrObj);
      const stream = r.pipe(JSONStream.parse('*'));

      const collect:any[] = [];

      stream.on('data', (data) => {
        // console.log('[JSON] received:', data);
        collect.push(data);
      });

      const response:any = await pEvent(r, 'response');
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');

      await pEvent(r, 'end');
      assert.equal(collect[0].firstname, 'Rita');
      assert.equal(collect[0].lastname, 'James');
      assert.equal(collect[1].firstname, 'Regina');
      assert.equal(collect[1].lastname, 'Sullivan');
    });

    it('streamingHandler binary stream should work', async () => {
      const crRead = request.get(`${base}/persons/downStreamBinary`, authHdrObj);
      const fileRead = fs.createReadStream('test/files/test.jpg');

      crRead.on('response', (response) => {
        assert.equal(response.statusCode, 200);
        assert.equal(response.headers['content-type'], 'image/jpeg');
        assert.equal(response.headers['content-disposition'], 'inline; filename=test.jpg');
      });

      // const equal = await util.promisify(streamEqual)(crRead, fileRead);
      const equal = await streamEqual.default(crRead, fileRead);
      assert.equal(equal, true);
    });

    it('streaming file upload (multipart form) with incorrect data should return error', async () => {
      await utils.testForStatusCode(
        async () => {
          await doPost('/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a/upStream', {}, authHdrObj);
        },
        (error) => {
          assert.equal(error.status, 400);
          assert.equal(error.body.errors[0].code, 'error.initialising.busboy');
        },
      );
    });

    it('streaming file upload (multipart form) should work', async () => {
      const response = await util.promisify(request.post)(`${base}/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a/upStream`, {
        formData: {
          image: fs.createReadStream('test/files/test.jpg'),
          pdf: fs.createReadStream('test/files/test.pdf'),
        },
      });

      assert.equal(response.statusCode, 200);
      assert.equal(JSON.stringify(JSON.parse(response.body)), JSON.stringify(['OK']));

      // Here we have a race condition if we immediatly read the person: as the transaction of the upload
      // is only commited after finishing the stream, the read start task can start before the commit is
      // done -> work around with sleep (maybe sri4node should be redesigned, to support streaming request
      // but sending a non-streaming answer)
      await sleep(500);

      const p = await doGet('/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a', null, authHdrObjEddy);
      assert.notEqual(p.picture, null);
    });

    it('onlyCustom should work', async () => {
      const response = await doGet('/onlyCustom', null, authHdrObj);
      assert.equal(response.bar, 'foo');
    });

    describe('keep-alive mechanism (send something on a regular interval to keep the connection alive)', () => {
      const streamingKeepAliveTimeoutMillis = 3_000; // cfr. ./context.js should be the same value !

      it('should kick in when there are huge time gaps within the stream', async () => {
        const { body } = await client.request({ path: '/customStreaming', method: 'GET' });

        let maxIntervalWithoutData = 0;
        let lastRcv = performance.now();
        const bufArr:string[] = [];
        for await (const data of body) {
          const curTime = performance.now();
          const duration = curTime - lastRcv;
          if (duration > maxIntervalWithoutData) {
            maxIntervalWithoutData = duration;
          }
          bufArr.push(data.toString());
          lastRcv = curTime;
        }
        // expect(maxIntervalWithoutData).to.be.below(streamingKeepAliveTimeoutMillis + 500);
        assert.strictEqual(maxIntervalWithoutData < streamingKeepAliveTimeoutMillis + 500, true);
        assert.deepEqual(JSON.parse(bufArr.join('')), ['f', 'o', 'o', 'b', 'a', 'r', '!']);
      });

      it('should kick in when there are huge time gaps within the stream with gzip compression enabled', async () => {
        const { body } = await client.request({
          path: '/customStreaming?slowstart',
          method: 'GET',
          headers: { 'Accept-Encoding': 'gzip' },
        });
        let maxIntervalWithoutData = 0;
        let lastRcv = performance.now();
        const bufArr:any[] = [];
        for await (const data of body) {
          const curTime = performance.now();
          const duration = curTime - lastRcv;
          if (duration > maxIntervalWithoutData) {
            maxIntervalWithoutData = duration;
          }
          bufArr.push(data);
          lastRcv = curTime;
        }
        // make sure context.ts sets streamingKeepAliveTimeoutMillis to 3_000 seconds
        // expect(maxIntervalWithoutData).to.be.below(streamingKeepAliveTimeoutMillis + 500);
        assert.strictEqual(maxIntervalWithoutData < streamingKeepAliveTimeoutMillis + 500, true);
        const jsonTxt = zlib.gunzipSync(Buffer.concat(bufArr));
        assert.deepEqual(JSON.parse(jsonTxt.toString()), ['foo']);
      });
    });
  });
};
