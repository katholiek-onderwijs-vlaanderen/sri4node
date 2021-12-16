const common = require('../../js/common');
// Messages relations
export = module.exports = function (roa, extra) {
  'use strict';

  var $s = roa.schemaUtils;
  var $q = roa.queryUtils;

  var ret = {
    type: '/relations',
    metaType: 'SRI4NODE_RELATIONS',
    'public': false, // eslint-disable-line
    map: {
      key: {},
      from: {references: '/messages'},
      to: {references: '/messages'},
      type: {},
      startdate: {},
      enddate: {}
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A relation between messages.',
      type: 'object',
      properties: {
        key: $s.guid('GUID for this relation.'),
        from: $s.permalink('/messages', 'Relation From message.'),
        to: $s.permalink('/messages', 'Relation To message.'),
        type: $s.string('Type of the relation.'),
        startdate: {
          type: 'string',
          format: 'date',
          description: 'Validity start date of the relation.'
        },
        enddate: {
          type: 'string',
          format: 'date',
          description: 'Validity end date of the relation.'
        }
      },
      required: ['key', 'from', 'to', 'type']
    },
  };

  common.mergeObject(extra, ret);
  return ret;
};
