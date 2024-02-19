import { TResourceDefinition } from "../../sri4node";
import * as Sri4Node from "../../index";

module.exports = function (sri4node: typeof Sri4Node) {
  const $s = sri4node.schemaUtils;

  const r: TResourceDefinition = {
    type: "/prefix/countries2",
    metaType: "SRI4NODE_PREFIX_COUNTRIES",
    map: {
      key: {},
      name: {},
      position: {},
    },
    schema: {
      $schema: "http://json-schema.org/schema#",
      title:
        "Countries with their country code. (only official codes are included) </br><small>Last update: 19/11/2015</small>",
      type: "object",
      properties: {
        key: $s.string("Official country code"),
        name: $s.string("Name of the country."),
        position: {
          type: "object",
          description: "Coordinates of the country.",
          properties: {
            latitude: {
              type: "number",
            },
            longitude: {
              type: "number",
            },
          },
        },
      },
      required: ["key", "name"],
    },
  };
  return r;
};
