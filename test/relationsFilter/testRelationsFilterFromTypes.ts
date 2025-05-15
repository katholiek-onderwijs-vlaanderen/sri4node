// Utility methods for calling the SRI interface
import { assert } from "chai";
import { THttpClient } from "../httpClient";

module.exports = function (httpClient: THttpClient) {
  describe("Relations Filters", () => {
    describe("From types match", () => {
      it("should find relations where from resource is of type", async () => {
        const response = await httpClient.get({ path: "/relations?fromTypes=request" });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 2);
        assert.equal(response.body.results[0].$$expanded.type, "IS_RELATED");
        assert.equal(response.body.results[1].$$expanded.type, "IS_RELATED");
      });

      it("should find relations where from resource is one of types", async () => {
        const response = await httpClient.get({ path: "/relations?fromTypes=request,offer" });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 4);
      });

      it("should not find relations where from resource is not of type", async () => {
        const response = await httpClient.get({ path: "/relations?fromTypes=response" });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 0);
      });
    });
  });
};
