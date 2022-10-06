import * as common from '../../js/common';

module.exports = function (sri4node, extra) {


  var $s = sri4node.schemaUtils;

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
