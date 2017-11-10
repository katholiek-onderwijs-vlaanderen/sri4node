const configuration = global.configuration  



exports = module.exports = {

  /*
   Add references from a different resource to this resource.
   * type : the resource type that has a reference to the retrieved elements.
   * column : the database column that contains the foreign key.
   * key : the name of the key to add to the retrieved elements.
   */  
   //TODO: refactor and fix (together with the whole expand story)
  addReferencingResources: function (type, column, targetkey, expand) {
    'use strict';
    return function (database, elements) {
      var tablename, query, elementKeys, elementKeysToElement;
      var permalink, elementKey;
      var deferred = Q.defer();
      var typeToMapping = typeToConfig(resources);
      var mapping = typeToMapping[type];

      if (elements && elements.length && elements.length > 0) {
        tablename = type.split('/')[type.split('/').length - 1];
        query = prepare();
        elementKeys = [];
        elementKeysToElement = {};
        elements.forEach(function (element) {
          permalink = element.$$meta.permalink;
          elementKey = permalink.split('/')[2];
          elementKeys.push(elementKey);
          elementKeysToElement[elementKey] = element;
          element[targetkey] = [];
        });

        query.sql('select *, \"' + column + '\" as fkey from ' +
          tablename + ' where \"' + column + '\" in (').array(elementKeys)
          .sql(') and \"$$meta.deleted\" = false');
        pgExec(database, query).then(function (result) {
          result.rows.forEach(function (row) {
            var element = elementKeysToElement[row.fkey];
            var target = {href: type + '/' + row.key};
            var key, referencedType;
            if (expand) {
              target.$$expanded = {};
              for (key in row) {
                if (row.hasOwnProperty(key) && row[key] && key.indexOf('$$meta.') === -1 && key !== 'fkey') {
                  if (mapping.map[key] && mapping.map[key].references) {
                    referencedType = mapping.map[key].references;
                    target.$$expanded[key] = {href: typeToMapping[referencedType].type + '/' + row[key]};
                  } else {
                    target.$$expanded[key] = row[key];
                  }
                }
              }

              target.$$expanded.$$meta = {
                permalink: type + '/' + row.key,
                schema: type + '/schema',
                created: row['$$meta.created'],
                modified: row['$$meta.modified']
              };
            }
            element[targetkey].push(target);
          });
          deferred.resolve();
        }).fail(function (e) {
          cl(e.stack);
          deferred.reject();
        });
      } else {
        deferred.resolve();
      }

      return deferred.promise;
    };
  }
}