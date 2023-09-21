// Utility methods for calling the SRI interface
import assert from 'assert';
import sleep from 'await-sleep';
import fs from 'fs';
import * as streamEqual from 'stream-equal';
import zlib from 'zlib';
import FormData from 'form-data';
import { performance } from 'perf_hooks';


module.exports = function (httpClient) {
  describe('Custom routes', () => {
    it('should return the response for the custom route', async () => {
      const response = await httpClient.get({ path: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple', auth: 'kevin' });
      assert.equal(response.body.firstname, 'Kevin');
      assert.equal(response.body.lastname, 'Boon');
    });

    it('should forbid the custom route because of a secure function', async () => {
      const response = await httpClient.get({ path: '/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simple', auth: 'ingrid' });
      assert.equal(response.status, 403);
    });

    it('should return a server error for a problematic custom handler', async () => {
      const result = await httpClient.get({ path: '/persons/00000000-0000-0000-0000-000000000000/simple', auth: 'kevin' });
      assert.equal(result.status, 500);
    });

    it('should return the response for the custom \'like\' route with alterMapping', async () => {
      const response = await httpClient.get({ path: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike', auth: 'kevin' });
      assert.equal(Object.keys(response.body).length, 2);
      assert.equal(response.body.firstname, 'Kevin');
      assert.equal(response.body.lastname, 'Boon');
    });

    it('should return the response for the custom \'like\' route with transformResponse', async () => {
      const response = await httpClient.get({ path: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike2', auth: 'kevin' });
      assert.equal(Object.keys(response.body).length, 2);
      assert.equal(response.body.firstname, 'Kevin');
      assert.equal(response.body.lastname, 'Boon');
    });

    it('should return the response for the custom \'like\' route for forbidden user in \'original\' route', async () => {
      await httpClient.get({ path: '/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simpleLike', auth: 'ingrid' });
    });

    it('no auth should be forbidden for the custom \'like\' route', async () => {
      const result = await httpClient.get({ path:'/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simpleLike', auth: null });
      assert.equal(result.status, 401);
    });
    it('"query" overwrite should worki for the custom \'like\' route', async () => {
      const result = await httpClient.get({ path:'http://localhost:5000/persons/likeWithCommunitiesError?communities=/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849', auth: 'sabine' });
      assert.equal(result.status, 404);
      assert.equal(result.body.errors[0].code, 'invalid.query.parameter');
    });
    it('streaming is not allowed in batch', async () => {
      // create a batch array
      const batch = [
        {
          href: '/persons/downStreamJSON',
          verb: 'GET',
        },
      ];
      const result = await httpClient.put({path: '/persons/batch', body: batch, auth: 'kevin' });
      assert.equal(result.status, 400);
      assert.equal(result.body[0].body.errors[0].code, 'streaming.not.allowed.in.batch');
    });

    it('streamingHandler JSON stream should work', async function () {
      this.timeout(4000);
      const {
        status,
        headers,
        body,
      } = await httpClient.get({
        path: `/persons/downStreamJSON`,
        auth: 'sabine',
        streaming: true,
      });

      assert.equal(status, 200);
      assert.equal(headers['content-type'], 'application/json; charset=utf-8');

      const bufArr: any[] = [];
      for await (const data of body) {
        bufArr.push(data);
      }
      const result = JSON.parse(bufArr.join(''));

      assert.equal(result[0].firstname, 'Rita');
      assert.equal(result[0].lastname, 'James');
      assert.equal(result[1].firstname, 'Regina');
      assert.equal(result[1].lastname, 'Sullivan');
    });

    it('streamingHandler binary stream should work', async () => {
      const fileRead = fs.createReadStream('test/files/test.jpg')

      const {
        status,
        headers,
        body
      } = await httpClient.get({
        path: `/persons/downStreamBinary`,
        auth: 'kevin',
        streaming: true
      })
      assert.equal(status, 200)
      assert.equal(headers['content-type'], 'image/jpeg')
      assert.equal(headers['content-disposition'], 'inline; filename=test.jpg')

      const equal = await streamEqual.default(body, fileRead)
      assert.equal(equal, true)
    })


    it('streaming file upload (multipart form) with incorrect data should return error', async () => {
      const result = await httpClient.post({ path: '/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a/upStream', body: {}, auth: 'kevin' });
      assert.equal(result.status, 400);
      assert.equal(result.body.errors[0].code, 'error.initialising.busboy');
    });

    it('streaming file upload (multipart form) should work', async () => {
      const formData = new FormData();
      formData.append('image', fs.createReadStream('test/files/test.jpg'));
      formData.append('pdf', fs.createReadStream('test/files/test.pdf'));

      const response = await httpClient.post({
        path:`/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a/upStream`,
        headers: formData.getHeaders(),
        body: formData,
      });

      assert.equal(response.status, 200);
      assert.deepStrictEqual(response.body, ['OK']);

      // Here we have a race condition if we immediatly read the person: as the transaction of the upload
      // is only commited after finishing the stream, the read start task can start before the commit is
      // done -> work around with sleep (maybe sri4node should be redesigned, to support streaming request
      // but sending a non-streaming answer)
      await sleep(500);

      const p = await httpClient.get({ path: '/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a', auth: 'eddy' });
      assert.notEqual(p.body.picture, null);
    });

    it('onlyCustom should work', async () => {
      const response = await httpClient.get({ path: '/onlyCustom', auth: 'kevin' });
      assert.equal(response.body.bar, 'foo');
    });

    it('streaming custom route: status and headers set via beforeStreamingHandler should be returned to client', async () => {
      const { status, headers } = await httpClient.post({ path: '/persons/test_before_streaming_handler', body: {}, auth: 'kevin', streaming: true });
      assert.equal(status, 204);
      assert.equal(headers['MyTestHeader'.toLowerCase()], 'MyTestValue', 'expected header is missing')
    });

    it('streaming custom route: error handling of error in streamingHandler', async () => {
      const bufArr: any[] = [];
      let catchedErr = null;
      try {
        const { body } = await httpClient.post({ path: '/persons/bad_request', body: {}, auth: 'kevin', streaming: true });
        for await (const data of body) {
          bufArr.push(data);
        }
      } catch (err) {
        catchedErr = err;
      }
      assert.equal(catchedErr !== null, true, 'expected a http error')
      assert.equal((catchedErr as any).code, 'UND_ERR_SOCKET', 'expected a connection reset error')

      const partialBody = bufArr.toString();
      assert.equal(partialBody.includes('"status": 400'), true, 'expected status code 400 missing in partial body');
      assert.equal(partialBody.includes('"code": "customroute.bad.request"'), true, 'expected error code missing in partial body');
    });

    describe('keep-alive mechanism (send something on a regular interval to keep the connection alive)', () => {
      const streamingKeepAliveTimeoutMillis = 3_000; // cfr. ./context.js should be the same value !

      it('should kick in when there are huge time gaps within the stream', async () => {
        const { body } = await httpClient.get({ path: '/customStreaming', streaming: true });

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
        const { body } = await httpClient.get({
          path: '/customStreaming?slowstart',
          streaming: true,
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
