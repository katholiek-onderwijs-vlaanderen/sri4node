// Utility methods for calling the SRI interface
import { assert } from "chai";
import { THttpClient } from "../httpClient";

module.exports = function (httpClient: THttpClient) {
  describe("Relations Filters", () => {
    describe("To types match", () => {
      it("should find relations where to resource is of type", async () => {
        const response = await httpClient.get({ path: "/relations?toTypes=offer" });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 3);
        assert.equal(response.body.results[0].$$expanded.type, "IS_RELATED");
        assert.equal(response.body.results[1].$$expanded.type, "IS_RELATED");
        assert.equal(response.body.results[2].$$expanded.type, "IS_PART_OF");
      });

      it("should not find relations where to resource is not of type", async () => {
        const response = await httpClient.get({ path: "/relations?toTypes=response" });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 0);
      });
    });
  });
};
