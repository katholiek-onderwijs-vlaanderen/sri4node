// Utility methods for calling the SRI interface
var assert = require('assert');
const _ = require('lodash');
const uuid = require('uuid');

function generateRandomAllDatatypes(key) {
    return {
      key: key,
      id: 40n,
      numberbigserial:40n,
      numberserial:40,
      numbersmallserial:40,
      text2:'b2kx2rzb8q9',
    };
  }

exports = module.exports = function (base) {
  'use strict';

  const sriClientConfig = {
    baseUrl: base
  }
  const api = require('@kathondvla/sri-client/node-sri-client')(sriClientConfig)
  const doGet = function() { return api.getRaw(...arguments) };
  const doPut = function() { return api.put(...arguments) };

  const utils = require('./utils.js')(api);
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


    it('it should NOT have the field modified with a timestamp after the previous one after the resource is updated with the same version',
    async function () {
      const response = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)
      assert.equal(response.id, 38);
      const currentModified = new Date(response.$$meta.modified).getTime();

      const copyResponse = _.cloneDeep(response);
      await doPut('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', copyResponse, authHdrObj)

      const response2 = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)
      assert.equal(response2.id, 38);
      const newModified = new Date(response2.$$meta.modified).getTime();
      assert.equal(newModified, currentModified);
    });

    it('it should NOT have the field version incremented by one after the resource is updated with the same version',
    async function () {
      const response = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)
      assert.equal(response.id, 38);
      const currentVersion = response.$$meta.version

      const copyResponse = _.cloneDeep(response);
      await doPut('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', copyResponse, authHdrObj)

      const response2 = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)    
      assert.equal(response2.id, 38);
      const newVersion = response2.$$meta.version
      assert.equal(newVersion, currentVersion);
    });

    it('$$meta does not need to be considered when deciding wether the resource is updated with the same version or not',
    async function () {
      const response = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)
      assert.equal(response.id, 38);
      const currentModified = new Date(response.$$meta.modified).getTime();

      const copyResponse = _.cloneDeep(response);
      delete copyResponse['$$meta'];
      await doPut('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', copyResponse, authHdrObj)

      const response2 = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)   
      assert.equal(response2.id, 38);
      const newModified = new Date(response2.$$meta.modified).getTime();
      assert.equal(newModified, currentModified);
    });

    it('additional properties not in the schema does not need to be considered when deciding wether the resource is updated with the same version or not',
    async function () {
      const response = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)
      assert.equal(response.id, 38);
      const currentModified = new Date(response.$$meta.modified).getTime();

      const copyResponse = _.cloneDeep(response);
      copyResponse['blah'] = 'foobar';
      await doPut('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', copyResponse, authHdrObj)

      const response2 = await doGet('/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096', null, authHdrObj)   
      assert.equal(response2.id, 38);
      const newModified = new Date(response2.$$meta.modified).getTime();
      assert.equal(newModified, currentModified);
    });

    it('modification date should not be updated when same resource with nested objects is put',
    async function () {
      const response = await doGet('/messages/cf328c0a-7793-4b01-8544-bea8854147ab', null, authHdrObj)
      const currentModified = new Date(response.$$meta.modified).getTime();

      const copyResponse = _.cloneDeep(response);            
      await doPut('/messages/cf328c0a-7793-4b01-8544-bea8854147ab', copyResponse, authHdrObj)

      const response2 = await doGet('/messages/cf328c0a-7793-4b01-8544-bea8854147ab', null, authHdrObj)   
      const newModified = new Date(response2.$$meta.modified).getTime();
      assert.equal(newModified, currentModified);
    });

    // This test case does work, because 'adminpassword' is filtered out for GET.
    // Therefore every PUT object looks different from the object retrieved from the db via 
    // transformRowToObject, so in this kind of sri4node configuration there is no idempotence.
    // it('PUT of objects with properties not shown in GET should also be idempotent',
    //   async function () {

    //     function generateRandomCommunity(key) {
    //       return {
    //         key: key,
    //         name: 'LETS ' + key,
    //         street: 'Leuvensesteenweg',
    //         streetnumber: '34',
    //         zipcode: '1040',
    //         city: 'Brussel',
    //         phone: '0492882277',
    //         email: key + '@email.com',
    //         adminpassword: 'secret',
    //         currencyname: 'pluimen'
    //       };
    //     }

    //     const key = uuid.v4();
    //     const body = generateRandomCommunity(key);

    //     await doPut('/communities/' + key, body, authHdrObj)

    //     body.humptydumpty = '55'

    //     await doPut('/communities/' + key, body, authHdrObj)

    //     const r = await doGet('/communities/' + key, null, authHdrObj)

    //     assert.notEqual(r.humptydumpty, body.humptydumpty)
    //     assert.equal(r['$$meta'].version, 0)
    //   });

    it('New version with float should work', async function () {
        const key = uuid.v4();
        var body = generateRandomAllDatatypes(key);
        await doPut('/alldatatypes/' + key, body, authHdrObj)

        body.id = 40.95;
        await doPut('/alldatatypes/' + key, body,authHdrObj)
    });


  });

};
