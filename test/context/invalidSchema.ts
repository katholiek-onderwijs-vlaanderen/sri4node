import { JSONSchema4TypeName } from "json-schema";
import { TResourceDefinition } from "../../sri4node";

module.exports = function (sri4node) {
  const $s = sri4node.schemaUtils;

  const r : TResourceDefinition = {
    type: '/invalidschema',
    metaType: 'SRI4NODE_INVALID_SCHEMA',
    map: {
      key: {},
      bar: {},
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'Foo',
      type: 'object',
      properties: {
        key: $s.guid('Identifier.'),
        bar: {
          type: 'foo' as JSONSchema4TypeName, // invalid schema type
          description: 'foo is an invalid type -> invalid schema'
        },
      },
      required: ['key', 'bar']
    },
  };
  return r;
};
