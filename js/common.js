/* Internal utilities for sri4node */

const _ =require('lodash')

var env = require('./env.js');
var qo = require('./queryObject.js');


const pgpInitOptions = {
    // explicitly set search_path to env parameter for each fresh connection
    // needed to get heroku shared databases with schemas working
    connect(client, dc, isFresh) {
        const cp = client.connectionParameters;
        if (isFresh && env.postgresSchema) {
          client.query(`SET search_path TO ${env.postgresSchema},public;`)
        }
    }

};
const pgp = require('pg-promise')(pgpInitOptions);

const configuration = global.configuration


exports = module.exports = {
  cl: function (x) {
    'use strict';
    console.log(x); // eslint-disable-line
  },

  debug: (x) => {
    'use strict';
    if (global.configuration.logdebug) {
      exports.cl(x);
    }
  },

  errorAsCode: (s) => {
    'use strict';
    // return any string as code for REST API error object.
    var ret = s;

    ret = ret.toLowerCase().trim();
    ret = ret.replace(/[^a-z0-9 ]/gmi, '');
    ret = ret.replace(/ /gmi, '.');

    return ret;
  },

  // Converts the configuration object for roa4node into an array per resource type.
  typeToConfig: function (config) {
    'use strict';
    return config.reduce( (acc, c) => {
                acc[c.type] = c
                return acc
              }, {} )
  },

  sqlColumnNames: function (mapping) {
    'use strict';
    var columnNames = [];
    var key, j;

    for (key in mapping.map) {
      if (mapping.map.hasOwnProperty(key)) {
        columnNames.push(key);
      }
    }
    var sqlColumnNames = columnNames.indexOf('key') === -1 ? '"key",' : '';
    for (j = 0; j < columnNames.length; j++) {
      sqlColumnNames += '"' + columnNames[j] + '"';
      if (j < columnNames.length - 1) {
        sqlColumnNames += ',';
      }
    }

    return sqlColumnNames;
  },

  /* Merge all direct properties of object 'source' into object 'target'. */
  mergeObject: function (source, target) {
    'use strict';
    var key;
    for (key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key];
      }
    }
  },

  // Create a ROA resource, based on a row result from node-postgres.
  mapColumnsToObject: function (config, mapping, row, element) {
    'use strict';
    var typeToMapping = exports.typeToConfig(config);
    var key, referencedType;

    // add all mapped columns to output.
    for (key in mapping.map) {
      if (mapping.map.hasOwnProperty(key)) {
        if (mapping.map[key].references) {
          referencedType = mapping.map[key].references;
          if (row[key] !== null) {
            element[key] = {
              href: typeToMapping[referencedType].type + '/' + row[key]
            };
          } else {
            element[key] = null;
          }
        } else if (mapping.map[key].onlyinput) {
          // Skip on output !
        } else if (key.indexOf('$$meta.') === -1) {
          element[key] = row[key];
        } else {
          if (!element.$$meta) {
            element.$$meta = {};
          }
          element.$$meta[key.split('$$meta.')[1]] = row[key];
        }
      }
    }
  },

  // Execute registered mapping functions for elements of a ROA resource.
  executeOnFunctions: function (config, mapping, ontype, element) {
    'use strict';
    _.keys(mapping.map).forEach( key => {
        if (mapping.map[key][ontype]) {
          mapping.map[key][ontype](key, element);
        } 
      })
  },

  pgConnect: async function (configuration) {
    'use strict';
    var cl = exports.cl;

    // ssl=true is required for heruko.com
    // ssl=false is required for development on local postgres (Cloud9)
    var databaseUrl = env.databaseUrl;
    var dbUrl, searchPathPara;
    if (databaseUrl) {
      dbUrl = databaseUrl;
      pgp.pg.defaults.ssl = true
    } else {
      dbUrl = configuration.defaultdatabaseurl;
      pgp.pg.defaults.ssl = false
    }
    cl('Using database connection string : [' + dbUrl + ']');

    return pgp(dbUrl);
  },




  // Q wrapper for executing SQL statement on a node-postgres client.
  //
  // Instead the db object is a node-postgres Query config object.
  // See : https://github.com/brianc/node-postgres/wiki/Client#method-query-prepared.
  //
  // name : the name for caching as prepared statement, if desired.
  // text : The SQL statement, use $1,$2, etc.. for adding parameters.
  // values : An array of java values to be inserted in $1,$2, etc..
  //
  // It returns a Q promise to allow chaining, error handling, etc.. in Q-style.
  pgExec: function (db, query) {
    'use strict';
    var cl = exports.cl;
    const {sql, values} = query.toParameterizedSql()

    if (global.configuration.logsql) {
      const q = pgp.as.format(sql, values);
      cl(q);
    }

    return db.query(sql, values)
  },


  startTransaction: async (db) => {
    
    // Special double promise construction to extract tx db context and resolve/reject functions from within db.tx().
    // This is needed because db.tx() does not 'await' async functions (in which case errors within db.tx() will 
    // get lost). With this construction we can use the db tx context and thow errors which will be bubble up 
    // (in case await is used everywhere).
    
    return await (new Promise(async function(resolve, reject) {
          try {
            await db.tx( tx => {
              return (new Promise(function(resolveTx, rejectTx) {
                  resolve({tx, resolveTx: () => resolveTx('txResolved'), rejectTx: () => rejectTx('txRejected') })
              }))
            })
          } catch(err) {
            // 'txRejected' as err is expected behaviour in case rejectTx is called
            if (err!='txRejected') {
              throw err
            }
          }
    }))
  },

  getCountResult: async (tx, countquery) => {
    const [{count}] = await exports.pgExec(tx, countquery) 
    return parseInt(count, 10);
  },

  tableFromMapping: (mapping) => {
    return (mapping.table ? mapping.table : mapping.type.split('/')[mapping.type.split('/').length - 1]);
  },

  SriError: function (status, errors) {
    'use strict';
    this.obj = {
      status: status,
      body: {
        errors: errors.map( e => {
                    if (e.type == undefined) {
                      e.type = 'ERROR' // if no type is specified, set to 'ERROR'
                    }
                    return e
                  }),
        status: status
      }
    };
  },



}