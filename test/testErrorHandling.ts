// Utility methods for calling the SRI interface
import { assert } from "chai";
import * as uuid from "uuid";
import { THttpClient } from "./httpClient";
import { Server } from "http";
import { TSriServerInstance } from "../sri4node";
import * as context from "./context";
import { createMethodCalledPromise } from "./utils";

module.exports = function (
  httpClient: THttpClient,
  _testContext: {
    server: null | Server;
    sriServerInstance: null | TSriServerInstance;
    // did not work somehow, so we just imported the context module
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

  async function testBrokenConnection(
    url: string,
    dbMethodToWaitFor: keyof typeof context.pgpStats,
    waitTimeAfterConnect = 0,
  ) {
    try {
      context.resetPgpStats();
      const methodCalledPromise = createMethodCalledPromise(
        context.pgpStats[dbMethodToWaitFor],
        "push",
      );
      const responsePromise = httpClient.get({
        path: url,
        auth: "sabine",
      });
      await methodCalledPromise;
      await new Promise((resolve) => setTimeout(resolve, waitTimeAfterConnect));
      await httpClient.destroy();
      await responsePromise;
      assert.fail("Expected an error to be thrown");
    } catch (e) {
      // this is expected to throw
      assert.equal(e.message, "htpclient.failure");
    }
    assert.equal(context.pgpStats[dbMethodToWaitFor].length, 1);
    await new Promise((resolve) => setTimeout(resolve, 4000));
    console.log("            [testBrokenConnection] ======== QUERIES ========");
    console.log(
      "            [testBrokenConnection]",
      JSON.stringify(context.pgpStats.query.map(({ eventContext }) => eventContext.query)),
    );
    assert.equal(
      context.pgpStats.disconnect.length,
      1,
      `Expected 1 disconnect, got ${context.pgpStats.disconnect.length} for (${url}, ${dbMethodToWaitFor}, ${waitTimeAfterConnect})`,
    );
  }

  /**
   * In this secton, we want to check what happens when a client breaks the connection,
   * or when the connection gets broken by something in between like a proxy server or
   * a load balancer.
   */
  describe("Error handling for external errors", () => {
    // const key = uuid.v4();
    // const p = generateRandomPerson(key, communityDendermonde);

    describe("Client ends connection before response received", () => {
      describe("GET requests", () => {
        it("should recover and return the db connection to the pool if connection broken after connection", async () => {
          await testBrokenConnection(
            `/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple_slow`,
            "connect",
          );

          // We would hope that it can stop executing the rest of a request when the connection gets broken, but seems this is notyet the case
          // const nodeVersion = process.version.substring(1, 3);
          // if (nodeVersion <= "16") {
          //   console.log(
          //     "\x1b[96m\x1b[1m",
          //     "            Not assuming that the actual query was not executed, because Node < 16 does not seem to detect disconnections early",
          //     "\x1b[0m",
          //   );
          //   assert.isAtMost(context.pgpStats.query.length, 3, "Expected 3 queries to be executed (node 16 and below does not detect disconnections early)");
          // } else {
          //   assert.isAtMost(context.pgpStats.query.length, 2, "Expected 2 queries to be executed (node > 16 should detect disconnections early)");
          // }
        });
        // skipped for now, because sri4node is unable to cancel a running query, when the cient ends the connection
        // this would avoid overloading the database with queries that are not needed anymore
        it.skip("should recover and return the db connection to the pool if connection broken after connection during long query execution", async () => {
          await testBrokenConnection(
            `/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/db_slow`,
            "connect",
            1000,
          );
          await testBrokenConnection(
            `/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/db_timeout`,
            "connect",
            1000,
          );
        });
        it("should recover and return the db connection to the pool if connection broken after transaction", async () => {
          await testBrokenConnection("/persons/de32ce31-af0c-4620-988e-1d0de282ee9d", "task");
        });
      });
      describe.skip("should recover and return the db connection to the pool after a put request", () => {
        // todo
      });
      describe.skip("should recover and return the db connection to the pool after a delete request", () => {
        // todo
      });
    });
  });
};
