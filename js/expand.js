/* Handles the ?expand parameter */

const _ = require('lodash')
const pMap = require('p-map');


const hooks = require('./hooks.js')
const { debug, cl, typeToConfig, sqlColumnNames, transformRowToObject, 
        executeOnFunctions, tableFromMapping, pgExec, SriError } = require('./common.js');
const queryobject = require('./queryObject.js');
const prepare = queryobject.prepareSQL; 

'use strict';

async function executeSecureFunctionsOnExpandedElements(db, expandedElements, targetMapping, me) {
  if (targetMapping.secure && targetMapping.secure.length) {
    const batch = expandedElements.map( e => ({ 
                        href: e.$$meta.permalink,
                        verb: 'GET'
                      }) )
    return (await pMap(targetMapping.secure, (fun) => fun(db, me, batch) ))
  } else {
    return []
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
// async function executeSingleExpansion(db, elements, mapping, resources, expandpath, me, reqUrl) {

async function executeSingleExpansion(db, sriRequest, elements, mapping, resources, expandpath) {
  // console.log(expandpath)
  if (elements && elements.length > 0) {
    const { expand, recurse, recursepath } = checkRecurse(expandpath)
    if (!mapping.map[expand]) {
      debug('trace', 'expand - rejecting expand value [' + expand + ']');
      throw new SriError({status: 404, errors: [{code: 'expansion.failed', msg: `Cannot expand [${expand}] because it is not mapped.`}]})
    } else {
      const keysToExpand = elements.reduce( 
          (acc, element) => {
            if (element[expand]!=undefined) { // ignore if undefined
              const targetlink = element[expand].href;
              const targetkey = _.last(targetlink.split('/'))
              // Don't add already included and items that are already expanded.
              if (!acc.includes(targetkey) && !element[expand].$$expanded) {
                acc.push(targetkey);
              }
            }
            return acc
          }, [])

      if (keysToExpand.length > 0) {
        const targetType = mapping.map[expand].references;
        const typeToMapping = typeToConfig(resources);
        const targetMapping = typeToMapping[targetType];
        if (targetMapping === undefined) {
          throw new SriError({status: 400, errors: [{code: 'expand.across.boundary', msg: 'Only references to resources defined in the same sri4node configuration as the referer can be expanded.'}]})
        }
        const table = tableFromMapping(targetMapping)
        const columns = sqlColumnNames(targetMapping);

        const query = prepare();
        query.sql(`select ${columns} from "${table}" where key in (`).array(keysToExpand).sql(')');
        const rows = await pgExec(db, query)
        debug('trace', 'expand - expansion query done');

        const expandedElements = rows.map( row => {
            const element = transformRowToObject(row, targetMapping) 
            element['$$meta'].type = mapping.metaType;
            return element;
          })
        const expandedElementsDict = _.fromPairs(expandedElements.map( obj => ([ obj.$$meta.permalink, obj ])))

        debug('trace', 'expand - executing afterRead functions on expanded resources');
        await hooks.applyHooks( 'after read'
                              , targetMapping.afterRead
                              , f => f( db, sriRequest, 
                                        expandedElements.map( e => 
                                            ({ permalink: e.$$meta.permalink, incoming: null, stored: e }) )
                                      )
                              )

        // put expanded elements in place
        elements.forEach( (elem) => {
          if (elem[expand] !== undefined && elem[expand] !== null) {
            permalinkToExpand = elem[expand].href;
            elem[expand].$$expanded = expandedElementsDict[permalinkToExpand];
          } 
        })
              
        if (recurse) {
          debug('trace', 'expand - recursing to next level of expansion : ' + recursepath);
          await executeSingleExpansion(db, sriRequest, expandedElements, targetMapping, resources, recursepath);
        } else {
          debug('trace', 'expand - executeSingleExpansion resolving');
        }
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
  const paths = expand.split(',');

  let ret;
  if (paths.map( p => p.toLowerCase() ).includes('none')) {
    ret = []
  } else {
    ret = paths.filter( p => ! [ 'full', 'summary', 'results' ].includes(p.toLowerCase()) ) // 'full', 'results' are already handled
               .map( p => p.replace(/^results\./, '') )
  }

  debug('trace', `expand - parseExpand() results in : ${ret}`);

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

module.exports.executeExpansion = async (db, sriRequest, elements, mapping) => { // eslint-disable-line
  const expand = sriRequest.query.expand

  const resources = global.sri4node_configuration.resources

  debug('trace', 'expand - executeExpansion()');
  if (expand) {
    const paths = parseExpand(expand, mapping);
    if (paths && paths.length > 0) {
      const expandedElements = elements.map( element => element.$$expanded || element );
      const results = await pMap(paths, (path) => executeSingleExpansion(db, sriRequest, expandedElements, mapping, resources, path) )
      debug('trace', 'expand - expansion done');
    }
  }
  return 
} 

