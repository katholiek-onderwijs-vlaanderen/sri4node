var common = require('../../js/common.js');

exports = module.exports = function (roa, extra) {
  'use strict';

  var $s = roa.schemaUtils;

  var ret = {
    type: '/store/products',
    'public': false, // eslint-disable-line
    map: {
      key: {},
      name: {},
      category: {},
      package: {
        references: '/store/packages'
      }
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A product linked to a package.',
      type: 'object',
      properties: {
        key: $s.guid('Identifier.'),
        name: $s.string('Name of the package.'),
        category: $s.string('Name of the package.'),
        package: $s.permalink('/store/packages', 'Relation to package.')
      },
      required: ['key', 'name', 'category', 'package']
    },
  };

  common.mergeObject(extra, ret);
  return ret;
};
