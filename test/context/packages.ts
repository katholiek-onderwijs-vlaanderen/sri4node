import common from '../../js/common';

export = module.exports = function (sri4node, extra) {
  'use strict';

  var $s = sri4node.schemaUtils;

  var ret = {
    type: '/store/packages',
    metaType: 'SRI4NODE_STORE_PACKAGE',
    'public': false, // eslint-disable-line
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

  common.mergeObject(extra, ret);
  return ret;
};
