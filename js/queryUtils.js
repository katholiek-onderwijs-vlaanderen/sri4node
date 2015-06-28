/* External query utilities. use in the 'query' section of your sri4node configuration */
var Q = require("q");
var utils = require('./common.js')   ;
var cl = utils.cl;

exports = module.exports = {
    filterHrefs : function (value, query) {
        var deferred = Q.defer();
        try {
            var permalinks, keys, i;

            if (value) {
                permalinks = value.split(",");
                keys = [];
                var reject = false;
                for (i = 0; i < permalinks.length; i++) {
                    var key = permalinks[i].split('/')[2];
                    if(key.length == 36) {
                        keys.push(key);
                    } else {
                        deferred.reject({ code: "parameter." + param + ".invalid.value" });
                        reject = true;
                        break;
                    }
                }
                if(!reject) {
                    query.sql(' and key in (').array(keys).sql(') ');
                    deferred.resolve();
                }
            }
        } catch(error) {
            cl(error.stack);
            deferred.reject({ code: 'internal.error', description: error.toString() });
        }

        return deferred.promise;
    },

    // filterReferencedType('/persons','person')
    filterReferencedType : function (resourcetype, columnname) {
        return function (value, query) {
            var deferred = Q.defer();

            var permalinks, keys, i;

            if (value) {
                permalinks = value.split(",");
                keys = [];
                var reject = false;
                for (i = 0; i < permalinks.length; i++) {
                    if(permalinks[i].indexOf(resourcetype + "/") === 0) {
                        var key = permalinks[i].substr(resourcetype.length + 1);
                        if(key.length == 36) {
                            keys.push(key);
                        } else {
                            deferred.reject({ code: "parameter.invalid.value" });
                            reject = true;
                            break;
                        }
                    } else {
                        deferred.reject({ code: "parameter.invalid.value" });
                        reject = true;
                        break;
                    }
                }
                if(!reject) {
                    query.sql(' and "' + columnname + '" in (').array(keys).sql(') ');
                    deferred.resolve();
                }
            }

            return deferred.promise;
        }
    },

    filterILike: function(columnname) {
        return function(value, select) {
            var deferred = Q.defer();

            if (value) {
                var values = value.split(',');
                select.sql(' AND (');
                for(var i=0; i<values.length; i++) {
                    if(i>0) select.sql(' OR ');
                    select.sql('"' + columnname + '" ILIKE ').param('%' + values[i] + '%');
                }
                select.sql(') ');
                deferred.resolve();
            } else {
                deferred.resolve();
            }

            return deferred.promise;
        }
    },

    filterIn: function(columnname) {
        return function(value, select) {
            var deferred = Q.defer();

            if(value) {
                var values = value.split(',');
                select.sql(' AND "' + columnname + '" IN (').array(values).sql(') ');
                deferred.resolve();
            } else {
                deferred.resolve();
            }

            return deferred.promise;
        }
    }    
}