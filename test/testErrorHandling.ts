// Utility methods for calling the SRI interface
import assert from "assert";
import * as uuid from "uuid";
import { THttpClient } from "./httpClient";
import { util } from "chai";
import { Server } from "http";
import { TSriServerInstance } from "../sri4node";
import { SinonSpy, spy } from "sinon";
import sinon from "sinon";
import * as context from "./context";
import { resolve } from "path";
import { createMethodCalledPromise } from "./utils";

module.exports = function (
  httpClient: THttpClient,
  testContext: {
    server: null | Server;
    sriServerInstance: null | TSriServerInstance;
    context: typeof context;
  },
) {
  const communityDendermonde = "/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849";

  function generateRandomPerson(key, communityPermalink) {
    return {
      firstname: "Sabine",
      lastname: "Eeckhout",
      street: "Stationstraat",
      streetnumber: "17",
      zipcode: "9280",
      city: "Lebbeke",
      phone: "0492882277",
      email: `${key}@email.com`,
      balance: 0,
      mail4elas: "weekly",
      community: {
        href: communityPermalink,
      },
    };
  }

  describe("Error handling for internal errors", () => {
    const key = uuid.v4();
    const p = generateRandomPerson(key, communityDendermonde);

    describe("After Read", () => {
      it("should return 500 (server error) when rejecting without an error object", async () => {
        const response = await httpClient.get({
          path: "/persons/9abe4102-6a29-4978-991e-2a30655030e6",
          auth: "daniella",
        });
        assert.equal(response.status, 500);
      });

      it("should return 403 (forbidden) when rejecting with an error object", async () => {
        const response = await httpClient.get({
          path: "/persons/9abe4102-6a29-4978-991e-2a30655030e6",
          auth: "ingrid",
        });
        assert.equal(response.status, 403);
      });
    });

    describe("After Insert", () => {
      it("should return 500 (server error) when rejecting without an error object", async () => {
        const response = await httpClient.put({
          path: `/persons/${key}`,
          body: p,
          auth: "daniella",
        });
        assert.equal(response.status, 500);
      });

      it("should return 403 (forbidden) when rejecting with an error object", async () => {
        const response = await httpClient.put({ path: `/persons/${key}`, body: p, auth: "ingrid" });
        assert.equal(response.status, 403);
      });
    });

    describe("After Update", () => {
      before(async () => {
        const response = await httpClient.put({ path: `/persons/${key}`, body: p, auth: "sabine" });
        assert.equal(response.status, 201);
      });

      it("should return 500 (server error) when rejecting without an error object", async () => {
        const response = await httpClient.put({
          path: `/persons/${key}`,
          body: p,
          auth: "daniella",
        });
        assert.equal(response.status, 500);
      });

      it("should return 403 (forbidden) when rejecting with an error object", async () => {
        const response = await httpClient.put({ path: `/persons/${key}`, body: p, auth: "ingrid" });
        assert.equal(response.status, 403);
      });
    });

    describe("After Delete", () => {
      const key2 = uuid.v4();
      const p2 = generateRandomPerson(key2, communityDendermonde);

      before(async () => {
        const response = await httpClient.put({
          path: `/persons/${key2}`,
          body: p2,
          auth: "sabine",
        });
        assert.equal(response.status, 201);
      });

      it("should return 500 (server error) when rejecting without an error object", async () => {
        const response = await httpClient.delete({ path: `/persons/${key2}`, auth: "daniella" });
        assert.equal(response.status, 500);
      });

      it("should return 403 (forbidden) when rejecting with an error object", async () => {
        const response = await httpClient.delete({ path: `/persons/${key2}`, auth: "ingrid" });
        assert.equal(response.status, 403);
      });
    });

    // TODO: find another way to trigger an SQL error as duplicates generate now a 409 conflict
    // describe('SQL error ', function () {

    //   const key = uuid.v4();
    //   const p = generateRandomPerson(key, communityDendermonde);
    //   p.email = 'sabine@email.be';

    //   it('should return 500 (server error) [regular request]', async function () {
    //     await utils.testForStatusCode(
    //       async () => {
    //         const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
    //         await httpClient.put({ path:'/persons/' + key, p, { headers: { authorization: auth }, maxAttempts: 1  });
    //       },
    //       (error) => {
    //         assert.equal(error.status, 500);
    //       })
    //   });

    //   it('should return 500 (server error) [batch request]', async function () {
    //     const batch = [
    //         { "href": '/persons/' + key
    //         , "verb": "PUT"
    //         , "body": p
    //         }]

    //     await utils.testForStatusCode(
    //       async () => {
    //         const auth = makeBasicAuthHeader('sabine@email.be', 'pwd')
    //         await httpClient.put({ path:'/batch', batch, { headers: { authorization: auth }, maxAttempts: 1 });
    //       },
    //       (error) => {
    //         assert.equal(error.status, 500);
    //       })
    //   });

    // });
  });

  /**
   * Iin this secton, we want to check what happens when a client brealks the connection,
   * or when the connection gets broken by something in between like a proxy server or
   * a load balancer.
   */
  describe("Error handling for external errors", () => {
    // const key = uuid.v4();
    // const p = generateRandomPerson(key, communityDendermonde);

    describe("Client ends connection before response received", () => {
      describe("GET requests", () => {
        it("should recover and return the db conneciton to the pool if connection broken after connection", async () => {
          // now try to break the connection directly after the db connection has been set up
          try {
            context.resetPgpStats();
            const connectCalledPromise = createMethodCalledPromise(
              context.pgpStats.connect,
              "push",
            );
            const responsePromise = httpClient.get({
              path: `/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple_slow`,
              auth: "sabine",
            });
            await connectCalledPromise;
            await httpClient.destroy();
            await responsePromise;
            assert.fail("Expected an error to be thrown");
          } catch (e) {
            // this is expected to throw
            assert.equal(e.message, "htpclient.failure");
          }
          assert.equal(context.pgpStats.connect.length, 1);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          assert.equal(context.pgpStats.disconnect.length, 1);
        });
        it("should recover and return the db conneciton to the pool if connection broken after transaction", async () => {
          try {
            context.resetPgpStats();
            const taskCalledPromise = createMethodCalledPromise(context.pgpStats.task, "push");
            const responsePromise = httpClient.get({
              path: `/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple_slow`,
              auth: "sabine",
            });
            await taskCalledPromise;
            await httpClient.destroy();
            await responsePromise;
            assert.fail("Expected an error to be thrown");
          } catch (e) {
            // this is expected to throw
            assert.equal(e.message, "htpclient.failure");
          }
          // check if 1 new task has been created
          assert.equal(context.pgpStats.task.length, 1);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          assert.equal(context.pgpStats.disconnect.length, 1);
        });
      });
      it.skip("should recover and return the db conneciton to the pool after a put request", async () => {
        // todo
      });
      it.skip("should recover and return the db conneciton to the pool after a delete request", async () => {
        // todo
      });
    });
  });
};
