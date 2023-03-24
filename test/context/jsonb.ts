import { TResourceDefinition } from "../../sri4node";

module.exports = function (sri4node) {
  const $s = sri4node.schemaUtils;
  const r : TResourceDefinition = {
    type: '/jsonb',
    metaType: 'SRI4NODE_JSONB',
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'jsonb test context.',
      type: 'object',
      properties: {
        key: $s.guid(''),
        details: { "type": "object" },
        foo: $s.permalink('/foo', 'json permalink test')
      },
      required: ['key', 'details', 'foo']
    },    
    map: {
      key: {},
      details: {},
      foo: {}
    }
  };
  return r;
};
