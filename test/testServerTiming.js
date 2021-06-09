// Utility methods for calling the SRI interface
const pMap = require('p-map'); 
var assert = require('assert');
var common = require('../js/common.js');
var cl = common.cl;
var uuid = require('uuid');
const { Client } = require('undici');







/**
 * BATCH should work like this (and now it works the other way around):
 *
 * [ {}, {} ] SHOULD EXECUTE ALL OPERATIONS SEQUENTIALLY and is a shorthand for [ [ {}, {} ] ] !
 * [ [ {}, {} ] ] SHOULD ALSO EXECUTE ALL OPERATIONS SEQUENTIALLY !
 * [ [ {}, {} ], [ {}, {} ] ] SHOULD EXECUTE ALL OPERATIONS WITHIN THE CHILD ARRAY SEQUENTIALLY, but the multiple sequences can be applied in parallel
 *
 * SO IN SHORT: 1 batch is a list of SERIES that can be executed in parallel.
 *   If there's only 1 list, there is NO PARALLELIZATION !!!
 *
 * Because I don't see the use-case in 'do all this in parallel, wait until it's all done, then do some more in parallel'
 *
 * AT THE VERY LEAST: if it stays 'THE OLD WAY' [ {}, {} ] should become equivalent to [ [ {} ], [ {} ] ]
 *   to make sure a simple single-array batch is executed IN SEQUENCE as everybody would expect !!!
 *
 */
exports = module.exports = function (base, logverbose) {
  'use strict';

  const client = new Client(`http://localhost:5000`);

  const utils =  require('./utils.js')(null);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }


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

        assert.strictEqual(trailers['server-timing'] !== undefined, true, 'Server-Timing header is missing in trailers.');
      });

  });
};