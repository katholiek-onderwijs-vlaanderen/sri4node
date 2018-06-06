// Utility methods for calling the SRI interface
var assert = require('assert');

exports = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = api.get;
  const doPut = api.put;

  const utils =  require('./utils.js')(api);
  const makeBasicAuthHeader = utils.makeBasicAuthHeader;
  const authHdrObj = { headers: { authorization: makeBasicAuthHeader('kevin@email.be', 'pwd') } }

  describe('Modify resource', function () {

    it('it should have the field created with a valid timestamp', async function () {
      const response = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)
      assert.equal(response.id, 38);
      assert(response.$$meta.created);
    });

    it('it should have the field modified with a timestamp after the previous one after the resource is updated',
    async function () {
      const response = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)
      assert.equal(response.id, 38);
      const currentModified = new Date(response.$$meta.modified).getTime();

      // modify with random value, PUTting same version will not alter modification date
      response.text2 = Math.random().toString(36).substring(2)
      await doPut('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', response, authHdrObj)

      const response2 = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)
      assert.equal(response2.id, 38);
      const newModified = new Date(response2.$$meta.modified).getTime();
      assert(newModified > currentModified);
    });

    it('it should have the field version incremented by one after the resource is updated',
    async function () {
      const response = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)
      assert.equal(response.id, 38);
      const currentVersion = response.$$meta.version

      // modify with random value, PUTting same version will not alter modification date
      response.text2 = Math.random().toString(36).substring(2)
      await doPut('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', response, authHdrObj)

      const response2 = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)
      assert.equal(response2.id, 38);
      const newVersion = response2.$$meta.version
      assert.equal(newVersion, currentVersion + 1);
    });

    it('it should support modifiedSince as a filter (backward compatibility)', async function () {
      const response = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)
      assert.equal(response.id, 38);
      const currentModified = response.$$meta.modified;

      const response2 = await doGet('/alldatatypes?modifiedSince=' + currentModified, null, authHdrObj)
      assert(response2.results.length > 0);
    });

  });

};
