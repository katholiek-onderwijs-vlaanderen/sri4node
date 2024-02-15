// Utility methods for calling the SRI interface
import { assert } from "chai";
import { THttpClient } from "../httpClient";

module.exports = function (httpClient: THttpClient) {
  describe("Generic Filters", () => {
    describe("Combination match", () => {
      it("should find resources with a combined match", async () => {
        const response = await httpClient.get({
          path: "/alldatatypes?text=vsko&number=450",
          auth: "kevin",
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 1);
        assert.equal(response.body.results[0].$$expanded.text, "VSKO");
        assert.equal(response.body.results[0].$$expanded.number, 450);
      });

      it("should find resources with a combined match and modifiers", async () => {
        const response = await httpClient.get({
          path: "/alldatatypes?textCaseSensitiveNot=VSKO&numberAfter=230",
          auth: "kevin",
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 2);
        assert.equal(response.body.results[0].$$expanded.text, "dienst informatica");
        assert.equal(response.body.results[0].$$expanded.number, 230);
        assert.equal(response.body.results[1].$$expanded.text, "combined unit");
        assert.equal(response.body.results[1].$$expanded.number, 1000);
      });

      it("should not find resources with a combined match", async () => {
        const response = await httpClient.get({
          path: "/alldatatypes?textCaseSensitive=vsko&number=230",
          auth: "kevin",
        });
        assert.equal(response.status, 200);
        assert.equal(response.body.results.length, 0);
      });
    });
  });
};
