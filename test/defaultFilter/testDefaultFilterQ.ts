// Utility methods for calling the SRI interface
import { assert } from "chai";
import { THttpClient } from "../httpClient";

module.exports = function (httpClient: THttpClient) {
  describe("Generic Filters", () => {
    describe("Q query", () => {
      it("should find resources with a general match", async () => {
        const response = await httpClient.get({ path: "/alldatatypes?q=multiple", auth: "kevin" });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 2);
        assert.equal(response.body.results[0].$$expanded.id, 13);
        assert.equal(response.body.results[1].$$expanded.id, 14);
      });

      it("should find resources of type varchar and char with a general match", async () => {
        const response = await httpClient.get({ path: "/alldatatypes?q=char", auth: "kevin" });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 4);
        assert.equal(response.body.results[0].$$expanded.id, 34);
        assert.equal(response.body.results[1].$$expanded.id, 35);
        assert.equal(response.body.results[2].$$expanded.id, 36);
        assert.equal(response.body.results[3].$$expanded.id, 37);
      });

      it("should find resources with a general match and multiple values", async () => {
        const response = await httpClient.get({
          path: "/alldatatypes?q=MULTIPLE+vsko",
          auth: "kevin",
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 1);
        assert.equal(response.body.results[0].$$expanded.id, 13);
      });

      it("should not find resources with a general match", async () => {
        const response = await httpClient.get({ path: "/alldatatypes?q=general", auth: "kevin" });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 0);
      });
    });
  });
};
