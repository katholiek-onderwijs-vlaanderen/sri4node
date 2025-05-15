import { TResourceDefinition } from "../../sri4node";
import * as Sri4Node from "../../index";

module.exports = function (sri4node: typeof Sri4Node) {
  const $s = sri4node.schemaUtils;
  const $m = sri4node.mapUtils;

  const r: TResourceDefinition = {
    type: "/store/products",
    metaType: "SRI4NODE_STORE_PRODUCT",
    map: {
      key: {},
      name: {},
      category: {},
      package: {
        references: "/store/packages",
      },
      package2: {
        references: "/store/packages",
      },
      package3: {
        references: "/store/packages",
        columnToField: [$m.removeifnull],
      },
    },
    schema: {
      $schema: "http://json-schema.org/schema#",
      title: "A product linked to a package.",
      type: "object",
      properties: {
        key: $s.guid("Identifier."),
        name: $s.string("Name of the package."),
        category: $s.string("Name of the package."),
        package: $s.permalink("/store/packages", "Relation to package."),
        package2: $s.permalink("/store/packages", "Relation to package (non-mandatory)."),
        package3: $s.permalink("/store/packages", "Relation to package (non-mandatory)."),
      },
      required: ["key", "name", "category", "package"],
    },
  };
  return r;
};
