module.exports = function (sri4node) {
  const $s = sri4node.schemaUtils;

  async function allParentsOf(value, select) {
    const key = value.split('/')[2];
    const nonrecursive = sri4node.utils.executeSQL();
    nonrecursive.sql('VALUES (').param(key).sql(')');
    const recursive = sri4node.utils.prepareSQL();
    recursive.sql('SELECT sr.parent FROM selfreferential sr, parentsof p' +
      ' WHERE sr.key = p.key AND sr.parent IS NOT NULL');
    select.with(nonrecursive, 'UNION', recursive, 'parentsof(key)');
    select.sql(' AND key IN (SELECT key FROM parentsof)');
    sri4node.debug('mocha', select.text);
  }
  
  return {
    type: '/selfreferential',
    metaType: 'SRI4NODE_SELFREFERENTIAL',
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
};
