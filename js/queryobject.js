/* 
A query object used to allow multiple functions to annotate a common piece for SQL
independently from each other. For example : all 'query' functions in an sri4node
configuration can add pieces to the WHERE clause of a list resource.
They can all add CTEs as well, without affecting one another.
*/
exports = module.exports = {
    // Creates a config object for q node-postgres prepared statement.
    // It also adds some convenience functions for handling appending of SQL and parameters.
    parameterPattern: '$?$?',
    prepareSQL: function(name) {
        return {
            name: name,
            text: '',
            params: [],
            param: function(x) {
                // Convenience function for adding a parameter to the text, it
                // automatically adds $x to the SQL text, and adds the supplied value
                // to the 'value'-array.
                var index = this.params.length + 1;
                this.params.push(x);
                this.text = this.text + exports.parameterPattern;

                return this;
            },
            sql: function(x) {
                // Convenience function for adding a parameter to the SQL statement.
                this.text = this.text + x;

                return this;
            },
            array: function(x) {
                // Convenience function for adding an array of values to a SQL statement.
                // The values are added comma-separated.

                if(x && x.length && x.length > 0) {
                    for(var i=0; i< x.length; i++) {
                        this.param(x[i]);
                        if (i < (x.length - 1)) {
                            this.text = this.text + ',';
                        }
                    }
                }

                return this;
            },
            keys: function(o) {
                // Convenience function for adding all keys in an object (comma-separated)
                var columnNames = [];

                for (var key in o) {
                    if (o.hasOwnProperty(key)) {
                        columnNames.push(key);
                    }
                }
                var sqlColumnNames = '';
                for (var j = 0; j < columnNames.length; j++) {
                    sqlColumnNames += columnNames[j];
                    if (j < columnNames.length - 1) {
                        sqlColumnNames += ",";
                    }
                }
                this.text = this.text + sqlColumnNames;

                return this;
            },
            values: function(o) {
                // Convenience function for adding all values of an object as parameters.
                // Same iteration order as 'columns'.
                var firstcolumn = true;
                for (var key in o) {
                    if (o.hasOwnProperty(key)) {
                        if(!firstcolumn) {
                            this.text += ",";
                        } else {
                            firstcolumn = false;
                        }
                        this.param(o[key]);
                    }
                }

                return this;
            },
            with: function(query, virtualtablename) {
                if(this.text.indexOf('WITH') == -1) {
                    this.text = 'WITH ' + virtualtablename + ' AS (' + query.text + ') /*LASTCTE*/ ' + this.text;
                } else {
                    var cte = ', ' + virtualtablename + ' AS (' + query.text + ') /*LASTCTE*/ ';
                    this.text = this.text.replace('/*LASTCTE*/',cte);
                }
                this.params = query.params.concat(this.params);

                return this;
            }
        }
    }
}