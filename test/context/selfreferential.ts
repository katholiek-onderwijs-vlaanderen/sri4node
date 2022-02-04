const { utils: $u, schemaUtils: $s, queryUtils: $q, mapUtils: $m } = require('../../index');
import * as common from '../../js/common';
var debug = common.debug;


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
  debug('mocha', select.text);
}

export = module.exports = function (extra) {
  'use strict';
  var ret = {
    type: '/selfreferential',
    metaType: 'SRI4NODE_SELFREFERENTIAL',
    'public': true, // eslint-disable-line
    map: {
      key: {},
      name: {},
      parent: {
        references: '/selfreferential'
      }
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'An object that contains references to resources of the same type.',
      type: 'object',
      properties: {
        key: $s.guid('GUID for this selfreferential.'),
        name: $s.string('The name of the selfreferential.'),
        parent: $s.permalink('/selfreferential', 'A link to the parent.'),
      }
    },
    query: {
      allParentsOf: allParentsOf
    },
  };

  common.mergeObject(extra, ret);
  return ret;
};
