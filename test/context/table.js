var common = require('../../js/common.js');

exports = module.exports = function (roa, extra) {
  'use strict';

  var $s = roa.schemaUtils;

  var ret = {
    type: '/table',
    metaType: 'SRI4NODE_TABLE',
    'public': true, // eslint-disable-line
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

  common.mergeObject(extra, ret);
  return ret;
};
