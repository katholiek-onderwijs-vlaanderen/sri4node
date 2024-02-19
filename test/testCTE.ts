// Utility methods for calling the SRI interface
import assert from "assert";
import { THttpClient } from "./httpClient";

module.exports = function (httpClient: THttpClient) {
  describe("query parameters", () => {
    describe("that use a CTE", () => {
      it("to limit to a single key, should only return 1 row.", async () => {
        const response = await httpClient.get({
          path: "/messages?cteOneGuid=true",
          auth: "sabibe",
        });
        assert.equal(response.body.results.length, 1);
      });
    });

    // Test re-ordering of query parameters.
    describe("that use a CTE and other parameter", () => {
      it("to limit to a single key + another parameter, should handle re-sequencing of parameters well", async () => {
        const response = await httpClient.get({
          path: "/messages?hrefs=/messages/d70c98ca-9559-47db-ade6-e5da590b2435&cteOneGuid=true",
          auth: "sabine",
        });
        assert.equal(response.body.results.length, 1);
      });
    });

    // Test applying 2 CTEs
    describe("that use a TWO CTEs", () => {
      it("to limit to a single key, should handle both CTEs well", async () => {
        const response = await httpClient.get({
          path: "/messages?cteOneGuid=true&cteOneGuid2=true",
          auth: "sabine",
        });
        assert.equal(response.body.results.length, 1);
      });
    });

    // TODO: fix and reenable recursion cases
    // // Test recursive CTE
    // describe('that require recursion', function () {
    //   it('should find parents', async function () {
    //     const response = await doGet('/selfreferential?allParentsOf=/selfreferential/ab142ea6-7e79-4f93-82d3-8866b0c8d46b')
    //     debug('mocha', response);
    //     assert.equal(response.$$meta.count, 4);
    //   });
    // });

    // describe('that require recursion', function () {
    //   it('should find parents', async function () {
    //     const response = await doGet('/selfreferential?allParentsOf=/selfreferential/b8c020bf-0505-407c-a8ad-88044d741712')
    //     debug('mocha', response);
    //     assert.equal(response.$$meta.count, 2);
    //   });
    // });
  });
};
