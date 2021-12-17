var common = require('../../js/common');

export = module.exports = function (sri4node, extra) {
  'use strict';

  var $s = sri4node.schemaUtils;

  var ret = {
    type: '/cities',
    metaType: 'SRI4NODE_CITY',
    'public': false, // eslint-disable-line
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
        if (sriRequest.body.key === 100001) {
            sriRequest.generateError = true;
        }
    }]
  };

  common.mergeObject(extra, ret);
  return ret;
};
