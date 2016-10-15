var common = require('../../js/common.js');
// Messages relations
exports = module.exports = function (roa, extra) {
  'use strict';

  var $s = roa.schemaUtils;
  var $q = roa.queryUtils;

  var ret = {
    type: '/personrelations',
    'public': false, // eslint-disable-line
    map: {
      key: {},
      from: {references: '/persons'},
      to: {references: '/persons'},
      type: {},
      startdate: {},
      enddate: {}
    },
    secure: [],
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A relation between perons.',
      type: 'object',
      properties: {
        key: $s.guid('GUID for this relation.'),
        from: $s.permalink('/persons', 'Relation From person.'),
        to: $s.permalink('/persons', 'Relation To person.'),
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
    afterinsert: [],
    afterupdate: []
  };

  common.mergeObject(extra, ret);
  return ret;
};
