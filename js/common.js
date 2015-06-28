/* Internal utilities for sri4node */

exports = module.exports = {
    cl: function(x) {
        console.log(x)
    },
    
    // Converts the configuration object for roa4node into an array per resource type.
    typeToConfig: function(config) {
        var ret = {};
        for (var i = 0; i < config.length; i++) {
            ret[config[i].type] = config[i];
        }
        return ret;
    },
    
    sqlColumnNames: function(mapping) {
        var columnNames = [];

        for (var key in mapping.map) {
            if (mapping.map.hasOwnProperty(key)) {
                columnNames.push(key);
            }
        }
        var sqlColumnNames = '"key",';
        for (var j = 0; j < columnNames.length; j++) {
            sqlColumnNames += '"' + columnNames[j] + '"';
            if (j < columnNames.length - 1) {
                sqlColumnNames += ",";
            }
        }

        return sqlColumnNames;
    },
    
    // Create a ROA resource, based on a row result from node-postgres.
    mapColumnsToObject: function(config, mapping, row, element) {
        var typeToMapping = exports.typeToConfig(config);

        // add all mapped columns to output.
        for (var key in mapping.map) {
            if (mapping.map.hasOwnProperty(key)) {
                if (mapping.map[key].references) {
                    var referencedType = mapping.map[key].references;
                    element[key] = {href: typeToMapping[referencedType].type + '/' + row[key]};
                } else if (mapping.map[key].onlyinput) {
                    // Skip on output !
                } else {
                    element[key] = row[key];
                }
            }
        }
    },
    
    // Execute registered mapping functions for elements of a ROA resource.
    executeOnFunctions: function(config, mapping, ontype, element) {
        for (var key in mapping.map) {
            if (mapping.map.hasOwnProperty(key)) {
                if (mapping.map[key][ontype]) {
                    mapping.map[key][ontype](key, element);
                }
            }
        }
    }
}