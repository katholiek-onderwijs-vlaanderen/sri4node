import { TResourceDefinition } from "../../sri4node";

module.exports = function (sri4node, extra) {
  const $s = sri4node.schemaUtils;
  const r : TResourceDefinition = {
    type: '/table',
    metaType: 'SRI4NODE_TABLE',
    map: {
      select: {},
      from: {}
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A table with protected keywords, to check escaping of sri4node',
      type: 'object',
      properties: {
        key: $s.guid('GUID for this table.'),
        select: $s.string(''),
        from: $s.string('')
      },
      required: ['select', 'from']
    },
  };
  return r;
};
