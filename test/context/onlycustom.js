const pMap = require('p-map'); 
const pEvent = require('p-event'); 
const sleep = require('await-sleep');
const fs = require('fs');
const streamEqual = require('stream-equal').default;
const util = require('util');

var common = require('../../js/common.js');
var cl = common.cl;
const queryobject = require('../../js/queryObject.js');
const prepare = queryobject.prepareSQL; 
const utils = require('../utils.js')(null);

exports = module.exports = function (roa, logverbose, extra) {
  'use strict';

  var ret = {
    type: '/onlyCustom',
    customRoutes: [
      { routePostfix: ''
      , httpMethods: ['GET']
      , handler: async(tx, sriRequest, mapping) => {
            return { status: 200, body: '{ "bar": "foo" }' }
        }
      },
    ],
    onlyCustom: true
  };

  return ret;
};

