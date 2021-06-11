const common = require('../../js/common.js');

exports = module.exports = function (roa, extra) {
  'use strict';

  var $s = roa.schemaUtils;

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
