import { TResourceDefinition } from "../../sri4node";

module.exports = function (sri4node) {
  const $s = sri4node.schemaUtils;
  const r : TResourceDefinition = {
    type: '/store/packages',
    metaType: 'SRI4NODE_STORE_PACKAGE',
    map: {
      key: {},
      name: {}
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A package of products.',
      type: 'object',
      properties: {
        key: $s.guid('Identifier.'),
        name: $s.string('Name of the package.')
      },
      required: ['key', 'name']
    },
  };
  return r;
};
