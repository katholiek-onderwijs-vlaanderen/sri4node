import { TResourceDefinition } from "../../sri4node";

module.exports = function (sri4node) {

  const $s = sri4node.schemaUtils;

  const r : TResourceDefinition = {
    type: '/cities',
    metaType: 'SRI4NODE_CITY',
    map: {
      key: {},
      name: {},
      nisCode: {}
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A city.',
      type: 'object',
      properties: {
        key: $s.numeric('Identifier.'),
        name: $s.string('Name of the package.'),
        nisCode: $s.numeric('nisCode')
      },
      required: ['key', 'name', 'nisCode']
    },
    beforeInsert: [ (tx, sriRequest, elements) => { 
        if (sriRequest.body?.key === 100001) {
            sriRequest.generateError = true;
        }
    }]
  };
  return r;
};
