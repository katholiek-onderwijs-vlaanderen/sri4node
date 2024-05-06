// Utility methods for calling the SRI interface
import { assert } from "chai";
import { THttpClient } from "./httpClient";

module.exports = function (httpClient: THttpClient) {
  describe("sriType should be present in sriRequest passed to hooks", function () {
    it("Regular GET", async function () {
      const response = await httpClient.get({
        path: "/persons/838524ec-d267-11eb-bbb0-8f3f35e5f1f8",
        auth: "sam",
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.errors[0].sriType, "/persons");
    });

    it("GET with custom route", async function () {
      const response = await httpClient.get({
        path: "/persons/838524ec-d267-11eb-bbb0-8f3f35e5f1f8/sritype",
        auth: "sam",
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.errors[0].sriType, "/persons");
    });

    it("List GET", async function () {
      const response = await httpClient.get({
        path: "/persons?communities=/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d",
        auth: "sam",
      });
      assert.equal(response.status, 200);
      assert.equal(response.body.errors[0].sriType, "/persons");
    });

    it("Batch GET", async function () {
      const batch = [{ href: "/persons/838524ec-d267-11eb-bbb0-8f3f35e5f1f8", verb: "GET" }];
      const response = await httpClient.put({ path: "/persons/batch", body: batch, auth: "sam" });
      assert.equal(response.status, 200);
      assert.equal(response.body[0].body.errors[0].sriType, "/persons");
    });

    it("onlyCustom route", async function () {
      const response = await httpClient.get({ path: "/onlyCustom", auth: "sam" });
      assert.equal(response.status, 200);
      assert.equal(response.body.sriType, "/onlyCustom");
    });
  });
};
