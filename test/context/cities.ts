import { TResourceDefinition } from "../../sri4node";
import * as Sri4Node from "../../index";

module.exports = function (sri4node: typeof Sri4Node) {
  const $s = sri4node.schemaUtils;

  const r: TResourceDefinition = {
    type: "/cities",
    metaType: "SRI4NODE_CITY",
    map: {
      key: {},
      name: {},
      nisCode: {},
    },
    schema: {
      $schema: "http://json-schema.org/schema#",
      title: "A city.",
      type: "object",
      properties: {
        key: $s.numeric("Identifier."),
        name: $s.string("Name of the package."),
        nisCode: $s.numeric("nisCode"),
      },
      required: ["key", "name", "nisCode"],
    },
    beforeInsert: [
      (_tx, sriRequest, _elements) => {
        if (sriRequest.body?.key === 100001) {
          sriRequest.generateError = true;
        }
      },
    ],
  };
  return r;
};
