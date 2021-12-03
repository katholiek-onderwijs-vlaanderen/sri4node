const assert = require('assert');
const { Client } = require('undici');
const stdout = require('test-console').stdout;


const setLogLvl = async (client, logdebug) => {
  const {
    statusCode,
    body
  } = await client.request({
    path: '/setlogdebug'
    , method: 'POST'
    , headers: {
      'Content-type': 'application/json; charset=utf-8',
    }
    , body: JSON.stringify(logdebug)
  });

  const bufArr = []
  for await (const data of body) {
    bufArr.push(data);
  }
  assert.strictEqual(statusCode, 200);
}


exports = module.exports = function (base) {
  'use strict';

  const client = new Client(`http://localhost:5000`);

  describe('reqID', function () {

    it('single get - check for reqId presence', async function () {
      const {
        headers,
        body
      } = await client.request({
        path: '/cities/38002'
        , method: 'GET'
        , headers: {
          'Request-Server-Timing': true,
        }
      });

      const reqID = headers['vsko-req-id'];
      assert.notEqual(reqID, undefined);
    });

    it('list get - check for reqId presence', async function () {
      const {
        headers,
        body
      } = await client.request({
        path: '/cities'
        , method: 'GET'
        , headers: {
          'Request-Server-Timing': true,
        }
      });

      const reqID = headers['vsko-req-id'];
      assert.notEqual(reqID, undefined);
    });

    it('batch - check for reqId presence', async function () {
      const batch = [
        [{
          "href": '/cities/38002'
          , "verb": "GET"
        }]
      ]

      const {
        headers,
        body
      } = await client.request({
        path: '/batch'
        , method: 'PUT'
        , headers: {
          'Content-type': 'application/json; charset=utf-8',
          'Request-Server-Timing': true,
          //   'authorization': makeBasicAuthHeader('sabine@email.be', 'pwd')
        }
        , body: JSON.stringify(batch)
      });

      const reqID = headers['vsko-req-id'];
      assert.notEqual(reqID, undefined);
    });

    it('streaming batch - check for reqId presence', async function () {
      const batch = [
        [{
          "href": '/cities/38002'
          , "verb": "GET"
        }]
      ]

      const {
        headers,
        trailers,
        body
      } = await client.request({
        path: '/batch_streaming'
        , method: 'PUT'
        , headers: {
          'Content-type': 'application/json; charset=utf-8',
          'Request-Server-Timing': true,
        }
        , body: JSON.stringify(batch)
      });

      const reqID = headers['vsko-req-id'];
      assert.notEqual(reqID, undefined);
    });

    it('single get - x-request-id -> reqId ', async function () {
      const {
        headers,
        body
      } = await client.request({
        path: '/cities/38002'
        , method: 'GET'
        , headers: {
          'x-request-id': 'ABCDEFG',
          'Request-Server-Timing': true,
        }
      });

      const reqID = headers['vsko-req-id'];
      assert.equal(reqID, 'ABCDEFG');
    });

    it('single get - x-request-id -> reqId case check', async function () {
      const {
        headers,
        body
      } = await client.request({
        path: '/cities/38002'
        , method: 'GET'
        , headers: {
          'X-requesT-id': 'ABCDEFG',
          'Request-Server-Timing': true,
        }
      });

      const reqID = headers['vsko-req-id'];
      assert.equal(reqID, 'ABCDEFG');
    });


    it('list get --  x-request-id -> reqId ', async function () {
      const {
        headers,
        body
      } = await client.request({
        path: '/cities'
        , method: 'GET'
        , headers: {
          'x-request-id': 'ABCDEFG',
          'Request-Server-Timing': true,
        }
      });

      const reqID = headers['vsko-req-id'];
      assert.equal(reqID, 'ABCDEFG');
    });

    it('batch --  x-request-id -> reqId ', async function () {
      const batch = [
        [{
          "href": '/cities/38002'
          , "verb": "GET"
        }]
      ]

      const {
        headers,
        body
      } = await client.request({
        path: '/batch'
        , method: 'PUT'
        , headers: {
          'x-request-id': 'ABCDEFG',
          'Content-type': 'application/json; charset=utf-8',
          'Request-Server-Timing': true,
          //   'authorization': makeBasicAuthHeader('sabine@email.be', 'pwd')
        }
        , body: JSON.stringify(batch)
      });

      const reqID = headers['vsko-req-id'];
      assert.equal(reqID, 'ABCDEFG');
    });

    it('stearing batch -  x-request-id -> reqId ', async function () {
      const batch = [
        [{
          "href": '/cities/38002'
          , "verb": "GET"
        }]
      ]

      const {
        headers,
        trailers,
        body
      } = await client.request({
        path: '/batch_streaming'
        , method: 'PUT'
        , headers: {
          'x-request-id': 'ABCDEFG',
          'Content-type': 'application/json; charset=utf-8',
          'Request-Server-Timing': true,
        }
        , body: JSON.stringify(batch)
      });

      const reqID = headers['vsko-req-id'];
      assert.equal(reqID, 'ABCDEFG');
    });

    it('single get -x-amz-cf-id -> reqId ', async function () {
      const {
        headers,
        body
      } = await client.request({
        path: '/cities/38002'
        , method: 'GET'
        , headers: {
          'x-amz-cf-id': 'ABCDEFG',
          'Request-Server-Timing': true,
        }
      });

      const reqID = headers['vsko-req-id'];
      assert.equal(reqID, 'ABCDEFG');
    });

    it('single get - x-amz-cf-id -> reqId case check', async function () {
      const {
        headers,
        body
      } = await client.request({
        path: '/cities/38002'
        , method: 'GET'
        , headers: {
          'x-amZ-cF-id': 'ABCDEFG',
          'Request-Server-Timing': true,
        }
      });

      const reqID = headers['vsko-req-id'];
      assert.equal(reqID, 'ABCDEFG');
    });


    it('list get -- x-amz-cf-id -> reqId ', async function () {
      const {
        headers,
        body
      } = await client.request({
        path: '/cities'
        , method: 'GET'
        , headers: {
          'x-amz-cf-id': 'ABCDEFG',
          'Request-Server-Timing': true,
        }
      });

      const reqID = headers['vsko-req-id'];
      assert.equal(reqID, 'ABCDEFG');
    });

    it('batch -- x-amz-cf-id -> reqId ', async function () {
      const batch = [
        [{
          "href": '/cities/38002'
          , "verb": "GET"
        }]
      ]

      const {
        headers,
        body
      } = await client.request({
        path: '/batch'
        , method: 'PUT'
        , headers: {
          'x-amz-cf-id': 'ABCDEFG',
          'Content-type': 'application/json; charset=utf-8',
          'Request-Server-Timing': true,
          //   'authorization': makeBasicAuthHeader('sabine@email.be', 'pwd')
        }
        , body: JSON.stringify(batch)
      });

      const reqID = headers['vsko-req-id'];
      assert.equal(reqID, 'ABCDEFG');
    });

    it('stearing batch - x-amz-cf-id -> reqId ', async function () {
      const batch = [
        [{
          "href": '/cities/38002'
          , "verb": "GET"
        }]
      ]

      const {
        headers,
        trailers,
        body
      } = await client.request({
        path: '/batch_streaming'
        , method: 'PUT'
        , headers: {
          'x-amz-cf-id': 'ABCDEFG',
          'Content-type': 'application/json; charset=utf-8',
          'Request-Server-Timing': true,
        }
        , body: JSON.stringify(batch)
      });

      const reqID = headers['vsko-req-id'];
      assert.equal(reqID, 'ABCDEFG');
    });


  });
};