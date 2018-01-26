/* Internal utilities for sri4node */

const _ = require('lodash')
const url = require('url')

var env = require('./env.js');
var qo = require('./queryObject.js');


const pgpInitOptions = {
    // explicitly set search_path to env parameter for each fresh connection
    // needed to get heroku shared databases with schemas working
    connect: (client, dc, isFresh) => {
        const cp = client.connectionParameters;
        if (isFresh && env.postgresSchema) {
          client.query(`SET search_path TO ${env.postgresSchema},public;`)
        }
    }

};
const pgp = require('pg-promise')(pgpInitOptions);

// The node pg library assumes by default that values of type 'timestamp without time zone' are in local time.
//   (a deliberate choice, see https://github.com/brianc/node-postgres/issues/429)
// In the case of sri4node storing in UTC makes more sense as input data arrives in UTC format. Therefore we 
// override the pg handler for type 'timestamp without time zone' with one that appends a 'Z' before conversion
// to a JS Date object to indicate UTC.
pgp.pg.types.setTypeParser(1114, s=>new Date(s+'Z'));


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


  urlToTypeAndKey: (urlToParse) => {
    const parsedUrl = url.parse(urlToParse);
    const pathName = parsedUrl.pathname.replace(/\/$/, '') 
    const parts = pathName.split('/')
    const type = _.initial(parts).join('/')
    const key = _.last(parts)

    return { type, key }
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

  sqlColumnNames: function (mapping, summary=false) {
    const columnNames = summary 
                          ? Object.keys(mapping.map).filter(c => ! (mapping.map[c].excludeOn === 'summary'))
                          : Object.keys(mapping.map)

    console.log('columnNames:')
    console.log(columnNames)

    return columnNames.includes('key') ? '' : '"key",' 
            + (columnNames.map( c => `"${c}"`).join(','))
            + ', "$$meta.deleted", "$$meta.created", "$$meta.modified", "$$meta.version"'
  },

  /* Merge all direct properties of object 'source' into object 'target'. */
  mergeObject: function (source, target) {
    'use strict';
    var key;
    Object.keys(source).forEach( key => target[key] = source[key] );
  },

  transformRowToObject: function (row, resourceMapping) {
    const map = resourceMapping.map
    const element = {}
    Object.keys(map).forEach( key => {
      if (map[key].references) {
        const referencedType = map[key].references;
        if (row[key] !== null) {
          element[key] = {
            href: referencedType + '/' + row[key]
          };
        } else {
          element[key] = null;
        }
      } else {
        element[key] = row[key];
      } 

      if (map[key]['columnToField']) {
        map[key]['columnToField'].forEach( f => f(key, element) );
      }         
    })

    element.$$meta = _.pickBy({ // keep only properties with defined non-null value (requires lodash - behaves different as underscores _.pick())
        deleted: row['$$meta.deleted'],
        created: row['$$meta.created'],
        modified: row['$$meta.modified'],
      })
    element.$$meta.permalink = resourceMapping.type + '/' + row.key;      
    element.$$meta.version = row['$$meta.version'];  

    // exports.debug('Transformed incoming row according to configuration');
    return element
  },

 
  transformObjectToRow: function (obj, resourceMapping) {  
    const map = resourceMapping.map
    const row = {}
    Object.keys(map).forEach( key => {
      if (map[key].references && obj[key] !== undefined) {
        const permalink = obj[key].href;
        if (!permalink) {
          throw new SriError({status: 409, errors: [{code: 'no.href.inside.reference', msg: 'No href found inside reference ' + key}]})
        }
        const expectedType = map[key].references
        const { type: refType, key: refKey } = exports.urlToTypeAndKey(permalink)
        if (refType === expectedType) {
          row[key] = refKey;
        } else {
          const msg = `Faulty reference detected [${permalink}], detected [${refType}] expected [${expectedType}].`
          exports.cl(msg);
          throw new exports.SriError({status: 409, errors: [{code: 'faulty.reference', msg: msg}]})
        }
      } else {
        if (obj[key] !== undefined) {
          row[key] = obj[key];
        } else {
          // explicitly set missing properties to null (https://github.com/katholiek-onderwijs-vlaanderen/sri4node/issues/118)
          row[key] = null
        }
      } 

      const fieldTypeDb = global.configuration.informationSchema['/' + exports.tableFromMapping(resourceMapping)][key].type
      const fieldTypeObject = resourceMapping.schema.properties[key].type
      if ( fieldTypeDb === 'jsonb' && fieldTypeObject === 'array') {
        // for this type combination we need to explicitly stringify the JSON, 
        // otherwise insert will attempt to store a postgres array which fails for jsonb
        row[key] = JSON.stringify(row[key])        
      }

      if (map[key]['fieldToColumn']) {
        map[key]['fieldToColumn'].forEach( f => f(key, row) );
      } 

    })

    // exports.debug('Transformed incoming object according to configuration');
    return row
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

  installVersionIncTriggerOnTable: async function(db, tableName) {

    const plpgsql = `
      DO $___$
      BEGIN
        -- 1. add column '$$meta.version' if not yet present
        IF NOT EXISTS (
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${tableName}'
            AND column_name = '$$meta.version'     
            ${( env.postgresSchema !== undefined
              ? `AND table_schema = '${env.postgresSchema}'`
              : '' )}
        ) THEN
          ALTER TABLE ${tableName} ADD "$$meta.version" integer DEFAULT 0;
        END IF;

        -- 2. create func vsko_resource_version_inc_function if not yet present
        IF NOT EXISTS (SELECT proname from pg_proc where proname = 'vsko_resource_version_inc_function') THEN
          CREATE FUNCTION vsko_resource_version_inc_function() RETURNS OPAQUE AS '
          BEGIN
            NEW."$$meta.version" := OLD."$$meta.version" + 1;
            RETURN NEW;
          END' LANGUAGE 'plpgsql';
        END IF;

        -- 3. create trigger 'vsko_resource_version_trigger_${tableName}' if not yet present
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'vsko_resource_version_trigger_${tableName}') THEN
            CREATE TRIGGER vsko_resource_version_trigger_${tableName} BEFORE UPDATE ON ${tableName}
            FOR EACH ROW EXECUTE PROCEDURE vsko_resource_version_inc_function();
        END IF;
      END
      $___$
      LANGUAGE 'plpgsql';
    `
    await db.query(plpgsql)
  },

  getCountResult: async (tx, countquery) => {
    const [{count}] = await exports.pgExec(tx, countquery) 
    return parseInt(count, 10);
  },

  tableFromMapping: (mapping) => {
    return (mapping.table ? mapping.table : _.last(mapping.type.split('/')) )
  },

  isEqualSriObject: (obj1, obj2, mapping) => {
  
    const compareAttr = (key, a1, a2) => {
      if (mapping.schema.properties[key].format === 'date-time') {
          return ( (new Date(a1)).getTime() === (new Date(a2)).getTime() )
        } else {  
          return (a1 === a2)
        } 
    }

    return Object.keys(mapping.map).every( key => {
      if ( ((obj1[key] === undefined) || (obj1[key] === null))
        && ((obj2[key] === undefined) || (obj2[key] === null)) ) {
        return true
      } else if ( (obj1[key] !== undefined) && (obj2[key] !== undefined) ) {
        return compareAttr(key, obj1[key], obj2[key])
      } 
    })
  },

  stringifyError: (e) => {
    if (e instanceof Error) {
      return e.toString()
    } else {
      return JSON.stringify(e)
    }
  },


  SriError: class {
    constructor({status = 500, errors = [], headers = {}}) {
      this.status = status,
      this.body = {
        errors: errors.map( e => {
                    if (e.type == undefined) {
                      e.type = 'ERROR' // if no type is specified, set to 'ERROR'
                    }
                    return e
                  }),
        status: status
      },
      this.headers = headers
    }
  }

}