/*
A query object used to allow multiple functions to annotate a common piece for SQL
independently from each other. For example : all 'query' functions in an sri4node
configuration can add pieces to the WHERE clause of a list resource.
They can all add CTEs as well, without affecting one another.
*/
exports = module.exports = {
  parameterPattern: '$?$?',

  // Creates a config object for q node-postgres prepared statement.
  // It also adds some convenience functions for handling appending of SQL and parameters.
  prepareSQL: function (name) {
    'use strict';
    return {
      name: name,
      text: '',
      params: [],
      param: function (x, noQuotes = false) {
        // Convenience function for adding a parameter to the text, it
        // automatically adds $x to the SQL text, and adds the supplied value
        // to the 'value'-array.
        this.params.push(x);
        this.text = this.text + exports.parameterPattern;
        if (noQuotes) {
          this.text += ':value'
        }

        return this;
      },
      sql: function (x) {
        // Convenience function for adding a parameter to the SQL statement.
        this.text = this.text + x;

        return this;
      },
      array: function (x) {
        var i;
        // Convenience function for adding an array of values to a SQL statement.
        // The values are added comma-separated.

        if (x && x.length && x.length > 0) {
          for (i = 0; i < x.length; i++) {
            this.param(x[i]);
            if (i < x.length - 1) {
              this.text = this.text + ',';
            }
          }
        }

        return this;
      },
      keys: function (o) {
        // Convenience function for adding all keys in an object (comma-separated)
        var columnNames = [];
        var key, j;

        for (key in o) {
          if (o.hasOwnProperty(key)) {
            columnNames.push(key);
          }
        }
        var sqlColumnNames = '';
        for (j = 0; j < columnNames.length; j++) {
          sqlColumnNames += '\"' + columnNames[j] + '\"';
          if (j < columnNames.length - 1) {
            sqlColumnNames += ',';
          }
        }
        this.text = this.text + sqlColumnNames;

        return this;
      },
      values: function (o) {
        // Convenience function for adding all values of an object as parameters.
        // Same iteration order as 'columns'.
        var key;

        var firstcolumn = true;
        for (key in o) {
          if (o.hasOwnProperty(key)) {
            if (!firstcolumn) {
              this.text += ',';
            } else {
              firstcolumn = false;
            }
            this.param(o[key]);
          }
        }

        return this;
      },
      with: function (nonrecursivequery, unionclause, recursivequery, virtualtablename) {
        // Form : select.with(nonrecursiveterm,virtualtablename)
        var tablename, cte;

        if (nonrecursivequery && unionclause && !recursivequery && !virtualtablename) {
          tablename = unionclause;
          if (this.text.indexOf('WITH RECURSIVE') === -1) {
            this.text = 'WITH RECURSIVE ' + tablename + ' AS (' + nonrecursivequery.text + ') /*LASTCTE*/ ' + this.text;
          } else {
            cte = ', ' + tablename + ' AS (' + nonrecursivequery.text + ') /*LASTCTE*/ ';
            // Do not use text.replace() as this function special uses replacement patterns which can interfere with
            // our $$meta fields.
            // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
            this.text = this.text.split('/*LASTCTE*/').join(cte);
          }
          this.params = nonrecursivequery.params.concat(this.params);
        } else
        // Format : select.with(nonrecursiveterm, 'UNION' or 'UNION ALL', recursiveterm, virtualtablename)
        if (nonrecursivequery && unionclause && nonrecursivequery && virtualtablename) {
          unionclause = unionclause.toLowerCase().trim();
          if (unionclause === 'union' || unionclause === 'union all') {
            if (this.text.indexOf('WITH RECURSIVE') === -1) {
              this.text = 'WITH RECURSIVE ' + virtualtablename +
                ' AS (' + nonrecursivequery.text + ' ' + unionclause + ' ' + recursivequery.text + ') /*LASTCTE*/ ' +
                this.text;
            } else {
              cte = ', ' + virtualtablename +
                  ' AS (' + nonrecursivequery.text + ' ' + unionclause + ' ' + recursivequery.text + ') /*LASTCTE*/ ';
              // Do not use text.replace() as this function special uses replacement patterns which can interfere with
              // our $$meta fields.
              // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
              this.text = this.text.split('/*LASTCTE*/').join(cte);
            }
            this.params = nonrecursivequery.params.concat(this.params);
            this.params = recursivequery.params.concat(this.params);
          } else {
            throw new Error('Must use UNION or UNION ALL as union-clause');
          }
          tablename = virtualtablename;
        } else {
          throw new Error('Parameter combination not supported...');
        }

        return this;
      },
      toParameterizedSql: function () {
        function debug(x) {
          if (global.sri4node_configuration.logdebug) {
            console.log(x);
          }
        }

        var text = this.text;
        var values = this.params;
        var paramCount = 1;
        if (values && values.length > 0) {
          for (var i = 0; i < values.length; i++) {
            const index = text.indexOf(exports.parameterPattern);
            if (index === -1) {
              var msg = 'Parameter count in query does not add up. Too few parameters in the query string';
              debug('** ' + msg);
              throw new Error(msg)
            } else {
              const prefix = text.substring(0, index);
              const postfix = text.substring(index + exports.parameterPattern.length, text.length);
              text = prefix + '$' + paramCount + postfix;
              paramCount++;
            }
          }
          const index = text.indexOf(exports.parameterPattern);
          if (index !== -1) {
            var msg = 'Parameter count in query does not add up. Extra parameters in the query string.';
            debug('** ' + msg);
            throw new Error(msg)
          }
        }
        return { sql: text, values: values }
      }
    };
  }
};
