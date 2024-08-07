/* Internal utilities for sri4node */

const _ = require('lodash')
const url = require('url')
const EventEmitter = require('events');
const pEvent = require('p-event');

const env = require('./env.js');

const { Readable } = require('stream')
const httpContext = require('express-http-context');

let pgp = null; // will be initialized at pgConnect

exports = module.exports = {
  cl: function (x) {
    'use strict';
    console.log(x); // eslint-disable-line
  },

  debug: (x) => {
    'use strict';
    if (global.sri4node_configuration===undefined || global.sri4node_configuration.logdebug) {
      const reqId = httpContext.get('reqId');
      console.log(reqId ? `[reqId:${reqId}] ${x}` : x);
    }
  },

  error: (x) => {
    const reqId = httpContext.get('reqId');
    console.error(reqId ? `[reqId:${reqId}] ${x}` : x);
  },


  urlToTypeAndKey: (urlToParse) => {
    if (typeof urlToParse !== 'string') {
      throw 'urlToTypeAndKey requires a string argument instead of ' + urlToParse
    }
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

  typeToMapping: function (type) {
      return exports.typeToConfig(global.sri4node_configuration.resources)[type]
  },

  sqlColumnNames: function (mapping, summary=false) {
    const columnNames = summary 
                          ? Object.keys(mapping.map).filter(c => ! (mapping.map[c].excludeOn !== undefined && mapping.map[c].excludeOn.toLowerCase() === 'summary'))
                          : Object.keys(mapping.map)

    return (columnNames.includes('key') ? '' : '"key",')
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
    element.$$meta = {}
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
        if (key.startsWith('$$meta.')) {
          element['$$meta'][key.split('$$meta.')[1]] = row[key]
        } else {
          element[key] = row[key];          
        }
      } 

      if (map[key]['columnToField']) {
        map[key]['columnToField'].forEach( f => f(key, element) );
      }         
    })

    Object.assign(element.$$meta, _.pickBy({ 
        // keep only properties with defined non-null value (requires lodash - behaves different as underscores _.pick())
        deleted: row['$$meta.deleted'],
        created: row['$$meta.created'],
        modified: row['$$meta.modified'],
      }))
    element.$$meta.permalink = resourceMapping.type + '/' + row.key;     
    element.$$meta.version = row['$$meta.version'];  

    // exports.debug('Transformed incoming row according to configuration');
    return element
  },

 
  transformObjectToRow: function (obj, resourceMapping, isNewResource) {  
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

      if (map[key]['fieldToColumn']) {
        map[key]['fieldToColumn'].forEach( f => f(key, row, isNewResource) );
      } 

      const fieldTypeDb = global.sri4node_configuration.informationSchema['/' + exports.tableFromMapping(resourceMapping)][key].type
      const fieldTypeObject = resourceMapping.schema.properties[key] 
                                  ? resourceMapping.schema.properties[key].type
                                  : null
      if ( fieldTypeDb === 'jsonb' && fieldTypeObject === 'array') {
        // for this type combination we need to explicitly stringify the JSON, 
        // otherwise insert will attempt to store a postgres array which fails for jsonb
        row[key] = JSON.stringify(row[key])        
      }

    })

    // exports.debug('Transformed incoming object according to configuration');
    return row
  },


  pgInit: async function (pgpInitOptionsIn = {}) {
    const pgpInitOptions = {
        schema: process.env.POSTGRES_SCHEMA,
        ...pgpInitOptionsIn,
    };

    pgp = require('pg-promise')(pgpInitOptions);
    if (process.env.PGP_MONITOR === 'true') {
      const monitor = require('pg-monitor');
      monitor.attach(pgpInitOptions);
    }

    // The node pg library assumes by default that values of type 'timestamp without time zone' are in local time.
    //   (a deliberate choice, see https://github.com/brianc/node-postgres/issues/429)
    // In the case of sri4node storing in UTC makes more sense as input data arrives in UTC format. Therefore we 
    // override the pg handler for type 'timestamp without time zone' with one that appends a 'Z' before conversion
    // to a JS Date object to indicate UTC.
    pgp.pg.types.setTypeParser(1114, s=>new Date(s+'Z'));

    pgp.pg.types.setTypeParser(1184, s => {
        const match = s.match(/\.\d\d\d(\d{0,3})\+/);
        let microseconds = '';
        if (match !== null) {
          microseconds = match[1];
        }

        const isoWithoutMicroseconds = (new Date(s)).toISOString();
        const isoWithMicroseconds = isoWithoutMicroseconds.substring(0, isoWithoutMicroseconds.length - 1)
                                        + microseconds + 'Z';
        return isoWithMicroseconds;
      });
  },

  pgConnect: async function (arg) {
    // pgConnect can be called with the database url as argument of the sri4configuration object
    const cl = exports.cl;
    let dbUrl, ssl, sri4nodeConfig;
    
    if (typeof arg === 'string') {
      // arg is the connection string
      dbUrl = arg;
    } else {
      // arg is sri4node configuration object
      sri4nodeConfig = arg;
      if (pgp === null) {
        pgpInitOptions = {} 
        if (sri4nodeConfig.dbConnectionInitSql !== undefined) {
          pgpInitOptions.connect = (client, dc, isFresh) => {
                if (isFresh) {
                  client.query(sri4nodeConfig.dbConnectionInitSql);
                }
            };
        } 
        this.pgInit(pgpInitOptions);
      }
      if (process.env.DATABASE_URL) {
        dbUrl = process.env.DATABASE_URL;
      } else {
        dbUrl = configsri4nodeConfiguration.defaultdatabaseurl;
      }      
    }

    cl('Using database connection string : [' + dbUrl + ']');

    // ssl=true is required for heruko.com
    // ssl=false is required for development on local postgres (Cloud9)
    if (dbUrl.indexOf('ssl=false') === -1) {
      ssl = { rejectUnauthorized: false } 
      // recent pg 8 deprecates implicit disabling of certificate verification 
      //   and heroku does not provide for their  CA files or certificate for your Heroku Postgres server
      //   (see https://help.heroku.com/3DELT3RK/why-can-t-my-third-party-utility-connect-to-heroku-postgres-with-ssl)
      //   ==> need for explicit disabling of rejectUnauthorized
    } else {
      ssl = false
    }    

    let cn = {
       connectionString: dbUrl,
       ssl: ssl,
       connectionTimeoutMillis: process.env.PGP_CONN_TIMEOUT || 2000,
       idleTimeoutMillis: process.env.PGP_IDLE_TIMEOUT || 1000,
       max: process.env.PGP_POOL_SIZE || (sri4nodeConfig !== undefined && sri4nodeConfig.maxConnections) || 16,
    }

    return pgp(cn);
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

    if (global.sri4node_configuration.logsql) {
      const q = pgp.as.format(sql, values);
      cl(q);
    }

    return db.query(sql, values)
  },

  startTransaction: async (db, mode = new pgp.txMode.TransactionMode()) => {
    exports.debug('++ Starting database transaction.');  

    const emitter = new EventEmitter()  

    const txWrapper = async (emitter) => {
      // This wrapper run async without being awaited. This has some consequences:
      //   * errors are not passed the usual way, but via the 'tDone' event
      //   * exports.debug() does not log the correct reqId      
      try {
        await db.tx( {mode},  async tx => {
          emitter.emit('txEvent', tx)
          const how = await pEvent(emitter, 'terminate')
          if (how === 'reject') {
            throw 'txRejected'
          }
        })
        emitter.emit('txDone')
      } catch(err) {
        // 'txRejected' as err is expected behaviour in case rejectTx is called
        if (err!='txRejected') {
          emitter.emit('txDone', err)
        } else {
          emitter.emit('txDone')
        }      
      }
    }

    try {
      const tx = await new Promise(function(resolve, reject) {
        let resolved = false
        emitter.on('txEvent', (tx) => {
          resolve(tx);
          resolved = true;
        });
        emitter.on('txDone', (err) => {
          // ignore undefined error, happens at 
          if (!resolved) {
            console.log('GOT ERROR:')
            console.log(err)
            console.log(JSON.stringify(err));
            reject(err);
          }
        });
        txWrapper(emitter);
      });
      exports.debug('Got db tx object.');

      await tx.none('SET CONSTRAINTS ALL DEFERRED;');

      const terminateTx = (how) => async () => {
          if (how !== 'reject') {
            await tx.none('SET CONSTRAINTS ALL IMMEDIATE;');
          }
          emitter.emit('terminate', how)
          const res = await pEvent(emitter, 'txDone')
          if (res !== undefined) {
            throw res
          }
      }

      return ({ tx, resolveTx: terminateTx('resolve'), rejectTx: terminateTx('reject') })
    } catch (err) {
      exports.debug('CATCHED ERROR: ');  
      exports.debug(JSON.stringify(err));  
      throw new exports.SriError({status: 503, errors: [{code: 'too.busy', msg: 'The request could not be processed as the database is too busy right now. Try again later.'}]})
    }      
  },


  startTask: async (db) => {
    exports.debug('++ Starting database task.');  

    const emitter = new EventEmitter()  

    const taskWrapper = async (emitter) => {
      // This wrapper run async without being awaited. This has some consequences:
      //   * errors are not passed the usual way, but via the 'tDone' event
      //   * exports.debug() does not log the correct reqId
      try {
        await db.task( async t => {
          emitter.emit('tEvent', t)
          await pEvent(emitter, 'terminate')
        })
        emitter.emit('tDone')
      } catch(err) {
        emitter.emit('tDone', err)
      }
    }

    try {
      const t = await new Promise(function(resolve, reject) {
        emitter.on('tEvent', (t) => {
          resolve(t);
        });
        emitter.on('tDone', (err) => {
          reject(err);
        });
        taskWrapper(emitter);
      });
      exports.debug('Got db t object.');  

      const endTask = async () => {
          emitter.emit('terminate')
          const res = await pEvent(emitter, 'tDone')
          exports.debug('db task done.');  
          if (res !== undefined) {
            throw res
          }
      }

      return ({ t, endTask: endTask })
    } catch (err) {
      exports.debug('CATCHED ERROR: ');  
      exports.debug(JSON.stringify(err));  
      throw new exports.SriError({status: 503, errors: [{code: 'too.busy', msg: 'The request could not be processed as the database is too busy right now. Try again later.'}]})
    }
  },

  installVersionIncTriggerOnTable: async function(db, tableName) {

    const tgname = `vsko_resource_version_trigger_${( env.postgresSchema !== undefined ? env.postgresSchema : '' )}_${tableName}`

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
          ALTER TABLE "${tableName}" ADD "$$meta.version" integer DEFAULT 0;
        END IF;

        -- 2. create func vsko_resource_version_inc_function if not yet present
        IF NOT EXISTS (SELECT proname from pg_proc p INNER JOIN pg_namespace ns ON (p.pronamespace = ns.oid)
                        WHERE proname = 'vsko_resource_version_inc_function'
                        ${( env.postgresSchema !== undefined
                          ? `AND nspname = '${env.postgresSchema}'`
                          : `AND nspname = ''` )}
                      ) THEN
          CREATE FUNCTION vsko_resource_version_inc_function() RETURNS OPAQUE AS '
          BEGIN
            NEW."$$meta.version" := OLD."$$meta.version" + 1;
            RETURN NEW;
          END' LANGUAGE 'plpgsql';
        END IF;

        -- 3. create trigger 'vsko_resource_version_trigger_${tableName}' if not yet present
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${tgname}') THEN
            CREATE TRIGGER ${tgname} BEFORE UPDATE ON "${tableName}"
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
    const relevantProperties = Object.keys(mapping.schema.properties)

    function customizer(val, key, obj) {
      if (mapping.schema.properties[key] && mapping.schema.properties[key].format === 'date-time') {
        return (new Date(val)).getTime();
      }
    }

    const o1 =_.cloneDeepWith(_.pickBy(obj1, (val, key) => {
      return (val!==null && val!=undefined && relevantProperties.includes(key))
    }), customizer)
    const o2 =_.cloneDeepWith(_.pickBy(obj2, (val, key) => {
      return (val!==null && val!=undefined && relevantProperties.includes(key))
    }), customizer)

    return _.isEqualWith(o1, o2);
  },

  stringifyError: (e) => {
    if (e instanceof Error) {
      return e.toString()
    } else {
      return JSON.stringify(e)
    }
  },

  settleResultsToSriResults: (results) => {
    return results.map(res => {
        if (res.isFulfilled) {
          return res.value
        } else {
          const err = res.reason
          if (err instanceof exports.SriError) {
            return err
          } else {      
            exports.error('____________________________ E R R O R (settleResultsToSriResults)_________________________') 
            exports.error(exports.stringifyError(err))
            exports.error('STACK:')
            exports.error(err.stack)            
            exports.error('___________________________________________________________________________________________') 
            return new exports.SriError({status: 500, errors: [{code: 'internal.server.error', msg: `Internal Server Error. [${exports.stringifyError(err)}]`}]})
          }
        }
      });    
  },

  createReadableStream: (objectMode = true) => {
    const s = new Readable({ objectMode })
    s._read = function () {}
    return s
  },

  getPersonFromSriRequest: (sriRequest) => {
    // A userObject of null happens when the use is (not yet) logged in
    return (sriRequest.userObject ? '/persons/' + sriRequest.userObject.uuid : 'NONE')
  },

  SriError: class {
    constructor({status = 500, errors = [], headers = {}, document}) {
      this.status = status,
      this.body = {
        errors: errors.map( e => {
                    if (e.type == undefined) {
                      e.type = 'ERROR' // if no type is specified, set to 'ERROR'
                    }
                    return e
                  }),
        status: status,
        document: document
      },
      this.headers = headers
    }
  }

}