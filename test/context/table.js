exports = module.exports = function (roa) {
  'use strict';

  var $s = roa.schemaUtils;

  var ret = {
    type: '/table',
    'public': true, // eslint-disable-line
    map: {
      select: {},
      from: {}
    },
    secure: [],
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A table with protected keywords, to check escaping of sri4node',
      type: 'object',
      properties: {
        select: $s.string(''),
        from: $s.string('')
      },
      required: ['select', 'from']
    },
    afterinsert: [],
    afterupdate: []
  };

  return ret;
};
