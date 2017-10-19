/* Handles the ?expand parameter */

const configuration = global.configuration

var Q = require('q');
const { debug, cl, typeToConfig, sqlColumnNames, mapColumnsToObject, 
        executeOnFunctions, tableFromMapping } = require('./common.js');

'use strict';

function executeSecureFunctionsOnExpandedElements(database, expandedElements, targetMapping, me) {
  if (targetMapping.secure && targetMapping.secure.length) {
    const batch = expandedElements.map( (e) => ({ 
                        href: e.$$meta.permalink,
                        verb: 'GET'
                      }) )
    return Q.all(targetMapping.secure.map( (fun) => fun(database, me, batch) ));
  } else {
    return Q.all([]);
  }
}


const checkRecurse = (expandpath) => {
    const parts = expandpath.split('.')
    if (parts.length > 1) {
      return { expand: _.first(parts), recurse: true, recursepath: _.tail(parts).join('.') }
    } else {
      return { expand: expandpath, recurse: false }
    }
}


// Expands a single path on an array of elements.
// Potential improvement : when the expansion would load obejcts that are already
// in the cluster currently loaded, re-use the loaded element, rather that querying it again.
async function executeSingleExpansion(db, elements, mapping, resources, expandpath, me, reqUrl) {
  if (elements && elements.length > 0) {
    const { expand, recurse, recursepath } = checkRecurse(expandpath)
    if (!mapping.map[expand]) {
      debug('** rejecting expand value [' + expand + ']');
      throw new SriError(404, [{code: 'expansion.failed', msg: `Cannot expand [${expand}] because it is not mapped.`}])
    } else {
      const targetkeys = elements.reduce( (acc, element) => {
        const targetlink = element[expand].href;
        const targetkey = _.last(targetlink.split('/'))
        // Don't add already included and items that are already expanded.
        if (!targetkeys.includes(targetkey) && !element[expand].$$expanded) {
          acc.push(targetkey);
        }
        return acc
      }, [])

      const targetType = mapping.map[expand].references;  // TODO: what if no references ??
      const typeToMapping = typeToConfig(resources);
      const targetMapping = typeToMapping[targetType];
      const table = tableFromMapping(table)
      const columns = sqlColumnNames(targetMapping);
      const targetpermalinkToObject = {};

      debug(table);
      const query = prepare();
      query.sql('select ' + columns + ' from "' + table + '" where key in (').array(targetkeys).sql(')');
      const rows = await pgExec(database, query)
      debug('** expansion query done');

      const expandedElements = rows.map( (row) => {
        const expandedObj = {};
        mapColumnsToObject(resources, targetMapping, row, expandedObj);
        executeOnFunctions(resources, targetMapping, 'onread', expandedObj);
        targetpermalinkToObject[targetType + '/' + row.key] = expandedObj;
        expandedObj.$$meta = { permalink: targetMapping.type + '/' + row.key };
        return expandedObj;
      })

      debug('** executing secure functions on expanded resources');
      await executeSecureFunctionsOnExpandedElements(database, expandedElements, targetMapping, me);
      debug('** executing afterread functions on expanded resources');
      await hooks.applyHooks('after read', targetMapping.afterread, f => f(database, expandedElements, me, reqUrl))

      elements.forEach( (elem) => {
        target = elem[expand].href;
        elem[expand].$$expanded = targetpermalinkToObject[target];
      })
      if (recurse) {
        debug('** recursing to next level of expansion : ' + recursepath);                          
        await executeSingleExpansion(db, expandedElements, targetMapping, resources, recursepath, me, reqUrl)
      } else {
        debug('** executeSingleExpansion resolving');
      }
    }
  }
  return
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

module.exports.executeExpansion = async (database, elements, mapping, resources, expand, me, reqUrl) => { // eslint-disable-line

  var paths, path, promises, i, errors;
  var deferred = Q.defer();
  debug('** executeExpansion()');
  if (expand) {
    paths = parseExpand(expand, mapping);
    if (paths && paths.length > 0) {
      const promises = paths.map( (path) => executeSingleExpansion(database, elements, mapping, resources, path, me, reqUrl) )
      const resulsts = await Q.allSettled(promises)
      debug('allSettled');
    }
  }
  return 
} 