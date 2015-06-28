/* Handles the ?expand parameter */

exports = module.exports = function(logdebug, prepare, pgExec, executeAfterReadFunctions) {
    var Q = require("q");
    var common = require('./common.js')   ;
    var cl = common.cl;
    var typeToConfig = common.typeToConfig;
    var sqlColumnNames = common.sqlColumnNames;
    var mapColumnsToObject = common.mapColumnsToObject;
    var executeOnFunctions = common.executeOnFunctions;
    
    function debug(x) {
        if(logdebug) cl(x);
    }

    // Expands a single path on an array of elements.
    // Potential improvement : when the expansion would load obejcts that are already
    // in the cluster currently loaded, re-use the loaded element, rather that querying it again.
    function executeSingleExpansion(database, elements, mapping, resources, expandpath) {
        var deferred = Q.defer();

        try {
            if(elements && elements.length > 0) {        
                var query = prepare();
                var targetkeys = [];
                var keyToElement = {};
                var firstDotIndex = expandpath.indexOf('.');
                var expand;
                var recurse;
                var recursepath;
                if(firstDotIndex == -1) {
                    expand = expandpath;
                    recurse = false;
                } else {
                    expand = expandpath.substring(0,firstDotIndex);
                    recurse = true;
                    recursepath = expandpath.substring(firstDotIndex + 1, expandpath.length);
                }
                if(mapping.map[expand] == undefined) {
                    debug('** rejecting expand value [' + expand + ']');
                    deferred.reject();
                } else {            
                    for(var i=0; i<elements.length; i++) {
                        var element = elements[i];
                        var permalink = element.$$meta.permalink;
                        var targetlink = element[expand].href;
                        var key = permalink.split('/')[2];
                        var targetkey = targetlink.split('/')[2];
                        // Remove duplicates and items that are already expanded.
                        if(targetkeys.indexOf(targetkey) == -1 && element[expand].$$expanded == undefined) {
                            targetkeys.push(targetkey);
                        }
                        keyToElement[key] = element;
                    }

                    var targetType = mapping.map[expand].references;
                    var typeToMapping = typeToConfig(resources);
                    var targetMapping = typeToMapping[targetType];
                    var table = targetMapping.type.substr(1);
                    var columns = sqlColumnNames(targetMapping);
                    var targetpermalinkToObject = {};
                    var expandedElements = [];

                    debug(table);
                    query.sql('select ' + columns + ' from "' + table + '" where key in (').array(targetkeys).sql(')');
                    pgExec(database,query).then(function(result) {
                        debug('expansion query done');
                        var rows = result.rows;
                        for(var i=0; i<rows.length; i++) {
                            var row = rows[i];
                            var expanded = {};
                            var key = row['key'];
                            mapColumnsToObject(resources, targetMapping, row, expanded);
                            executeOnFunctions(resources, targetMapping, "onread", expanded);
                            targetpermalinkToObject[targetType + '/' + key] = expanded;
                            expanded.$$meta = {permalink: mapping.type + '/' + key};
                            expandedElements.push(expanded);
                        }

                        debug('** executing afterread functions on expanded resources');
                        return executeAfterReadFunctions(database, expandedElements, targetMapping);
                    }).then(function() {
                        for(var i=0; i<elements.length; i++) {
                            var element = elements[i];
                            var targetlink = element[expand].href;
                            element[expand].$$expanded = targetpermalinkToObject[targetlink];
                        }
                        if(recurse) {
                            debug('** recursing to next level of expansion : ' + recursepath);
                            executeSingleExpansion(database,expandedElements,targetMapping,resources,recursepath,keyToElement).then(function() {
                                deferred.resolve();
                            }).fail(function(e) {
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
        } catch(e) {
            debug("** executeSingleExpansion failed : ");
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
    function parseExpand(expand, mapping) {
        var ret = [];

        var paths = expand.split(',');
        var containsFull = false;
        for(var i=0; i<paths.length; i++) {
            var path = paths[i].toLowerCase();
            if(path == 'none') {
                return [];
            } else if(path == 'full') {
                // If this was a list resource full is already handled.
            } else if(path == 'results') {
                // If this was a list resource full is already handled.
            } else {
                var prefix = 'results.';
                var index = paths[i].indexOf(prefix)
                if(index == 0) {
                    var npath = path.substr(prefix.length);
                    if(npath && npath.length > 0) {
                        debug(npath);
                        ret.push(npath);
                    }
                } else if(index == -1) {
                    ret.push(path);
                }
            }
        }    
        debug("** parseExpand() results in :");
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
    function executeExpansion(database, elements, mapping, resources, expand, executeAfterReadFunctions) {
        var deferred = Q.defer();
        debug('** executeExpansion()');
        try {    
            if(expand) {
                var paths = parseExpand(expand, mapping);
                if(paths && paths.length > 0) {
                    var promises = [];
                    for(var i=0; i<paths.length; i++) {
                        var path = paths[i];
                        promises.push(executeSingleExpansion(database, elements, mapping, resources, path));
                    }

                    Q.allSettled(promises).then(function(results) {
                        debug("allSettled :");
                        debug(results);
                        var errors = [];
                        results.forEach(function(result) {
                            if(result.state == 'rejected') {
                                errors.push(result.reason);
                            }
                        });

                        if(errors.length == 0) {
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
        } catch(e) {
            resolve.reject(e.toString());
        }

        return deferred.promise;
    }

    return executeExpansion;
}