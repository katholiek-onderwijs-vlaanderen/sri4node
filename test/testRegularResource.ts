// Utility methods for calling the SRI interface
import assert from "assert";
import { THttpClient } from "./httpClient";
import utils from "./utils";

module.exports = function (httpClient: THttpClient) {
  describe("GET public regular resource", function () {
    describe("without authentication", function () {
      it("should return LETS, Regio Dendermonde", async function () {
        const response = await httpClient.get({
          path: "/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849",
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.name, "LETS, Regio Dendermonde");
      });
    });

    describe("with authentication", function () {
      it("should return LETS, Hamme", async function () {
        const response = await httpClient.get({
          path: "/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d",
          auth: "sabine",
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.name, "LETS, Hamme");
      });
    });

    describe("with invalid authentication - non-existing user", function () {
      it("should return LETS, Hamme", async function () {
        const response = await httpClient.get({
          path: "/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d",
          auth: "unknown",
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.name, "LETS, Hamme");
      });
    });

    describe("with invalid authentication - existing user, wrong password", function () {
      it("should return LETS, Hamme", async function () {
        const response = await httpClient.get({
          path: "/communities/1edb2754-8481-4996-ae5b-ec33c903ee4d",
          headers: { authorization: utils.makeBasicAuthHeader("sabine@email.be", "INVALID") },
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.name, "LETS, Hamme");
      });
    });
  });

  describe("GET private regular resource", function () {
    describe("/persons/{key} from my community", function () {
      it("should return Kevin Boon", async function () {
        const response = await httpClient.get({
          path: "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d",
          auth: "kevin",
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.firstname, "Kevin");
        assert.equal(response.body.lastname, "Boon");
      });
    });

    describe("/persons/{key} from different community", function () {
      it("should be 403 Forbidden", async function () {
        const response = await httpClient.get({
          path: "/persons/82565813-943e-4d1a-ac58-8b4cbc865bdb",
          auth: "sabine",
        });
        assert.equal(response.status, 403);
      });
    });

    describe("two secure functions", function () {
      it("should disallow read on Ingrid Ohno", async function () {
        const response = await httpClient.get({
          path: "/persons/da6dcc12-c46f-4626-a965-1a00536131b2",
          auth: "sabine",
        });
        assert.equal(response.status, 403);
      });
    });

    describe("with invalid authentication - non-existing user", function () {
      it("should disallow read", async function () {
        const response = await httpClient.get({
          path: "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d",
          auth: "unknown",
        });
        assert.equal(response.status, 401);
      });
    });

    describe("with invalid authentication - existing user, wrong password", function () {
      it("should disallow read", async function () {
        const response = await httpClient.get({
          path: "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d",
          headers: { authorization: utils.makeBasicAuthHeader("sabine@email.be", "INVALID") },
        });
        assert.equal(response.status, 401);
      });
    });

    describe("without authentication", function () {
      it("should disallow read", async function () {
        const response = await httpClient.get({
          path: "/persons/da6dcc12-c46f-4626-a965-1a00536131b2",
        });
        assert.equal(response.status, 401);
      });
    });
  });

  describe("Prefixed resource should also work", function () {
    it('get by "key" on resource', async function () {
      const response = await httpClient.get({ path: "/prefix/countries2/be", auth: "sabine" });
      assert.equal(response.status, 200);
      assert.equal(response.body.name, "Belgium");
    });
  });

  describe("Invalid key should", function () {
    it('return "invalid key" error', async function () {
      const response = await httpClient.get({ path: "/persons/abc" });
      assert.equal(response.status, 400);
      assert.equal(response.body.errors[0].code, "key.invalid");
    });
  });
};
