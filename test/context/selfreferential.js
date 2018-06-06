var roa = require('../../sri4node.js');
var $u = roa.utils;
var common = require('../../js/common.js');
var cl = common.cl;

async function allParentsOf(value, select) {
  'use strict';
  var key = value.split('/')[2];
  var nonrecursive = $u.prepareSQL();
  nonrecursive.sql('VALUES (').param(key).sql(')');
  var recursive = $u.prepareSQL();
  recursive.sql('SELECT sr.parent FROM selfreferential sr, parentsof p' +
    ' WHERE sr.key = p.key AND sr.parent IS NOT NULL');
  select.with(nonrecursive, 'UNION', recursive, 'parentsof(key)');
  select.sql(' AND key IN (SELECT key FROM parentsof)');
  cl(select.text);
}

exports = module.exports = function (extra) {
  'use strict';
  var ret = {
    type: '/selfreferential',
        'public': true, // eslint-disable-line
    map: {
      key: {},
      name: {},
      parent: {
        references: '/selfreferential'
      }
    },
    query: {
      allParentsOf: allParentsOf
    }
  };

  common.mergeObject(extra, ret);
  return ret;
};
