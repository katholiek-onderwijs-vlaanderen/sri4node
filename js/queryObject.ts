const { error } = require('./common');
import { TPreparedSql } from './typeDefinitions';
/*
A query object used to allow multiple functions to annotate a common piece for SQL
independently from each other. For example : all 'query' functions in an sri4node
configuration can add pieces to the WHERE clause of a list resource.
They can all add CTEs as well, without affecting one another.
*/

const parameterPattern = '$?$?';

export default function prepareSQL(name?:string):TPreparedSql {
  return {
    name,
    text: '',
    params: [] as Array<string| number | boolean>,
    param(x, noQuotes = false) {
      // Convenience function for adding a parameter to the text, it
      // automatically adds $x to the SQL text, and adds the supplied value
      // to the 'value'-array.
      this.params.push(x);
      this.text += parameterPattern;
      if (noQuotes) {
        this.text += ':value';
      }

      return this;
    },
    sql(x:string) {
      // Convenience function for adding a parameter to the SQL statement.
      this.text += x;

      return this;
    },
    array(x:Array<string | number | boolean>) {
      // Convenience function for adding an array of values to a SQL statement.
      // The values are added comma-separated.

      if (x && x.length && x.length > 0) {
        for (let i = 0; i < x.length; i++) {
          this.param(x[i]);
          if (i < x.length - 1) {
            this.text += ',';
          }
        }
      }

      return this;
    },
    keys(o) {
      // Convenience function for adding all keys in an object (comma-separated)
      const columnNames:string[] = [];
      let key;
      let j;

      for (key in o) {
        if (o.hasOwnProperty(key)) {
          columnNames.push(key);
        }
      }
      let sqlColumnNames = '';
      for (j = 0; j < columnNames.length; j++) {
        sqlColumnNames += `\"${columnNames[j]}\"`;
        if (j < columnNames.length - 1) {
          sqlColumnNames += ',';
        }
      }
      this.text += sqlColumnNames;

      return this;
    },
    values(o) {
      // Convenience function for adding all values of an object as parameters.
      // Same iteration order as 'columns'.
      let key;

      let firstcolumn = true;
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
    with(nonrecursivequery, unionclause, recursivequery, virtualtablename) {
      // Form : select.with(nonrecursiveterm,virtualtablename)
      let tablename; let cte; let
        countParamsInCurrentCtes = 0;

      if (nonrecursivequery && unionclause && !recursivequery && !virtualtablename) {
        tablename = unionclause;
        if (this.text.indexOf('WITH RECURSIVE') === -1) {
          this.text = `WITH RECURSIVE ${tablename} AS (${nonrecursivequery.text}) /*LASTCTE*/ ${this.text}`;
        } else {
          cte = `, ${tablename} AS (${nonrecursivequery.text}) /*LASTCTE*/ `;
          // Do not use text.replace() as this function special uses replacement patterns which can
          // interfere with our $$meta fields.
          // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
          const textSplitted = this.text.split('/*LASTCTE*/');
          countParamsInCurrentCtes = (textSplitted[0].match(/\$\?\$\?/g) || []).length;
          this.text = textSplitted.join(cte);
        }
        this.params.splice(countParamsInCurrentCtes, 0, ...nonrecursivequery.params);
      } else
      // Format : select.with(nonrecursiveterm, 'UNION' or 'UNION ALL', recursiveterm, virtualtablename)
      if (nonrecursivequery && unionclause && nonrecursivequery && virtualtablename) {
        unionclause = unionclause.toLowerCase().trim();
        if (unionclause === 'union' || unionclause === 'union all') {
          if (this.text.indexOf('WITH RECURSIVE') === -1) {
            this.text = `WITH RECURSIVE ${virtualtablename
            } AS (${nonrecursivequery.text} ${unionclause} ${recursivequery.text}) /*LASTCTE*/ ${
              this.text}`;
          } else {
            cte = `, ${virtualtablename
            } AS (${nonrecursivequery.text} ${unionclause} ${recursivequery.text}) /*LASTCTE*/ `;
            // Do not use text.replace() as this function special uses replacement patterns which
            // can interfere with our $$meta fields.
            // See https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replace
            const textSplitted = this.text.split('/*LASTCTE*/');
            countParamsInCurrentCtes = (textSplitted[0].match(/\$\?\$\?/g) || []).length;
            this.text = textSplitted.join(cte);
          }
          this.params.splice(
            countParamsInCurrentCtes, 0, ...nonrecursivequery.params.concat(recursivequery.params)
          );
        } else {
          throw new Error('Must use UNION or UNION ALL as union-clause');
        }
        tablename = virtualtablename;
      } else {
        throw new Error('Parameter combination not supported...');
      }

      return this;
    },
    toParameterizedSql():{ sql: string, values: Array<any> } {
      let { text } = this;
      const values = this.params;
      let paramCount = 1;
      if (values && values.length > 0) {
        for (let i = 0; i < values.length; i++) {
          const index = text.indexOf(parameterPattern);
          if (index === -1) {
            const msg = 'Parameter count in query does not add up. Too few parameters in the query string';
            error(`** ${msg}`);
            throw new Error(msg);
          } else {
            const prefix = text.substring(0, index);
            const postfix = text.substring(index + parameterPattern.length, text.length);
            text = `${prefix}$${paramCount}${postfix}`;
            paramCount += 1;
          }
        }
        const index = text.indexOf(parameterPattern);
        if (index !== -1) {
          const msg = 'Parameter count in query does not add up. Extra parameters in the query string.';
          error(`** ${msg}`);
          throw new Error(msg);
        }
      }
      return { sql: text, values };
    },
    appendQueryObject(queryObject2) {
      this.text += queryObject2.text;
      this.params.push(...queryObject2.params);

      return this;
    },
  };
}
