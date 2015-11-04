/* Handles the ?expand parameter */

exports = module.exports = function (logdebug, prepare, pgExec, executeAfterReadFunctions, identify) {
  'use strict';
  var Q = require('q');
  var common = require('./common.js');
  var cl = common.cl;
  var typeToConfig = common.typeToConfig;
  var sqlColumnNames = common.sqlColumnNames;
  var mapColumnsToObject = common.mapColumnsToObject;
  var executeOnFunctions = common.executeOnFunctions;

  function debug(x) {
    if (logdebug) {
      cl(x);
    }
  }

  // Expands a single path on an array of elements.
  // Potential improvement : when the expansion would load obejcts that are already
  // in the cluster currently loaded, re-use the loaded element, rather that querying it again.
  function executeSingleExpansion(database, elements, mapping, resources, expandpath, req) {
    var deferred = Q.defer();

    var query, targetkeys, keyToElement, firstDotIndex, expand, recurse, recursepath;
    var permalink, element, key, targetkey, targetlink;
    var i;
    var targetType, typeToMapping, targetMapping, table, columns;
    var targetpermalinkToObject, expandedElements;

    try {
      if (elements && elements.length > 0) {
        query = prepare();
        targetkeys = [];
        keyToElement = {};
        firstDotIndex = expandpath.indexOf('.');
        if (firstDotIndex === -1) {
          expand = expandpath;
          recurse = false;
        } else {
          expand = expandpath.substring(0, firstDotIndex);
          recurse = true;
          recursepath = expandpath.substring(firstDotIndex + 1, expandpath.length);
        }
        if (!mapping.map[expand]) {
          debug('** rejecting expand value [' + expand + ']');
          deferred.reject();
        } else {
          for (i = 0; i < elements.length; i++) {
            element = elements[i];
            permalink = element.$$meta.permalink;
            targetlink = element[expand].href;
            key = permalink.split('/')[2];
            targetkey = targetlink.split('/')[2];
            // Remove duplicates and items that are already expanded.
            if (targetkeys.indexOf(targetkey) === -1 && !element[expand].$$expanded) {
              targetkeys.push(targetkey);
            }
            keyToElement[key] = element;
          }

          targetType = mapping.map[expand].references;
          typeToMapping = typeToConfig(resources);
          targetMapping = typeToMapping[targetType];
          table = targetMapping.type.substr(1);
          columns = sqlColumnNames(targetMapping);
          targetpermalinkToObject = {};
          expandedElements = [];

          debug(table);
          query.sql('select ' + columns + ' from "' + table + '" where key in (').array(targetkeys).sql(')');
          pgExec(database, query).then(function (result) {
            debug('expansion query done');
            var rows = result.rows;
            var row, expanded, k, j;

            for (j = 0; j < rows.length; j++) {
              row = rows[j];
              expanded = {};
              k = row.key;
              mapColumnsToObject(resources, targetMapping, row, expanded);
              executeOnFunctions(resources, targetMapping, 'onread', expanded);
              targetpermalinkToObject[targetType + '/' + k] = expanded;
              expanded.$$meta = {
                permalink: mapping.type + '/' + k
              };
              expandedElements.push(expanded);
            }

            debug('** execute identify');
            return identify(req, database);
          }).then(function(me) {
            debug('** executing afterread functions on expanded resources');
            return executeAfterReadFunctions(database, expandedElements, targetMapping, me);
          }).then(function () {
            var z, elem, target;
            for (z = 0; z < elements.length; z++) {
              elem = elements[z];
              target = element[expand].href;
              elem[expand].$$expanded = targetpermalinkToObject[target];
            }
            if (recurse) {
              debug('** recursing to next level of expansion : ' + recursepath);
              executeSingleExpansion(database, expandedElements, targetMapping,
                                     resources, recursepath, req).then(function () {
                deferred.resolve();
              }).fail(function (e) {
                deferred.reject(e);
              });
            } else {
              debug('** executeSingleExpansion resolving');
              deferred.resolve();
            }
          });
        }
      } else {
        deferred.resolve();
      }
    } catch (e) {
      debug('** executeSingleExpansion failed : ');
      debug(e);
      deferred.reject(e.toString());
    }

    return deferred.promise;
  }

  /*
  Reduce comma-separated expand parameter to array, in lower case, and remove 'results.href' as prefix.
  The rest of the processing of expansion does not make a distinction between list resources and regular
  resources. Also rewrites 'none' and 'full' to the same format.
  If none appears anywhere in the list, an empty array is returned.
  */
  function parseExpand(expand) {
    var ret = [];
    var i, path, prefix, index, npath;

    var paths = expand.split(',');
    for (i = 0; i < paths.length; i++) {
      path = paths[i].toLowerCase();
      if (path === 'none') {
        return [];
      } else if (path === 'full') {
        // If this was a list resource full is already handled.
      } else if (path === 'results') {
        // If this was a list resource full is already handled.
      } else {
        prefix = 'results.';
        index = paths[i].indexOf(prefix);
        if (index === 0) {
          npath = path.substr(prefix.length);
          if (npath && npath.length > 0) {
            debug(npath);
            ret.push(npath);
          }
        } else if (index === -1) {
          ret.push(path);
        }
      }
    }
    debug('** parseExpand() results in :');
    debug(ret);

    return ret;
  }

  /*
  Execute expansion on an array of elements.
  Takes into account a comma-separated list of property paths.
  Currently only one level of items on the elements can be expanded.

  So for list resources :
  - results.href.person is OK
  - results.href.community is OK
  - results.href.person,results.href.community is OK. (2 expansions - but both 1 level)
  - results.href.person.address is NOT OK - it has 1 expansion of 2 levels. This is not supported.

  For regular resources :
  - person is OK
  - community is OK
  - person,community is OK
  - person.address,community is NOT OK - it has 1 expansion of 2 levels. This is not supported.
  */
  function executeExpansion(database, elements, mapping, resources, expand, executeAfterReadFunctions, req) { // eslint-disable-line
    var paths, path, promises, i, errors;
    var deferred = Q.defer();
    debug('** executeExpansion()');
    try {
      if (expand) {
        paths = parseExpand(expand, mapping);
        if (paths && paths.length > 0) {
          promises = [];
          for (i = 0; i < paths.length; i++) {
            path = paths[i];
            promises.push(executeSingleExpansion(database, elements, mapping, resources, path, req));
          }

          Q.allSettled(promises).then(function (results) {
            debug('allSettled :');
            debug(results);
            errors = [];
            results.forEach(function (result) {
              if (result.state === 'rejected') {
                errors.push(result.reason);
              }
            });

            if (errors.length === 0) {
              debug('** executeExpansion() resolves.');
              debug('after expansion :');
              debug(elements);
              deferred.resolve();
            } else {
              deferred.reject({
                type: 'expansion.failed',
                status: 404,
                body: {
                  errors: {
                    code: 'invalid.expand.value',
                    description: 'expand=' + expand + ' is not a valid expansion string.'
                  }
                }
              });
            }
          });
        } else {
          deferred.resolve();
        }
      } else {
        // No expand value ? We're done !
        deferred.resolve();
      }
    } catch (e) {
      deferred.reject(e.toString());
    }

    return deferred.promise;
  }

  return executeExpansion;
};
