import assert from "assert";
import { debug } from "../js/common";
import { getInformationSchema } from "../js/informationSchema";

import * as context from "./context";
import { TSriServerInstance } from "../sri4node";

module.exports = function (testContext: { sriServerInstance: null | TSriServerInstance }) {
  describe("Information Schema", () => {
    it("should correctly show text columns", async () => {
      const configuration = context.getConfiguration();
      const is = await getInformationSchema(
        (testContext.sriServerInstance as TSriServerInstance).db,
        configuration,
      );
      const { type } = is["/communities"].zipcode;
      debug("mocha", `type : ${type}`);
      assert.equal(type, "text");
    });
  });
};
