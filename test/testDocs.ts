// Utility methods for calling the SRI interface

import { assert } from "chai";

import { THttpClient } from "./httpClient";

module.exports = function (httpClient: THttpClient) {
  describe("Docs", () => {
    it("should return general API documentation", async () => {
      const response = await httpClient.get({ path: "/docs" });
      assert.equal(response.status, 200);
      assert.isAbove(response.body.indexOf("footer"), 0);
    });

    it("should return persons documentation", async () => {
      const response = await httpClient.get({ path: "/persons/docs" });
      assert.equal(response.status, 200);
      assert.isAbove(response.body.indexOf("footer"), 0);
    });

    it("should return alldatatypes documentation", async () => {
      const response = await httpClient.get({ path: "/alldatatypes/docs" });
      assert.equal(response.status, 200);
      assert.isAbove(response.body.indexOf("footer"), 0);
    });

    it("should return communities documentation", async () => {
      const response = await httpClient.get({ path: "/communities/docs" });
      assert.equal(response.status, 200);
      assert.isAbove(response.body.indexOf("footer"), 0);
    });

    it("should return jsonb documentation", async () => {
      const response = await httpClient.get({ path: "/jsonb/docs" });
      assert.equal(response.status, 200);
      assert.isAbove(response.body.indexOf("footer"), 0);
    });

    it("should return messages documentation", async () => {
      const response = await httpClient.get({ path: "/messages/docs" });
      assert.equal(response.status, 200);
      assert.isAbove(response.body.indexOf("footer"), 0);
    });

    it("should return selfreferential documentation", async () => {
      const response = await httpClient.get({ path: "/selfreferential/docs" });
      assert.equal(response.status, 200);
      assert.isAbove(response.body.indexOf("footer"), 0);
    });

    it("should return table documentation", async () => {
      const response = await httpClient.get({ path: "/table/docs" });
      assert.equal(response.status, 200);
      assert.isAbove(response.body.indexOf("footer"), 0);
    });

    it("should return transactions documentation", async () => {
      const response = await httpClient.get({ path: "/transactions/docs" });
      assert.equal(response.status, 200);
      assert.isAbove(response.body.indexOf("footer"), 0);
    });
  });
};
