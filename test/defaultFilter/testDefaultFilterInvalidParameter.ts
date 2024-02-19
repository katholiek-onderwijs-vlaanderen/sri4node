// Utility methods for calling the SRI interface
import assert from "assert";
import _ from "lodash";

import { THttpClient } from "../httpClient";

import * as sri4node from "../../index";
// import * as alldatatypesFactory from '../context/alldatatypes';
const alldatatypesFactory = require("../context/alldatatypes"); // importing a function not possible
const alldatatypes = alldatatypesFactory(sri4node);

module.exports = function (httpClient: THttpClient) {
  describe("Generic Filters", () => {
    describe("Invalid parameter (non existent)", () => {
      it("should return 404 - not found", async () => {
        const response = await httpClient.get({
          path: "/alldatatypes?wrongParameter=multiple",
          auth: "kevin",
        });
        assert.equal(response.status, 404);
        assert.equal(response.body.errors[0].code, "invalid.query.parameter");
        assert.equal(response.body.errors[0].parameter, "wrongParameter");
        assert.equal(response.body.errors[0].type, "ERROR");
      });

      it("should return the list of possible parameters", async () => {
        const response = await httpClient.get({
          path: "/alldatatypes?wrongParameter=multiple",
          auth: "kevin",
        });
        assert.equal(response.status, 404);
        assert.equal(response.body.errors[0].code, "invalid.query.parameter");
        assert.equal(response.body.errors[0].parameter, "wrongParameter");
        assert.equal(response.body.errors[0].type, "ERROR");

        const possibleParameters = [
          ...new Set([
            ...Object.keys(alldatatypes.schema.properties),
            "key",
            "$$meta.deleted",
            "$$meta.modified",
            "$$meta.created",
            "$$meta.version",
          ]),
        ];

        assert.deepEqual(
          _.orderBy(response.body.errors[0].possibleParameters),
          _.orderBy(possibleParameters),
        );
      });
    });
  });
};
