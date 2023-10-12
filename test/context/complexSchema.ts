import { TResourceDefinition } from "../../sri4node";

import * as Sri4Node from '../../index'

/**
 * This one returns a schema containing oneOf, anyOf or allOf, tomake sure that
 * more complex schema's are also supported.
 */
module.exports = function (sri4node: typeof Sri4Node): TResourceDefinition {
  const $s = sri4node.schemaUtils;

  const r: TResourceDefinition = {
    type: "/complexschema",
    metaType: "SRI4NODE_COMPLEX_SCHEMA",
    map: {
      key: {},
      foo: {
        columnToField: [sri4node.mapUtils.removeifnull],
      },
      bar: {
        columnToField: [sri4node.mapUtils.removeifnull],
      },
    },
    schema: {
      // anyOf: [
      //   {
      //     $schema: "http://json-schema.org/schema#",
      //     title: "Foo is a string",
      //     type: "object",
      //     properties: {
      //       key: $s.guid("Identifier."),
      //       foo: $s.string("a string property called foo"),
      //     },
      //     required: ["key", "foo"],
      //     additionalProperties: false,
      //   },
      //   {
      //     $schema: "http://json-schema.org/schema#",
      //     title: "Bar",
      //     type: "object",
      //     properties: {
      //       key: $s.guid("Identifier."),
      //       bar: $s.string("a string property called bar"),
      //     },
      //     required: ["key", "bar"],
      //     additionalProperties: false,
      //   },
      // ],
      oneOf: [
        {
          anyOf: [
            {
              $schema: "http://json-schema.org/schema#",
              title: "Foo is a string",
              type: "object",
              properties: {
                key: $s.guid("Identifier."),
                foo: $s.string("a string property called foo"),
              },
              required: ["key", "foo"],
              additionalProperties: false,
            },
            {
              $schema: "http://json-schema.org/schema#",
              title: "Foo is a number",
              type: "object",
              properties: {
                key: $s.guid("Identifier."),
                foo: $s.numeric("a numeric property called foo"),
              },
              required: ["key", "foo"],
              additionalProperties: false,
            },
          ],
        },
        {
          $schema: "http://json-schema.org/schema#",
          title: "Bar",
          type: "object",
          properties: {
            key: $s.guid("Identifier."),
            bar: $s.string("a string property called bar"),
          },
          required: ["key", "bar"],
          additionalProperties: false,
        },
      ],
    },
  };
  return r;
};
