/* Internal utilities for sri4node */

const _ = require('lodash')
const url = require('url')
const EventEmitter = require('events');
const pEvent = require('p-event');
const path = require('path');

const env = require('./env.js');

const { Readable } = require('stream')
const httpContext = require('express-http-context');

process.env.TIMER = true; //eslint-disable-line
const emt = require('express-middleware-timer');

let pgp = null; // will be initialized at pgConnect

const logBuffer = {};


exports = module.exports = {
  cl: function (x) {
    'use strict';
    console.log(x); // eslint-disable-line
  },

  installEMT: (app) => {
    app.use(emt.init(function emtReporter(req, res) {
    }));
    return emt;
  },

  emtReportToServerTiming: (req, res, sriRequest) => {
      const report = emt.calculate(req, res);
      const timerLogs = Object.keys(report.timers).forEach(timer => {
        const duration = report.timers[timer]['took']
        if (duration > 0 && timer !== 'express-wrapper') {
            exports.setServerTimingHdr(sriRequest, timer, duration);
        }
      });
  },

  createDebugLogConfigObject: (logdebug) => {
    if (logdebug === true) {
        // for backwards compability
        console.warn(
            '\n\n\n------------------------------------------------------------------------------------------------------------------\n' +
            'The logdebug parameter has changed format. Before, debug logging was enabled by specifying the boolean value \'true\'.\n' +
            'Now you need to provide a string with all the logchannels for which you want to receive debug logging (see the\n' +
            'sri4node documentation for more details ). For now "general,trace,requests,server-timing" is set as sensible default, \n' +
            'but please specify the preferred channels for which logging is requested.\n' +
            '------------------------------------------------------------------------------------------------------------------\n\n\n'
            )
        return { channels: new Set(['general', 'trace', 'requests', 'server-timing']) }
    } else if (logdebug === false) {
        return { channels: new Set() }
    } else {
        const tempLogDebug = { channels: logdebug.channels === 'all' ? 'all' : new Set(logdebug.channels) }
        if (logdebug.statuses) {
            tempLogDebug.statuses =  new Set(logdebug.statuses)
        }
        return tempLogDebug;
    }
  },

  handleRequestDebugLog: (status) => {
      const reqId = httpContext.get('reqId');
      if (global.sri4node_configuration.logdebug.statuses.has(status)) {
        logBuffer[reqId].forEach( e => console.log(e) );
      }
      delete logBuffer[reqId];
  },

  debug: (channel, x) => {
    if (global.sri4node_configuration===undefined || 
          (global.sri4node_configuration.logdebug && (
              global.sri4node_configuration.logdebug.channels==='all' ||
              global.sri4node_configuration.logdebug.channels.has(channel)) ) )
    {
      const reqId = httpContext.get('reqId');
      const msg = `${(new Date()).toISOString()} ${reqId ? `[reqId:${reqId}]` : ""}[${channel}] ${typeof x === 'function' ? x() : x}`
      if (reqId !== undefined) {
          if (global.sri4node_configuration.logdebug.statuses !== undefined) {
            logBuffer[reqId] ? logBuffer[reqId].push(msg) : logBuffer[reqId] = [ msg ];
          } else {
            console.log(msg);
          }
      } else {
        console.log(msg);
      }
    }
  },

  error: function() {
    const reqId = httpContext.get('reqId');
    if (reqId) {
        console.error(`[reqId:${reqId}]`, ...arguments);
    } else {
        console.error(...arguments);
    }
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


// 2 functions below are COPIED FROM beveiliging_nodejs --> TODO: remove them there and use the version here

// Unfortunatly we seems to have generated invalid UUIDs in the past.
// (we even have uuids with invalid version like /organisations/efeb7119-60e4-8bd7-e040-fd0a059a2c55)
// Therefore we cannot use a strict uuid checker like the npm module 'uuid-validate' but do we have to be less strict.
  isUuid: (uuid) => (uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) != null),

  parseResource: (u) => {
    if (!u) {
      return null;
    }
  
    const [u1, comment] = (u.includes('#'))
      ? u.split('#/')
      : [u, null];
  
    if (u1.includes('?')) {
      const splittedUrl = u1.split('?');
      return {
        base: splittedUrl[0],
        id: null,
        query: splittedUrl[1],
        comment,
      };
    }
    const pp = path.parse(u1);
    if (exports.isUuid(pp.name)) {
      return {
        base: pp.dir,
        id: pp.name,
        query: null,
        comment,
      };
    }
    return {
      base: `${(pp.dir !== '/' ? pp.dir : '')}/${pp.name}`,
      id: null,
      query: null,
      comment,
    };
  },
  



  errorAsCode: (s) => {
    'use strict';
    // return any string as code for REST API error object.
    var ret = s;

    ret = ret.replace(/".*"/, '');

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

      const fieldTypeDb = global.sri4node_configuration.informationSchema[resourceMapping.type][key].type
      const fieldTypeObject = resourceMapping.schema.properties[key] 
                                  ? resourceMapping.schema.properties[key].type
                                  : null
      if ( fieldTypeDb === 'jsonb' && fieldTypeObject === 'array') {
        // for this type combination we need to explicitly stringify the JSON, 
        // otherwise insert will attempt to store a postgres array which fails for jsonb
        row[key] = JSON.stringify(row[key])
      }

    })

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

    if (global.sri4node_configuration && global.sri4node_configuration.pgMonitor===true) {
        const monitor = require('pg-monitor');
        monitor.attach(pgpInitOptions);
    };

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

    pgp.pg.types.setTypeParser(20, BigInt);
    pgp.pg.types.setTypeParser(1700, function(val) {
        return parseFloat(val);
    });
    BigInt.prototype.toJSON = function() { return this.toString() };
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
          pgpInitOptions.connect = (client, dc, useCount) => {
                if (useCount===0) {
                  client.query(sri4nodeConfig.dbConnectionInitSql);
                }
            };
        } 
        exports.pgInit(pgpInitOptions);
      }
      if (process.env.DATABASE_URL) {
        dbUrl = process.env.DATABASE_URL;
      } else {
        dbUrl = sri4nodeConfig.defaultdatabaseurl;
      }      
    }

    if (dbUrl === undefined) {
        exports.error('FATAL: database configuration is missing !');
        process.exit(1)
    }


    // ssl=true is required for heruko.com
    // ssl=false is required for development on local postgres (Cloud9)
    if (dbUrl.indexOf('ssl=false') === -1) {
      ssl = { rejectUnauthorized: false } 
      // recent pg 8 deprecates implicit disabling of certificate verification 
      //   and heroku does not provide for their  CA files or certificate for your Heroku Postgres server
      //   (see https://help.heroku.com/3DELT3RK/why-can-t-my-third-party-utility-connect-to-heroku-postgres-with-ssl)
      //   ==> need for explicit disabling of rejectUnauthorized
    } else {
      dbUrl = dbUrl.replace('ssl=false', '').replace(/\?$/, '');
      ssl = false
    }    

    let cn = {
       connectionString: dbUrl,
       ssl: ssl,
       connectionTimeoutMillis: process.env.PGP_CONN_TIMEOUT || 2000,
       idleTimeoutMillis: process.env.PGP_IDLE_TIMEOUT || 14400000, // 4 hours
       max: process.env.PGP_POOL_SIZE || (sri4nodeConfig !== undefined && sri4nodeConfig.maxConnections) || 16,
    }

    cl('Using database connection object : [' + JSON.stringify(cn) + ']');

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
  pgExec: async function (db, query, sriRequest=null) {
    const {sql, values} = query.toParameterizedSql()

    exports.debug('sql', () => pgp.as.format(sql, values));

    const hrstart = process.hrtime();
    const result = await db.query(sql, values);
    const hrend = process.hrtime(hrstart);
    if (sriRequest) {
        exports.setServerTimingHdr(sriRequest, 'db', hrend[0]*1000 + hrend[1] / 1000000);
    }

    return result;
  },

  pgResult: async function (db, query, sriRequest=null) {
    const {sql, values} = query.toParameterizedSql()

    exports.debug('sql', () => pgp.as.format(sql, values));

    const hrstart = process.hrtime();
    const result = await db.result(sql, values) 
    const hrend = process.hrtime(hrstart);
    if (sriRequest) {
        exports.setServerTimingHdr(sriRequest, 'db', hrend[0]*1000 + hrend[1] / 1000000);
    }

    return result;
  },

  startTransaction: async (db, sriRequest=null, mode = new pgp.txMode.TransactionMode()) => {
    const hrstart = process.hrtime();
    exports.debug('db', '++ Starting database transaction.');  

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
      exports.debug('db', 'Got db tx object.');

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

      const hrend = process.hrtime(hrstart);
      if (sriRequest) {
          exports.setServerTimingHdr(sriRequest, 'db-starttx', hrend[0]*1000 + hrend[1] / 1000000);
      }
  
      return ({ tx, resolveTx: terminateTx('resolve'), rejectTx: terminateTx('reject') })
    } catch (err) {
      exports.error('CATCHED ERROR: ');  
      exports.error(JSON.stringify(err));  
      throw new exports.SriError({status: 503, errors: [{code: 'too.busy', msg: 'The request could not be processed as the database is too busy right now. Try again later.'}]})
    }
  },


  startTask: async (db, sriRequest=null) => {
    const hrstart = process.hrtime();
    exports.debug('db', '++ Starting database task.');  

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
      exports.debug('db', 'Got db t object.');  

      const endTask = async () => {
          emitter.emit('terminate')
          const res = await pEvent(emitter, 'tDone')
          exports.debug('db', 'db task done.');  
          if (res !== undefined) {
            throw res
          }
      }
      const hrend = process.hrtime(hrstart);
      if (sriRequest) {
          exports.setServerTimingHdr(sriRequest, 'db-starttask', hrend[0]*1000 + hrend[1] / 1000000);
      }
  
      return ({ t, endTask: endTask })
    } catch (err) {
      exports.error('CATCHED ERROR: ');
      exports.error(JSON.stringify(err));
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
                          : `AND nspname = 'public'` )}
                      ) THEN
          CREATE FUNCTION ${( env.postgresSchema !== undefined ? env.postgresSchema : 'public' )}.vsko_resource_version_inc_function() RETURNS OPAQUE AS '
          BEGIN
            NEW."$$meta.version" := OLD."$$meta.version" + 1;
            RETURN NEW;
          END' LANGUAGE 'plpgsql';
        END IF;

        -- 3. create trigger 'vsko_resource_version_trigger_${tableName}' if not yet present
        IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${tgname}') THEN
            CREATE TRIGGER ${tgname} BEFORE UPDATE ON "${tableName}"
            FOR EACH ROW EXECUTE PROCEDURE ${( env.postgresSchema !== undefined ? env.postgresSchema : 'public' )}.vsko_resource_version_inc_function();
        END IF;
      END
      $___$
      LANGUAGE 'plpgsql';
    `
    await db.query(plpgsql)
  },

  getCountResult: async (tx, countquery, sriRequest) => {
    const [{count}] = await exports.pgExec(tx, countquery, sriRequest) 
    return parseInt(count, 10);
  },

  tableFromMapping: (mapping) => {
    return (mapping.table ? mapping.table : _.last(mapping.type.split('/')) )
  },

  isEqualSriObject: (obj1, obj2, mapping) => {
    const relevantProperties = Object.keys(mapping.map)

    function customizer(val, key, obj) {
      if (mapping.schema.properties[key] && mapping.schema.properties[key].format === 'date-time') {
        return (new Date(val)).getTime();
      }

      if (global.sri4node_configuration.informationSchema[mapping.type][key]
            && global.sri4node_configuration.informationSchema[mapping.type][key].type === 'bigint') {
        return BigInt(val)
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
            if (err && err.stack) {
                exports.error('STACK:')
                exports.error(err.stack)
            }
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
    // A userObject of null happens when the user is (not yet) logged in
    return (sriRequest.userObject ? '/persons/' + sriRequest.userObject.uuid : 'NONE')
  },

  setServerTimingHdr: (sriRequest, property, value) => {
    const parentSriRequest = exports.getParentSriRequest(sriRequest);
    if (parentSriRequest.serverTiming === undefined) {
        parentSriRequest.serverTiming = {}
    }
    if (parentSriRequest.serverTiming[property] === undefined) {
        parentSriRequest.serverTiming[property] = value;
    } else {
        parentSriRequest.serverTiming[property] += value;
    }
  },

  getParentSriRequest: (sriRequest) => {
    return sriRequest.parentSriRequest ? sriRequest.parentSriRequest : sriRequest;
  },
  getParentSriRequestFromRequestMap: (sriRequestMap) => {
    const sriRequest = Array.from(sriRequestMap.values())[0];
    return exports.getParentSriRequest(sriRequest);
  },

  getPgp: () => pgp,

  SriError: class {
    constructor({status = 500, errors = [], headers = {}, document, sriRequestID=null}) {
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
      this.headers = headers,
      this.sriRequestID = sriRequestID
    }
  }

}
