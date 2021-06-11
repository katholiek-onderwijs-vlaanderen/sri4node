const assert = require('assert');
const { Client } = require('undici');

const sleep = require('await-sleep')

exports = module.exports = function (base) {
  'use strict';

  const client = new Client(`http://localhost:5000`);

  const utils =  require('./utils.js')(null);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;

  describe('ServerTiming', function () {

    it('single get', async function () {
        const {
          headers,
          body
        } = await client.request({ path: '/cities/38002'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                                'authorization': makeBasicAuthHeader('sabine@email.be', 'pwd')
                            } });

        const bufArr = []
        for await (const data of body) {
            bufArr.push(data);
        }

        // there seems to be a race condition in undici, sometimes headers/trailers are not directly set after body is done 
        //  --> dumb sleep as workaround
        await sleep(500);
        assert.strictEqual(headers['server-timing'] !== undefined, true, 'Server-Timing header is missing in headers.');
    });

    it('list get', async function () {
        const {
          headers,
          body
        } = await client.request({ path: '/cities'
                          , method: 'GET'
                          , headers: {
                                'Request-Server-Timing': true,
                                'authorization': makeBasicAuthHeader('sabine@email.be', 'pwd')
                            } });

        const bufArr = []
        for await (const data of body) {
            bufArr.push(data);
        }

        // there seems to be a race condition in undici, sometimes headers/trailers are not directly set after body is done 
        //  --> dumb sleep as workaround
        await sleep(500);
        assert.strictEqual(headers['server-timing'] !== undefined, true, 'Server-Timing header is missing in headers.');
    });

    it('batch', async function () {

      const batch = [
        [{ "href": '/cities/38002'
        , "verb": "GET"
        }]
      ]

      const {
        headers,
        body
      } = await client.request({ path: '/batch'
                        , method: 'PUT'
                        , headers: {
                              'Content-type': 'application/json; charset=utf-8',
                              'Request-Server-Timing': true,
                              'authorization': makeBasicAuthHeader('sabine@email.be', 'pwd')
                          }
                        , body: JSON.stringify(batch) });

      const bufArr = []
      for await (const data of body) {
          bufArr.push(data);
      }

      // there seems to be a race condition in undici, sometimes headers/trailers are not directly set after body is done 
      //  --> dumb sleep as workaround
      await sleep(500);
      assert.strictEqual(headers['server-timing'] !== undefined, true, 'Server-Timing header is missing in headers.');
    });

    it('batch - streaming', async function () {

        const batch = [
          [{ "href": '/cities/38002'
          , "verb": "GET"
          }]
        ]

        const {
          trailers,
          body
        } = await client.request({ path: '/batch_streaming'
                          , method: 'PUT'
                          , headers: {
                                'Content-type': 'application/json; charset=utf-8',
                                'Request-Server-Timing': true,
                                'authorization': makeBasicAuthHeader('sabine@email.be', 'pwd')
                            }
                          , body: JSON.stringify(batch) });

        const bufArr = []
        for await (const data of body) {
            bufArr.push(data);
        }

        // there seems to be a race condition in undici, sometimes headers/trailers are not directly set after body is done 
        //  --> dumb sleep as workaround
        await sleep(500); 
        assert.strictEqual(trailers['server-timing'] !== undefined, true, 'Server-Timing header is missing in trailers.');
      });

  });
};