import common from '../../js/common';
const utils = require('../utils')(null);

export = module.exports = function (sri4node, extra) {
  'use strict';

  var $s = sri4node.schemaUtils;
  var $q = sri4node.queryUtils;
  var $m = sri4node.mapUtils;

  const checkRead = function( tx, sriRequest, elements ) {

    const publicRoutes = [
      '/alldatatypes?textIn=value',
      '/alldatatypes/fd7e38e1-26c3-425e-9443-8a80722dfb16'
    ];

    if (sriRequest.userObject === undefined && !publicRoutes.includes(sriRequest.originalUrl)) {
      throw new sriRequest.SriError({status: 401, errors: [{code: 'unauthorized'}]})
    }
  };

  const returnTestHeader = function( tx, sriRequest, elements ) {
    if (sriRequest.path === '/alldatatypes/3d3e6b7a-67e3-11e8-9298-e7ebb66610b3') {
      throw new sriRequest.SriError({status: 400, headers: { test: 'TestHeader' }, errors: [{code: 'a.test.error.with.header'}]})
    }
  }


  var ret = {
    type: '/alldatatypes',
    metaType: 'SRI4NODE_ALLDATATYPES',
    public: false, // eslint-disable-line
    cache: {
      ttl: 60,
      type: 'local'
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A set of resources for the generic filters',
      type: 'object',
      properties: {
        key: $s.guid('GUID for this alldatatype.'),
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
    map: {
      id: {},
      text: {columnToField: [ $m.removeifnull ]},
      textvarchar: {columnToField: [ $m.removeifnull ]},
      textchar: {columnToField: [ $m.removeifnull ]},
      text2: {columnToField: [ $m.removeifnull ]},
      texts: {columnToField: [ $m.removeifnull ]},
      publication: {columnToField: [ ]},
      publications: {columnToField: [ $m.removeifnull ]},
      number: {columnToField: [ $m.removeifnull ]},
      numbers: {columnToField: [ $m.removeifnull ]},
      numberint: {columnToField: [ $m.removeifnull ]},
      numberbigint: {columnToField: [ $m.removeifnull ]},
      numbersmallint: {columnToField: [ $m.removeifnull ]},
      numberdecimal: {columnToField: [ $m.removeifnull ]},
      numberreal: {columnToField: [ $m.removeifnull ]},
      numberdoubleprecision: {columnToField: [ $m.removeifnull ]},
      numbersmallserial: {columnToField: [ $m.removeifnull ]},
      numberserial: {columnToField: [ $m.removeifnull ]},
      numberbigserial: {columnToField: [ $m.removeifnull ]}
    },
    query: {
      defaultFilter: $q.defaultFilter
    },
    beforeRead: [ returnTestHeader ],
    afterRead: [ checkRead ],
    defaultlimit: 5,
    maxlimit: 50,

    transformRequest: utils.lookForBasicAuthUser
  };

  common.mergeObject(extra, ret);
  return ret;
};
