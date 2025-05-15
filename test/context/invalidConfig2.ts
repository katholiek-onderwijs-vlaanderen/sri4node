import { TResourceDefinition } from "../../sri4node";
import * as Sri4Node from "../../index";

module.exports = function (sri4node: typeof Sri4Node) {
  const $s = sri4node.schemaUtils;

  const r: TResourceDefinition = {
    type: "/invalidconfig2",
    metaType: "SRI4NODE_INVALID_CONFIG2",
    table: "foos",
    map: {
      key: {},
      bar: {},
      foo: {},
    },
    schema: {
      $schema: "http://json-schema.org/schema#",
      title: "Foo",
      type: "object",
      properties: {
        key: $s.guid("Identifier."),
        bar: $s.numeric("Just a number."),
        foo: $s.string("Just a string"),
      },
      required: ["key", "bar", "foo"],
    },
  };
  return r;
};
