var common = require('../../js/common.js');

exports = module.exports = function (roa, extra) {
  'use strict';

  var $s = roa.schemaUtils;

  var ret = {
    type: '/cities',
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
  };

  common.mergeObject(extra, ret);
  return ret;
};
