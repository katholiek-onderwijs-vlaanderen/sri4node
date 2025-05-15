// Utility methods for calling the SRI interface
import { assert } from "chai";

module.exports = function (httpClient) {
  describe("Order by", function () {
    describe("no specific order", function () {
      it("should sort LETS, Aalst-Oudenaarde BEFORE LETS, Zele", async function () {
        const response = await httpClient.get({ path: "/communities?orderBy=name" });
        const names = response.body.results.map((r) => r.$$expanded.name);

        assert(
          names.indexOf("LETS, Aalst-Oudenaarde") < names.indexOf("LETS, Zele"),
          "Aalst occur before Zele",
        );
      });
    });

    describe("descending", function () {
      it("should sort LETS, Aalst-Oudenaarde BEFORE LETS, Zele", async function () {
        const response = await httpClient.get({
          path: "/communities?orderBy=name&descending=false",
        });
        const names = response.body.results.map((r) => r.$$expanded.name);

        assert(
          names.indexOf("LETS, Aalst-Oudenaarde") < names.indexOf("LETS, Zele"),
          "Aalst occur before Zele",
        );
      });
    });

    describe("ascending", function () {
      it("should sort LETS, Aalst-Oudenaarde AFTER LETS, Zele", async function () {
        const response = await httpClient.get({
          path: "/communities?orderBy=name&descending=true",
        });
        const names = response.body.results.map((r) => r.$$expanded.name);

        assert(
          names.indexOf("LETS, Aalst-Oudenaarde") > names.indexOf("LETS, Zele"),
          "Zele should occur before Aalst",
        );
      });
    });
  });
};
