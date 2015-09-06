var common = require('../../js/common.js');

exports = module.exports = function (roa, extra) {
  'use strict';

  var $s = roa.schemaUtils;
  var $q = roa.queryUtils;

  var ret = {
    type: '/alldatatypes',
    'public': true, // eslint-disable-line
    secure: [],
    cache: {
      ttl: 60,
      type: 'local'
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A set of resources for the generic filters',
      type: 'object',
      properties: {
        id: $s.numeric('Identificator'),
        text: $s.string('A text field.'),
        textvarchar: $s.string('A text field.'),
        textchar: $s.string('A text field.'),
        text2: $s.string('Another text field.'),
        texts: $s.array('A collection of text.'),
        publication: $s.timestamp('A timestamp field.'),
        publications: $s.array('A collection of timestamps.'),
        number: $s.numeric('A numeric field.'),
        numbers: $s.array('A collection of numbers.'),
        numberint: $s.numeric('A numeric field.'),
        numberbigint: $s.numeric('A numeric field.'),
        numbersmallint: $s.numeric('A numeric field.'),
        numberdecimal: $s.numeric('A numeric field.'),
        numberreal: $s.numeric('A numeric field.'),
        numberdoubleprecision: $s.numeric('A numeric field.'),
        numbersmallserial: $s.numeric('A numeric field.'),
        numberserial: $s.numeric('A numeric field.'),
        numberbigserial: $s.numeric('A numeric field.')
      },
      required: []
    },
    validate: [],
    map: {
      id: {},
      text: {},
      textvarchar: {},
      textchar: {},
      text2: {},
      texts: {},
      publication: {},
      publications: {},
      number: {},
      numbers: {},
      numberint: {},
      numberbigint: {},
      numbersmallint: {},
      numberdecimal: {},
      numberreal: {},
      numberdoubleprecision: {},
      numbersmallserial: {},
      numberserial: {},
      numberbigserial: {}
    },
    query: {
      defaultFilter: $q.defaultFilter
    },
    defaultlimit: 5,
    maxlimit: 50
  };

  common.mergeObject(extra, ret);
  return ret;
};
