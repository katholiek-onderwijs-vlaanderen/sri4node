// Utility methods for calling the SRI interface
import assert from "assert";
import * as uuid from "uuid";
import _ from "lodash";
import { THttpClient } from "./httpClient";

module.exports = function (httpClient: THttpClient) {
  function generateRandomCommunity(key) {
    return {
      key: key,
      name: "LETS, " + key,
      street: "Leuvensesteenweg",
      streetnumber: "34",
      zipcode: "1040",
      city: "Brussel",
      phone: "0492882277",
      email: key + "@email.com",
      adminpassword: "secret",
      currencyname: "pluimen",
    };
  }

  describe("DELETE regular resource", function () {
    const key = uuid.v4();
    const body = generateRandomCommunity(key);

    before(async function () {
      const response = await httpClient.put({ path: "/communities/" + key, body, auth: "sabine" });
      assert.equal(response.status, 201);
    });

    after(async function () {
      await httpClient.delete({ path: "/communities/" + key, auth: "sabine" });
    });

    it("should be possible to delete a newly created resource", async function () {
      const response = await httpClient.delete({ path: "/communities/" + key, auth: "sabine" });
      assert.equal(response.status, 200);
    });

    it("retrieving a deleted resource should return 410 - Gone", async function () {
      const response = await httpClient.get({ path: "/communities/" + key, auth: "sabine" });
      assert.equal(response.status, 410);
    });

    it("deleting a deleted resource should return 200 - OK", async function () {
      const response = await httpClient.delete({ path: "/communities/" + key, auth: "sabine" });
      assert.equal(response.status, 200);
    });

    it("retrieving a deleted resource with deleted=true should return the resource", async function () {
      const response = await httpClient.get({
        path: "/communities/" + key + "?$$meta.deleted=true",
        auth: "sabine",
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.email, key + "@email.com");
      assert.equal(response.body.$$meta.deleted, true);
    });

    it("listing a deleted resource should not return it", async function () {
      const response = await httpClient.get({
        path: "/communities?email=" + key + "@email.com",
        auth: "sabine",
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 0);
    });

    it("listing a deleted resource with deleted=true should return it only", async function () {
      const response = await httpClient.get({
        path: "/communities?$$meta.deleted=true&email=" + key + "@email.com",
        auth: "sabine",
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].$$expanded.email, key + "@email.com");
      assert.equal(response.body.results[0].$$expanded.$$meta.deleted, true);
    });

    it("listing a deleted resource with deleted=any should return everything", async function () {
      const response = await httpClient.get({
        path: "/communities?$$meta.deleted=any&email=" + key + "@email.com",
        auth: "sabine",
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 1);
      assert.equal(response.body.results[0].$$expanded.email, key + "@email.com");
      assert.equal(response.body.results[0].$$expanded.$$meta.deleted, true);
    });

    it("listing a deleted resource with deleted=false should not return it", async function () {
      const response = await httpClient.get({
        path: "/communities?$$meta.deleted=false&email=" + key + "@email.com",
        auth: "sabine",
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.results.length, 0);
    });

    it("PATCH on soft deleted resources should fail", async function () {
      const p = [{ op: "replace", path: "name", value: "foo" }];
      const respone = await httpClient.patch({
        path: "/communities/" + key,
        body: p,
        auth: "sabine",
      });
      assert.equal(respone.status, 410);
    });

    it("updating a deleted resource should have same result as CREATE", async function () {
      const body2 = _.clone(body);
      body2.currencyname = "pollekes";
      const response = await httpClient.put({
        path: "/communities/" + key,
        body: body2,
        auth: "sabine",
      });
      assert.equal(response.status, 201);

      const response2 = await httpClient.get({ path: "/communities/" + key, auth: "sabine" });
      assert.equal(response2.status, 200);
      assert.equal(response2.body.currencyname, "pollekes");
      assert.equal(response2.body.$$meta.deleted, undefined);
    });

    // // does not work out-of-the-box with logical delete ==> TODO?
    // it('deleting resource resulting in foreign key error should return 409 - Conflict', async function () {
    //   await utils.testForStatusCode(
    //     async () => {
    //       await httpClient.delete({ path: communityDendermonde,)
    //     },
    //     (error) => {
    //       assert.equal(error.status, 409);
    //     })
    // });
  });
};
