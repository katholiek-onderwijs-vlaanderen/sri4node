// Utility methods for calling the SRI interface
const assert = require('assert');
const request = require('request');
const sleep = require('await-sleep');
const pEvent = require('p-event');
const JSONStream = require('JSONStream');
const fs = require('fs');
const streamEqual = require('stream-equal').default;
const util = require('util');

export = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function(...args) { return api.getRaw(...args) };
  const doPut = function(...args) { return api.put(...args) };
  const doPost = function(...args) { return api.post(...args) };

  const utils =  require('./utils')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }
  const authHdrObjIngrid = { headers: { authorization: makeBasicAuthHeader('ingrid@email.be', 'pwd') } }
  const authHdrObjEddy = { headers: { authorization: makeBasicAuthHeader('eddy@email.be', 'pwd') } }

  describe('Custom routes', function () {

    it('should return the response for the custom route', async function () {
      const response = await doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple', null,  authHdrObj)
      assert.equal(response.firstname, 'Kevin');
      assert.equal(response.lastname, 'Boon');
    });

    it('should forbid the custom route because of a secure function', async function () {
      await utils.testForStatusCode(
          async () => {
            await doGet('/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simple', null,  authHdrObjIngrid)
          }, 
          (error) => {
            assert.equal(error.status, 403);
          })
    });

    it('should return a server error for a problematic custom handler', async function () {
      await utils.testForStatusCode(
          async () => {
            const auth = makeBasicAuthHeader('kevin@email.be', 'pwd')
            await doGet('/persons/00000000-0000-0000-0000-000000000000/simple', null,  { headers: { authorization: auth }, maxAttempts: 1 })
          }, 
          (error) => {
            assert.equal(error.status, 500);
          })
    });


    it('should return the response for the custom \'like\' route', async function () {
      const response = await doGet('/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike', null,  authHdrObj)
      assert.equal(Object.keys(response).length, 2);
      assert.equal(response.firstname, 'Kevin');
      assert.equal(response.lastname, 'Boon');
    });

    it('should return the response for the custom \'like\' route for forbidden user in \'original\' route', async function () {
      await doGet('/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simpleLike', null,  authHdrObjIngrid)
    });

    it('no auth should be forbidden for the custom \'like\' route', async function () {
      await utils.testForStatusCode(
          async () => {
            await doGet('/persons/da6dcc12-c46f-4626-a965-1a00536131b2/simpleLike', null,  {})
          }, 
          (error) => {
            assert.equal(error.status, 401);
          })
    });

    it('streaming is not allowed in batch', async function () {
      // create a batch array
      const batch = [
          { "href": '/persons/downStreamJSON'
          , "verb": "GET"
          }
      ]
      await utils.testForStatusCode(
          async () => {
            await doPut('/persons/batch', batch, authHdrObj);
          }, 
          (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.body[0].body.errors[0].code, 'streaming.not.allowed.in.batch');
          })
    });

    it('streamingHandler JSON stream should work', async function () {
      this.timeout(4000);
      const r = request.get(base + '/persons/downStreamJSON', authHdrObj)
      const stream = r.pipe(JSONStream.parse('*'))      
       
      const collect:any[] = []

      stream.on('data', function(data) {
        // console.log('[JSON] received:', data);
        collect.push(data)
      });

      const response = await pEvent(r, 'response')    
      assert.equal(response.statusCode, 200);
      assert.equal(response.headers['content-type'], 'application/json; charset=utf-8');

      await pEvent(r, 'end')
      assert.equal(collect[0].firstname, 'Rita');
      assert.equal(collect[0].lastname, 'James');
      assert.equal(collect[1].firstname, 'Regina');
      assert.equal(collect[1].lastname, 'Sullivan');
    });

    it('streamingHandler binary stream should work', async function () {
      const crRead = request.get(base + '/persons/downStreamBinary', authHdrObj)
      const fileRead = fs.createReadStream('test/files/test.jpg');

      crRead.on('response', function(response) {
        assert.equal(response.statusCode, 200);
        assert.equal(response.headers['content-type'], 'image/jpeg');
        assert.equal(response.headers['content-disposition'], 'inline; filename=test.jpg');
      });

      // const equal = await util.promisify(streamEqual)(crRead, fileRead);
      const equal = await streamEqual(crRead, fileRead);
      assert.equal(equal, true);
    });



    it('streaming file upload (multipart form) with incorrect data should return error', async function () {
      await utils.testForStatusCode(
          async () => {
            await doPost('/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a/upStream', {}, authHdrObj);
          }, 
          (error) => {
            assert.equal(error.status, 400);
            assert.equal(error.body.errors[0].code, 'error.initialising.busboy');
          })
    });

    it('streaming file upload (multipart form) should work', async function () {

      const response = await util.promisify(request.post)(base + '/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a/upStream', {formData: {
          image: fs.createReadStream('test/files/test.jpg'),
          pdf: fs.createReadStream('test/files/test.pdf')
        }});

      assert.equal(response.statusCode, 200);
      assert.equal(JSON.stringify(JSON.parse(response.body)), JSON.stringify([ 'OK' ]));

      // Here we have a race condition if we immediatly read the person: as the transaction of the upload
      // is only commited after finishing the stream, the read start task can start before the commit is
      // done -> work around with sleep (maybe sri4node should be redesigned, to support streaming request
      // but sending a non-streaming answer)
      await sleep(500);

      const p = await doGet('/persons/ab0fb783-0d36-4511-8ca5-9e29390eea4a', null, authHdrObjEddy);
      assert.notEqual(p.picture, null);
    });

    it('onlyCustom should work', async function () {
        const response = await doGet('/onlyCustom', null,  authHdrObj)
        assert.equal(response.bar, 'foo');
    });

  });
};
