import { assert } from "chai";
import * as uuid from "uuid";
import { THttpClient } from "./httpClient";

module.exports = function (httpClient: THttpClient) {
  function generateRandomProduct(key, packageKey) {
    return {
      key: key,
      name: "Traussers",
      category: "Cloth",
      package: {
        href: "/store/packages/" + packageKey,
      },
    };
  }

  // Will use resources products and packages which are configured with types: /store/products and /store/packages
  describe("Combined resource type", function () {
    describe(' get by "key" on resource with references', function () {
      it("should succeed with correct referenced link.", async function () {
        const response = await httpClient.get({
          path: "/store/products/1edb2754-5684-1234-ae5b-ec33c903ee4d",
          auth: "sabine",
        });
        assert.equal(response.status, 200);
        assert.equal(
          response.body.package.href,
          "/store/packages/1edb2754-5684-4996-ae5b-ec33c903ee4d",
        );
      });
    });

    describe(" get resource list", function () {
      it("should succeed with correct count.", async function () {
        const response = await httpClient.get({ path: "/store/packages", auth: "sabine" });
        assert.equal(response.status, 200);
        assert.equal(response.body.$$meta.count, 2);
      });
    });

    describe(" put new resource with references", function () {
      it("should succeed with correct referenced link.", async function () {
        const key = uuid.v4();
        const packageKey = "2edb2754-1598-4996-ae5b-ec33c903ee4d";
        const body = generateRandomProduct(key, packageKey);
        const response = await httpClient.put({
          path: "/store/products/" + key,
          body,
          auth: "sabine",
        });
        assert.equal(response.status, 201);
      });
    });

    describe(" batch put new resources", function () {
      it("should succeed all of them with correct status.", async function () {
        const batch = ["p1", "p2"].map(function () {
          const key = uuid.v4();
          const packageKey = "2edb2754-1598-4996-ae5b-ec33c903ee4d";
          const body = generateRandomProduct(key, packageKey);
          return {
            verb: "PUT",
            href: "/store/products/" + key,
            body: body,
          };
        });

        const response = await httpClient.put({
          path: "/store/products/batch",
          body: batch,
          auth: "sabine",
        });
        assert.equal(response.status, 201);
        response.body.forEach((subResponse) => assert.equal(subResponse.status, 201));
      });
    });

    describe(" batch get resources", function () {
      it("should succeed all of them with correct status.", async function () {
        const batch = [
          "2f11714a-9c45-44d3-8cde-cd37eb0c048b",
          "692fa054-33ec-4a28-87eb-53df64e3d09d",
        ].map(function (key) {
          return {
            verb: "GET",
            href: "/persons/" + key,
          };
        });

        const response = await httpClient.put({
          path: "/persons/batch",
          body: batch,
          auth: "sabine",
        });
        assert.equal(response.status, 200);
        response.body.forEach((subResponse) => assert.equal(subResponse.status, 200));
        assert.equal(response.body.length, 2);
      });
    });

    describe(" delete resource", function () {
      const key = uuid.v4();

      before(async function () {
        const package1 = { key: key, name: "ToDelete-" + key };
        const response = await httpClient.put({
          path: "/store/packages/" + key,
          body: package1,
          auth: "sabine",
        });
        assert.equal(response.status, 201);
      });

      it("should succeed with correct status.", async function () {
        await httpClient.delete({ path: "/store/packages/" + key, auth: "sabine" });
      });

      it("retrieving a deleted resource should return 410 - Gone", async function () {
        const response = await httpClient.get({ path: "/store/packages/" + key, auth: "sabine" });
        assert.equal(response.status, 410);
      });
    });

    describe("get docs", function () {
      it("should succeed with correct documentation.", async function () {
        const response = await httpClient.get({ path: "/docs", auth: "sabine" });
        assert.equal(response.status, 200);
      });
    });
  });

  // Will use resources persons and communities which are configured with types: /persons and /communities
  describe("Simple resource type", function () {
    // Test basic resource get
    describe(' get by "key" on resource with references', function () {
      it("should succeed with correct referenced link.", async function () {
        const response = await httpClient.get({
          path: "/persons/9abe4102-6a29-4978-991e-2a30655030e6",
          auth: "sabine",
        });
        assert.equal(response.status, 200);
        assert.equal(
          response.body.community.href,
          "/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849",
        );
      });
    });
  });
};
