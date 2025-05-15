// Utility methods for calling the SRI interfacedoGet(
import assert from "assert";
import _ from "lodash";
import * as uuid from "uuid";
import { THttpClient } from "./httpClient";

const { isValidISODateString } = require("iso-datestring-validator");

function generateRandomAllDatatypes(key) {
  return {
    key,
    id: 40, // 40n,
    numberbigserial: BigInt(40), // 40n,
    numberserial: 40,
    numbersmallserial: 40,
    text2: "b2kx2rzb8q9",
  };
}

module.exports = function (httpClient: THttpClient) {
  describe("Modify resource", () => {
    it("it should have the field created with a valid timestamp", async () => {
      const response = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.id, 38);
      assert(response.body.$$meta.created);
      assert(isValidISODateString(response.body.$$meta.created), "true");
    });

    it("it should have the field modified with a timestamp after the previous one after the resource is updated", async () => {
      const responseGet1 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet1.status, 200);
      assert.equal(responseGet1.body.id, 38);
      const currentModified = new Date(responseGet1.body.$$meta.modified).getTime();

      // modify with random value, PUTting same version will not alter modification date
      responseGet1.body.text2 = Math.random().toString(36).substring(2);
      const responsePut = await httpClient.put({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        body: responseGet1.body,
        auth: "kevin",
      });
      assert.equal(responsePut.status, 200);

      const responseGet2 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet2.status, 200);
      assert.equal(responseGet2.body.id, 38);
      const newModified = new Date(responseGet2.body.$$meta.modified).getTime();
      assert(
        newModified > currentModified,
        `${newModified} should be more recent then ${currentModified}`,
      );
    });

    it("it should have the field version incremented by one after the resource is updated", async () => {
      const responseGet1 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet1.status, 200);
      assert.equal(responseGet1.body.id, 38);
      const currentVersion = responseGet1.body.$$meta.version;

      // modify with random value, PUTting same version will not alter modification date
      responseGet1.body.text2 = Math.random().toString(36).substring(2);
      const responsePut = await httpClient.put({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        body: responseGet1.body,
        auth: "kevin",
      });
      assert.equal(responsePut.status, 200);

      const responseGet2 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet2.status, 200);
      assert.equal(responseGet2.body.id, 38);
      const newVersion = responseGet2.body.$$meta.version;

      // Between 2018 and 2023-10 the auto-created-at-startup triggers to increment the version
      // contained the name of the schema
      // This was problematic because it could lead to duplicated triggers when copying
      // an api to another schema
      // The fix from 2023-10 will try to remove the 'old' trigger first, and this is why we will add
      // such an old trigger here, in order to make sure that it gets removed properly.
      // in sql/schema.sql on the alladatatypes table we added a trigger with this old name
      // in order to make sure that the trigger gets removed properly.
      assert.equal(newVersion, currentVersion + 1);
    });

    it("it should support modifiedSince as a filter (backward compatibility)", async () => {
      const response = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.id, 38);
      const currentModified = response.body.$$meta.modified;

      const response2 = await httpClient.get({
        path: `/alldatatypes?modifiedSince=${currentModified}`,
        auth: "kevin",
      });
      assert.equal(response2.status, 200);
      assert(response2.body.results.length > 0);
    });

    it("it should NOT have the field modified with a timestamp after the previous one after the resource is updated with the same version", async () => {
      const responseGet1 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet1.status, 200);
      assert.equal(responseGet1.body.id, 38);
      const currentModified = new Date(responseGet1.body.$$meta.modified).getTime();

      const copyResponse = _.cloneDeep(responseGet1);
      const responsePut = await httpClient.put({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        body: copyResponse.body,
        auth: "kevin",
      });
      assert.equal(responsePut.status, 200);

      const responseGet2 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet2.status, 200);
      assert.equal(responseGet2.body.id, 38);
      const newModified = new Date(responseGet2.body.$$meta.modified).getTime();
      assert.equal(newModified, currentModified);
    });

    it("it should NOT have the field version incremented by one after the resource is updated with the same version", async () => {
      const responseGet1 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet1.status, 200);
      assert.equal(responseGet1.body.id, 38);
      const currentVersion = responseGet1.body.$$meta.version;

      const copyResponse = _.cloneDeep(responseGet1);
      const responsePut = await httpClient.put({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        body: copyResponse.body,
        auth: "kevin",
      });
      assert.equal(responsePut.status, 200);

      const responseGet2 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet2.status, 200);
      assert.equal(responseGet2.body.id, 38);
      const newVersion = responseGet2.body.$$meta.version;
      assert.equal(newVersion, currentVersion);
    });

    it("$$meta does not need to be considered when deciding wether the resource is updated with the same version or not", async () => {
      const responseGet1 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet1.status, 200);
      assert.equal(responseGet1.body.id, 38);
      const currentModified = new Date(responseGet1.body.$$meta.modified).getTime();

      const copyResponse = _.cloneDeep(responseGet1);
      delete copyResponse.$$meta;
      const responsePut = await httpClient.put({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        body: copyResponse.body,
        auth: "kevin",
      });
      assert.equal(responsePut.status, 200);

      const responseGet2 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet2.status, 200);
      assert.equal(responseGet2.body.id, 38);
      const newModified = new Date(responseGet2.body.$$meta.modified).getTime();
      assert.equal(newModified, currentModified);
    });

    it("additional properties not in the schema does not need to be considered when deciding wether the resource is updated with the same version or not", async () => {
      const responseGet1 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet1.status, 200);
      assert.equal(responseGet1.body.id, 38);
      const currentModified = new Date(responseGet1.body.$$meta.modified).getTime();

      const copyResponse = _.cloneDeep(responseGet1);
      copyResponse.blah = "foobar";
      const responsePut = await httpClient.put({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        body: copyResponse.body,
        auth: "kevin",
      });
      assert.equal(responsePut.status, 200);

      const responseGet2 = await httpClient.get({
        path: "/alldatatypes/e7e49d48-010b-480d-9f90-cdcd802a3096",
        auth: "kevin",
      });
      assert.equal(responseGet2.status, 200);
      assert.equal(responseGet2.body.id, 38);
      const newModified = new Date(responseGet2.body.$$meta.modified).getTime();
      assert.equal(newModified, currentModified);
    });

    it("modification date should not be updated when same resource with nested objects is put", async () => {
      const responseGet1 = await httpClient.get({
        path: "/messages/cf328c0a-7793-4b01-8544-bea8854147ab",
        auth: "kevin",
      });
      assert.equal(responseGet1.status, 200);
      const currentModified = new Date(responseGet1.body.$$meta.modified).getTime();

      const copyResponse = _.cloneDeep(responseGet1);
      const responsePut = await httpClient.put({
        path: "/messages/cf328c0a-7793-4b01-8544-bea8854147ab",
        body: copyResponse.body,
        auth: "kevin",
      });
      assert.equal(responsePut.status, 200);

      const responseGet2 = await httpClient.get({
        path: "/messages/cf328c0a-7793-4b01-8544-bea8854147ab",
        auth: "kevin",
      });
      assert.equal(responseGet2.status, 200);
      const newModified = new Date(responseGet2.body.$$meta.modified).getTime();
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
    //         name: 'LETS, ' + key,
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

    //     await httpClient.put({ path: '/communities/' + key, body, authHdrObj)

    //     body.humptydumpty = '55'

    //     await httpClient.put({ path: '/communities/' + key, body, authHdrObj)

    //     const r = await httpClient.get({ path: '/communities/' + key, null, authHdrObj)

    //     assert.notEqual(r.humptydumpty, body.humptydumpty)
    //     assert.equal(r['$$meta'].version, 0)
    //   });

    it("New version with float should work", async () => {
      const key = uuid.v4();
      const body = generateRandomAllDatatypes(key);
      const resultPut1 = await httpClient.put({
        path: `/alldatatypes/${key}`,
        body,
        auth: "kevin",
      });
      assert.equal(resultPut1.status, 201);

      body.id = 40.95;
      const resultPut2 = await httpClient.put({
        path: `/alldatatypes/${key}`,
        body,
        auth: "kevin",
      });
      assert.equal(resultPut2.status, 200);
    });
  });
};
