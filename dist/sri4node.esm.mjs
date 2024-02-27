var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value2) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value: value2 }) : obj[key] = value2;
var __spreadValues = (a, b) => {
  for (var prop in b ||= {})
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value2) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value2);
};
var __privateSet = (obj, member, value2, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value2) : member.set(obj, value2);
  return value2;
};
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value2) => {
      try {
        step(generator.next(value2));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value2) => {
      try {
        step(generator.throw(value2));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// sri4node.ts
import _7 from "lodash";
import * as util from "util";
import Ajv2 from "ajv";
import addFormats2 from "ajv-formats";
import compression from "compression";
import bodyParser from "body-parser";
import Route from "route-parser";
import pMap8 from "p-map";
import busboy from "busboy";
import EventEmitter3 from "events";
import pEvent4 from "p-event";
import httpContext3 from "express-http-context";
import shortid from "shortid";

// js/common.ts
import pgPromise from "pg-promise";
import monitor from "pg-monitor";
import { v4 as uuidv4 } from "uuid";
import { Readable } from "stream";
import _ from "lodash";

// js/schemaUtils.ts
var schemaUtils_exports = {};
__export(schemaUtils_exports, {
  array: () => array,
  belgianzipcode: () => belgianzipcode,
  boolean: () => boolean,
  email: () => email,
  enumeration: () => enumeration,
  flattenJsonSchema: () => flattenJsonSchema,
  guid: () => guid,
  integer: () => integer,
  numeric: () => numeric,
  patchSchemaToDisallowAdditionalProperties: () => patchSchemaToDisallowAdditionalProperties,
  permalink: () => permalink,
  phone: () => phone,
  string: () => string,
  timestamp: () => timestamp,
  url: () => url
});
function flattenJsonSchema(jsonSchema, pathToCurrent = []) {
  var _a;
  if (jsonSchema.type === "object") {
    const retVal = {};
    Object.entries(jsonSchema.properties || {}).forEach(([pName, pSchema]) => {
      Object.assign(retVal, flattenJsonSchema(pSchema, [...pathToCurrent, pName]));
    });
    return retVal;
  }
  if (jsonSchema.type === "array") {
    const retVal = {};
    if (Array.isArray(jsonSchema.items)) {
      (_a = jsonSchema.items) == null ? void 0 : _a.forEach((pSchema) => {
        Object.assign(retVal, flattenJsonSchema(pSchema, [...pathToCurrent, "[*]"]));
      });
    } else if (jsonSchema.items) {
      Object.assign(retVal, flattenJsonSchema(jsonSchema.items, [...pathToCurrent, "[*]"]));
    }
    return retVal;
  }
  const flattenedName = pathToCurrent.reduce((a, c) => {
    if (c === "[*]") {
      return `${a}${c}`;
    }
    return `${a}.${c}`;
  });
  return { [flattenedName]: jsonSchema };
}
function permalink(type, description) {
  const name = type.substring(1);
  return {
    type: "object",
    properties: {
      href: {
        type: "string",
        pattern: `^/${name}/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$`,
        description
      }
    },
    required: ["href"]
  };
}
function string(description, min, max, pattern) {
  const ret = {
    type: "string",
    description
  };
  if (min) {
    ret.minLength = min;
  }
  if (max) {
    ret.maxLength = max;
  }
  if (pattern) {
    if (Array.isArray(pattern)) {
      ret.oneOf = pattern.map((p) => ({ pattern: p }));
    } else {
      ret.pattern = pattern;
    }
  }
  return ret;
}
function numeric(description, min, max) {
  const ret = {
    type: "number",
    description
  };
  if (min || min === 0) {
    ret.minimum = min;
  }
  if (max) {
    ret.maximum = max;
  }
  return ret;
}
function integer(description, min, max) {
  const ret = {
    type: "integer",
    description
  };
  if (min || min === 0) {
    ret.minimum = min;
  }
  if (max) {
    ret.maximum = max;
  }
  return ret;
}
function email(description) {
  return {
    type: "string",
    format: "email",
    minLength: 1,
    maxLength: 254,
    description
  };
}
function url(description) {
  return {
    type: "string",
    minLength: 1,
    maxLength: 2e3,
    format: "uri",
    description
  };
}
function belgianzipcode(description) {
  return {
    type: "string",
    pattern: "^[0-9][0-9][0-9][0-9]$",
    description
  };
}
function phone(description) {
  return {
    type: "string",
    pattern: "^[0-9]*$",
    minLength: 9,
    maxLength: 10,
    description
  };
}
function guid(description) {
  return {
    type: "string",
    description,
    pattern: "^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$"
  };
}
function timestamp(description) {
  return {
    type: "string",
    format: "date-time",
    description
  };
}
function boolean(description) {
  return {
    type: "boolean",
    description
  };
}
function array(description, type) {
  const ret = {
    type: "array",
    description
  };
  if (type !== void 0) {
    if (type instanceof Object) {
      ret.items = __spreadValues({}, type);
    } else {
      ret.items = { type };
    }
  }
  return ret;
}
function enumeration(description, values) {
  const ret = {
    type: "string",
    description,
    enum: values
  };
  return ret;
}
function patchSchemaToDisallowAdditionalProperties(schema) {
  const patchedSchema = __spreadValues({}, schema);
  if (patchedSchema.properties && patchedSchema.additionalProperties === void 0) {
    patchedSchema.additionalProperties = false;
    patchedSchema.properties = Object.fromEntries(
      Object.entries(patchedSchema.properties).map((e) => [
        e[0],
        patchSchemaToDisallowAdditionalProperties(e[1])
      ])
    );
  }
  return patchedSchema;
}

// js/typeDefinitions.ts
var SriError = class {
  /**
   * Contructs an sri error based on the given initialisation object
   *
   * @param {Object} value
   */
  constructor({
    status = 500,
    errors = [],
    headers = {},
    document = {},
    sriRequestID = null
  }) {
    this.status = status;
    this.body = {
      errors: errors.map((e) => {
        if (e.type === void 0) {
          e.type = "ERROR";
        }
        return e;
      }),
      status,
      document
    };
    this.headers = headers;
    this.sriRequestID = sriRequestID;
  }
};
function isLikeCustomRouteDefinition(cr) {
  return "like" in cr;
}
function isNonStreamingCustomRouteDefinition(cr) {
  return "handler" in cr;
}
function isStreamingCustomRouteDefinition(cr) {
  return "streamingHandler" in cr;
}

// js/url_parsing/non_flat_url_parser.ts
import peggy from "peggy";

// js/common.ts
import url2 from "url";
import EventEmitter from "events";
import pEvent from "p-event";
import path from "path";
import stream from "stream";
import peggy2 from "peggy";
import httpContext from "express-http-context";

// js/express-middleware-timer.ts
var express_middleware_timer_exports = {};
__export(express_middleware_timer_exports, {
  calculate: () => calculate,
  init: () => init,
  instrument: () => instrument
});
var OFF = false;
var instrumented = 0;
function instrument(middleware, name) {
  if (OFF)
    return middleware;
  function bindWrapper(m, name2) {
    return function wrapper(req, res, next) {
      const now2 = Date.now();
      if (res._timer && res._timer.times) {
        res._timer.times[name2] = {
          from_start: now2 - res._timer.start,
          last: now2 - res._timer.last
        };
        res._timer.last = now2;
      }
      m(req, res, next);
    };
  }
  if (typeof middleware === "function") {
    const position = instrumented++;
    name = name || middleware.name || "anonymous middlware #" + position;
    return bindWrapper(middleware, name);
  }
  let itter = 0;
  return middleware.map(function(m) {
    const position = instrumented++;
    let newname;
    if (name) {
      newname = name + " #" + itter++;
    }
    newname = newname || m.name || "anonymous middlware #" + position;
    return bindWrapper(m, newname);
  });
}
function calculate(req, res) {
  const report2 = {
    request: { url: req.url, headers: req.headers },
    timers: { startup: { from_start: 0 } }
  };
  const reportedTimers = res._timer.times;
  function updateReport(timer) {
    const reportNames = Object.keys(report2.timers);
    const lastReport = reportNames[reportNames.length - 1];
    if (typeof timer === "string") {
      report2.timers[lastReport].took = reportedTimers[timer].last;
      report2.timers[lastReport].from_start = reportedTimers[timer].from_start;
      report2.timers[timer] = {};
    } else {
      const now2 = Date.now();
      report2.timers[lastReport].took = now2 - timer.last;
      report2.timers[lastReport].from_start = now2 - timer.start;
    }
  }
  Object.keys(reportedTimers).forEach(function(timer) {
    updateReport(timer);
  });
  updateReport(res._timer);
  return report2;
}
function report(req, res) {
  if (OFF || !res._timer || !res._timer.times)
    return;
  console.log("------------------------------");
  console.dir(calculate(req, res));
  console.log("------------------------------");
}
function init(reporter) {
  return function(req, res, next) {
    if (OFF)
      return next();
    const now2 = Date.now();
    res._timer = {
      start: now2,
      last: now2,
      times: {}
    };
    reporter = typeof reporter === "function" ? reporter : report;
    res.on("finish", function onResponseFinish() {
      reporter(req, res);
    });
    next();
  };
}

// js/common.ts
var pgp;
var logBuffer = {};
function hrtimeToMilliseconds([seconds, nanoseconds]) {
  return seconds * 1e3 + nanoseconds / 1e6;
}
var isLogChannelEnabled = (channel) => {
  return global.sri4node_configuration === void 0 || global.sri4node_configuration.logdebug && (global.sri4node_configuration.logdebug.channels === "all" || global.sri4node_configuration.logdebug.channels.has(channel));
};
var debugAnyChannelAllowed = (channel, output) => {
  if (isLogChannelEnabled(channel)) {
    const reqId = httpContext.get("reqId");
    const msg = `${(/* @__PURE__ */ new Date()).toISOString()} ${reqId ? `[reqId:${reqId}]` : ""}[${channel}] ${typeof output === "function" ? output() : output}`;
    if (reqId !== void 0) {
      if (global.sri4node_configuration.logdebug.statuses !== void 0) {
        if (!logBuffer[reqId]) {
          logBuffer[reqId] = [msg];
        } else {
          logBuffer[reqId].push(msg);
        }
      } else {
        console.log(msg);
      }
    } else {
      console.log(msg);
    }
  }
};
var debug = (channel, output) => {
  debugAnyChannelAllowed(channel, output);
};
var error = function(...args) {
  const reqId = httpContext.get("reqId");
  if (reqId) {
    console.error(`[reqId:${reqId}]`, ...args);
  } else {
    console.error(...args);
  }
};
function getParentSriRequest(sriRequest, recurse = false) {
  return sriRequest.parentSriRequest ? recurse ? getParentSriRequest(sriRequest.parentSriRequest) : sriRequest.parentSriRequest : sriRequest;
}
function installEMT(app) {
  app.use(
    init((_req, _res) => {
    })
  );
  return express_middleware_timer_exports;
}
function setServerTimingHdr(sriRequest, property, value2) {
  const parentSriRequest = getParentSriRequest(sriRequest);
  if (parentSriRequest.serverTiming === void 0) {
    parentSriRequest.serverTiming = {};
  }
  if (parentSriRequest.serverTiming[property] === void 0) {
    parentSriRequest.serverTiming[property] = value2;
  } else {
    parentSriRequest.serverTiming[property] += value2;
  }
}
function emtReportToServerTiming(req, res, sriRequest) {
  try {
    const report2 = calculate(req, res);
    Object.keys(report2.timers).forEach((timer) => {
      const duration = report2.timers[timer].took;
      if (duration > 0 && timer !== "express-wrapper") {
        setServerTimingHdr(sriRequest, timer, duration);
      }
    });
  } catch (err) {
    error("[emtReportToServerTiming] it does not work anymore but why???", err);
    throw err;
  }
}
function createDebugLogConfigObject(logdebug) {
  if (logdebug === true) {
    console.warn(
      `


------------------------------------------------------------------------------------------------------------------
The logdebug parameter has changed format. Before, debug logging was enabled by specifying the boolean value 'true'.
Now you need to provide a string with all the logchannels for which you want to receive debug logging (see the
sri4node documentation for more details ). For now "general,trace,requests,server-timing" is set as sensible default, 
but please specify the preferred channels for which logging is requested.
------------------------------------------------------------------------------------------------------------------


`
    );
    return {
      channels: /* @__PURE__ */ new Set(["general", "trace", "requests", "server-timing"])
    };
  }
  if (logdebug === false) {
    return { channels: /* @__PURE__ */ new Set() };
  }
  const tempLogDebug = {
    channels: logdebug.channels === "all" ? "all" : new Set(logdebug.channels)
  };
  if (logdebug.statuses) {
    tempLogDebug.statuses = new Set(logdebug.statuses);
  }
  return tempLogDebug;
}
function handleRequestDebugLog(status) {
  const reqId = httpContext.get("reqId");
  if (global.sri4node_configuration.logdebug.statuses.has(status)) {
    logBuffer[reqId].forEach((e) => console.log(e));
  }
  delete logBuffer[reqId];
}
function urlToTypeAndKey(urlToParse) {
  var _a;
  if (typeof urlToParse !== "string") {
    throw new Error(`urlToTypeAndKey requires a string argument instead of ${urlToParse}`);
  }
  const parsedUrl = url2.parse(urlToParse);
  const pathName = (_a = parsedUrl.pathname) == null ? void 0 : _a.replace(/\/$/, "");
  const parts = pathName == null ? void 0 : pathName.split("/");
  const type = _.initial(parts).join("/");
  const key = _.last(parts);
  return { type, key };
}
function isUuid(uuid) {
  return uuid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/) != null;
}
function parseResource(u) {
  if (!u) {
    return null;
  }
  const [u1, comment] = u.includes("#") ? u.split("#/") : [u, null];
  if (u1.includes("?")) {
    const splittedUrl = u1.split("?");
    return {
      base: splittedUrl[0],
      id: null,
      query: splittedUrl[1],
      comment
    };
  }
  const pp = path.parse(u1);
  if (isUuid(pp.name)) {
    return {
      base: pp.dir,
      id: pp.name,
      query: null,
      comment
    };
  }
  return {
    base: `${pp.dir !== "/" ? pp.dir : ""}/${pp.name}`,
    id: null,
    query: null,
    comment
  };
}
function errorAsCode(s) {
  let ret = s;
  ret = ret.replace(/".*"/, "");
  ret = ret.toLowerCase().trim();
  ret = ret.replace(/[^a-z0-9 ]/gim, "");
  ret = ret.replace(/ /gim, ".");
  return ret;
}
function typeToConfig(config) {
  return config.reduce((acc, c) => {
    acc[c.type] = c;
    return acc;
  }, {});
}
function typeToMapping(type) {
  return typeToConfig(global.sri4node_configuration.resources)[type];
}
function sqlColumnNames(mapping, summary = false) {
  const columnNames = summary ? Object.keys(mapping.map).filter(
    (c) => !(mapping.map[c].excludeOn !== void 0 && mapping.map[c].excludeOn.toLowerCase() === "summary")
  ) : Object.keys(mapping.map);
  return `${(columnNames.includes("key") ? "" : '"key",') + columnNames.map((c) => `"${c}"`).join(",")}, "$$meta.deleted", "$$meta.created", "$$meta.modified", "$$meta.version"`;
}
function transformRowToObject(row, resourceMapping) {
  const map = resourceMapping.map || {};
  const element = {};
  element.$$meta = {};
  Object.keys(map).forEach((key) => {
    var _a, _b;
    if (map[key].references) {
      const referencedType = map[key].references;
      if (row[key] !== null) {
        element[key] = {
          href: `${referencedType}/${row[key]}`
        };
      } else {
        element[key] = null;
      }
    } else if (key.startsWith("$$meta.")) {
      element.$$meta[key.split("$$meta.")[1]] = row[key];
    } else {
      element[key] = row[key];
    }
    (_b = (_a = map[key]) == null ? void 0 : _a.columnToField) == null ? void 0 : _b.forEach((f) => f(key, element));
  });
  Object.assign(
    element.$$meta,
    _.pickBy({
      // keep only properties with defined non-null value (requires lodash - behaves different as underscores _.pick())
      deleted: row["$$meta.deleted"],
      created: row["$$meta.created"],
      modified: row["$$meta.modified"]
    })
  );
  element.$$meta.permalink = `${resourceMapping.type}/${row.key}`;
  element.$$meta.version = row["$$meta.version"];
  return element;
}
function checkSriConfigWithDb(sriConfig, informationSchema2) {
  sriConfig.resources.forEach((resourceMapping) => {
    const map = resourceMapping.map || {};
    Object.keys(map).forEach((key) => {
      if (informationSchema2[resourceMapping.type][key] === void 0) {
        const dbFields = Object.keys(informationSchema2[resourceMapping.type]).sort();
        const caseInsensitiveIndex = dbFields.map((c) => c.toLowerCase()).indexOf(key.toLowerCase());
        if (caseInsensitiveIndex >= 0) {
          console.error(
            `
[CONFIGURATION PROBLEM] No database column found for property '${key}' as specified in sriConfig of resource '${resourceMapping.type}'. It is probably a case mismatch because we did find a column named '${dbFields[caseInsensitiveIndex]}'instead.`
          );
        } else {
          console.error(
            `
[CONFIGURATION PROBLEM] No database column found for property '${key}' as specified in sriConfig of resource '${resourceMapping.type}'. All available column names are ${dbFields.join(", ")}`
          );
        }
        throw new Error("mismatch.between.sri.config.and.database");
      }
    });
  });
}
function transformObjectToRow(obj, resourceMapping, isNewResource) {
  const map = resourceMapping.map || {};
  const row = {};
  Object.keys(map).forEach((key) => {
    if (map[key].references && obj[key] !== void 0) {
      const permalink2 = obj[key].href;
      if (!permalink2) {
        throw new SriError({
          status: 409,
          errors: [
            {
              code: "no.href.inside.reference",
              msg: `No href found inside reference ${key}`
            }
          ]
        });
      }
      const expectedType = map[key].references;
      const { type: refType, key: refKey } = urlToTypeAndKey(permalink2);
      if (refType === expectedType) {
        row[key] = refKey;
      } else {
        const msg = `Faulty reference detected [${permalink2}], detected [${refType}] expected [${expectedType}].`;
        console.log(msg);
        throw new SriError({
          status: 409,
          errors: [{ code: "faulty.reference", msg }]
        });
      }
    } else if (obj[key] !== void 0) {
      row[key] = obj[key];
    } else {
      row[key] = null;
    }
    if (map[key].fieldToColumn) {
      map[key].fieldToColumn.forEach((f) => f(key, row, isNewResource));
    }
    const fieldTypeDb = global.sri4node_configuration.informationSchema[resourceMapping.type][key].type;
    if (fieldTypeDb === "jsonb") {
      row[key] = JSON.stringify(row[key]);
    }
  });
  return row;
}
function pgInit() {
  return __async(this, arguments, function* (pgpInitOptions = {}, extraOptions) {
    const pgpInitOptionsUpdated = __spreadProps(__spreadValues({
      schema: extraOptions.schema
    }, pgpInitOptions), {
      connect: extraOptions.connectionInitSql === void 0 ? pgpInitOptions.connect : (client, dc, useCount) => {
        if (useCount === 0) {
          client.query(extraOptions.connectionInitSql);
        }
        if (pgpInitOptions.connect) {
          pgpInitOptions.connect(client, dc, useCount);
        }
      }
    });
    pgp = pgPromise(pgpInitOptionsUpdated);
    if (extraOptions.monitor) {
      monitor.attach(pgpInitOptionsUpdated);
    }
    if (pgp) {
      pgp.pg.types.setTypeParser(1114, (s) => /* @__PURE__ */ new Date(`${s}Z`));
      pgp.pg.types.setTypeParser(1184, (s) => {
        const match = s.match(/\.\d\d\d(\d{0,3})\+/);
        let microseconds = "";
        if (match !== null) {
          microseconds = match[1];
        }
        const isoWithoutMicroseconds = new Date(s).toISOString();
        const isoWithMicroseconds = `${isoWithoutMicroseconds.substring(0, isoWithoutMicroseconds.length - 1) + microseconds}Z`;
        return isoWithMicroseconds;
      });
      pgp.pg.types.setTypeParser(20, BigInt);
      pgp.pg.types.setTypeParser(1700, (val) => parseFloat(val));
      BigInt.prototype.toJSON = function() {
        return this.toString();
      };
    } else {
      throw "pgPromise not initialized!";
    }
  });
}
function pgConnect(sri4nodeConfig) {
  return __async(this, null, function* () {
    if (sri4nodeConfig.defaultdatabaseurl !== void 0) {
      console.warn(
        "defaultdatabaseurl config property has been deprecated, use databaseConnectionParameters.connectionString instead"
      );
    }
    if (sri4nodeConfig.maxConnections) {
      console.warn(
        "maxConnections config property has been deprecated, use databaseConnectionParameters.max instead"
      );
    }
    if (sri4nodeConfig.dbConnectionInitSql) {
      console.warn(
        "dbConnectionInitSql config property has been deprecated, use databaseConnectionParameters.connectionInitSql instead"
      );
    }
    if (process.env.PGP_MONITOR) {
      console.warn(
        "environemtn variable PGP_MONITOR has been deprecated, set config property databaseLibraryInitOptions.pgMonitor to true instead"
      );
    }
    if (!pgp) {
      const extraOptions = {
        schema: sri4nodeConfig.databaseConnectionParameters.schema,
        monitor: sri4nodeConfig.enablePgMonitor === true,
        connectionInitSql: sri4nodeConfig.databaseConnectionParameters.connectionInitSql
      };
      pgInit(sri4nodeConfig.databaseLibraryInitOptions, extraOptions);
    }
    const cn = __spreadValues({
      // first some defaults, but override them with whatever is in the config
      max: 16,
      connectionTimeoutMillis: 2e3,
      // 2 seconds
      idleTimeoutMillis: 144e5,
      // 4 hours
      statement_timeout: 3e4
    }, sri4nodeConfig.databaseConnectionParameters);
    console.log(`Using database connection object : [${JSON.stringify(cn)}]`);
    return pgp(cn);
  });
}
function pgExec(db, query, sriRequest, statementTimeout) {
  return __async(this, null, function* () {
    if (statementTimeout) {
      const dbConnection = yield db.connect();
      try {
        yield dbConnection.none("START TRANSACTION; SET LOCAL statement_timeout = $1;", [
          statementTimeout
        ]);
        const { sql, values } = query.toParameterizedSql();
        const hrstart = process.hrtime();
        const dbResult = yield dbConnection.query(sql, values);
        const hrElapsed = process.hrtime(hrstart);
        if (sriRequest) {
          setServerTimingHdr(sriRequest, "db", hrtimeToMilliseconds(hrElapsed));
        }
        yield dbConnection.none("ROLLBACK;");
        return dbResult;
      } finally {
        dbConnection.done();
      }
    } else {
      const { sql, values } = query.toParameterizedSql();
      debug("sql", () => pgp == null ? void 0 : pgp.as.format(sql, values));
      const hrstart = process.hrtime();
      const result = yield db.query(sql, values);
      const hrElapsed = process.hrtime(hrstart);
      if (sriRequest) {
        setServerTimingHdr(sriRequest, "db", hrtimeToMilliseconds(hrElapsed));
      }
      return result;
    }
  });
}
function pgResult(db, query, sriRequest) {
  return __async(this, null, function* () {
    const { sql, values } = query.toParameterizedSql();
    debug("sql", () => pgp == null ? void 0 : pgp.as.format(sql, values));
    const hrstart = process.hrtime();
    const result = yield db.result(sql, values);
    const hrElapsed = process.hrtime(hrstart);
    if (sriRequest) {
      setServerTimingHdr(sriRequest, "db", hrtimeToMilliseconds(hrElapsed));
    }
    return result;
  });
}
function startTransaction(_0) {
  return __async(this, arguments, function* (db, mode = new pgp.txMode.TransactionMode()) {
    debug("db", "++ Starting database transaction.");
    const eventEmitter = new EventEmitter();
    const txWrapper = (emitter) => __async(this, null, function* () {
      try {
        yield db.tx({ mode }, (tx) => __async(this, null, function* () {
          emitter.emit("txEvent", tx);
          const how = yield pEvent(emitter, "terminate");
          if (how === "reject") {
            throw "txRejected";
          }
        }));
        emitter.emit("txDone");
      } catch (err) {
        if (err === "txRejected" || err.message === "Client has encountered a connection error and is not queryable" && err.query === "rollback") {
          emitter.emit("txDone");
        } else {
          emitter.emit("txDone", err);
        }
      }
    });
    try {
      const tx = yield new Promise((resolve, reject) => {
        let resolved = false;
        eventEmitter.on("txEvent", (tx2) => {
          resolve(tx2);
          resolved = true;
        });
        eventEmitter.on("txDone", (err) => {
          if (!resolved) {
            console.log("GOT ERROR:");
            console.log(err);
            console.log(JSON.stringify(err));
            reject(err);
          }
        });
        txWrapper(eventEmitter);
      });
      debug("db", "Got db tx object.");
      yield tx.none("SET CONSTRAINTS ALL DEFERRED;");
      const terminateTx = (how) => () => __async(this, null, function* () {
        if (how !== "reject") {
          yield tx.none("SET CONSTRAINTS ALL IMMEDIATE;");
        }
        eventEmitter.emit("terminate", how);
        const res = yield pEvent(eventEmitter, "txDone");
        if (res !== void 0) {
          throw res;
        }
      });
      return {
        tx,
        resolveTx: terminateTx("resolve"),
        rejectTx: terminateTx("reject")
      };
    } catch (err) {
      error("CAUGHT ERROR: ");
      error(JSON.stringify(err), err);
      throw new SriError({
        status: 503,
        errors: [
          {
            code: "too.busy",
            msg: "The request could not be processed as the database is too busy right now. Try again later."
          }
        ]
      });
    }
  });
}
function startTask(db) {
  return __async(this, null, function* () {
    debug("db", "++ Starting database task.");
    const emitter = new EventEmitter();
    const taskWrapper = (emitter2) => __async(this, null, function* () {
      try {
        yield db.task((t) => __async(this, null, function* () {
          emitter2.emit("tEvent", t);
          yield pEvent(emitter2, "terminate");
        }));
        emitter2.emit("tDone");
      } catch (err) {
        emitter2.emit("tDone", err);
      }
    });
    try {
      const t = yield new Promise((resolve, reject) => {
        emitter.on("tEvent", (t2) => {
          resolve(t2);
        });
        emitter.on("tDone", (err) => {
          reject(err);
        });
        taskWrapper(emitter);
      });
      debug("db", "Got db t object.");
      const endTask = () => __async(this, null, function* () {
        emitter.emit("terminate");
        const res = yield pEvent(emitter, "tDone");
        debug("db", "db task done.");
        if (res !== void 0) {
          throw res;
        }
      });
      return { t, endTask };
    } catch (err) {
      error("CAUGHT ERROR: ");
      error(JSON.stringify(err));
      throw new SriError({
        status: 503,
        errors: [
          {
            code: "too.busy",
            msg: "The request could not be processed as the database is too busy right now. Try again later."
          }
        ]
      });
    }
  });
}
function installVersionIncTriggerOnTable(db, tableName, schemaName, statementTimeout) {
  return __async(this, null, function* () {
    const tgNameToBeDropped = `vsko_resource_version_trigger_${schemaName !== void 0 ? schemaName : ""}_${tableName}`;
    const tgname = `vsko_resource_version_trigger_${tableName}`;
    const schemaNameOrPublic = schemaName !== void 0 ? schemaName : "public";
    const plpgsql = `
    ${statementTimeout !== void 0 ? "START TRANSACTION; SET LOCAL statement_timeout = $1;" : ""}
    DO $___$
    BEGIN
      -- 1. add column '$$meta.version' if not yet present
      IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
          AND column_name = '$$meta.version'
          AND table_schema = '${schemaNameOrPublic}'
          -- ${schemaName !== void 0 ? `AND table_schema = '${schemaName}'` : ""}
      ) THEN
        ALTER TABLE "${schemaNameOrPublic}"."${tableName}" ADD "$$meta.version" integer DEFAULT 0;
      END IF;

      -- 2. create func vsko_resource_version_inc_function if not yet present
      IF NOT EXISTS (SELECT proname from pg_proc p INNER JOIN pg_namespace ns ON (p.pronamespace = ns.oid)
                      WHERE proname = 'vsko_resource_version_inc_function'
                        AND nspname = '${schemaNameOrPublic}'
                    ) THEN
        CREATE FUNCTION "${schemaNameOrPublic}".vsko_resource_version_inc_function() RETURNS TRIGGER AS '
        BEGIN
          NEW."$$meta.version" := OLD."$$meta.version" + 1;
          RETURN NEW;
        END' LANGUAGE 'plpgsql';
      END IF;

      -- 3. drop old triggers if they exist
      DROP TRIGGER IF EXISTS "${tgNameToBeDropped}" on "${schemaNameOrPublic}"."${tableName}";

      -- 4. create trigger 'vsko_resource_version_trigger_${tableName}' if not yet present
      IF NOT EXISTS (
          SELECT 1 FROM information_schema.triggers
          WHERE trigger_name = '${tgname}'
	          AND trigger_schema = '${schemaNameOrPublic}'
            AND event_object_table = '${tableName}'
          -- OBSOLETE (does not check for schema and tablenam): SELECT 1 FROM pg_trigger WHERE tgname = '${tgname}'
        ) THEN
          CREATE TRIGGER ${tgname} BEFORE UPDATE ON "${schemaNameOrPublic}"."${tableName}"
          FOR EACH ROW EXECUTE PROCEDURE "${schemaNameOrPublic}".vsko_resource_version_inc_function();
      END IF;
    END
    $___$
    LANGUAGE 'plpgsql';
    ${statementTimeout !== void 0 ? "COMMIT;" : ""}
  `;
    yield db.query(plpgsql, statementTimeout !== void 0 ? [statementTimeout] : void 0);
  });
}
function getCountResult(tx, countquery, sriRequest) {
  return __async(this, null, function* () {
    const [{ count }] = yield pgExec(tx, countquery, sriRequest);
    return parseInt(count, 10);
  });
}
function tableFromMapping(mapping) {
  return mapping.table || _.last(mapping.type.split("/"));
}
function isEqualSriObject(obj1, obj2, mapping) {
  const relevantProperties = Object.keys(mapping.map);
  function customizer(val, key, _obj) {
    var _a;
    if (((_a = findPropertyInJsonSchema(mapping.schema, key)) == null ? void 0 : _a.format) === "date-time") {
      return new Date(val).getTime();
    }
    if (global.sri4node_configuration.informationSchema[mapping.type][key] && global.sri4node_configuration.informationSchema[mapping.type][key].type === "bigint") {
      return BigInt(val);
    }
  }
  const o1 = _.cloneDeepWith(
    _.pickBy(
      obj1,
      (val, key) => val !== null && val != void 0 && relevantProperties.includes(key)
    ),
    customizer
  );
  const o2 = _.cloneDeepWith(
    _.pickBy(
      obj2,
      (val, key) => val !== null && val != void 0 && relevantProperties.includes(key)
    ),
    customizer
  );
  return _.isEqualWith(o1, o2);
}
function stringifyError(e) {
  if (e instanceof Error) {
    return e.toString();
  }
  return JSON.stringify(e);
}
function settleResultsToSriResults(results) {
  return results.map((res) => {
    var _a, _b;
    if (res.isFulfilled) {
      return res.value;
    }
    const err = res.reason;
    if (err instanceof SriError || ((_b = (_a = err == null ? void 0 : err.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError") {
      return err;
    }
    error(
      "____________________________ E R R O R (settleResultsToSriResults)_________________________"
    );
    error(stringifyError(err));
    if (err && err.stack) {
      error("STACK:");
      error(err.stack);
    }
    error(
      "___________________________________________________________________________________________"
    );
    return new SriError({
      status: 500,
      errors: [
        {
          code: "internal.server.error",
          msg: `Internal Server Error. [${stringifyError(err)}}]`
        }
      ]
    });
  });
}
function createReadableStream(objectMode = true) {
  const s = new Readable({ objectMode });
  s._read = function() {
  };
  return s;
}
function getParentSriRequestFromRequestMap(sriRequestMap, recurse = false) {
  const sriRequest = Array.from(sriRequestMap.values())[0];
  return getParentSriRequest(sriRequest, recurse);
}
function getPgp() {
  return pgp;
}
function generateSriRequest(expressRequest = void 0, expressResponse = void 0, basicConfig = void 0, batchHandlerAndParams = void 0, parentSriRequest = void 0, batchElement = void 0, internalSriRequest = void 0) {
  var _a;
  const baseSriRequest = {
    id: uuidv4(),
    logDebug: debug,
    // (ch, message) => debug(requestId, ch, message)
    logError: error,
    SriError,
    // context: {},
    parentSriRequest: parentSriRequest || (internalSriRequest == null ? void 0 : internalSriRequest.parentSriRequest),
    path: "",
    query: {},
    params: {},
    sriType: void 0,
    isBatchRequest: void 0,
    readOnly: void 0,
    originalUrl: void 0,
    httpMethod: void 0,
    headers: {},
    body: void 0,
    dbT: (basicConfig == null ? void 0 : basicConfig.dbT) || (internalSriRequest == null ? void 0 : internalSriRequest.dbT) || (parentSriRequest == null ? void 0 : parentSriRequest.dbT),
    inStream: new stream.Readable(),
    outStream: new stream.Writable(),
    setHeader: void 0,
    setStatus: void 0,
    streamStarted: void 0,
    protocol: void 0,
    isBatchPart: void 0,
    /**
     * serverTiming is an object used to accumulate timing data which is passed to the client in the response
     * as Server-Timing header (see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Server-Timing).
     */
    serverTiming: {},
    /**
     * userData is an object which can be used by applications using sri4node to store information associated with
     * a request. It is initialized as an empty object.
     */
    userData: {}
  };
  if (internalSriRequest && !batchElement) {
    return __spreadProps(__spreadValues({}, baseSriRequest), {
      // parentSriRequest: parentSriRequest,
      originalUrl: internalSriRequest.href,
      path: batchHandlerAndParams.path,
      query: batchHandlerAndParams.queryParams,
      params: batchHandlerAndParams.routeParams,
      sriType: batchHandlerAndParams.handler.mapping.type,
      isBatchRequest: batchHandlerAndParams.handler.isBatch,
      readOnly: batchHandlerAndParams.handler.readOnly,
      httpMethod: internalSriRequest.verb,
      headers: internalSriRequest.headers ? internalSriRequest.headers : {},
      body: internalSriRequest.body,
      dbT: internalSriRequest.dbT,
      inStream: internalSriRequest.inStream,
      outStream: internalSriRequest.outStream,
      setHeader: internalSriRequest.setHeader,
      setStatus: internalSriRequest.setStatus,
      streamStarted: internalSriRequest.streamStarted,
      protocol: "_internal_",
      isBatchPart: false,
      parentSriRequest: internalSriRequest.parentSriRequest
    });
  }
  if (parentSriRequest && batchElement) {
    return __spreadProps(__spreadValues(__spreadValues({}, parentSriRequest), baseSriRequest), {
      dbT: parentSriRequest.dbT,
      originalUrl: batchElement.href,
      path: batchHandlerAndParams.path,
      query: batchHandlerAndParams.queryParams,
      params: batchHandlerAndParams.routeParams,
      httpMethod: batchElement.verb,
      body: batchElement.body == null ? null : _.isObject(batchElement.body) ? batchElement.body : JSON.parse(batchElement.body),
      sriType: batchHandlerAndParams.handler.mapping.type,
      isBatchPart: true
    });
  }
  if (expressRequest) {
    const generatedSriRequest = __spreadProps(__spreadValues({}, baseSriRequest), {
      path: expressRequest.path,
      originalUrl: expressRequest.originalUrl,
      query: expressRequest.query,
      params: expressRequest.params,
      httpMethod: expressRequest.method,
      headers: expressRequest.headers,
      protocol: expressRequest.protocol,
      body: expressRequest.body,
      isBatchPart: false,
      isBatchRequest: basicConfig == null ? void 0 : basicConfig.isBatchRequest,
      readOnly: basicConfig == null ? void 0 : basicConfig.readOnly,
      // the batch code will set sriType for batch elements
      sriType: !(basicConfig == null ? void 0 : basicConfig.isBatchRequest) ? (_a = basicConfig == null ? void 0 : basicConfig.mapping) == null ? void 0 : _a.type : void 0
    });
    if (basicConfig == null ? void 0 : basicConfig.isStreamingRequest) {
      if (!expressResponse) {
        throw Error(
          "[generateSriRequest] basicConfig.isStreamingRequest is true, but expressResponse argument is missing"
        );
      }
      const inStream = new stream.PassThrough({
        allowHalfOpen: false,
        emitClose: true
      });
      const outStream = new stream.PassThrough({
        allowHalfOpen: false,
        emitClose: true
      });
      generatedSriRequest.inStream = expressRequest.pipe(inStream);
      generatedSriRequest.outStream = outStream.pipe(expressResponse);
      generatedSriRequest.setHeader = (k, v) => expressResponse.set(k, v);
      generatedSriRequest.setStatus = (s) => expressResponse.status(s);
      generatedSriRequest.streamStarted = () => expressResponse.headersSent;
    }
    return generatedSriRequest;
  }
  if (parentSriRequest && !batchElement) {
    return __spreadProps(__spreadValues({}, baseSriRequest), {
      originalUrl: parentSriRequest.href,
      path: batchHandlerAndParams.path,
      query: batchHandlerAndParams.queryParams,
      params: batchHandlerAndParams.routeParams,
      sriType: batchHandlerAndParams.handler.mapping.type,
      isBatchRequest: batchHandlerAndParams.handler.isBatch,
      readOnly: batchHandlerAndParams.handler.readOnly,
      httpMethod: parentSriRequest.verb,
      headers: parentSriRequest.headers ? parentSriRequest.headers : {},
      body: parentSriRequest.body,
      dbT: parentSriRequest.dbT,
      inStream: parentSriRequest.inStream,
      outStream: parentSriRequest.outStream,
      setHeader: parentSriRequest.setHeader,
      setStatus: parentSriRequest.setStatus,
      streamStarted: parentSriRequest.streamStarted,
      protocol: "_internal_",
      isBatchPart: false,
      parentSriRequest: parentSriRequest.parentSriRequest
      // ??? || parentSriRequest,
    });
  }
  if (parentSriRequest && batchElement) {
    return __spreadProps(__spreadValues(__spreadValues({}, parentSriRequest), baseSriRequest), {
      originalUrl: batchElement.href,
      path: batchHandlerAndParams.path,
      query: batchHandlerAndParams.queryParams,
      params: batchHandlerAndParams.routeParams,
      httpMethod: batchElement.verb,
      body: batchElement.body == null ? null : _.isObject(batchElement.body) ? batchElement.body : JSON.parse(batchElement.body),
      sriType: batchHandlerAndParams.handler.mapping.type,
      isBatchPart: true
    });
  }
  throw Error(
    "[generateSriRequest] Unable to generate an SriRequest based on the given combination of parameters"
  );
}
function findPropertyInJsonSchema(schema, propertyName) {
  var _a;
  if ((_a = schema == null ? void 0 : schema.properties) == null ? void 0 : _a[propertyName]) {
    return schema.properties[propertyName];
  }
  const subSchemas = schema.anyOf || schema.allOf || schema.oneOf;
  if (subSchemas) {
    for (const subSchema of subSchemas) {
      const found = findPropertyInJsonSchema(subSchema, propertyName);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

// js/batch.ts
import _2 from "lodash";
import pMap3 from "p-map";
import pEachSeries from "p-each-series";
import url3 from "url";
import JSONStream from "JSONStream";
import EventEmitter2 from "events";
import pEvent3 from "p-event";
import httpContext2 from "express-http-context";

// js/hooks.ts
import pMap from "p-map";
function applyHooks(type, functions, applyFun, sriRequest) {
  return __async(this, null, function* () {
    var _a, _b;
    if (functions && functions.length > 0) {
      try {
        debug("hooks", `applyHooks-${type}: going to apply ${functions.length} functions`);
        yield pMap(
          functions,
          (fun) => __async(this, null, function* () {
            const hrstart = process.hrtime();
            const funName = fun.name !== "" ? fun.name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`) : "anonymous-fun";
            const stHookName = `${type.replace(/ - /g, "-").replace(/ /g, "-")}-${funName}`;
            try {
              yield applyFun(fun);
              const hrend = process.hrtime(hrstart);
              const duration = hrend[0] * 1e3 + hrend[1] / 1e6;
              debug("hooks", `applyHooks-${type}: all functions resolved (took ${duration}ms).`);
              if (sriRequest) {
                setServerTimingHdr(sriRequest, stHookName, duration);
              }
            } catch (err) {
              const hrend = process.hrtime(hrstart);
              const duration = hrend[0] * 1e3 + hrend[1] / 1e6;
              debug("hooks", `applyHooks-${type}: function ${fun.name} failed (took ${duration}ms).`);
              if (sriRequest) {
                setServerTimingHdr(sriRequest, stHookName, duration);
              }
              throw err;
            }
          }),
          { concurrency: 1 }
        );
      } catch (err) {
        if (err instanceof SriError || ((_b = (_a = err == null ? void 0 : err.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError") {
          throw err;
        } else {
          console.log(
            "_______________________ H O O K S - E R R O R _____________________________________________"
          );
          console.log(err);
          console.log(err.stack);
          console.log(Object.prototype.toString.call(err));
          console.log(
            "___________________________________________________________________________________________"
          );
          throw new SriError({
            status: 500,
            errors: [{ code: errorAsCode(`${type} failed`), msg: stringifyError(err) }]
          });
        }
      }
    } else {
      debug("hooks", `applyHooks-${type}: no ${type} functions registered.`);
    }
  });
}

// js/phaseSyncedSettle.ts
import pSettle from "p-settle";
import pEvent2 from "p-event";
import pMap2 from "p-map";
import queue from "emitter-queue";
import Emitter from "events";
import { v4 as uuidv42 } from "uuid";
var debug_log = (id, msg) => {
  debug("phaseSyncer", `PS -${id}- ${msg}`);
};
var _sriRequest;
var PhaseSyncer = class {
  constructor(fun, args, ctrlEmitter) {
    /**
     * SriRequest associated with the PhaseSyncer instance
     */
    __privateAdd(this, _sriRequest, void 0);
    this.ctrlEmitter = ctrlEmitter;
    this.id = uuidv42();
    this.phaseCntr = 0;
    this.jobEmitter = queue(new Emitter());
    __privateSet(this, _sriRequest, args[1]);
    const jobWrapperFun = () => __async(this, null, function* () {
      try {
        const res = yield fun(this, ...args);
        this.ctrlEmitter.queue("jobDone", this.id);
        this.sriRequest.ended = true;
        return res;
      } catch (err) {
        this.ctrlEmitter.queue("jobFailed", this.id);
        this.sriRequest.ended = true;
        throw err;
      }
    });
    this.jobPromise = jobWrapperFun();
    debug_log(this.id, "PhaseSyncer constructed.");
  }
  /**
   * This function needs to be called by the sri request handler at the end of each phase
   * (i.e. at each synchronisation point).
   */
  phase() {
    return __async(this, null, function* () {
      var _a, _b;
      debug_log(this.id, `STEP ${this.phaseCntr}`);
      if (this.phaseCntr > 0) {
        this.ctrlEmitter.queue("stepDone", this.id, this.phaseCntr);
      }
      this.phaseCntr += 1;
      const result = yield pEvent2(this.jobEmitter, ["sriError", "ready"]);
      if (result instanceof SriError || ((_b = (_a = result == null ? void 0 : result.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError") {
        throw result;
      }
    });
  }
  get sriRequest() {
    return __privateGet(this, _sriRequest);
  }
};
_sriRequest = new WeakMap();
var splitListAt = (list, index2) => [list.slice(0, index2), list.slice(index2)];
function phaseSyncedSettle(_0) {
  return __async(this, arguments, function* (jobList, { concurrency, beforePhaseHooks } = {}) {
    var _a, _b;
    const ctrlEmitter = queue(new Emitter());
    const jobMap = new Map(
      jobList.map(([fun, args]) => new PhaseSyncer(fun, args, ctrlEmitter)).map((phaseSyncer) => [phaseSyncer.id, phaseSyncer])
    );
    const pendingJobs = new Set(jobMap.keys());
    const sriRequestMap = new Map(
      [...jobMap.entries()].map(([id, phaseSyncer]) => [
        id,
        phaseSyncer.sriRequest
      ])
    );
    const sriRequestIDToPhaseSyncerMap = new Map(
      [...jobMap.entries()].map(([_id, phaseSyncer]) => [
        phaseSyncer.sriRequest.id,
        phaseSyncer
      ])
    );
    let queuedJobs;
    let phasePendingJobs;
    let failureHasBeenBroadcasted = false;
    try {
      const startNewPhase = () => __async(this, null, function* () {
        const pendingJobList = [...pendingJobs.values()];
        const [jobsToWake, jobsToQueue] = splitListAt(pendingJobList, concurrency || 1);
        queuedJobs = new Set(jobsToQueue);
        phasePendingJobs = new Set(pendingJobs);
        if (jobsToWake.length > 0) {
          yield applyHooks(
            "ps",
            beforePhaseHooks || [],
            (f) => f(sriRequestMap, jobMap, pendingJobs),
            getParentSriRequestFromRequestMap(sriRequestMap)
          );
        }
        jobsToWake.forEach((id) => {
          const job = jobMap.get(id);
          if (job) {
            job.jobEmitter.queue("ready");
          } else {
            error("PhaseSyncer: job not found in jobMap");
            throw new Error("PhaseSyncer: job not found in jobMap");
          }
        });
      });
      const startQueuedJob = () => {
        if (phasePendingJobs.size - queuedJobs.size > (concurrency || 1)) {
          error(
            "ERROR: PhaseSyncer: unexpected startQueuedJob() call while max number of concurrent jobs is still running ! -> NOT starting queued job"
          );
        } else {
          if (queuedJobs.size > 0) {
            const id = queuedJobs.values().next().value;
            const job = jobMap.get(id);
            if (job) {
              job.jobEmitter.queue("ready");
            } else {
              error("PhaseSyncer: job not found in jobMap");
              throw new Error("PhaseSyncer: job not found in jobMap");
            }
            queuedJobs.delete(id);
          }
        }
      };
      const errorHandlingWrapper = (fun) => (id, args) => __async(this, null, function* () {
        var _a2, _b2, _c, _d;
        try {
          yield fun(id, args);
        } catch (err) {
          if (err instanceof SriError || ((_b2 = (_a2 = err == null ? void 0 : err.__proto__) == null ? void 0 : _a2.constructor) == null ? void 0 : _b2.name) === "SriError") {
            if (err.sriRequestID && sriRequestIDToPhaseSyncerMap.get(err.sriRequestID)) {
              (_c = sriRequestIDToPhaseSyncerMap.get(err.sriRequestID)) == null ? void 0 : _c.jobEmitter.queue("sriError", err);
              return;
            }
            if (jobMap.get(id)) {
              (_d = jobMap.get(id)) == null ? void 0 : _d.jobEmitter.queue("sriError", err);
              return;
            }
          }
          console.error(`
ERROR: ${err} - ${JSON.stringify(err)}
`);
        }
      });
      ctrlEmitter.on(
        "stepDone",
        errorHandlingWrapper((id, stepnr) => __async(this, null, function* () {
          debug_log(id, `*step ${stepnr}* done.`);
          phasePendingJobs.delete(id);
          if (getParentSriRequestFromRequestMap(sriRequestMap).reqCancelled) {
            throw new SriError({
              status: 0,
              errors: [{ code: "cancelled", msg: "Request cancelled by client." }]
            });
          }
          if (phasePendingJobs.size === 0) {
            debug_log(id, " Starting new phase.");
            yield startNewPhase();
          } else {
            debug_log(id, " Starting queued job.");
            startQueuedJob();
          }
        }))
      );
      ctrlEmitter.on(
        "jobDone",
        errorHandlingWrapper((id) => __async(this, null, function* () {
          debug_log(id, "*JOB* done.");
          pendingJobs.delete(id);
          queuedJobs.delete(id);
          phasePendingJobs.delete(id);
          if (phasePendingJobs.size === 0) {
            yield startNewPhase();
          } else {
            startQueuedJob();
          }
        }))
      );
      ctrlEmitter.on(
        "jobFailed",
        errorHandlingWrapper((id) => __async(this, null, function* () {
          debug_log(id, "*JOB* failed.");
          pendingJobs.delete(id);
          queuedJobs.delete(id);
          phasePendingJobs.delete(id);
          if (getParentSriRequestFromRequestMap(sriRequestMap).readOnly === true) {
            if (phasePendingJobs.size === 0) {
              yield startNewPhase();
            } else {
              startQueuedJob();
            }
          } else if (!failureHasBeenBroadcasted) {
            const parent = getParentSriRequestFromRequestMap(sriRequestMap);
            failureHasBeenBroadcasted = true;
            yield pMap2(pendingJobs, (id2) => __async(this, null, function* () {
              var _a2, _b2, _c;
              const job = jobMap.get(id2);
              if (job === void 0) {
                throw new Error("[jobFailed] Job is undefined, which is unexpected...");
              } else if (job.sriRequest === void 0 || !(parent.multiInsertFailed && ((_a2 = parent.putRowsToInsertIDs) == null ? void 0 : _a2.includes(job == null ? void 0 : job.sriRequest.id))) && !(parent.multiUpdateFailed && ((_b2 = parent.putRowsToUpdateIDs) == null ? void 0 : _b2.includes(job == null ? void 0 : job.sriRequest.id))) && !(parent.multiDeleteFailed && ((_c = parent.rowsToDeleteIDs) == null ? void 0 : _c.includes(job == null ? void 0 : job.sriRequest.id)))) {
                job == null ? void 0 : job.jobEmitter.queue(
                  "sriError",
                  new SriError({
                    status: 202,
                    errors: [
                      {
                        code: "cancelled",
                        msg: "Request cancelled due to failure in accompanying request in batch."
                      }
                    ]
                  })
                );
              }
            }));
          }
          if (phasePendingJobs.size === 0) {
            yield startNewPhase();
          } else {
            yield startQueuedJob();
          }
        }))
      );
      yield startNewPhase();
      return pSettle([...jobMap.values()].map((phaseSyncer) => phaseSyncer.jobPromise));
    } catch (err) {
      console.warn("WARN: error in phase syncer");
      console.warn(err);
      console.warn(JSON.stringify(err));
      let sriError;
      if (err instanceof SriError || ((_b = (_a = err == null ? void 0 : err.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError") {
        sriError = err;
      } else {
        sriError = new SriError({
          status: 500,
          errors: [{ code: "phase.synced.settle.failed", err: err.toString() }]
        });
      }
      pendingJobs.forEach((id) => {
        var _a2;
        (_a2 = jobMap.get(id)) == null ? void 0 : _a2.jobEmitter.queue(
          "sriError",
          new SriError({
            status: 202,
            errors: [
              {
                code: "cancelled",
                msg: "Request cancelled due to failure in accompanying request in batch."
              }
            ]
          })
        );
      });
      yield pSettle([...jobMap.values()].map((phaseSyncer) => phaseSyncer.jobPromise));
      return [...jobMap.values()].map((_phaseSyncer) => ({ isFulfilled: false, reason: sriError }));
    }
  });
}

// js/batch.ts
var maxSubListLen = (a) => (
  // this code works as long as a batch array contain either all objects or all (sub)arrays
  // (which is required by batchOpertation, otherwise a 'batch.invalid.type.mix' error is sent)
  a.reduce((max, e, _idx, arr) => {
    if (Array.isArray(e)) {
      return Math.max(maxSubListLen(e), max);
    }
    return Math.max(arr.length, max);
  }, 0)
);
function matchHref(href, verb) {
  if (!verb) {
    console.log(`No VERB stated for ${href}.`);
    throw new SriError({
      status: 400,
      errors: [{ code: "no.verb", msg: `No VERB stated for ${href}.` }]
    });
  }
  const parsedUrl = url3.parse(href, true);
  const queryParams = parsedUrl.query;
  const path2 = (parsedUrl.pathname || "").replace(/\/$/, "");
  const batchHandlerMap = global.sri4node_configuration.batchHandlerMap;
  const matches = batchHandlerMap[verb].map((handler2) => ({ handler: handler2, match: handler2.route.match(path2) })).filter(({ match }) => match !== false);
  if (matches.length > 1) {
    console.log(
      `WARNING: multiple handler functions match for batch request ${path2}. Only first will be used. Check configuration.`
    );
  } else if (matches.length === 0) {
    throw new SriError({
      status: 404,
      errors: [{ code: "no.matching.route", msg: `No route found for ${verb} on ${path2}.` }]
    });
  }
  const { handler } = _2.first(matches);
  const routeParams = _2.first(matches).match;
  return {
    handler,
    path: path2,
    routeParams,
    queryParams
  };
}
function matchBatch(req) {
  const reqBody = req.body;
  const batchBase = req.path.split("/batch")[0];
  if (!Array.isArray(reqBody)) {
    throw new SriError({
      status: 400,
      errors: [
        {
          code: "batch.body.invalid",
          msg: "Batch body should be JSON array.",
          body: reqBody
        }
      ]
    });
  }
  const handleBatchForMatchBatch = (batch) => {
    if (batch.every((element) => Array.isArray(element))) {
      batch.forEach(handleBatchForMatchBatch);
    } else if (batch.every((element) => typeof element === "object" && !Array.isArray(element))) {
      batch.forEach((element) => {
        var _a;
        const match = matchHref(element.href, element.verb);
        if (match.handler.isBatch === true) {
          throw new SriError({
            status: 400,
            errors: [
              {
                code: "batch.not.allowed.in.batch",
                msg: "Nested /batch requests are not allowed, use 1 batch with sublists inside the batch JSON."
              }
            ]
          });
        }
        if (!((_a = match.path) == null ? void 0 : _a.startsWith(batchBase))) {
          throw new SriError({
            status: 400,
            errors: [
              {
                code: "href.across.boundary",
                msg: "Only requests within (sub) path of /batch request are allowed."
              }
            ]
          });
        }
        if (match.queryParams.dryRun === "true") {
          throw new SriError({
            status: 400,
            errors: [
              {
                code: "dry.run.not.allowed.in.batch",
                msg: "The dryRun query parameter is only allowed for the batch url itself (/batch?dryRun=true), not for hrefs inside a batch request."
              }
            ]
          });
        }
        element.match = match;
      });
    } else {
      throw new SriError({
        status: 400,
        errors: [
          {
            code: "batch.invalid.type.mix",
            msg: "A batch array should contain either all objects or all (sub)arrays."
          }
        ]
      });
    }
  };
  handleBatchForMatchBatch(reqBody);
}
var batchOperation = function batchOperation2(sriRequest, internalUtils) {
  return __async(this, null, function* () {
    const reqBody = sriRequest.body || [];
    const batchConcurrency = Math.min(
      maxSubListLen(reqBody),
      global.sri4node_configuration.batchConcurrency
    );
    global.overloadProtection.startPipeline(batchConcurrency);
    try {
      let batchFailed = false;
      const handleBatchInBatchOperation = (batch, tx) => __async(this, null, function* () {
        if (batch.every((element) => Array.isArray(element))) {
          debug(
            "batch",
            "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
          );
          debug("batch", "| Handling batch list");
          debug(
            "batch",
            "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
          );
          return pMap3(
            batch,
            (element) => __async(this, null, function* () {
              const { tx: tx1, resolveTx, rejectTx } = yield startTransaction(tx);
              const result = yield handleBatchInBatchOperation(element, tx1);
              if (result.every((e) => e.status < 300)) {
                yield resolveTx();
              } else {
                yield rejectTx();
              }
              return result;
            }),
            { concurrency: 1 }
          );
        }
        if (batch.every((element) => typeof element === "object" && !Array.isArray(element))) {
          if (!batchFailed) {
            const batchJobs = yield pMap3(
              batch,
              (batchElement) => __async(this, null, function* () {
                var _a;
                if (!batchElement.verb) {
                  throw new SriError({
                    status: 400,
                    errors: [{ code: "verb.missing", msg: "VERB is not specified." }]
                  });
                }
                debug(
                  "batch",
                  "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
                );
                debug(
                  "batch",
                  `| Executing /batch section ${batchElement.verb} - ${batchElement.href} `
                );
                debug(
                  "batch",
                  "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
                );
                const { match } = batchElement;
                const innerSriRequest = generateSriRequest(
                  void 0,
                  void 0,
                  void 0,
                  match,
                  sriRequest,
                  batchElement
                );
                if (!((_a = match == null ? void 0 : match.handler) == null ? void 0 : _a.func))
                  throw new Error("match.handler.func is undefined");
                return [
                  match.handler.func,
                  [tx, innerSriRequest, match.handler.mapping, internalUtils]
                ];
              }),
              { concurrency: 1 }
            );
            const results = settleResultsToSriResults(
              yield phaseSyncedSettle(batchJobs, {
                concurrency: batchConcurrency,
                beforePhaseHooks: global.sri4node_configuration.beforePhase
              })
            );
            if (results.some(
              (e) => {
                var _a, _b;
                return e instanceof SriError || ((_b = (_a = e == null ? void 0 : e.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError";
              }
            ) && sriRequest.readOnly === false) {
              batchFailed = true;
            }
            yield pEachSeries(results, (res, idx) => __async(this, null, function* () {
              var _a, _b;
              const [_tx, innerSriRequest, mapping, internalUtils2] = batchJobs[idx][1];
              if (!(res instanceof SriError || ((_b = (_a = res == null ? void 0 : res.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError")) {
                yield applyHooks(
                  "transform response",
                  mapping.transformResponse || [],
                  (f) => f(tx, innerSriRequest, res, internalUtils2)
                );
              }
            }));
            return results.map((res, idx) => {
              const [_tx, innerSriRequest, _mapping] = batchJobs[idx][1];
              res.href = innerSriRequest.originalUrl;
              res.verb = innerSriRequest.httpMethod;
              delete res.sriRequestID;
              return res;
            });
          }
          return batch.map(
            (_e) => new SriError({
              status: 202,
              errors: [
                {
                  code: "cancelled",
                  msg: "Request cancelled due to failure in accompanying request in batch."
                }
              ]
            })
          );
        }
        batchFailed = true;
        throw new SriError({
          status: 400,
          errors: [
            {
              code: "batch.invalid.type.mix",
              msg: "A batch array should contain either all objects or all (sub)arrays."
            }
          ]
        });
      });
      const batchResults = _2.flatten(
        yield handleBatchInBatchOperation(reqBody, sriRequest.dbT)
      );
      const status = batchResults.some((e) => e.status === 403) ? 403 : Math.max(200, ...batchResults.map((e) => e.status));
      return { status, body: batchResults };
    } finally {
      global.overloadProtection.endPipeline(batchConcurrency);
    }
  });
};
var batchOperationStreaming = (sriRequest, internalUtils) => __async(void 0, null, function* () {
  let keepAliveTimer = null;
  const reqBody = sriRequest.body;
  const batchConcurrency = global.overloadProtection.startPipeline(
    Math.min(maxSubListLen(reqBody), global.sri4node_configuration.batchConcurrency)
  );
  try {
    let batchFailed = false;
    const handleBatchStreaming = (batch, tx) => __async(void 0, null, function* () {
      if (batch.every((element) => Array.isArray(element))) {
        debug(
          "batch",
          "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
        );
        debug("batch", "| Handling batch list");
        debug(
          "batch",
          "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
        );
        return pMap3(
          batch,
          (element) => __async(void 0, null, function* () {
            const result = yield handleBatchStreaming(element, tx);
            return result;
          }),
          { concurrency: 1 }
        );
      }
      if (batch.every((element) => typeof element === "object" && !Array.isArray(element))) {
        if (!batchFailed) {
          const batchJobs = yield pMap3(
            batch,
            (batchElement) => __async(void 0, null, function* () {
              var _a;
              if (!batchElement.verb) {
                throw new SriError({
                  status: 400,
                  errors: [{ code: "verb.missing", msg: "VERB is not specified." }]
                });
              }
              debug(
                "batch",
                "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
              );
              debug(
                "batch",
                `| Executing /batch section ${batchElement.verb} - ${batchElement.href} `
              );
              debug(
                "batch",
                "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500"
              );
              const { match } = batchElement;
              if (match) {
                const innerSriRequest = __spreadProps(__spreadValues({}, sriRequest), {
                  parentSriRequest: sriRequest,
                  path: match.path || "",
                  originalUrl: batchElement.href,
                  query: match.queryParams,
                  params: match.routeParams,
                  httpMethod: batchElement.verb,
                  body: batchElement.body,
                  // element.body === undefined || _.isObject(element.body)
                  //   ? element.body
                  //   : JSON.parse(element.body),
                  sriType: match.handler.mapping.type,
                  isBatchPart: true
                  // context,
                });
                if (!((_a = match == null ? void 0 : match.handler) == null ? void 0 : _a.func))
                  throw new Error("match.handler.func is undefined");
                return [
                  match.handler.func,
                  [tx, innerSriRequest, match.handler.mapping, internalUtils]
                ];
              } else {
                throw new SriError({
                  status: 500,
                  errors: [{ code: "batch.missing.match", msg: "" }]
                });
              }
            }),
            { concurrency: 1 }
          );
          const results = settleResultsToSriResults(
            yield phaseSyncedSettle(batchJobs, {
              concurrency: batchConcurrency,
              beforePhaseHooks: global.sri4node_configuration.beforePhase
            })
          );
          if (results.some(
            (e) => {
              var _a, _b;
              return e instanceof SriError || ((_b = (_a = e == null ? void 0 : e.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError";
            }
          )) {
            batchFailed = true;
          }
          yield pEachSeries(results, (res, idx) => __async(void 0, null, function* () {
            var _a, _b;
            const [_tx, innerSriRequest, mapping] = batchJobs[idx][1];
            if (!(res instanceof SriError || ((_b = (_a = res == null ? void 0 : res.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError")) {
              yield applyHooks(
                "transform response",
                mapping.transformResponse || [],
                (f) => f(tx, innerSriRequest, res)
              );
            }
          }));
          return results.map((res, idx) => {
            const [_tx, innerSriRequest, _mapping] = batchJobs[idx][1];
            res.href = innerSriRequest.originalUrl;
            res.verb = innerSriRequest.httpMethod;
            delete res.sriRequestID;
            stream2.push(res);
            return res.status;
          });
        }
        batch.forEach(
          (_e) => stream2.push({
            status: 202,
            errors: [
              {
                code: "cancelled",
                msg: "Request cancelled due to failure in accompanying request in batch."
              }
            ]
          })
        );
        return 202;
      }
      batchFailed = true;
      throw new SriError({
        status: 400,
        errors: [
          {
            code: "batch.invalid.type.mix",
            msg: "A batch array should contain either all objects or all (sub)arrays."
          }
        ]
      });
    });
    if (sriRequest.setHeader) {
      const reqId = httpContext2.get("reqId");
      if (reqId !== void 0) {
        sriRequest.setHeader("vsko-req-id", reqId);
      }
      if (sriRequest.headers["request-server-timing"]) {
        sriRequest.setHeader("Trailer", "Server-Timing");
      }
      sriRequest.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    const stream2 = createReadableStream(true);
    stream2.pipe(JSONStream.stringify()).pipe(sriRequest.outStream, { end: false });
    keepAliveTimer = setInterval(() => {
      sriRequest.outStream.write("");
    }, 15e3);
    const streamEndEmitter = new EventEmitter2();
    const streamDonePromise = pEvent3(streamEndEmitter, "done");
    stream2.on("end", () => streamEndEmitter.emit("done"));
    sriRequest.outStream.write("{");
    sriRequest.outStream.write('"results":');
    if (!sriRequest.dbT)
      throw new Error("sriRequest containsno db transaction to work on");
    const batchResults = _2.flatten(
      yield handleBatchStreaming(reqBody, sriRequest.dbT)
    );
    const status = batchResults.some((e) => e === 403) ? 403 : Math.max(200, ...batchResults);
    stream2.push(null);
    yield streamDonePromise;
    sriRequest.outStream.write(`, "status": ${status}`);
    sriRequest.outStream.write("}\n");
    return { status };
  } finally {
    if (keepAliveTimer !== null) {
      clearInterval(keepAliveTimer);
    }
    global.overloadProtection.endPipeline(batchConcurrency);
  }
});

// js/queryObject.ts
var parameterPattern = "$?$?";
function prepareSQL(name) {
  return {
    name,
    text: "",
    params: [],
    param(x, noQuotes = false) {
      this.params.push(x);
      this.text += parameterPattern;
      if (noQuotes) {
        this.text += ":value";
      }
      return this;
    },
    sql(x) {
      this.text += x;
      return this;
    },
    array(x) {
      if (Array.isArray(x)) {
        for (let i = 0; i < x.length; i++) {
          this.param(x[i]);
          if (i < x.length - 1) {
            this.text += ",";
          }
        }
      }
      return this;
    },
    /**
     * Adds an array of tuples to the SQL statement.
     * @example
     * ```
     * prepareSQL()
     *  .sql('select name from mytable where (name, code) in('))
     *  .arrayOfTuples([['a', 1], ['b', 2], ['c', 3]])
     *  .sql(')');
     *
     * prepareSQL()
     *  .sql('select name from mytable where exists name, code in('))
     *  .arrayOfTuples([['a', 1], ['b', 2], ['c', 3]])
     *  .sql(')');
     * ```
     */
    arrayOfTuples(tuples, cast) {
      tuples.forEach((tuple, i) => {
        this.text += "(";
        tuple.forEach((el, j) => {
          this.param(el);
          if (i === 0 && cast && cast[j]) {
            this.text += `::${cast[j]}`;
          }
          if (j < tuple.length - 1) {
            this.text += ",";
          }
        });
        this.text += ")";
        if (i < tuples.length - 1) {
          this.text += ",";
        }
      });
      return this;
    },
    valueIn(valueRef, values, cast) {
      this.text += ` EXISTS (SELECT 1 FROM (VALUES `;
      this.arrayOfTuples(
        values.map((v) => [v]),
        [cast]
      );
      this.text += `) AS t(v) WHERE t.v = ${valueRef})`;
      return this;
    },
    /**
     * @todo IMPLMENT
     *
     * @param tupleRef
     * @param values
     * @returns
     */
    tupleIn(tupleRef, values, cast) {
      throw new Error("Not implemented");
      return this;
    },
    keys(o) {
      const columnNames = [];
      let key;
      let j;
      for (key in o) {
        if (Object.prototype.hasOwnProperty.call(o, key)) {
          columnNames.push(key);
        }
      }
      let sqlColumnNames2 = "";
      for (j = 0; j < columnNames.length; j++) {
        sqlColumnNames2 += `"${columnNames[j]}"`;
        if (j < columnNames.length - 1) {
          sqlColumnNames2 += ",";
        }
      }
      this.text += sqlColumnNames2;
      return this;
    },
    values(o) {
      let key;
      let firstcolumn = true;
      for (key in o) {
        if (Object.prototype.hasOwnProperty.call(o, key)) {
          if (!firstcolumn) {
            this.text += ",";
          } else {
            firstcolumn = false;
          }
          this.param(o[key]);
        }
      }
      return this;
    },
    with(nonrecursivequery, unionclause, recursivequery, virtualtablename) {
      let tablename;
      let cte;
      let countParamsInCurrentCtes = 0;
      if (nonrecursivequery && unionclause && !recursivequery && !virtualtablename) {
        tablename = unionclause;
        if (this.text.indexOf("WITH RECURSIVE") === -1) {
          this.text = `WITH RECURSIVE ${tablename} AS (${nonrecursivequery.text}) /*LASTCTE*/ ${this.text}`;
        } else {
          cte = `, ${tablename} AS (${nonrecursivequery.text}) /*LASTCTE*/ `;
          const textSplitted = this.text.split("/*LASTCTE*/");
          countParamsInCurrentCtes = (textSplitted[0].match(/\$\?\$\?/g) || []).length;
          this.text = textSplitted.join(cte);
        }
        this.params.splice(countParamsInCurrentCtes, 0, ...nonrecursivequery.params);
      } else if (nonrecursivequery && unionclause && nonrecursivequery && virtualtablename) {
        unionclause = unionclause.toLowerCase().trim();
        if (unionclause === "union" || unionclause === "union all") {
          if (this.text.indexOf("WITH RECURSIVE") === -1) {
            this.text = `WITH RECURSIVE ${virtualtablename} AS (${nonrecursivequery.text} ${unionclause} ${recursivequery.text}) /*LASTCTE*/ ${this.text}`;
          } else {
            cte = `, ${virtualtablename} AS (${nonrecursivequery.text} ${unionclause} ${recursivequery.text}) /*LASTCTE*/ `;
            const textSplitted = this.text.split("/*LASTCTE*/");
            countParamsInCurrentCtes = (textSplitted[0].match(/\$\?\$\?/g) || []).length;
            this.text = textSplitted.join(cte);
          }
          this.params.splice(
            countParamsInCurrentCtes,
            0,
            ...nonrecursivequery.params.concat(recursivequery.params)
          );
        } else {
          throw new Error("Must use UNION or UNION ALL as union-clause");
        }
        tablename = virtualtablename;
      } else {
        throw new Error("Parameter combination not supported...");
      }
      return this;
    },
    toParameterizedSql() {
      let { text } = this;
      const values = this.params;
      let paramCount = 1;
      if (values && values.length > 0) {
        for (let i = 0; i < values.length; i++) {
          const index3 = text.indexOf(parameterPattern);
          if (index3 === -1) {
            const msg = "Parameter count in query does not add up. Too few parameters in the query string";
            error(`** ${msg}`);
            throw new Error(msg);
          } else {
            const prefix = text.substring(0, index3);
            const postfix = text.substring(index3 + parameterPattern.length, text.length);
            text = `${prefix}$${paramCount}${postfix}`;
            paramCount += 1;
          }
        }
        const index2 = text.indexOf(parameterPattern);
        if (index2 !== -1) {
          const msg = "Parameter count in query does not add up. Extra parameters in the query string.";
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
    }
  };
}

// js/queryUtils.ts
var queryUtils_exports = {};
__export(queryUtils_exports, {
  defaultFilter: () => defaultFilter,
  filterHrefs: () => filterHrefs,
  filterReferencedType: () => filterReferencedType,
  modifiedSince: () => modifiedSince
});

// js/defaultFilter.ts
function analyseParameter(parameter) {
  let key = parameter;
  let operator;
  let prefix;
  let postfix;
  let path2;
  let matches;
  const pattern = /^(.*?)(CaseSensitive)?(Not)?(Greater(OrEqual)?|After|Less(OrEqual)?|Before|In|RegEx|Contains|Overlaps)?$/;
  if ((matches = key.match(pattern)) !== null) {
    key = matches[1];
    prefix = matches[2];
    postfix = matches[3];
    operator = matches[4];
  }
  if (parameter.indexOf(".") > -1 && parameter.indexOf("$$meta") == -1) {
    path2 = key;
    key = parameter.split(".")[0];
  }
  return {
    key,
    operator,
    prefix,
    postfix,
    path: path2
  };
}
function filterString(select, filter, value2, mapping, baseType, _field) {
  let values;
  const not = filter.postfix === "Not";
  const sensitive = filter.prefix === "CaseSensitive";
  const tablename = tableFromMapping(mapping);
  if (filter.operator === "Greater" && not && sensitive || filter.operator === "Less" && !not && sensitive) {
    select.sql(` AND ("${tablename}"."${filter.key}"::text COLLATE "C") < `).param(value2);
  } else if (filter.operator === "Greater" && !not && sensitive || filter.operator === "Less" && not && sensitive) {
    select.sql(` AND ("${tablename}"."${filter.key}"::text COLLATE "C") > `).param(value2);
  } else if (filter.operator === "Greater" && not && !sensitive || filter.operator === "Less" && !not && !sensitive) {
    select.sql(` AND LOWER("${tablename}"."${filter.key}"::text) < LOWER(`).param(value2).sql(")");
  } else if (filter.operator === "Greater" && !not && !sensitive || filter.operator === "Less" && not && !sensitive) {
    select.sql(` AND LOWER("${tablename}"."${filter.key}"::text) > LOWER(`).param(value2).sql(")");
  } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && not && sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && !not && sensitive) {
    select.sql(` AND ("${tablename}"."${filter.key}"::text COLLATE "C") <= `).param(value2);
  } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && !not && sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && not && sensitive) {
    select.sql(` AND ("${tablename}"."${filter.key}"::text COLLATE "C") >= `).param(value2);
  } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && not && !sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && !not && !sensitive) {
    select.sql(` AND LOWER("${tablename}"."${filter.key}"::text) <= LOWER(`).param(value2).sql(")");
  } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && !not && !sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && not && !sensitive) {
    select.sql(` AND LOWER("${tablename}"."${filter.key}"::text) >= LOWER(`).param(value2).sql(")");
  } else if (filter.operator === "In" && not && sensitive) {
    values = value2.split(",");
    select.sql(` AND ( NOT `).valueIn(`"${tablename}"."${filter.key}"::text`, values).sql(` OR "${tablename}"."${filter.key}"::text IS NULL )`);
  } else if (filter.operator === "In" && !not && sensitive) {
    values = value2.split(",");
    select.sql(` AND `).valueIn(`"${tablename}"."${filter.key}"::text`, values);
  } else if (filter.operator === "In" && not && !sensitive) {
    values = value2.split(",").map((v) => v.toLowerCase());
    select.sql(` AND ( NOT `).valueIn(`LOWER("${tablename}"."${filter.key}"::text)`, values).sql(` OR "${tablename}"."${filter.key}"::text IS NULL )`);
  } else if (filter.operator === "In" && !not && !sensitive) {
    values = value2.split(",").map((v) => v.toLowerCase());
    select.sql(` AND `).valueIn(`LOWER("${tablename}"."${filter.key}"::text)`, values);
  } else if (filter.operator === "RegEx" && not && sensitive) {
    select.sql(` AND "${tablename}"."${filter.key}"::text !~ `).param(value2);
  } else if (filter.operator === "RegEx" && !not && sensitive) {
    select.sql(` AND "${tablename}"."${filter.key}"::text ~ `).param(value2);
  } else if (filter.operator === "RegEx" && not && !sensitive) {
    select.sql(` AND "${tablename}"."${filter.key}"::text !~* `).param(value2);
  } else if (filter.operator === "RegEx" && !not && !sensitive) {
    select.sql(` AND "${tablename}"."${filter.key}"::text ~* `).param(value2);
  } else if (filter.operator === "Contains" && not && sensitive) {
    select.sql(` AND ("${tablename}"."${filter.key}"::text NOT LIKE `).param(`%${value2}%`).sql(` OR ${filter.key}::text IS NULL)`);
  } else if (filter.operator === "Contains" && !not && sensitive) {
    select.sql(` AND "${tablename}"."${filter.key}"::text LIKE `).param(`%${value2}%`);
  } else if (filter.operator === "Contains" && not && !sensitive) {
    select.sql(` AND ("${tablename}"."${filter.key}"::text NOT ILIKE `).param(`%${value2}%`).sql(` OR ${filter.key}::text IS NULL)`);
  } else if (filter.operator === "Contains" && !not && !sensitive) {
    select.sql(` AND "${tablename}"."${filter.key}"::text ILIKE `).param(`%${value2}%`);
  } else if (not && sensitive) {
    select.sql(` AND ("${tablename}"."${filter.key}"::text <> `).param(value2).sql(` OR ${filter.key}::text IS NULL)`);
  } else if (!not && sensitive) {
    select.sql(` AND "${tablename}"."${filter.key}"::text = `).param(value2);
  } else if (not && !sensitive) {
    select.sql(` AND (LOWER("${tablename}"."${filter.key}"::text) <> `).param(value2.toLowerCase()).sql(` OR ${filter.key}::text IS NULL)`);
  } else {
    select.sql(` AND LOWER("${tablename}"."${filter.key}"::text) = `).param(value2.toLowerCase());
  }
}
function filterNumericOrTimestamp(select, filter, value2, _mapping, baseType, _field) {
  const isTimestamp = baseType === "timestamp";
  if (!filter.postfix && filter.operator === "Less" || filter.operator === "Greater" && filter.postfix === "Not") {
    select.sql(` AND "${filter.key}" < `).param(value2);
  } else if (!filter.postfix && (filter.operator === "LessOrEqual" || filter.operator === "Before") || (filter.operator === "GreaterOrEqual" || filter.operator === "After") && filter.postfix === "Not") {
    select.sql(` AND "${filter.key}" <= `).param(value2);
  } else if (!filter.postfix && filter.operator === "Greater" || filter.operator === "Less" && filter.postfix === "Not") {
    select.sql(` AND "${filter.key}" > `).param(value2);
  } else if (!filter.postfix && (filter.operator === "GreaterOrEqual" || filter.operator === "After") || (filter.operator === "LessOrEqual" || filter.operator === "Before") && filter.postfix === "Not") {
    select.sql(` AND ("${filter.key}" >= `).param(value2);
    if (isTimestamp) {
      select.sql(` OR "${filter.key}" IS NULL)`);
    } else {
      select.sql(")");
    }
  } else if (filter.operator === "In") {
    const parseFunc = isTimestamp ? (v) => v : Number.parseFloat;
    if (filter.postfix === "Not") {
      select.sql(` AND ( NOT `).valueIn(
        isTimestamp ? `${filter.key}::timestamptz` : filter.key,
        value2.split(",").map((v) => parseFunc(v)),
        isTimestamp ? "timestamptz" : void 0
      ).sql(` OR "${filter.key}" IS NULL )`);
    } else {
      select.sql(` AND`).valueIn(
        filter.key,
        value2.split(",").map((v) => parseFunc(v)),
        isTimestamp ? "timestamptz" : void 0
      );
    }
  } else if (filter.postfix === "Not") {
    select.sql(` AND "${filter.key}" <> `).param(value2);
  } else {
    select.sql(` AND "${filter.key}" = `).param(value2);
  }
}
function filterArray(select, filter, value2, _mapping, _baseType, field) {
  const values = value2.split(",");
  if (values.length > 0) {
    if (filter.postfix === "Not") {
      select.sql(" AND NOT (");
    } else {
      select.sql(" AND (");
    }
    if (filter.operator === "Overlaps") {
      select.sql("ARRAY[").array(values).sql(`]::${field.element_type}[] && "${filter.key}"`);
    } else if (filter.operator === "Contains" || filter.operator === "In") {
      select.sql("ARRAY[").array(values).sql(`]::${field.element_type}[] <@ "${filter.key}"`);
    } else if (filter.operator === void 0) {
      select.sql("( ARRAY[").array(values).sql(`]::${field.element_type}[] <@ "${filter.key}"`).sql("AND ARRAY[").array(values).sql(`]::${field.element_type}[] @> "${filter.key}" )`);
    } else {
      throw new SriError({
        status: 400,
        errors: [
          {
            code: "invalid.array.filter",
            parameter: filter.operator,
            message: "Invalid array filter operator."
          }
        ]
      });
    }
    select.sql(")");
  }
}
function filterBoolean(select, filter, value2, _mapping, _baseType, _field) {
  if (value2 !== "any") {
    if (filter.postfix === "Not") {
      select.sql(" AND NOT ");
    } else {
      select.sql(" AND ");
    }
    select.sql(`"${filter.key}" = `).param(value2);
  }
}
function filterJson(select, filter, value2, mapping, _baseType, _field) {
  const { path: path2 } = filter;
  if (path2 == null) {
    throw new SriError({
      status: 404,
      errors: [
        {
          code: "invalid.query.property",
          parameter: filter.key,
          message: "There is no valid path defined, use '.' to define path."
        }
      ]
    });
  } else {
    let jsonKey = "";
    path2.split(".").forEach((part) => {
      if (jsonKey === "") {
        jsonKey = `"${part}"`;
      } else {
        jsonKey = `(${jsonKey})::json->>'${part}'`;
      }
    });
    jsonKey = `(${jsonKey})`;
    const not = filter.postfix === "Not";
    const sensitive = filter.prefix === "CaseSensitive";
    const tablename = tableFromMapping(mapping);
    if (filter.operator === "Greater" && not && sensitive || filter.operator === "Less" && !not && sensitive) {
      select.sql(` AND ${jsonKey}::text < `).param(value2);
    } else if (filter.operator === "Greater" && !not && sensitive || filter.operator === "Less" && not && sensitive) {
      select.sql(` AND ${jsonKey}::text > `).param(value2);
    } else if (filter.operator === "Greater" && not && !sensitive || filter.operator === "Less" && !not && !sensitive) {
      select.sql(` AND LOWER(${jsonKey}::text) < LOWER(`).param(value2).sql(")");
    } else if (filter.operator === "Greater" && !not && !sensitive || filter.operator === "Less" && not && !sensitive) {
      select.sql(` AND LOWER(${jsonKey}::text) > LOWER(`).param(value2).sql(")");
    } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && not && sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && !not && sensitive) {
      select.sql(` AND ${jsonKey}::text <= `).param(value2);
    } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && !not && sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && not && sensitive) {
      select.sql(` AND ${jsonKey}::text >= `).param(value2);
    } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && not && !sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && !not && !sensitive) {
      select.sql(` AND LOWER(${jsonKey}::text) <= LOWER(`).param(value2).sql(")");
    } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && !not && !sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && not && !sensitive) {
      select.sql(` AND LOWER(${jsonKey}::text) >= LOWER(`).param(value2).sql(")");
    } else if (filter.operator === "In" && not && sensitive) {
      const values = value2.split(",");
      select.sql(` AND ( NOT `).valueIn(`${jsonKey}::text`, values).sql(` OR ${filter.key}::text IS NULL )`);
    } else if (filter.operator === "In" && !not && sensitive) {
      const values = value2.split(",");
      select.sql(` AND `).valueIn(`${jsonKey}::text`, values);
    } else if (filter.operator === "In" && not && !sensitive) {
      const values = value2.split(",").map((v) => v.toLowerCase());
      select.sql(` AND ( NOT `).valueIn(`LOWER(${jsonKey}::text)`, values).sql(` OR ${filter.key}::text IS NULL )`);
    } else if (filter.operator === "In" && !not && !sensitive) {
      const values = value2.split(",").map((v) => v.toLowerCase());
      select.sql(` AND `).valueIn(`LOWER(${jsonKey}::text)`, values);
    } else if (filter.operator === "RegEx" && not && sensitive) {
      select.sql(` AND ${jsonKey}::text !~ `).param(value2);
    } else if (filter.operator === "RegEx" && !not && sensitive) {
      select.sql(` AND ${jsonKey}::text ~ `).param(value2);
    } else if (filter.operator === "RegEx" && not && !sensitive) {
      select.sql(` AND ${jsonKey}::text !~* `).param(value2);
    } else if (filter.operator === "RegEx" && !not && !sensitive) {
      select.sql(` AND ${jsonKey}::text ~* `).param(value2);
    } else if (filter.operator === "Contains" && not && sensitive) {
      select.sql(` AND (${jsonKey}::text NOT LIKE `).param(`%${value2}%`).sql(` OR ${filter.key}::text IS NULL)`);
    } else if (filter.operator === "Contains" && !not && sensitive) {
      select.sql(` AND ${jsonKey}::text LIKE `).param(`%${value2}%`);
    } else if (filter.operator === "Contains" && not && !sensitive) {
      select.sql(` AND (${jsonKey}::text NOT ILIKE `).param(`%${value2}%`).sql(` OR ${filter.key}::text IS NULL)`);
    } else if (filter.operator === "Contains" && !not && !sensitive) {
      select.sql(` AND ${jsonKey}::text ILIKE `).param(`%${value2}%`);
    } else if (not && sensitive) {
      select.sql(` AND (${jsonKey}::text <> `).param(value2).sql(` OR ${filter.key}::text IS NULL)`);
    } else if (!not && sensitive) {
      select.sql(` AND ${jsonKey}::text = `).param(value2);
    } else if (not && !sensitive) {
      select.sql(` AND (LOWER(${jsonKey}::text) <> `).param(value2.toLowerCase()).sql(` OR ${filter.key}::text IS NULL)`);
    } else {
      select.sql(` AND LOWER(${jsonKey}::text) = `).param(value2.toLowerCase());
    }
  }
}
function getTextFieldsFromTable(informationSchema2) {
  const textFields = [];
  let field;
  let type;
  for (field in informationSchema2) {
    if (Object.prototype.hasOwnProperty.call(informationSchema2, field)) {
      type = informationSchema2[field].type;
      if (type === "text" || type === "varchar" || type === "character varying" || type === "char" || type === "character" || type === "uuid") {
        textFields.push(field);
      }
    }
  }
  return textFields;
}
function filterFieldByValues(select, value2, textFields) {
  let i;
  select.sql(" AND (");
  for (i = 0; i < textFields.length; i++) {
    if (i > 0) {
      select.sql(" OR ");
    }
    select.sql(`"${textFields[i]}"::text ILIKE `).param(`%${value2}%`);
  }
  select.sql(")");
}
function filterGeneral(select, value2, textFields) {
  const values = value2.split(/[ +]/);
  let i;
  for (i = 0; i < values.length; i++) {
    filterFieldByValues(select, values[i], textFields);
  }
}
function getFieldBaseType(fieldType) {
  const type = fieldType.trim().toLowerCase();
  if (type.match(/^timestamp/) || type === "date") {
    return "timestamp";
  }
  if (type === "array") {
    return "array";
  }
  if (type === "boolean") {
    return "boolean";
  }
  if (type === "text" || type === "varchar" || type === "character varying" || type === "char" || type === "character" || type === "uuid") {
    return "text";
  }
  if (type === "numeric" || type === "integer" || type === "bigint" || type === "smallint" || type === "decimal" || type === "real" || type === "double precision" || type === "smallserial" || type === "serial" || type === "bigserial") {
    return "numeric";
  }
  if (type === "jsonb" || type === "json") {
    return "json";
  }
  return null;
}
function defaultFilter(valueEnc, query, parameter, _tx, _doCount, mapping, _urlParameters) {
  var _a, _b;
  const value2 = decodeURIComponent(valueEnc);
  const filter = analyseParameter(parameter);
  const { informationSchema: informationSchema2 } = global.sri4node_configuration;
  const idx = mapping.type;
  const field = (_a = informationSchema2 == null ? void 0 : informationSchema2[idx][filter.key]) != null ? _a : null;
  if (field) {
    const baseType = getFieldBaseType(field.type);
    let filterFn;
    if (baseType === "text") {
      filterFn = filterString;
    } else if (baseType === "numeric" || baseType === "timestamp") {
      filterFn = filterNumericOrTimestamp;
    } else if (baseType === "array") {
      filterFn = filterArray;
    } else if (baseType === "boolean") {
      filterFn = filterBoolean;
    } else if (baseType === "json") {
      filterFn = filterJson;
    }
    if (filterFn) {
      filterFn(query, filter, value2, mapping, baseType, field);
    }
  } else if (filter.key === "q") {
    filterGeneral(query, value2, getTextFieldsFromTable(informationSchema2 == null ? void 0 : informationSchema2[idx]));
  } else {
    throw new SriError({
      status: 404,
      errors: [
        {
          code: "invalid.query.parameter",
          parameter,
          possibleParameters: Object.keys((_b = informationSchema2 == null ? void 0 : informationSchema2[idx]) != null ? _b : {})
        }
      ]
    });
  }
}

// js/queryUtils.ts
function filterHrefs(href, query, _parameter, _tx, _doCount, mapping, _urlParameters) {
  const table = tableFromMapping(mapping);
  if (href) {
    const permalinks = href.split(",");
    const keys = [];
    permalinks.forEach((permalink2) => {
      const key = permalink2.split("/")[permalink2.split("/").length - 1];
      keys.push(key);
    });
    query.sql(` and ${table}.key in (`).array(keys).sql(") ");
  }
}
function filterReferencedType(resourcetype, columnname) {
  return function(value2, query) {
    if (value2) {
      const permalinks = value2.split(",");
      const keys = permalinks.map((permalink2) => {
        if (permalink2.indexOf(`${resourcetype}/`) !== 0) {
          throw new SriError({
            status: 400,
            errors: [
              {
                code: "parameter.referenced.type.invalid.value",
                msg: `Parameter '${columnname}' should start with '${`${resourcetype}/`}'.`,
                parameter: columnname,
                value: permalink2
              }
            ]
          });
        }
        const key = permalink2.split("/")[permalink2.split("/").length - 1];
        return key;
      });
      query.sql(` and "${columnname}" in (`).array(keys).sql(") ");
    }
  };
}
function modifiedSince(value2, query, _parameter, _tx, _doCount, mapping, _urlParameters) {
  const table = tableFromMapping(mapping);
  query.sql(` AND ${table}."$$meta.modified" >= `).param(value2);
  return query;
}

// js/mapUtils.ts
var mapUtils_exports = {};
__export(mapUtils_exports, {
  base64enc: () => base64enc,
  now: () => now,
  parse: () => parse,
  remove: () => remove,
  removeifnull: () => removeifnull,
  stringify: () => stringify,
  value: () => value
});
function removeifnull(key, e) {
  if (e[key] == null) {
    delete e[key];
  }
}
function remove(key, e) {
  delete e[key];
}
function now(key, e) {
  e[key] = (/* @__PURE__ */ new Date()).toISOString();
}
function value(value2) {
  return function(key, e) {
    e[key] = value2;
  };
}
function parse(key, e) {
  e[key] = JSON.parse(e[key]);
}
function stringify(key, e) {
  e[key] = JSON.stringify(e[key]);
}
function base64enc(key, e) {
  if (e[key] !== null) {
    e[key] = e[key].toString("base64");
  }
}

// js/informationSchema.ts
import _3 from "lodash";
function informationSchema(db, sriConfig) {
  return __async(this, null, function* () {
    var _a;
    const tableNames = _3.uniq(sriConfig.resources.map((mapping) => tableFromMapping(mapping)));
    const query = prepareSQL("information-schema");
    const { schema, statement_timeout } = sriConfig.databaseConnectionParameters;
    let schemaParam = "public";
    if (Array.isArray(schema)) {
      schemaParam = schema[0];
    } else if (typeof schema === "function") {
      schemaParam = ((_a = yield schema(db)) == null ? void 0 : _a.toString()) || schemaParam;
    } else if (schema) {
      schemaParam = schema;
    }
    query.sql(
      `SELECT c.table_name, c.column_name, c.data_type, e.data_type AS element_type from information_schema.columns c
          LEFT JOIN information_schema.element_types e
            ON ((c.table_catalog, c.table_schema, c.table_name, 'TABLE', c.dtd_identifier)
                      = (e.object_catalog, e.object_schema, e.object_name, e.object_type, e.collection_type_identifier))
          WHERE table_schema = `
    ).param(schemaParam).sql(` AND`).valueIn("c.table_name", tableNames);
    const timeoutForCheckQueries = Math.max(
      5e3,
      typeof statement_timeout === "number" ? statement_timeout : 5e3
    );
    const rowsByTable = _3.groupBy(yield pgExec(db, query, void 0, timeoutForCheckQueries), (r) => r.table_name);
    return Object.fromEntries(
      sriConfig.resources.filter((mapping) => !mapping.onlyCustom).map((mapping) => {
        return [
          mapping.type,
          Object.fromEntries(
            rowsByTable[tableFromMapping(mapping)].map((c) => [
              c.column_name,
              { type: c.data_type, element_type: c.element_type }
            ])
          )
        ];
      })
    );
  });
}

// js/listResource.ts
import _5 from "lodash";
import pMap5 from "p-map";
import pFilter from "p-filter";
import url4 from "url";

// js/expand.ts
import _4 from "lodash";
import pMap4 from "p-map";
var checkRecurse = (expandpath) => {
  const parts = expandpath.split(".");
  if (parts.length > 1) {
    return { expand: _4.first(parts), recurse: true, recursepath: _4.tail(parts).join(".") };
  }
  return { expand: expandpath, recurse: false };
};
function executeSingleExpansion(db, sriRequest, elements, mapping, resources, expandpath) {
  return __async(this, null, function* () {
    var _a;
    if (elements && elements.length > 0) {
      const { expand, recurse, recursepath } = checkRecurse(expandpath);
      if (!((_a = mapping.map) == null ? void 0 : _a[expand])) {
        debug("trace", `expand - rejecting expand value [${expand}]`);
        throw new SriError({
          status: 404,
          errors: [
            { code: "expansion.failed", msg: `Cannot expand [${expand}] because it is not mapped.` }
          ]
        });
      } else {
        const keysToExpand = elements.reduce((acc, element) => {
          if (element[expand]) {
            const targetlink = element[expand].href;
            const targetkey = _4.last(targetlink.split("/"));
            if (!acc.includes(targetkey) && !element[expand].$$expanded) {
              acc.push(targetkey);
            }
          }
          return acc;
        }, []);
        if (keysToExpand.length > 0) {
          const targetType = mapping.map[expand].references;
          const typeToMapping2 = typeToConfig(resources);
          const targetMapping = typeToMapping2[targetType];
          if (targetMapping === void 0) {
            throw new SriError({
              status: 400,
              errors: [
                {
                  code: "expand.across.boundary",
                  msg: "Only references to resources defined in the same sri4node configuration as the referer can be expanded."
                }
              ]
            });
          }
          const table = tableFromMapping(targetMapping);
          const columns = sqlColumnNames(targetMapping);
          const query = prepareSQL();
          query.sql(`select ${columns} from "${table}" where key in (`).array(keysToExpand).sql(")");
          const rows = yield pgExec(db, query);
          debug("trace", "expand - expansion query done");
          const expandedElements = rows.map((row) => {
            const element = transformRowToObject(row, targetMapping);
            element.$$meta.type = mapping.metaType;
            return element;
          });
          const expandedElementsDict = _4.fromPairs(
            expandedElements.map((obj) => [obj.$$meta.permalink, obj])
          );
          debug("trace", "expand - executing afterRead functions on expanded resources");
          yield applyHooks(
            "after read",
            targetMapping.afterRead,
            (f) => f(
              db,
              sriRequest,
              expandedElements.map((e) => ({
                permalink: e.$$meta.permalink,
                incoming: null,
                stored: e
              }))
            )
          );
          elements.forEach((elem) => {
            if (elem[expand] !== void 0 && elem[expand] !== null) {
              const permalinkToExpand = elem[expand].href;
              elem[expand].$$expanded = expandedElementsDict[permalinkToExpand];
            }
          });
          if (recurse) {
            debug("trace", `expand - recursing to next level of expansion : ${recursepath}`);
            yield executeSingleExpansion(
              db,
              sriRequest,
              expandedElements,
              targetMapping,
              resources,
              recursepath
            );
          } else {
            debug("trace", "expand - executeSingleExpansion resolving");
          }
        }
      }
    }
  });
}
function parseExpand(expand) {
  const paths = expand.split(",");
  let ret;
  if (paths.map((p) => p.toLowerCase()).includes("none")) {
    ret = [];
  } else {
    ret = paths.filter((p) => !["full", "summary", "results"].includes(p.toLowerCase())).map((p) => p.replace(/^results\./, ""));
  }
  debug("trace", `expand - parseExpand() results in : ${ret}`);
  return ret;
}
function executeExpansion(db, sriRequest, elements, mapping) {
  return __async(this, null, function* () {
    const { expand } = sriRequest.query;
    const { resources } = global.sri4node_configuration;
    debug("trace", "expand - executeExpansion()");
    if (expand) {
      const paths = parseExpand(expand);
      if (paths && paths.length > 0) {
        const expandedElements = elements.map((element) => element.$$expanded || element);
        yield pMap4(
          paths,
          (path2) => executeSingleExpansion(db, sriRequest, expandedElements, mapping, resources, path2)
        );
        debug("trace", "expand - expansion done");
      }
    }
  });
}

// js/listResource.ts
var DEFAULT_LIMIT = 30;
var MAX_LIMIT = 500;
function applyRequestParameters(mapping, query, urlparameters, tx, doCount) {
  return __async(this, null, function* () {
    const standardParameters = [
      "orderBy",
      "descending",
      "limit",
      "keyOffset",
      "expand",
      "hrefs",
      "modifiedSince",
      "$$includeCount",
      "offset"
    ];
    if (mapping.query) {
      yield pMap5(
        Object.keys(urlparameters),
        (key) => __async(this, null, function* () {
          var _a, _b;
          const currentUrlParam = urlparameters[key];
          const keyAsString = typeof currentUrlParam === "string" ? currentUrlParam : (currentUrlParam || []).join(",");
          if (!standardParameters.includes(key)) {
            if (((_a = mapping.query) == null ? void 0 : _a[key]) || ((_b = mapping.query) == null ? void 0 : _b.defaultFilter)) {
              if (!mapping.query[key] && mapping.query.defaultFilter) {
                yield mapping.query.defaultFilter(
                  keyAsString,
                  query,
                  key,
                  tx,
                  doCount,
                  mapping,
                  urlparameters
                );
              } else {
                yield mapping.query[key](
                  keyAsString,
                  query,
                  key,
                  tx,
                  doCount,
                  mapping,
                  urlparameters
                );
              }
            } else {
              throw new SriError({
                status: 404,
                errors: [{ code: "unknown.query.parameter", parameter: key }]
              });
            }
          } else if (key === "hrefs" && urlparameters.hrefs) {
            filterHrefs(keyAsString, query, key, tx, doCount, mapping, urlparameters);
          } else if (key === "modifiedSince") {
            modifiedSince(keyAsString, query, key, tx, doCount, mapping, urlparameters);
          }
        }),
        { concurrency: 1 }
      );
    }
  });
}
function getSQLFromListResource(mapping, parameters, doCount, tx, query) {
  return __async(this, null, function* () {
    var _a, _b;
    const table = tableFromMapping(mapping);
    let sql;
    let columns;
    if (((_a = parameters.expand) == null ? void 0 : _a.toLowerCase()) === "none") {
      if (parameters.orderBy) {
        columns = parameters.orderBy.split(",").map((v) => `"${v}"`).join(",");
      } else {
        columns = '"key","$$meta.created"';
      }
    } else {
      columns = sqlColumnNames(mapping, ((_b = parameters.expand) == null ? void 0 : _b.toLowerCase()) === "summary");
    }
    if (doCount) {
      if (parameters["$$meta.deleted"] === "true") {
        sql = `select count(*) from "${table}" where "${table}"."$$meta.deleted" = true `;
      } else if (parameters["$$meta.deleted"] === "any") {
        sql = `select count(*) from "${table}" where 1=1 `;
      } else {
        sql = `select count(*) from "${table}" where "${table}"."$$meta.deleted" = false `;
      }
      query.sql(sql);
    } else {
      if (parameters["$$meta.deleted"] === "true") {
        sql = `select ${columns} from "`;
        sql += `${table}" where "${table}"."$$meta.deleted" = true `;
      } else if (parameters["$$meta.deleted"] === "any") {
        sql = `select ${columns} from "`;
        sql += `${table}" where 1=1 `;
      } else {
        sql = `select ${columns} from "`;
        sql += `${table}" where "${table}"."$$meta.deleted" = false `;
      }
      query.sql(sql);
    }
    debug("trace", "listResource - applying URL parameters to WHERE clause");
    yield applyRequestParameters(mapping, query, parameters, tx, doCount);
  });
}
var applyOrderAndPagingParameters = (query, queryParams, mapping, queryLimit, maxlimit, keyOffset, offset) => {
  const { orderBy, descending } = queryParams;
  let orderKeys = ["$$meta.created", "key"];
  if (orderBy !== void 0) {
    orderKeys = orderBy.split(",");
    const invalidOrderByKeys = orderKeys.filter(
      (k) => k !== "$$meta.created" && k !== "$$meta.modified" && !mapping.map[k]
    );
    if (invalidOrderByKeys.length !== 0) {
      throw new SriError({
        status: 400,
        errors: [
          {
            code: "invalid.orderby.parameter",
            message: `Can not order by [${orderBy}]. Unknown properties: ${invalidOrderByKeys.join(", ")}.`
          }
        ]
      });
    }
  }
  if (keyOffset) {
    const keyValues = keyOffset.split(",");
    if (keyValues.length !== orderKeys.length) {
      throw new SriError({
        status: 400,
        errors: [
          {
            code: "invalid.keyoffset",
            message: `Number of offset key values (${keyValues.length}) does not match number of order keys (${orderKeys.length}).`
          }
        ]
      });
    }
    const table = tableFromMapping(mapping);
    const orderKeyOp = descending === "true" ? "<" : ">";
    query.sql(` AND (${orderKeys.map((k) => `"${table}"."${k}"`).join()}) ${orderKeyOp} (`);
    orderKeys.forEach((_k, idx) => {
      if (idx > 0) {
        query.sql(",");
      }
      query.param(keyValues[idx]);
    });
    query.sql(")");
  }
  query.sql(
    ` order by ${orderKeys.map((k) => `"${k}" ${descending === "true" ? "desc" : "asc"}`).join(",")}`
  );
  const isGetAllExpandNone = queryLimit === "*" && queryParams.expand !== void 0 && queryParams.expand.toLowerCase() === "none";
  if (!isGetAllExpandNone) {
    if (queryLimit > maxlimit || queryLimit === "*") {
      throw new SriError({
        status: 409,
        errors: [
          {
            code: "invalid.limit.parameter",
            type: "ERROR",
            message: `The maximum allowed limit is ${maxlimit}`
          }
        ]
      });
    }
    query.sql(" limit ").param(queryLimit);
  }
  if (offset) {
    if (keyOffset) {
      throw new SriError({
        status: 409,
        errors: [
          {
            code: "offset.and.keyoffset.incompatible",
            type: "ERROR",
            message: 'The parameters "offset" and "keyOffset" cannot be used together'
          }
        ]
      });
    } else {
      query.sql(" offset ").param(offset);
    }
  }
  return orderKeys;
};
var handleListQueryResult = (sriRequest, rows, count, mapping, queryLimit, orderKeys) => {
  const results = [];
  const { originalUrl } = sriRequest;
  const queryParams = sriRequest.query;
  const tableInformation = global.sri4node_configuration.informationSchema[mapping.type];
  rows.forEach((currentrow) => {
    const element = {
      href: `${mapping.type}/${currentrow.key}`
    };
    if (!queryParams.expand || queryParams.expand.toLowerCase() === "full" || queryParams.expand.toLowerCase() === "summary" || queryParams.expand.indexOf("results") === 0) {
      element.$$expanded = transformRowToObject(currentrow, mapping);
      element.$$expanded.$$meta.type = mapping.metaType;
    } else if (queryParams.expand && queryParams.expand.toLowerCase() === "none") {
    } else if (queryParams.expand) {
      const msg = `listResource - expand value unknown : ${queryParams.expand}`;
      debug("trace", msg);
      throw new SriError({
        status: 400,
        errors: [
          {
            code: "parameter.value.unknown",
            msg: `Unknown value [${queryParams.expand}] for 'expand' parameter. The possible values are 'NONE', 'SUMMARY' and 'FULL'.`,
            parameter: "expand",
            value: queryParams.expand,
            possibleValues: ["NONE", "SUMMARY", "FULL"]
          }
        ]
      });
    }
    results.push(element);
  });
  const output = {
    $$meta: {
      schema: `${mapping.type}/schema`,
      docs: `${mapping.type}/docs`
    },
    results
  };
  if (count != null) {
    output.$$meta.count = count;
  }
  const addOrReplaceParameter = (url5, parameter, value2) => {
    if (url5.indexOf(parameter) > 0) {
      return url5.replace(new RegExp(`${parameter}[^&]*`), `${parameter}=${value2}`);
    }
    return `${url5 + (url5.indexOf("?") > 0 ? "&" : "?") + parameter}=${value2}`;
  };
  if (results.length === parseInt(queryLimit, 10) && results.length > 0) {
    const lastElement = queryParams.expand && queryParams.expand.toLowerCase() === "none" ? rows[queryLimit - 1] : results[queryLimit - 1].$$expanded;
    const keyOffset = orderKeys.map((k) => {
      const o = _5.get(lastElement, k);
      if (tableInformation[k].type === "timestamp with time zone") {
        return encodeURIComponent(o);
      } else if (o === null) {
        return null;
      }
      return encodeURIComponent(o.toString());
    }).join(",");
    output.$$meta.next = addOrReplaceParameter(originalUrl, "keyOffset", keyOffset);
  }
  return output;
};
function getListResource(phaseSyncer, tx, sriRequest, mapping) {
  return __async(this, null, function* () {
    const queryParams = sriRequest.query;
    const { type } = mapping;
    const defaultlimit = mapping.defaultlimit || DEFAULT_LIMIT;
    const maxlimit = mapping.maxlimit || MAX_LIMIT;
    const queryLimit = queryParams.limit || defaultlimit;
    const keyOffset = queryParams.keyOffset || "";
    const { offset } = queryParams;
    yield phaseSyncer.phase();
    yield phaseSyncer.phase();
    yield phaseSyncer.phase();
    yield applyHooks("before read", mapping.beforeRead || [], (f) => f(tx, sriRequest), sriRequest);
    yield phaseSyncer.phase();
    debug("trace", `listResource - GET list resource starting${type}`);
    let count = null;
    let rows;
    let orderKeys;
    try {
      let includeCount = mapping.listResultDefaultIncludeCount;
      if (queryParams.$$includeCount !== void 0) {
        includeCount = queryParams.$$includeCount === "true";
      }
      if (includeCount) {
        const countquery = prepareSQL();
        yield getSQLFromListResource(mapping, queryParams, true, tx, countquery);
        debug("trace", "listResource - executing SELECT COUNT query on tx");
        count = yield getCountResult(tx, countquery, sriRequest);
      }
      const query = prepareSQL();
      yield getSQLFromListResource(mapping, queryParams, false, tx, query);
      orderKeys = applyOrderAndPagingParameters(
        query,
        queryParams,
        mapping,
        queryLimit,
        maxlimit,
        keyOffset,
        offset
      );
      debug("trace", "listResource - executing SELECT query on tx");
      rows = yield pgExec(tx, query, sriRequest);
    } catch (error2) {
      if (error2.code === "42703") {
        throw new SriError({ status: 409, errors: [{ code: "invalid.query.parameter" }] });
      } else {
        throw error2;
      }
    }
    sriRequest.containsDeleted = rows.some((r) => r["$$meta.deleted"] === true);
    const output = handleListQueryResult(sriRequest, rows, count, mapping, queryLimit, orderKeys);
    yield phaseSyncer.phase();
    yield phaseSyncer.phase();
    debug("trace", "listResource - executing afterRead functions on results");
    yield applyHooks(
      "after read",
      mapping.afterRead || [],
      (f) => f(
        tx,
        sriRequest,
        output.results.map((e) => {
          if (e.$$expanded) {
            return {
              permalink: e.href,
              incoming: null,
              stored: e.$$expanded
            };
          }
          return {
            permalink: e.href,
            incoming: null,
            stored: null
          };
        })
      ),
      sriRequest
    );
    yield phaseSyncer.phase();
    debug("trace", `listResource - executing expansion : ${queryParams.expand}`);
    yield executeExpansion(tx, sriRequest, output.results, mapping);
    return { status: 200, body: output };
  });
}
var matchUrl = (url5, mapping) => {
  if (url5.match(mapping.listResourceRegex) !== null) {
    return { type: "list" };
  }
  const matchResult = url5.match(mapping.singleResourceRegex);
  if (matchResult !== null) {
    const key = matchResult[1];
    return { type: "single", key };
  }
  throw new SriError({ status: 400, errors: [{ code: "unknown.resource.type", url: url5 }] });
};
function isPartOf(phaseSyncer, tx, sriRequest, mapping) {
  return __async(this, null, function* () {
    yield phaseSyncer.phase();
    yield phaseSyncer.phase();
    yield phaseSyncer.phase();
    yield phaseSyncer.phase();
    yield phaseSyncer.phase();
    if (sriRequest.body.a === void 0 || sriRequest.body.a.href === void 0 || sriRequest.body.b === void 0 || sriRequest.body.b.hrefs === void 0) {
      throw new SriError({
        status: 400,
        errors: [{ code: "a.href.and.b.hrefs.needs.to.specified" }]
      });
    }
    if (Array.isArray(sriRequest.body.a.href)) {
      throw new SriError({ status: 400, errors: [{ code: "a.href.must.be.single.value" }] });
    }
    if (!Array.isArray(sriRequest.body.b.hrefs)) {
      throw new SriError({ status: 400, errors: [{ code: "b.hrefs.must.be.array" }] });
    }
    const urlA = sriRequest.body.a.href;
    const typeA = matchUrl(urlA, mapping);
    const resultList = yield pFilter(sriRequest.body.b.hrefs, (urlB) => __async(this, null, function* () {
      const typeB = matchUrl(urlB, mapping);
      if (typeB.type === "single") {
        if (typeA.type === "single") {
          return typeA.key === typeB.key;
        }
        return false;
      }
      const { query: paramsB } = url4.parse(urlB, true);
      const queryB = prepareSQL();
      try {
        yield getSQLFromListResource(mapping, paramsB, false, tx, queryB);
      } catch (err) {
        throw new SriError({
          status: 400,
          errors: [{ code: "resource.b.raised.error", url: urlB, err }]
        });
      }
      const sqlB = queryB.text;
      const valuesB = queryB.params;
      const query = prepareSQL();
      if (typeA.type === "single") {
        query.sql(
          `SELECT EXISTS ( SELECT key from (${sqlB}) as temp WHERE key='${typeA.key}' )  as result;`
        );
        query.params.push(...valuesB);
      } else {
        const { query: paramsA } = url4.parse(urlA, true);
        const queryA = prepareSQL();
        try {
          yield getSQLFromListResource(mapping, paramsA, false, tx, queryA);
        } catch (err) {
          throw new SriError({
            status: 400,
            errors: [{ code: "resource.a.raised.error", url: urlA, err }]
          });
        }
        const sqlA = queryA.text;
        const valuesA = queryA.params;
        query.sql(
          `SELECT NOT EXISTS ( SELECT key from (${sqlA}) as a WHERE NOT EXISTS (SELECT 1 FROM (${sqlB}) as b WHERE a.key = b.key)) as result;`
        );
        query.params.push(...valuesA);
        query.params.push(...valuesB);
      }
      const [{ result }] = yield pgExec(tx, query, sriRequest);
      return result;
    }));
    yield phaseSyncer.phase();
    yield phaseSyncer.phase();
    return { status: 200, body: resultList };
  });
}

// js/regularResource.ts
import _6 from "lodash";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import jsonPatch from "fast-json-patch";
import pMap6 from "p-map";
var ajv = new Ajv({ coerceTypes: true });
addFormats(ajv);
var makeMultiError = (type) => () => new SriError({
  status: 409,
  errors: [
    {
      code: `multi.${type}.failed`,
      msg: `An error occurred during multi row ${type}. There is no indication which request(s)/row(s) caused the error, to find out more information retry with individual ${type}s.`
    }
  ]
});
var multiInsertError = makeMultiError("insert");
var multiUpdateError = makeMultiError("update");
var multiDeleteError = makeMultiError("delete");
function queryByKeyRequestKey(sriRequest, mapping, key) {
  var _a;
  debug("trace", `queryByKeyRequestKey(${key})`);
  const { type } = mapping;
  const parentSriRequest = getParentSriRequest(sriRequest);
  if (findPropertyInJsonSchema(mapping.schema, "key") && mapping.validateKey) {
    const validKey = mapping.validateKey(key);
    if (!validKey) {
      throw new SriError({
        status: 400,
        errors: ((_a = mapping.validateKey.errors) == null ? void 0 : _a.map((e) => ({ code: "key.invalid", key, err: e }))) || []
      });
    }
  }
  if (parentSriRequest.queryByKeyFetchList === void 0) {
    parentSriRequest.queryByKeyFetchList = {};
  }
  if (parentSriRequest.queryByKeyFetchList[type] === void 0) {
    parentSriRequest.queryByKeyFetchList[type] = [];
  }
  parentSriRequest.queryByKeyFetchList[type].push(key);
}
function queryByKeyGetResult(sriRequest, mapping, key, wantsDeleted) {
  debug("trace", `queryByKeyGetResult(${key})`);
  const { type } = mapping;
  const parentSriRequest = getParentSriRequest(sriRequest);
  if (parentSriRequest.queryByKeyResults === void 0 || parentSriRequest.queryByKeyResults[type] === void 0) {
    const msg = `The function queryByKey did not produce the expected output for key ${key} and type ${type}`;
    error(msg);
    throw new SriError({
      status: 500,
      errors: [
        {
          code: "fetching.key.failed",
          type,
          key,
          msg
        }
      ]
    });
  }
  const row = parentSriRequest.queryByKeyResults[type][key];
  if (row !== void 0) {
    if (row["$$meta.deleted"] && !wantsDeleted) {
      return { code: "resource.gone" };
    }
    return { code: "found", object: transformRowToObject(row, mapping) };
  }
  return { code: "not.found" };
}
var beforePhaseQueryByKey = function(sriRequestMap, _jobMap, _pendingJobs) {
  return __async(this, null, function* () {
    const sriRequest = getParentSriRequestFromRequestMap(sriRequestMap);
    if (sriRequest.queryByKeyFetchList !== void 0) {
      const types = Object.keys(sriRequest.queryByKeyFetchList);
      const results = yield pMap6(
        types,
        (type) => __async(this, null, function* () {
          const keys = sriRequest.queryByKeyFetchList[type];
          const table = tableFromMapping(typeToMapping(type));
          const columns = sqlColumnNames(typeToMapping(type));
          const query = prepareSQL(`select-rows-by-key-from-${table}`);
          const keyDbType = global.sri4node_configuration.informationSchema[type].key.type;
          query.sql(
            `SELECT ${columns}
                       FROM UNNEST(`
          ).param(keys).sql(`::${keyDbType}[]) "key"
                       INNER JOIN "${table}" USING ("key");`);
          const rows = yield pgExec(sriRequest.dbT, query);
          return Object.fromEntries(rows.map((r) => [r.key, r]));
        }),
        { concurrency: 3 }
      );
      sriRequest.queryByKeyResults = Object.fromEntries(_6.zip(types, results));
      delete sriRequest.queryByKeyFetchList;
    }
  });
};
function getRegularResource(phaseSyncer, tx, sriRequest, mapping) {
  return __async(this, null, function* () {
    const { key } = sriRequest.params;
    yield phaseSyncer.phase();
    yield phaseSyncer.phase();
    yield phaseSyncer.phase();
    yield applyHooks("before read", mapping.beforeRead || [], (f) => f(tx, sriRequest), sriRequest);
    yield phaseSyncer.phase();
    queryByKeyRequestKey(sriRequest, mapping, key);
    yield phaseSyncer.phase();
    const result = queryByKeyGetResult(
      sriRequest,
      mapping,
      key,
      sriRequest.query["$$meta.deleted"] === "true" || sriRequest.query["$$meta.deleted"] === "any"
    );
    if (result.code == "resource.gone") {
      throw new SriError({
        status: 410,
        errors: [{ code: "resource.gone", msg: "Resource is gone" }]
      });
    } else if (result.code == "not.found") {
      throw new SriError({ status: 404, errors: [{ code: "not.found", msg: "Not Found" }] });
    }
    const element = result.object;
    sriRequest.containsDeleted = element.$$meta.deleted;
    element.$$meta.type = mapping.metaType;
    debug("trace", "* executing expansion");
    yield executeExpansion(tx, sriRequest, [element], mapping);
    yield phaseSyncer.phase();
    debug("trace", "* executing afterRead functions on results");
    yield applyHooks(
      "after read",
      mapping.afterRead || [],
      (f) => f(tx, sriRequest, [
        {
          permalink: element.$$meta.permalink,
          incoming: null,
          stored: element
        }
      ]),
      sriRequest
    );
    yield phaseSyncer.phase();
    return { status: 200, body: element };
  });
}
function getSchemaValidationErrors(json, schema, validateSchema) {
  const valid = validateSchema(json);
  if (!valid) {
    console.log("Schema validation revealed errors.");
    console.log(validateSchema.errors);
    console.log("JSON schema was : ");
    console.log(JSON.stringify(schema, null, 2));
    console.log("Document was : ");
    console.log(JSON.stringify(json, null, 2));
    return (validateSchema.errors || []).map((e) => ({
      code: errorAsCode(e.message || ""),
      err: e
    }));
  }
  return null;
}
function preparePatchInsideTransaction(phaseSyncer, tx, sriRequest, mapping) {
  return __async(this, null, function* () {
    const { key } = sriRequest.params;
    const patch = sriRequest.body || [];
    debug("trace", `PATCH processing starting key ${key}`);
    queryByKeyRequestKey(sriRequest, mapping, key);
    yield phaseSyncer.phase();
    const result = queryByKeyGetResult(sriRequest, mapping, key, false);
    if (result.code !== "found") {
      throw new SriError({
        status: 410,
        errors: [{ code: "resource.gone", msg: "Resource is gone" }]
      });
    }
    try {
      sriRequest.body = jsonPatch.applyPatch(result.object, patch, true, false).newDocument;
      debug("trace", `Patched resource looks like this: ${JSON.stringify(sriRequest.body, null, 2)}`);
    } catch (e) {
      throw new SriError({
        status: 400,
        errors: [{ code: "patch.invalid", msg: "The patch could not be applied.", error: e }]
      });
    }
    return preparePutInsideTransaction(phaseSyncer, tx, sriRequest, mapping, result);
  });
}
function preparePutInsideTransaction(phaseSyncer, tx, sriRequest, mapping, previousQueriedByKey = void 0) {
  return __async(this, null, function* () {
    const key = sriRequest.params.key;
    const obj = sriRequest.body;
    const table = tableFromMapping(mapping);
    debug("trace", `PUT processing starting for key ${key}`);
    if (obj.key !== void 0 && obj.key.toString() !== key) {
      throw new SriError({
        status: 400,
        errors: [
          { code: "key.mismatch", msg: "Key in the request url does not match the key in the body." }
        ]
      });
    }
    Object.keys(obj).forEach((k) => {
      if (obj[k] === null) {
        delete obj[k];
      }
    });
    debug("trace", "Validating schema.");
    if (mapping.schema) {
      const hrstart = process.hrtime();
      const validationErrors = getSchemaValidationErrors(obj, mapping.schema, mapping.validateSchema);
      if (validationErrors !== null) {
        const errors = { validationErrors };
        const schemaUrl = `https://${sriRequest.headers["host"]}${mapping.type}/schema`;
        throw new SriError({
          status: 409,
          errors: [{ code: "validation.errors", msg: "Validation error(s)", errors, schemaUrl }]
        });
      } else {
        debug("trace", "Schema validation passed.");
      }
      const hrend = process.hrtime(hrstart);
      setServerTimingHdr(sriRequest, "schema-validation", hrend[0] * 1e3 + hrend[1] / 1e6);
    }
    const permalink2 = mapping.type + "/" + key;
    let result;
    if (previousQueriedByKey !== void 0) {
      result = previousQueriedByKey;
    } else {
      queryByKeyRequestKey(sriRequest, mapping, key);
      yield phaseSyncer.phase();
      result = queryByKeyGetResult(sriRequest, mapping, key, false);
    }
    if (result.code == "resource.gone") {
      const deleteQ = prepareSQL("delete-" + table);
      deleteQ.sql(`delete from "${table}" where "key" = `).param(key);
      const deleteRes = yield pgResult(tx, deleteQ, sriRequest);
      if (deleteRes.rowCount !== 1) {
        debug("trace", "Removal of soft deleted resource failed ?!");
        debug("trace", JSON.stringify(deleteRes));
        throw new SriError({
          status: 500,
          errors: [{ code: "delete.failed", msg: "Removal of soft deleted resource failed." }]
        });
      }
    }
    sriRequest.containsDeleted = false;
    yield phaseSyncer.phase();
    if (result.code != "found") {
      yield applyHooks(
        "before insert",
        mapping.beforeInsert || [],
        (f) => f(tx, sriRequest, [{ permalink: permalink2, incoming: obj, stored: null }]),
        sriRequest
      );
      yield phaseSyncer.phase();
      const newRow = transformObjectToRow(obj, mapping, true);
      newRow.key = key;
      const type = mapping.type;
      const parentSriRequest = getParentSriRequest(sriRequest);
      if (parentSriRequest.putRowsToInsert === void 0) {
        parentSriRequest.putRowsToInsert = {};
      }
      if (parentSriRequest.putRowsToInsert[type] === void 0) {
        parentSriRequest.putRowsToInsert[type] = [];
      }
      if (parentSriRequest.putRowsToInsertIDs === void 0) {
        parentSriRequest.putRowsToInsertIDs = [];
      }
      parentSriRequest.putRowsToInsert[type].push(newRow);
      parentSriRequest.putRowsToInsertIDs.push(sriRequest.id);
      return { opType: "insert", obj, permalink: permalink2 };
    } else {
      const prevObj = result.object;
      yield applyHooks(
        "before update",
        mapping.beforeUpdate || [],
        (f) => f(tx, sriRequest, [{ permalink: permalink2, incoming: obj, stored: prevObj }]),
        sriRequest
      );
      yield phaseSyncer.phase();
      if (isEqualSriObject(prevObj, obj, mapping)) {
        debug("trace", "Putted resource does NOT contain changes -> ignore PUT.");
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        return { retVal: { status: 200 } };
      }
      const updateRow = transformObjectToRow(obj, mapping, false);
      updateRow["$$meta.modified"] = /* @__PURE__ */ new Date();
      const type = mapping.type;
      const parentSriRequest = getParentSriRequest(sriRequest);
      if (parentSriRequest.putRowsToUpdate === void 0) {
        parentSriRequest.putRowsToUpdate = {};
      }
      if (parentSriRequest.putRowsToUpdate[type] === void 0) {
        parentSriRequest.putRowsToUpdate[type] = [];
      }
      if (parentSriRequest.putRowsToUpdateIDs === void 0) {
        parentSriRequest.putRowsToUpdateIDs = [];
      }
      parentSriRequest.putRowsToUpdate[type].push(updateRow);
      parentSriRequest.putRowsToUpdateIDs.push(sriRequest.id);
      return { opType: "update", obj, prevObj, permalink: permalink2 };
    }
  });
}
function beforePhaseInsertUpdateDelete(sriRequestMap, _jobMap, _pendingJobs) {
  return __async(this, null, function* () {
    const sriRequest = getParentSriRequestFromRequestMap(sriRequestMap);
    const throwIfDbTUndefined = (sriReq) => {
      if ((sriReq == null ? void 0 : sriReq.dbT) === void 0) {
        throw new Error("[beforePhaseInsertUpdateDelete] Expected sriRequest.dbT to be defined");
      }
    };
    throwIfDbTUndefined(sriRequest);
    const pgp2 = getPgp();
    delete sriRequest.multiInsertFailed;
    delete sriRequest.multiUpdateFailed;
    delete sriRequest.multiDeleteFailed;
    const putRowsToInsert = sriRequest.putRowsToInsert;
    if (putRowsToInsert !== void 0) {
      const types = Object.keys(putRowsToInsert);
      yield pMap6(types, (type) => __async(this, null, function* () {
        var _a;
        const rows = putRowsToInsert[type];
        const table = tableFromMapping(typeToMapping(type));
        const cs = global.sri4node_configuration.pgColumns[table].insert;
        const query = pgp2.helpers.insert(rows, cs);
        try {
          yield (_a = sriRequest.dbT) == null ? void 0 : _a.none(query);
        } catch (err) {
          sriRequest.multiInsertFailed = true;
          if (err.code === "25P02") {
            sriRequest.multiDeleteError = err;
          }
          if (rows.length === 1) {
            sriRequest.multiInsertError = err;
          }
        }
      }));
    }
    sriRequest.putRowsToInsert = void 0;
    const putRowsToUpdate = sriRequest.putRowsToUpdate;
    if (putRowsToUpdate !== void 0) {
      const types = Object.keys(putRowsToUpdate);
      yield pMap6(types, (type) => __async(this, null, function* () {
        var _a;
        const rows = putRowsToUpdate[type];
        const table = tableFromMapping(typeToMapping(type));
        const cs = global.sri4node_configuration.pgColumns[table].update;
        const keyDbType = global.sri4node_configuration.informationSchema[type].key.type;
        const update = `${pgp2.helpers.update(rows, cs)} WHERE "$$meta.deleted" = false AND v.key::${keyDbType} = t.key::${keyDbType}`;
        try {
          yield (_a = sriRequest.dbT) == null ? void 0 : _a.none(update);
        } catch (err) {
          sriRequest.multiUpdateFailed = true;
          if (err.code === "25P02") {
            sriRequest.multiDeleteError = err;
          }
          if (rows.length === 1) {
            sriRequest.multiUpdateError = err;
          }
        }
      }));
    }
    sriRequest.putRowsToUpdate = void 0;
    const rowsToDelete = sriRequest.rowsToDelete;
    if (rowsToDelete !== void 0) {
      const types = Object.keys(rowsToDelete);
      yield pMap6(types, (type) => __async(this, null, function* () {
        var _a;
        const rows = rowsToDelete[type];
        const table = tableFromMapping(typeToMapping(type));
        const cs = global.sri4node_configuration.pgColumns[table].delete;
        const keyDbType = global.sri4node_configuration.informationSchema[type].key.type;
        const update = `${pgp2.helpers.update(rows, cs)} WHERE t."$$meta.deleted" = false AND v.key::${keyDbType} = t.key::${keyDbType}`;
        try {
          yield (_a = sriRequest.dbT) == null ? void 0 : _a.none(update);
        } catch (err) {
          sriRequest.multiDeleteFailed = true;
          if (err.code === "25P02") {
            sriRequest.multiDeleteError = err;
          }
          if (rows.length === 1) {
            sriRequest.multiDeleteError = err;
          }
        }
      }));
    }
    sriRequest.rowsToDelete = void 0;
  });
}
function handlePutResult(phaseSyncer, sriRequest, mapping, state) {
  return __async(this, null, function* () {
    const parentSriRequest = getParentSriRequest(sriRequest);
    if (state.opType === "insert") {
      if (parentSriRequest.multiInsertFailed) {
        if (parentSriRequest.multiInsertError !== void 0) {
          const err = parentSriRequest.multiInsertError;
          throw err;
        } else {
          throw multiInsertError();
        }
      }
      yield phaseSyncer.phase();
      yield applyHooks(
        "after insert",
        mapping.afterInsert,
        (f) => f(sriRequest.dbT, sriRequest, [
          { permalink: state.permalink, incoming: state.obj, stored: null }
        ]),
        sriRequest
      );
      yield phaseSyncer.phase();
      return { status: 201 };
    }
    if (parentSriRequest.multiUpdateFailed) {
      if (parentSriRequest.multiUpdateError !== void 0) {
        const err = parentSriRequest.multiUpdateError;
        throw err;
      } else {
        throw multiUpdateError();
      }
    }
    yield phaseSyncer.phase();
    yield applyHooks(
      "after update",
      mapping.afterUpdate || [],
      (f) => f(sriRequest.dbT, sriRequest, [
        { permalink: state.permalink, incoming: state.obj, stored: state.prevObj }
      ]),
      sriRequest
    );
    yield phaseSyncer.phase();
    return { status: 200 };
  });
}
function createOrUpdateRegularResource(phaseSyncer, tx, sriRequest, mapping) {
  return __async(this, null, function* () {
    var _a, _b;
    yield phaseSyncer.phase();
    debug("trace", "* sri4node PUT processing invoked.");
    try {
      const state = yield preparePutInsideTransaction(phaseSyncer, tx, sriRequest, mapping);
      if (state.retVal !== void 0) {
        return state.retVal;
      }
      yield phaseSyncer.phase();
      const retVal = yield handlePutResult(phaseSyncer, sriRequest, mapping, state);
      return retVal;
    } catch (err) {
      if (err.constraint !== void 0) {
        throw new SriError({
          status: 409,
          errors: [{ code: "db.constraint.violation", msg: err.detail }]
        });
      } else {
        if (!(err instanceof SriError || ((_b = (_a = err == null ? void 0 : err.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name))) {
          throw new SriError({ status: 500, errors: [{ code: "sql.error", msg: err.message, err }] });
        }
        throw err;
      }
    }
  });
}
function patchRegularResource(phaseSyncer, tx, sriRequest, mapping) {
  return __async(this, null, function* () {
    yield phaseSyncer.phase();
    debug("trace", "* sri4node PATCH processing invoked.");
    try {
      const state = yield preparePatchInsideTransaction(phaseSyncer, tx, sriRequest, mapping);
      if (state.retVal !== void 0) {
        return state.retVal;
      }
      yield phaseSyncer.phase();
      const retVal = yield handlePutResult(phaseSyncer, sriRequest, mapping, state);
      return retVal;
    } catch (err) {
      if (err.constraint !== void 0) {
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
        console.log(err);
        console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
        throw new SriError({
          status: 409,
          errors: [{ code: "db.constraint.violation", msg: err.detail }]
        });
      } else {
        throw err;
      }
    }
  });
}
function deleteRegularResource(phaseSyncer, tx, sriRequest, mapping) {
  return __async(this, null, function* () {
    try {
      yield phaseSyncer.phase();
      debug("trace", "sri4node DELETE invoked");
      const { key } = sriRequest.params;
      queryByKeyRequestKey(sriRequest, mapping, key);
      yield phaseSyncer.phase();
      const result = queryByKeyGetResult(
        sriRequest,
        mapping,
        key,
        sriRequest.query["$$meta.deleted"] === "true" || sriRequest.query["$$meta.deleted"] === "any"
      );
      if (result.code != "found") {
        debug("trace", "No row affected - the resource is already gone");
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
      } else {
        sriRequest.containsDeleted = false;
        yield phaseSyncer.phase();
        const prevObj = result.object;
        yield applyHooks(
          "before delete",
          mapping.beforeDelete || [],
          (f) => f(tx, sriRequest, [{ permalink: sriRequest.path, incoming: null, stored: prevObj }]),
          sriRequest
        );
        yield phaseSyncer.phase();
        const deleteRow = {
          key,
          "$$meta.modified": /* @__PURE__ */ new Date(),
          "$$meta.deleted": true
        };
        const { type } = mapping;
        const parentSriRequest = getParentSriRequest(sriRequest);
        if (parentSriRequest.rowsToDelete === void 0) {
          parentSriRequest.rowsToDelete = {};
        }
        if (parentSriRequest.rowsToDelete[type] === void 0) {
          parentSriRequest.rowsToDelete[type] = [];
        }
        if (parentSriRequest.rowsToDeleteIDs === void 0) {
          parentSriRequest.rowsToDeleteIDs = [];
        }
        parentSriRequest.rowsToDelete[type].push(deleteRow);
        parentSriRequest.rowsToDeleteIDs.push(sriRequest.id);
        yield phaseSyncer.phase();
        if (parentSriRequest.multiDeleteFailed) {
          if (parentSriRequest.multiDeleteError !== void 0) {
            if (parentSriRequest.multiDeleteError.code === "25P02") {
              throw new SriError({
                status: 202,
                errors: [
                  {
                    code: "transaction.failed",
                    msg: "Request cancelled due to database error generated by accompanying request in batch."
                  }
                ]
              });
            }
            const err = parentSriRequest.multiDeleteError;
            throw err;
          } else {
            throw multiDeleteError();
          }
        }
        yield phaseSyncer.phase();
        yield applyHooks(
          "after delete",
          mapping.afterDelete || [],
          (f) => f(tx, sriRequest, [{ permalink: sriRequest.path, incoming: null, stored: prevObj }]),
          sriRequest
        );
      }
      yield phaseSyncer.phase();
      return { status: 200 };
    } catch (err) {
      if (err.constraint !== void 0) {
        throw new SriError({
          status: 409,
          errors: [{ code: "db.constraint.violation", msg: err.detail }]
        });
      } else {
        throw err;
      }
    }
  });
}

// js/utilLib.ts
import pMap7 from "p-map";
function addReferencingResources(type, column, targetkey, excludeOnExpand) {
  return function(tx, sriRequest, elements) {
    return __async(this, null, function* () {
      const { resources } = global.sri4node_configuration;
      const typeToMapping2 = typeToConfig(resources);
      const mapping = typeToMapping2[type];
      if (Array.isArray(sriRequest.query.expand)) {
        throw new SriError({
          status: 500,
          errors: [
            {
              code: "multiple.expand.query.parameters.not.allowed",
              msg: 'Only one "expand" query parameter value can be specified.'
            }
          ]
        });
      }
      const expand = sriRequest.query.expand ? sriRequest.query.expand.toLowerCase() : "full";
      if (elements && elements.length && elements.length > 0 && expand !== "none" && (Array.isArray(excludeOnExpand) && !excludeOnExpand.includes(expand) || !Array.isArray(excludeOnExpand))) {
        const tablename = type.split("/")[type.split("/").length - 1];
        const query = prepareSQL();
        const elementKeys = [];
        const elementKeysToElement = {};
        elements.forEach(({ stored: element }) => {
          const { permalink: permalink2 } = element.$$meta;
          const elementKey = permalink2.split("/")[2];
          elementKeys.push(elementKey);
          elementKeysToElement[elementKey] = element;
          element[targetkey] = [];
        });
        query.sql(`select *, "${column}" as fkey from ${tablename} where "${column}" in (`).array(elementKeys).sql(') and "$$meta.deleted" = false');
        const rows = yield pgExec(tx, query);
        yield pMap7(rows, (row) => __async(this, null, function* () {
          const element = elementKeysToElement[row.fkey];
          const target = { href: `${type}/${row.key}` };
          target.$$expanded = yield transformRowToObject(row, mapping);
          element[targetkey].push(target);
        }));
      }
    });
  };
}

// js/overloadProtection.ts
function overloadProtectionFactory(config) {
  let usedPipelines = 0;
  let extraDrop = 0;
  return {
    canAccept: () => {
      if (config !== void 0) {
        debug(
          "overloadProtection",
          `overloadProtection - canAccept ${extraDrop} - ${usedPipelines} - ${config.maxPipelines}`
        );
        if (extraDrop === 0) {
          return usedPipelines < config.maxPipelines;
        }
        extraDrop -= 1;
        return false;
      }
      return true;
    },
    startPipeline: (nr = 1) => {
      if (config !== void 0) {
        const remainingCap = Math.max(config.maxPipelines - usedPipelines, 1);
        const nrServed = Math.min(nr, remainingCap);
        usedPipelines += nrServed;
        debug(
          "overloadProtection",
          `overloadProtection - startPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`
        );
        return nrServed;
      }
      return null;
    },
    endPipeline: (nr = 1) => {
      if (config !== void 0) {
        usedPipelines -= nr;
        debug(
          "overloadProtection",
          `overloadProtection - endPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`
        );
      }
    },
    addExtraDrops: (nr = 1) => {
      if (config !== void 0) {
        extraDrop += nr;
      }
    }
  };
}

// js/relationsFilter.ts
var relationsFilter_exports = {};
__export(relationsFilter_exports, {
  fromTypes: () => fromTypesFilter,
  froms: () => fromsFilter,
  toTypes: () => toTypesFilter,
  tos: () => tosFilter
});
function fromTypesFilter(value2, select, _key, _database, _doCount, mapping, _urlParameters) {
  var _a, _b;
  let sql;
  let fromCondition;
  let whereCondition;
  let fromTable;
  let types;
  if (value2 && ((_b = (_a = mapping.map) == null ? void 0 : _a.from) == null ? void 0 : _b.references)) {
    fromCondition = select.text.split(" from")[1];
    whereCondition = fromCondition.split("where")[1];
    fromCondition = fromCondition.split("where")[0];
    const table = tableFromMapping(mapping);
    types = value2.split(",").join("','");
    fromTable = mapping.map.from.references.split("/")[mapping.map.from.references.split("/").length - 1];
    sql = select.text.indexOf("count") !== -1 ? `select count(distinct ${table}.*)` : `select distinct ${table}.*`;
    sql += ` from ${fromCondition} JOIN ${fromTable} c on c.key = ${table}.from `;
    sql += ` where ${whereCondition}`;
    sql += ` AND c.type in ('${types}') AND c."$$meta.deleted" = false `;
    select.text = sql;
  }
}
function toTypesFilter(value2, select, _key, _database, _doCount, mapping, _urlParameters) {
  var _a, _b;
  let sql;
  let fromCondition;
  let whereCondition;
  let toTable;
  let types;
  if (value2 && ((_b = (_a = mapping.map) == null ? void 0 : _a.to) == null ? void 0 : _b.references)) {
    fromCondition = select.text.split(" from")[1];
    whereCondition = fromCondition.split("where")[1];
    fromCondition = fromCondition.split("where")[0];
    const table = tableFromMapping(mapping);
    types = value2.split(",").join("','");
    toTable = mapping.map.to.references.split("/")[mapping.map.to.references.split("/").length - 1];
    sql = select.text.indexOf("count") !== -1 ? `select count(distinct ${table}.*)` : `select distinct ${table}.*`;
    sql += ` FROM ${fromCondition} JOIN ${toTable} c2 on c2.key = ${table}.to `;
    sql += ` where ${whereCondition}`;
    sql += ` AND c2.type in ('${types}') AND c2."$$meta.deleted" = false `;
    select.text = sql;
  }
}
function fromsFilter(value2, select, _key, _database, _doCount, mapping, _urlParameters) {
  if (value2) {
    const table = tableFromMapping(mapping);
    const froms = value2.split(",").map((val) => val.split("/")[val.split("/").length - 1]);
    select.sql(` AND ${table}.from in (`).array(froms).sql(")");
  }
}
function tosFilter(value2, select, _key, _database, _doCount, mapping, _urlParameters) {
  if (value2) {
    const table = tableFromMapping(mapping);
    const tos = value2.split(",").map((val) => val.split("/")[val.split("/").length - 1]);
    select.sql(` AND ${table}.to in (`).array(tos).sql(")");
  }
}

// sri4node.ts
import { ServerResponse } from "http";
import { JsonStreamStringify } from "json-stream-stringify";

// js/docs/pugTemplates.ts
import * as pug from "pug";
var index = pug.compile(
  `
doctype html
html(lang='en')
    head
        title API Documentation
        link(href='../docs/static/bootstrap.min.css', rel='stylesheet')
        link(href='../docs/static/custom.css', rel='stylesheet')
    body
        .container
            .header.clearfix
                h3.text-primary API Documentation
            .row.well!= config.description
            .row
                .panel.panel-primary
                    .panel-heading
                        h3.panel-title Resources
                    .panel-body
                        each resource in config.resources
                            .panel.panel-default
                                .panel-heading
                                    h3.panel-title
                                        a(href='#{resource.type }/docs') #{resource.type }
                                    .pull-right(style='margin-top: -20px')
                                        if resource.methods
                                            each method in resource.methods
                                                span.label.label-success(style='margin-left: 5px') #{ method }
                                        else
                                            span.label.label-success(style='margin-left: 5px') GET
                                            span.label.label-success(style='margin-left: 5px') PUT
                                            span.label.label-success(style='margin-left: 5px') DELETE
                                if resource.schema
                                    if resource.schema.title
                                        .panel-body!= resource.schema.title
            .row
                .panel.panel-primary
                    .panel-heading
                        h3.panel-title Endpoints
                    .panel-body
                        .panel.panel-default
                            .panel-heading
                                h3.panel-title
                                    a(href='/me') /me
                                span.label.label-success.pull-right(style='margin-top: -15px') GET
                            .panel-body
                                | Get information about the current user.
                        .panel.panel-default
                            .panel-heading
                                h3.panel-title /batch
                                span.label.label-success.pull-right(style='margin-top: -15px') PUT
                            .panel-body
                                | Send a batch request to the server. You can find more documentation&nbsp;
                                a(href='https://github.com/dimitrydhondt/sri#batch-operations', target='_blank') here
                                | .
                        .panel.panel-default
                            .panel-heading
                                h3.panel-title /log
                                span.label.label-success.pull-right(style='margin-top: -15px') PUT
                            .panel-body
                                | Send logs to the server.
                        .panel.panel-default
                            .panel-heading
                                h3.panel-title
                                    a(href='/resources') /resources
                                span.label.label-success.pull-right(style='margin-top: -15px') GET
                            .panel-body
                                | See all available resources in json format.
                        .panel.panel-default
                            .panel-heading
                                h3.panel-title
                                    a(href='/docs') /docs
                                span.label.label-success.pull-right(style='margin-top: -15px') GET
                            .panel-body
                                | This documentation about the API, generated from the configuration.
            footer.footer
                p
                    | Powered by&nbsp;
                    a(href='https://github.com/dimitrydhondt/sri4node', target='_blank') sir4node
                    |  based on the&nbsp;
                    a(href='https://github.com/dimitrydhondt/sri', target='_blank') sri specification
`,
  {}
);
var resource = pug.compile(
  `
- var $q = queryUtils;

mixin property(key, property, required)
        - if(typeof  required == 'undefined'){ required = []; }
        .panel.panel-default
            .panel-heading
                h3.panel-title
                    if isNaN(key)
                         span #{ key }
                    else
                        span
                    if property.format
                        span.label.label-default.pull-right  #{property.format} (#{property.type})
                    else
                        span.label.label-default.pull-right #{property.type}
                    if required.indexOf(key) != - 1 || key == 'key'
                        span.text-primary *
                    | &nbsp;
                    span.text-muted(style='background-color: transparent;')
                        small #{property.description}
            table.table.table-bordered.table-condensed
                if property.pattern
                    tr
                        td.text-muted(align='right', style='width: 150px')
                            small Pattern
                        td
                            small
                                code.text-muted #{property.pattern}
                if property.minLength || property.maxLength
                    tr
                        td.text-muted(align='right', style='width: 150px')
                            small Length between
                        td
                            small
                                if property.minLength
                                    code.text-muted !{property.minLength}
                                else
                                    code.text-muted 0
                                | &nbsp;-&nbsp;
                                if property.maxLength
                                    code.text-muted !{property.maxLength}
                                else
                                    code.text-muted &mldr;
                if resource.map[key]
                    if resource.map[key].references
                        tr
                            td.text-muted(align='right', style='width: 150px')
                                small Reference
                            td
                                a(href='#{resource.map[key].references}/docs')
                                    small
                                        code.text-muted #{resource.map[key].references}
                if property.enum
                    tr
                        td.text-muted(align='right', style='width: 150px')
                            small Allowed values
                        td
                            small
                                code.text-muted= JSON.stringify(property.enum, null, 1)
                if property.type == 'array' && property.items
                    tr
                        td(style='padding: 15px 15px 0px 15px')
                            +property('', property.items)
                if property.type == 'object' && property.properties
                    tr
                        td.text-muted(align='right', style='width: 150px')
                            small Properties
                        td(style='padding: 15px 15px 0px 15px')
                            each objectProperty, key in property.properties
                                +property(key, objectProperty, property.required)

doctype html
html(lang='en')
    head
        title API Documentation
        link(href='docs/static/bootstrap.min.css', rel='stylesheet')
        link(href='docs/static/custom.css', rel='stylesheet')
    body
        .container
            .header.clearfix
                nav
                    ul.nav.nav-pills.pull-right
                        li(role='presentation')
                            a(href='#{ resource.type }') View resource
                        li(role='presentation')
                            a(href='../docs') Docs home
                h3.text-primary #{ resource.type }
            if resource.schema
                if resource.schema.title
                    .row.well!= resource.schema.title
            .row
                .panel.panel-primary
                    .panel-heading
                        h3.panel-title Properties
                    .panel-body
                        if resource.schema
                            each property, key in resource.schema.properties
                                +property(key, property, resource.schema.required)
            .row
                .panel.panel-primary
                    .panel-heading
                        h3.panel-title Methods
                    .panel-body
                        if resource.methods
                            each method in resource.methods
                                span.label.label-success(style='margin-left: 5px') #{ method }
                        else
                            span.label.label-success(style='margin-left: 5px') GET
                            span.label.label-success(style='margin-left: 5px') PUT
                            span.label.label-success(style='margin-left: 5px') DELETE
            .row
                .panel.panel-primary
                    .panel-heading
                        h3.panel-title URL Parameters
                    .panel-body
                        if resource.query
                            each query, key in resource.query
                                .panel.panel-default
                                    .panel-heading
                                        h3.panel-title #{ key }
                                    if key == 'defaultFilter' && query == $q.defaultFilter
                                        .panel-body
                                            | The default filter gives you the possibility to use filters described in the sri-query specification.
                                            br
                                            | More information about the default filter you can find&nbsp;
                                            a(href='https://github.com/dimitrydhondt/sri-query', target='_blank') here.
                                    else
                                        if resource.queryDocs
                                            if resource.queryDocs[key]
                                                .panel-body!= resource.queryDocs[key]
            .row
                .panel.panel-primary
                    .panel-heading
                        h3.panel-title Validation
                    .panel-body
                        if resource.validateDocs
                            each validate, key in resource.validateDocs
                                .panel.panel-default
                                    .panel-heading
                                        h3.panel-title #{ key }
                                    .panel-body!= validate.description
                                    if validate.errors
                                        table.table.table-bordered
                                            each errors, key in validate.errors
                                                tr
                                                    td.text-muted(align='right')
                                                        small #{errors.code}
                                                    td
                                                        small!= errors.description
            .row
                .panel.panel-primary
                    .panel-heading
                        h3.panel-title Endpoints
                    .panel-body
                        if resource.customroutes
                            each route, key in resource.customroutes
                                .panel.panel-default
                                    .panel-heading
                                        h3.panel-title
                                            a #{ route.route }
                                        span.label.label-success.pull-right(style='margin-left: 5px; margin-top: -15px') #{ route.method }
                                    if route.description
                                        .panel-body
                                            | #{ route.description }
                            .panel.panel-default
                                .panel-heading
                                    h3.panel-title
                                        a(href='#{resource.type}/schema') #{ resource.type }/schema
                                    span.label.label-success.pull-right(style='margin-top: -15px') GET
                                .panel-body
                                    | JSON Schema for #{ resource.type }
                            .panel.panel-default
                                .panel-heading
                                    h3.panel-title #{ resource.type }/docs
                                    span.label.label-success.pull-right(style='margin-top: -15px') GET
                                .panel-body
                                    | This generated documentation about #{ resource.type }.
            footer.footer
                p
                    | Powered by&nbsp;
                    a(href='https://github.com/dimitrydhondt/sri4node', target='_blank') sir4node
                    |  based on the&nbsp;
                    a(href='https://github.com/dimitrydhondt/sri', target='_blank') sri specification
`,
  {}
);
var staticFiles = {
  "bootstrap.min.css": `
    /*!
    * Bootstrap v3.3.5 (http://getbootstrap.com)
    * Copyright 2011-2015 Twitter, Inc.
    * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
    */

    /*!
    * Generated using the Bootstrap Customizer (http://getbootstrap.com/customize/?id=b711f9d20ff56da1436c)
    * Config saved to config.json and https://gist.github.com/b711f9d20ff56da1436c
    *//*!
    * Bootstrap v3.3.5 (http://getbootstrap.com)
    * Copyright 2011-2015 Twitter, Inc.
    * Licensed under MIT (https://github.com/twbs/bootstrap/blob/master/LICENSE)
    *//*! normalize.css v3.0.3 | MIT License | github.com/necolas/normalize.css */html{font-family:sans-serif;-ms-text-size-adjust:100%;-webkit-text-size-adjust:100%}body{margin:0}article,aside,details,figcaption,figure,footer,header,hgroup,main,menu,nav,section,summary{display:block}audio,canvas,progress,video{display:inline-block;vertical-align:baseline}audio:not([controls]){display:none;height:0}[hidden],template{display:none}a{background-color:transparent}a:active,a:hover{outline:0}abbr[title]{border-bottom:1px dotted}b,strong{font-weight:bold}dfn{font-style:italic}h1{font-size:2em;margin:0.67em 0}mark{background:#ff0;color:#000}small{font-size:80%}sub,sup{font-size:75%;line-height:0;position:relative;vertical-align:baseline}sup{top:-0.5em}sub{bottom:-0.25em}img{border:0}svg:not(:root){overflow:hidden}figure{margin:1em 40px}hr{-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box;height:0}pre{overflow:auto}code,kbd,pre,samp{font-family:monospace, monospace;font-size:1em}button,input,optgroup,select,textarea{color:inherit;font:inherit;margin:0}button{overflow:visible}button,select{text-transform:none}button,html input[type="button"],input[type="reset"],input[type="submit"]{-webkit-appearance:button;cursor:pointer}button[disabled],html input[disabled]{cursor:default}button::-moz-focus-inner,input::-moz-focus-inner{border:0;padding:0}input{line-height:normal}input[type="checkbox"],input[type="radio"]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box;padding:0}input[type="number"]::-webkit-inner-spin-button,input[type="number"]::-webkit-outer-spin-button{height:auto}input[type="search"]{-webkit-appearance:textfield;-webkit-box-sizing:content-box;-moz-box-sizing:content-box;box-sizing:content-box}input[type="search"]::-webkit-search-cancel-button,input[type="search"]::-webkit-search-decoration{-webkit-appearance:none}fieldset{border:1px solid #c0c0c0;margin:0 2px;padding:0.35em 0.625em 0.75em}legend{border:0;padding:0}textarea{overflow:auto}optgroup{font-weight:bold}table{border-collapse:collapse;border-spacing:0}td,th{padding:0}*{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}*:before,*:after{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}html{font-size:10px;-webkit-tap-highlight-color:rgba(0,0,0,0)}body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;font-size:14px;line-height:1.42857143;color:#333;background-color:#fff}input,button,select,textarea{font-family:inherit;font-size:inherit;line-height:inherit}a{color:#337ab7;text-decoration:none}a:hover,a:focus{color:#23527c;text-decoration:underline}a:focus{outline:thin dotted;outline:5px auto -webkit-focus-ring-color;outline-offset:-2px}figure{margin:0}img{vertical-align:middle}.img-responsive{display:block;max-width:100%;height:auto}.img-rounded{border-radius:6px}.img-thumbnail{padding:4px;line-height:1.42857143;background-color:#fff;border:1px solid #ddd;border-radius:4px;-webkit-transition:all .2s ease-in-out;-o-transition:all .2s ease-in-out;transition:all .2s ease-in-out;display:inline-block;max-width:100%;height:auto}.img-circle{border-radius:50%}hr{margin-top:20px;margin-bottom:20px;border:0;border-top:1px solid #eee}.sr-only{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip:rect(0, 0, 0, 0);border:0}.sr-only-focusable:active,.sr-only-focusable:focus{position:static;width:auto;height:auto;margin:0;overflow:visible;clip:auto}[role="button"]{cursor:pointer}h1,h2,h3,h4,h5,h6,.h1,.h2,.h3,.h4,.h5,.h6{font-family:inherit;font-weight:500;line-height:1.1;color:inherit}h1 small,h2 small,h3 small,h4 small,h5 small,h6 small,.h1 small,.h2 small,.h3 small,.h4 small,.h5 small,.h6 small,h1 .small,h2 .small,h3 .small,h4 .small,h5 .small,h6 .small,.h1 .small,.h2 .small,.h3 .small,.h4 .small,.h5 .small,.h6 .small{font-weight:normal;line-height:1;color:#777}h1,.h1,h2,.h2,h3,.h3{margin-top:20px;margin-bottom:10px}h1 small,.h1 small,h2 small,.h2 small,h3 small,.h3 small,h1 .small,.h1 .small,h2 .small,.h2 .small,h3 .small,.h3 .small{font-size:65%}h4,.h4,h5,.h5,h6,.h6{margin-top:10px;margin-bottom:10px}h4 small,.h4 small,h5 small,.h5 small,h6 small,.h6 small,h4 .small,.h4 .small,h5 .small,.h5 .small,h6 .small,.h6 .small{font-size:75%}h1,.h1{font-size:36px}h2,.h2{font-size:30px}h3,.h3{font-size:24px}h4,.h4{font-size:18px}h5,.h5{font-size:14px}h6,.h6{font-size:12px}p{margin:0 0 10px}.lead{margin-bottom:20px;font-size:16px;font-weight:300;line-height:1.4}@media (min-width:768px){.lead{font-size:21px}}small,.small{font-size:85%}mark,.mark{background-color:#fcf8e3;padding:.2em}.text-left{text-align:left}.text-right{text-align:right}.text-center{text-align:center}.text-justify{text-align:justify}.text-nowrap{white-space:nowrap}.text-lowercase{text-transform:lowercase}.text-uppercase{text-transform:uppercase}.text-capitalize{text-transform:capitalize}.text-muted{color:#777}.text-primary{color:#337ab7}a.text-primary:hover,a.text-primary:focus{color:#286090}.text-success{color:#3c763d}a.text-success:hover,a.text-success:focus{color:#2b542c}.text-info{color:#31708f}a.text-info:hover,a.text-info:focus{color:#245269}.text-warning{color:#8a6d3b}a.text-warning:hover,a.text-warning:focus{color:#66512c}.text-danger{color:#a94442}a.text-danger:hover,a.text-danger:focus{color:#843534}.bg-primary{color:#fff;background-color:#337ab7}a.bg-primary:hover,a.bg-primary:focus{background-color:#286090}.bg-success{background-color:#dff0d8}a.bg-success:hover,a.bg-success:focus{background-color:#c1e2b3}.bg-info{background-color:#d9edf7}a.bg-info:hover,a.bg-info:focus{background-color:#afd9ee}.bg-warning{background-color:#fcf8e3}a.bg-warning:hover,a.bg-warning:focus{background-color:#f7ecb5}.bg-danger{background-color:#f2dede}a.bg-danger:hover,a.bg-danger:focus{background-color:#e4b9b9}.page-header{padding-bottom:9px;margin:40px 0 20px;border-bottom:1px solid #eee}ul,ol{margin-top:0;margin-bottom:10px}ul ul,ol ul,ul ol,ol ol{margin-bottom:0}.list-unstyled{padding-left:0;list-style:none}.list-inline{padding-left:0;list-style:none;margin-left:-5px}.list-inline>li{display:inline-block;padding-left:5px;padding-right:5px}dl{margin-top:0;margin-bottom:20px}dt,dd{line-height:1.42857143}dt{font-weight:bold}dd{margin-left:0}@media (min-width:768px){.dl-horizontal dt{float:left;width:160px;clear:left;text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dl-horizontal dd{margin-left:180px}}abbr[title],abbr[data-original-title]{cursor:help;border-bottom:1px dotted #777}.initialism{font-size:90%;text-transform:uppercase}blockquote{padding:10px 20px;margin:0 0 20px;font-size:17.5px;border-left:5px solid #eee}blockquote p:last-child,blockquote ul:last-child,blockquote ol:last-child{margin-bottom:0}blockquote footer,blockquote small,blockquote .small{display:block;font-size:80%;line-height:1.42857143;color:#777}blockquote footer:before,blockquote small:before,blockquote .small:before{content:'\\2014 \\00A0'}.blockquote-reverse,blockquote.pull-right{padding-right:15px;padding-left:0;border-right:5px solid #eee;border-left:0;text-align:right}.blockquote-reverse footer:before,blockquote.pull-right footer:before,.blockquote-reverse small:before,blockquote.pull-right small:before,.blockquote-reverse .small:before,blockquote.pull-right .small:before{content:''}.blockquote-reverse footer:after,blockquote.pull-right footer:after,.blockquote-reverse small:after,blockquote.pull-right small:after,.blockquote-reverse .small:after,blockquote.pull-right .small:after{content:'\\00A0 \\2014'}address{margin-bottom:20px;font-style:normal;line-height:1.42857143}code,kbd,pre,samp{font-family:Menlo,Monaco,Consolas,"Courier New",monospace}code{padding:2px 4px;font-size:90%;color:#c7254e;background-color:#f9f2f4;border-radius:4px}kbd{padding:2px 4px;font-size:90%;color:#fff;background-color:#333;border-radius:3px;-webkit-box-shadow:inset 0 -1px 0 rgba(0,0,0,0.25);box-shadow:inset 0 -1px 0 rgba(0,0,0,0.25)}kbd kbd{padding:0;font-size:100%;font-weight:bold;-webkit-box-shadow:none;box-shadow:none}pre{display:block;padding:9.5px;margin:0 0 10px;font-size:13px;line-height:1.42857143;word-break:break-all;word-wrap:break-word;color:#333;background-color:#f5f5f5;border:1px solid #ccc;border-radius:4px}pre code{padding:0;font-size:inherit;color:inherit;white-space:pre-wrap;background-color:transparent;border-radius:0}.pre-scrollable{max-height:340px;overflow-y:scroll}table{background-color:transparent}caption{padding-top:8px;padding-bottom:8px;color:#777;text-align:left}th{text-align:left}.table{width:100%;max-width:100%;margin-bottom:20px}.table>thead>tr>th,.table>tbody>tr>th,.table>tfoot>tr>th,.table>thead>tr>td,.table>tbody>tr>td,.table>tfoot>tr>td{padding:8px;line-height:1.42857143;vertical-align:top;border-top:1px solid #ddd}.table>thead>tr>th{vertical-align:bottom;border-bottom:2px solid #ddd}.table>caption+thead>tr:first-child>th,.table>colgroup+thead>tr:first-child>th,.table>thead:first-child>tr:first-child>th,.table>caption+thead>tr:first-child>td,.table>colgroup+thead>tr:first-child>td,.table>thead:first-child>tr:first-child>td{border-top:0}.table>tbody+tbody{border-top:2px solid #ddd}.table .table{background-color:#fff}.table-condensed>thead>tr>th,.table-condensed>tbody>tr>th,.table-condensed>tfoot>tr>th,.table-condensed>thead>tr>td,.table-condensed>tbody>tr>td,.table-condensed>tfoot>tr>td{padding:5px}.table-bordered{border:1px solid #ddd}.table-bordered>thead>tr>th,.table-bordered>tbody>tr>th,.table-bordered>tfoot>tr>th,.table-bordered>thead>tr>td,.table-bordered>tbody>tr>td,.table-bordered>tfoot>tr>td{border:1px solid #ddd}.table-bordered>thead>tr>th,.table-bordered>thead>tr>td{border-bottom-width:2px}.table-striped>tbody>tr:nth-of-type(odd){background-color:#f9f9f9}.table-hover>tbody>tr:hover{background-color:#f5f5f5}table col[class*="col-"]{position:static;float:none;display:table-column}table td[class*="col-"],table th[class*="col-"]{position:static;float:none;display:table-cell}.table>thead>tr>td.active,.table>tbody>tr>td.active,.table>tfoot>tr>td.active,.table>thead>tr>th.active,.table>tbody>tr>th.active,.table>tfoot>tr>th.active,.table>thead>tr.active>td,.table>tbody>tr.active>td,.table>tfoot>tr.active>td,.table>thead>tr.active>th,.table>tbody>tr.active>th,.table>tfoot>tr.active>th{background-color:#f5f5f5}.table-hover>tbody>tr>td.active:hover,.table-hover>tbody>tr>th.active:hover,.table-hover>tbody>tr.active:hover>td,.table-hover>tbody>tr:hover>.active,.table-hover>tbody>tr.active:hover>th{background-color:#e8e8e8}.table>thead>tr>td.success,.table>tbody>tr>td.success,.table>tfoot>tr>td.success,.table>thead>tr>th.success,.table>tbody>tr>th.success,.table>tfoot>tr>th.success,.table>thead>tr.success>td,.table>tbody>tr.success>td,.table>tfoot>tr.success>td,.table>thead>tr.success>th,.table>tbody>tr.success>th,.table>tfoot>tr.success>th{background-color:#dff0d8}.table-hover>tbody>tr>td.success:hover,.table-hover>tbody>tr>th.success:hover,.table-hover>tbody>tr.success:hover>td,.table-hover>tbody>tr:hover>.success,.table-hover>tbody>tr.success:hover>th{background-color:#d0e9c6}.table>thead>tr>td.info,.table>tbody>tr>td.info,.table>tfoot>tr>td.info,.table>thead>tr>th.info,.table>tbody>tr>th.info,.table>tfoot>tr>th.info,.table>thead>tr.info>td,.table>tbody>tr.info>td,.table>tfoot>tr.info>td,.table>thead>tr.info>th,.table>tbody>tr.info>th,.table>tfoot>tr.info>th{background-color:#d9edf7}.table-hover>tbody>tr>td.info:hover,.table-hover>tbody>tr>th.info:hover,.table-hover>tbody>tr.info:hover>td,.table-hover>tbody>tr:hover>.info,.table-hover>tbody>tr.info:hover>th{background-color:#c4e3f3}.table>thead>tr>td.warning,.table>tbody>tr>td.warning,.table>tfoot>tr>td.warning,.table>thead>tr>th.warning,.table>tbody>tr>th.warning,.table>tfoot>tr>th.warning,.table>thead>tr.warning>td,.table>tbody>tr.warning>td,.table>tfoot>tr.warning>td,.table>thead>tr.warning>th,.table>tbody>tr.warning>th,.table>tfoot>tr.warning>th{background-color:#fcf8e3}.table-hover>tbody>tr>td.warning:hover,.table-hover>tbody>tr>th.warning:hover,.table-hover>tbody>tr.warning:hover>td,.table-hover>tbody>tr:hover>.warning,.table-hover>tbody>tr.warning:hover>th{background-color:#faf2cc}.table>thead>tr>td.danger,.table>tbody>tr>td.danger,.table>tfoot>tr>td.danger,.table>thead>tr>th.danger,.table>tbody>tr>th.danger,.table>tfoot>tr>th.danger,.table>thead>tr.danger>td,.table>tbody>tr.danger>td,.table>tfoot>tr.danger>td,.table>thead>tr.danger>th,.table>tbody>tr.danger>th,.table>tfoot>tr.danger>th{background-color:#f2dede}.table-hover>tbody>tr>td.danger:hover,.table-hover>tbody>tr>th.danger:hover,.table-hover>tbody>tr.danger:hover>td,.table-hover>tbody>tr:hover>.danger,.table-hover>tbody>tr.danger:hover>th{background-color:#ebcccc}.table-responsive{overflow-x:auto;min-height:0.01%}@media screen and (max-width:767px){.table-responsive{width:100%;margin-bottom:15px;overflow-y:hidden;-ms-overflow-style:-ms-autohiding-scrollbar;border:1px solid #ddd}.table-responsive>.table{margin-bottom:0}.table-responsive>.table>thead>tr>th,.table-responsive>.table>tbody>tr>th,.table-responsive>.table>tfoot>tr>th,.table-responsive>.table>thead>tr>td,.table-responsive>.table>tbody>tr>td,.table-responsive>.table>tfoot>tr>td{white-space:nowrap}.table-responsive>.table-bordered{border:0}.table-responsive>.table-bordered>thead>tr>th:first-child,.table-responsive>.table-bordered>tbody>tr>th:first-child,.table-responsive>.table-bordered>tfoot>tr>th:first-child,.table-responsive>.table-bordered>thead>tr>td:first-child,.table-responsive>.table-bordered>tbody>tr>td:first-child,.table-responsive>.table-bordered>tfoot>tr>td:first-child{border-left:0}.table-responsive>.table-bordered>thead>tr>th:last-child,.table-responsive>.table-bordered>tbody>tr>th:last-child,.table-responsive>.table-bordered>tfoot>tr>th:last-child,.table-responsive>.table-bordered>thead>tr>td:last-child,.table-responsive>.table-bordered>tbody>tr>td:last-child,.table-responsive>.table-bordered>tfoot>tr>td:last-child{border-right:0}.table-responsive>.table-bordered>tbody>tr:last-child>th,.table-responsive>.table-bordered>tfoot>tr:last-child>th,.table-responsive>.table-bordered>tbody>tr:last-child>td,.table-responsive>.table-bordered>tfoot>tr:last-child>td{border-bottom:0}}fieldset{padding:0;margin:0;border:0;min-width:0}legend{display:block;width:100%;padding:0;margin-bottom:20px;font-size:21px;line-height:inherit;color:#333;border:0;border-bottom:1px solid #e5e5e5}label{display:inline-block;max-width:100%;margin-bottom:5px;font-weight:bold}input[type="search"]{-webkit-box-sizing:border-box;-moz-box-sizing:border-box;box-sizing:border-box}input[type="radio"],input[type="checkbox"]{margin:4px 0 0;margin-top:1px \\9;line-height:normal}input[type="file"]{display:block}input[type="range"]{display:block;width:100%}select[multiple],select[size]{height:auto}input[type="file"]:focus,input[type="radio"]:focus,input[type="checkbox"]:focus{outline:thin dotted;outline:5px auto -webkit-focus-ring-color;outline-offset:-2px}output{display:block;padding-top:7px;font-size:14px;line-height:1.42857143;color:#555}.form-control{display:block;width:100%;height:34px;padding:6px 12px;font-size:14px;line-height:1.42857143;color:#555;background-color:#fff;background-image:none;border:1px solid #ccc;border-radius:4px;-webkit-box-shadow:inset 0 1px 1px rgba(0,0,0,0.075);box-shadow:inset 0 1px 1px rgba(0,0,0,0.075);-webkit-transition:border-color ease-in-out .15s, -webkit-box-shadow ease-in-out .15s;-o-transition:border-color ease-in-out .15s, box-shadow ease-in-out .15s;transition:border-color ease-in-out .15s, box-shadow ease-in-out .15s}.form-control:focus{border-color:#66afe9;outline:0;-webkit-box-shadow:inset 0 1px 1px rgba(0,0,0,.075), 0 0 8px rgba(102, 175, 233, 0.6);box-shadow:inset 0 1px 1px rgba(0,0,0,.075), 0 0 8px rgba(102, 175, 233, 0.6)}.form-control::-moz-placeholder{color:#999;opacity:1}.form-control:-ms-input-placeholder{color:#999}.form-control::-webkit-input-placeholder{color:#999}.form-control[disabled],.form-control[readonly],fieldset[disabled] .form-control{background-color:#eee;opacity:1}.form-control[disabled],fieldset[disabled] .form-control{cursor:not-allowed}textarea.form-control{height:auto}input[type="search"]{-webkit-appearance:none}@media screen and (-webkit-min-device-pixel-ratio:0){input[type="date"].form-control,input[type="time"].form-control,input[type="datetime-local"].form-control,input[type="month"].form-control{line-height:34px}input[type="date"].input-sm,input[type="time"].input-sm,input[type="datetime-local"].input-sm,input[type="month"].input-sm,.input-group-sm input[type="date"],.input-group-sm input[type="time"],.input-group-sm input[type="datetime-local"],.input-group-sm input[type="month"]{line-height:30px}input[type="date"].input-lg,input[type="time"].input-lg,input[type="datetime-local"].input-lg,input[type="month"].input-lg,.input-group-lg input[type="date"],.input-group-lg input[type="time"],.input-group-lg input[type="datetime-local"],.input-group-lg input[type="month"]{line-height:46px}}.form-group{margin-bottom:15px}.radio,.checkbox{position:relative;display:block;margin-top:10px;margin-bottom:10px}.radio label,.checkbox label{min-height:20px;padding-left:20px;margin-bottom:0;font-weight:normal;cursor:pointer}.radio input[type="radio"],.radio-inline input[type="radio"],.checkbox input[type="checkbox"],.checkbox-inline input[type="checkbox"]{position:absolute;margin-left:-20px;margin-top:4px \\9}.radio+.radio,.checkbox+.checkbox{margin-top:-5px}.radio-inline,.checkbox-inline{position:relative;display:inline-block;padding-left:20px;margin-bottom:0;vertical-align:middle;font-weight:normal;cursor:pointer}.radio-inline+.radio-inline,.checkbox-inline+.checkbox-inline{margin-top:0;margin-left:10px}input[type="radio"][disabled],input[type="checkbox"][disabled],input[type="radio"].disabled,input[type="checkbox"].disabled,fieldset[disabled] input[type="radio"],fieldset[disabled] input[type="checkbox"]{cursor:not-allowed}.radio-inline.disabled,.checkbox-inline.disabled,fieldset[disabled] .radio-inline,fieldset[disabled] .checkbox-inline{cursor:not-allowed}.radio.disabled label,.checkbox.disabled label,fieldset[disabled] .radio label,fieldset[disabled] .checkbox label{cursor:not-allowed}.form-control-static{padding-top:7px;padding-bottom:7px;margin-bottom:0;min-height:34px}.form-control-static.input-lg,.form-control-static.input-sm{padding-left:0;padding-right:0}.input-sm{height:30px;padding:5px 10px;font-size:12px;line-height:1.5;border-radius:3px}select.input-sm{height:30px;line-height:30px}textarea.input-sm,select[multiple].input-sm{height:auto}.form-group-sm .form-control{height:30px;padding:5px 10px;font-size:12px;line-height:1.5;border-radius:3px}.form-group-sm select.form-control{height:30px;line-height:30px}.form-group-sm textarea.form-control,.form-group-sm select[multiple].form-control{height:auto}.form-group-sm .form-control-static{height:30px;min-height:32px;padding:6px 10px;font-size:12px;line-height:1.5}.input-lg{height:46px;padding:10px 16px;font-size:18px;line-height:1.3333333;border-radius:6px}select.input-lg{height:46px;line-height:46px}textarea.input-lg,select[multiple].input-lg{height:auto}.form-group-lg .form-control{height:46px;padding:10px 16px;font-size:18px;line-height:1.3333333;border-radius:6px}.form-group-lg select.form-control{height:46px;line-height:46px}.form-group-lg textarea.form-control,.form-group-lg select[multiple].form-control{height:auto}.form-group-lg .form-control-static{height:46px;min-height:38px;padding:11px 16px;font-size:18px;line-height:1.3333333}.has-feedback{position:relative}.has-feedback .form-control{padding-right:42.5px}.form-control-feedback{position:absolute;top:0;right:0;z-index:2;display:block;width:34px;height:34px;line-height:34px;text-align:center;pointer-events:none}.input-lg+.form-control-feedback,.input-group-lg+.form-control-feedback,.form-group-lg .form-control+.form-control-feedback{width:46px;height:46px;line-height:46px}.input-sm+.form-control-feedback,.input-group-sm+.form-control-feedback,.form-group-sm .form-control+.form-control-feedback{width:30px;height:30px;line-height:30px}.has-success .help-block,.has-success .control-label,.has-success .radio,.has-success .checkbox,.has-success .radio-inline,.has-success .checkbox-inline,.has-success.radio label,.has-success.checkbox label,.has-success.radio-inline label,.has-success.checkbox-inline label{color:#3c763d}.has-success .form-control{border-color:#3c763d;-webkit-box-shadow:inset 0 1px 1px rgba(0,0,0,0.075);box-shadow:inset 0 1px 1px rgba(0,0,0,0.075)}.has-success .form-control:focus{border-color:#2b542c;-webkit-box-shadow:inset 0 1px 1px rgba(0,0,0,0.075),0 0 6px #67b168;box-shadow:inset 0 1px 1px rgba(0,0,0,0.075),0 0 6px #67b168}.has-success .input-group-addon{color:#3c763d;border-color:#3c763d;background-color:#dff0d8}.has-success .form-control-feedback{color:#3c763d}.has-warning .help-block,.has-warning .control-label,.has-warning .radio,.has-warning .checkbox,.has-warning .radio-inline,.has-warning .checkbox-inline,.has-warning.radio label,.has-warning.checkbox label,.has-warning.radio-inline label,.has-warning.checkbox-inline label{color:#8a6d3b}.has-warning .form-control{border-color:#8a6d3b;-webkit-box-shadow:inset 0 1px 1px rgba(0,0,0,0.075);box-shadow:inset 0 1px 1px rgba(0,0,0,0.075)}.has-warning .form-control:focus{border-color:#66512c;-webkit-box-shadow:inset 0 1px 1px rgba(0,0,0,0.075),0 0 6px #c0a16b;box-shadow:inset 0 1px 1px rgba(0,0,0,0.075),0 0 6px #c0a16b}.has-warning .input-group-addon{color:#8a6d3b;border-color:#8a6d3b;background-color:#fcf8e3}.has-warning .form-control-feedback{color:#8a6d3b}.has-error .help-block,.has-error .control-label,.has-error .radio,.has-error .checkbox,.has-error .radio-inline,.has-error .checkbox-inline,.has-error.radio label,.has-error.checkbox label,.has-error.radio-inline label,.has-error.checkbox-inline label{color:#a94442}.has-error .form-control{border-color:#a94442;-webkit-box-shadow:inset 0 1px 1px rgba(0,0,0,0.075);box-shadow:inset 0 1px 1px rgba(0,0,0,0.075)}.has-error .form-control:focus{border-color:#843534;-webkit-box-shadow:inset 0 1px 1px rgba(0,0,0,0.075),0 0 6px #ce8483;box-shadow:inset 0 1px 1px rgba(0,0,0,0.075),0 0 6px #ce8483}.has-error .input-group-addon{color:#a94442;border-color:#a94442;background-color:#f2dede}.has-error .form-control-feedback{color:#a94442}.has-feedback label~.form-control-feedback{top:25px}.has-feedback label.sr-only~.form-control-feedback{top:0}.help-block{display:block;margin-top:5px;margin-bottom:10px;color:#737373}@media (min-width:768px){.form-inline .form-group{display:inline-block;margin-bottom:0;vertical-align:middle}.form-inline .form-control{display:inline-block;width:auto;vertical-align:middle}.form-inline .form-control-static{display:inline-block}.form-inline .input-group{display:inline-table;vertical-align:middle}.form-inline .input-group .input-group-addon,.form-inline .input-group .input-group-btn,.form-inline .input-group .form-control{width:auto}.form-inline .input-group>.form-control{width:100%}.form-inline .control-label{margin-bottom:0;vertical-align:middle}.form-inline .radio,.form-inline .checkbox{display:inline-block;margin-top:0;margin-bottom:0;vertical-align:middle}.form-inline .radio label,.form-inline .checkbox label{padding-left:0}.form-inline .radio input[type="radio"],.form-inline .checkbox input[type="checkbox"]{position:relative;margin-left:0}.form-inline .has-feedback .form-control-feedback{top:0}}.form-horizontal .radio,.form-horizontal .checkbox,.form-horizontal .radio-inline,.form-horizontal .checkbox-inline{margin-top:0;margin-bottom:0;padding-top:7px}.form-horizontal .radio,.form-horizontal .checkbox{min-height:27px}.form-horizontal .form-group{margin-left:-15px;margin-right:-15px}@media (min-width:768px){.form-horizontal .control-label{text-align:right;margin-bottom:0;padding-top:7px}}.form-horizontal .has-feedback .form-control-feedback{right:15px}@media (min-width:768px){.form-horizontal .form-group-lg .control-label{padding-top:14.333333px;font-size:18px}}@media (min-width:768px){.form-horizontal .form-group-sm .control-label{padding-top:6px;font-size:12px}}.btn{display:inline-block;margin-bottom:0;font-weight:normal;text-align:center;vertical-align:middle;-ms-touch-action:manipulation;touch-action:manipulation;cursor:pointer;background-image:none;border:1px solid transparent;white-space:nowrap;padding:6px 12px;font-size:14px;line-height:1.42857143;border-radius:4px;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.btn:focus,.btn:active:focus,.btn.active:focus,.btn.focus,.btn:active.focus,.btn.active.focus{outline:thin dotted;outline:5px auto -webkit-focus-ring-color;outline-offset:-2px}.btn:hover,.btn:focus,.btn.focus{color:#333;text-decoration:none}.btn:active,.btn.active{outline:0;background-image:none;-webkit-box-shadow:inset 0 3px 5px rgba(0,0,0,0.125);box-shadow:inset 0 3px 5px rgba(0,0,0,0.125)}.btn.disabled,.btn[disabled],fieldset[disabled] .btn{cursor:not-allowed;opacity:.65;filter:alpha(opacity=65);-webkit-box-shadow:none;box-shadow:none}a.btn.disabled,fieldset[disabled] a.btn{pointer-events:none}.btn-default{color:#333;background-color:#fff;border-color:#ccc}.btn-default:focus,.btn-default.focus{color:#333;background-color:#e6e6e6;border-color:#8c8c8c}.btn-default:hover{color:#333;background-color:#e6e6e6;border-color:#adadad}.btn-default:active,.btn-default.active,.open>.dropdown-toggle.btn-default{color:#333;background-color:#e6e6e6;border-color:#adadad}.btn-default:active:hover,.btn-default.active:hover,.open>.dropdown-toggle.btn-default:hover,.btn-default:active:focus,.btn-default.active:focus,.open>.dropdown-toggle.btn-default:focus,.btn-default:active.focus,.btn-default.active.focus,.open>.dropdown-toggle.btn-default.focus{color:#333;background-color:#d4d4d4;border-color:#8c8c8c}.btn-default:active,.btn-default.active,.open>.dropdown-toggle.btn-default{background-image:none}.btn-default.disabled,.btn-default[disabled],fieldset[disabled] .btn-default,.btn-default.disabled:hover,.btn-default[disabled]:hover,fieldset[disabled] .btn-default:hover,.btn-default.disabled:focus,.btn-default[disabled]:focus,fieldset[disabled] .btn-default:focus,.btn-default.disabled.focus,.btn-default[disabled].focus,fieldset[disabled] .btn-default.focus,.btn-default.disabled:active,.btn-default[disabled]:active,fieldset[disabled] .btn-default:active,.btn-default.disabled.active,.btn-default[disabled].active,fieldset[disabled] .btn-default.active{background-color:#fff;border-color:#ccc}.btn-default .badge{color:#fff;background-color:#333}.btn-primary{color:#fff;background-color:#337ab7;border-color:#2e6da4}.btn-primary:focus,.btn-primary.focus{color:#fff;background-color:#286090;border-color:#122b40}.btn-primary:hover{color:#fff;background-color:#286090;border-color:#204d74}.btn-primary:active,.btn-primary.active,.open>.dropdown-toggle.btn-primary{color:#fff;background-color:#286090;border-color:#204d74}.btn-primary:active:hover,.btn-primary.active:hover,.open>.dropdown-toggle.btn-primary:hover,.btn-primary:active:focus,.btn-primary.active:focus,.open>.dropdown-toggle.btn-primary:focus,.btn-primary:active.focus,.btn-primary.active.focus,.open>.dropdown-toggle.btn-primary.focus{color:#fff;background-color:#204d74;border-color:#122b40}.btn-primary:active,.btn-primary.active,.open>.dropdown-toggle.btn-primary{background-image:none}.btn-primary.disabled,.btn-primary[disabled],fieldset[disabled] .btn-primary,.btn-primary.disabled:hover,.btn-primary[disabled]:hover,fieldset[disabled] .btn-primary:hover,.btn-primary.disabled:focus,.btn-primary[disabled]:focus,fieldset[disabled] .btn-primary:focus,.btn-primary.disabled.focus,.btn-primary[disabled].focus,fieldset[disabled] .btn-primary.focus,.btn-primary.disabled:active,.btn-primary[disabled]:active,fieldset[disabled] .btn-primary:active,.btn-primary.disabled.active,.btn-primary[disabled].active,fieldset[disabled] .btn-primary.active{background-color:#337ab7;border-color:#2e6da4}.btn-primary .badge{color:#337ab7;background-color:#fff}.btn-success{color:#fff;background-color:#5cb85c;border-color:#4cae4c}.btn-success:focus,.btn-success.focus{color:#fff;background-color:#449d44;border-color:#255625}.btn-success:hover{color:#fff;background-color:#449d44;border-color:#398439}.btn-success:active,.btn-success.active,.open>.dropdown-toggle.btn-success{color:#fff;background-color:#449d44;border-color:#398439}.btn-success:active:hover,.btn-success.active:hover,.open>.dropdown-toggle.btn-success:hover,.btn-success:active:focus,.btn-success.active:focus,.open>.dropdown-toggle.btn-success:focus,.btn-success:active.focus,.btn-success.active.focus,.open>.dropdown-toggle.btn-success.focus{color:#fff;background-color:#398439;border-color:#255625}.btn-success:active,.btn-success.active,.open>.dropdown-toggle.btn-success{background-image:none}.btn-success.disabled,.btn-success[disabled],fieldset[disabled] .btn-success,.btn-success.disabled:hover,.btn-success[disabled]:hover,fieldset[disabled] .btn-success:hover,.btn-success.disabled:focus,.btn-success[disabled]:focus,fieldset[disabled] .btn-success:focus,.btn-success.disabled.focus,.btn-success[disabled].focus,fieldset[disabled] .btn-success.focus,.btn-success.disabled:active,.btn-success[disabled]:active,fieldset[disabled] .btn-success:active,.btn-success.disabled.active,.btn-success[disabled].active,fieldset[disabled] .btn-success.active{background-color:#5cb85c;border-color:#4cae4c}.btn-success .badge{color:#5cb85c;background-color:#fff}.btn-info{color:#fff;background-color:#5bc0de;border-color:#46b8da}.btn-info:focus,.btn-info.focus{color:#fff;background-color:#31b0d5;border-color:#1b6d85}.btn-info:hover{color:#fff;background-color:#31b0d5;border-color:#269abc}.btn-info:active,.btn-info.active,.open>.dropdown-toggle.btn-info{color:#fff;background-color:#31b0d5;border-color:#269abc}.btn-info:active:hover,.btn-info.active:hover,.open>.dropdown-toggle.btn-info:hover,.btn-info:active:focus,.btn-info.active:focus,.open>.dropdown-toggle.btn-info:focus,.btn-info:active.focus,.btn-info.active.focus,.open>.dropdown-toggle.btn-info.focus{color:#fff;background-color:#269abc;border-color:#1b6d85}.btn-info:active,.btn-info.active,.open>.dropdown-toggle.btn-info{background-image:none}.btn-info.disabled,.btn-info[disabled],fieldset[disabled] .btn-info,.btn-info.disabled:hover,.btn-info[disabled]:hover,fieldset[disabled] .btn-info:hover,.btn-info.disabled:focus,.btn-info[disabled]:focus,fieldset[disabled] .btn-info:focus,.btn-info.disabled.focus,.btn-info[disabled].focus,fieldset[disabled] .btn-info.focus,.btn-info.disabled:active,.btn-info[disabled]:active,fieldset[disabled] .btn-info:active,.btn-info.disabled.active,.btn-info[disabled].active,fieldset[disabled] .btn-info.active{background-color:#5bc0de;border-color:#46b8da}.btn-info .badge{color:#5bc0de;background-color:#fff}.btn-warning{color:#fff;background-color:#f0ad4e;border-color:#eea236}.btn-warning:focus,.btn-warning.focus{color:#fff;background-color:#ec971f;border-color:#985f0d}.btn-warning:hover{color:#fff;background-color:#ec971f;border-color:#d58512}.btn-warning:active,.btn-warning.active,.open>.dropdown-toggle.btn-warning{color:#fff;background-color:#ec971f;border-color:#d58512}.btn-warning:active:hover,.btn-warning.active:hover,.open>.dropdown-toggle.btn-warning:hover,.btn-warning:active:focus,.btn-warning.active:focus,.open>.dropdown-toggle.btn-warning:focus,.btn-warning:active.focus,.btn-warning.active.focus,.open>.dropdown-toggle.btn-warning.focus{color:#fff;background-color:#d58512;border-color:#985f0d}.btn-warning:active,.btn-warning.active,.open>.dropdown-toggle.btn-warning{background-image:none}.btn-warning.disabled,.btn-warning[disabled],fieldset[disabled] .btn-warning,.btn-warning.disabled:hover,.btn-warning[disabled]:hover,fieldset[disabled] .btn-warning:hover,.btn-warning.disabled:focus,.btn-warning[disabled]:focus,fieldset[disabled] .btn-warning:focus,.btn-warning.disabled.focus,.btn-warning[disabled].focus,fieldset[disabled] .btn-warning.focus,.btn-warning.disabled:active,.btn-warning[disabled]:active,fieldset[disabled] .btn-warning:active,.btn-warning.disabled.active,.btn-warning[disabled].active,fieldset[disabled] .btn-warning.active{background-color:#f0ad4e;border-color:#eea236}.btn-warning .badge{color:#f0ad4e;background-color:#fff}.btn-danger{color:#fff;background-color:#d9534f;border-color:#d43f3a}.btn-danger:focus,.btn-danger.focus{color:#fff;background-color:#c9302c;border-color:#761c19}.btn-danger:hover{color:#fff;background-color:#c9302c;border-color:#ac2925}.btn-danger:active,.btn-danger.active,.open>.dropdown-toggle.btn-danger{color:#fff;background-color:#c9302c;border-color:#ac2925}.btn-danger:active:hover,.btn-danger.active:hover,.open>.dropdown-toggle.btn-danger:hover,.btn-danger:active:focus,.btn-danger.active:focus,.open>.dropdown-toggle.btn-danger:focus,.btn-danger:active.focus,.btn-danger.active.focus,.open>.dropdown-toggle.btn-danger.focus{color:#fff;background-color:#ac2925;border-color:#761c19}.btn-danger:active,.btn-danger.active,.open>.dropdown-toggle.btn-danger{background-image:none}.btn-danger.disabled,.btn-danger[disabled],fieldset[disabled] .btn-danger,.btn-danger.disabled:hover,.btn-danger[disabled]:hover,fieldset[disabled] .btn-danger:hover,.btn-danger.disabled:focus,.btn-danger[disabled]:focus,fieldset[disabled] .btn-danger:focus,.btn-danger.disabled.focus,.btn-danger[disabled].focus,fieldset[disabled] .btn-danger.focus,.btn-danger.disabled:active,.btn-danger[disabled]:active,fieldset[disabled] .btn-danger:active,.btn-danger.disabled.active,.btn-danger[disabled].active,fieldset[disabled] .btn-danger.active{background-color:#d9534f;border-color:#d43f3a}.btn-danger .badge{color:#d9534f;background-color:#fff}.btn-link{color:#337ab7;font-weight:normal;border-radius:0}.btn-link,.btn-link:active,.btn-link.active,.btn-link[disabled],fieldset[disabled] .btn-link{background-color:transparent;-webkit-box-shadow:none;box-shadow:none}.btn-link,.btn-link:hover,.btn-link:focus,.btn-link:active{border-color:transparent}.btn-link:hover,.btn-link:focus{color:#23527c;text-decoration:underline;background-color:transparent}.btn-link[disabled]:hover,fieldset[disabled] .btn-link:hover,.btn-link[disabled]:focus,fieldset[disabled] .btn-link:focus{color:#777;text-decoration:none}.btn-lg{padding:10px 16px;font-size:18px;line-height:1.3333333;border-radius:6px}.btn-sm{padding:5px 10px;font-size:12px;line-height:1.5;border-radius:3px}.btn-xs{padding:1px 5px;font-size:12px;line-height:1.5;border-radius:3px}.btn-block{display:block;width:100%}.btn-block+.btn-block{margin-top:5px}input[type="submit"].btn-block,input[type="reset"].btn-block,input[type="button"].btn-block{width:100%}.nav{margin-bottom:0;padding-left:0;list-style:none}.nav>li{position:relative;display:block}.nav>li>a{position:relative;display:block;padding:10px 15px}.nav>li>a:hover,.nav>li>a:focus{text-decoration:none;background-color:#eee}.nav>li.disabled>a{color:#777}.nav>li.disabled>a:hover,.nav>li.disabled>a:focus{color:#777;text-decoration:none;background-color:transparent;cursor:not-allowed}.nav .open>a,.nav .open>a:hover,.nav .open>a:focus{background-color:#eee;border-color:#337ab7}.nav .nav-divider{height:1px;margin:9px 0;overflow:hidden;background-color:#e5e5e5}.nav>li>a>img{max-width:none}.nav-tabs{border-bottom:1px solid #ddd}.nav-tabs>li{float:left;margin-bottom:-1px}.nav-tabs>li>a{margin-right:2px;line-height:1.42857143;border:1px solid transparent;border-radius:4px 4px 0 0}.nav-tabs>li>a:hover{border-color:#eee #eee #ddd}.nav-tabs>li.active>a,.nav-tabs>li.active>a:hover,.nav-tabs>li.active>a:focus{color:#555;background-color:#fff;border:1px solid #ddd;border-bottom-color:transparent;cursor:default}.nav-tabs.nav-justified{width:100%;border-bottom:0}.nav-tabs.nav-justified>li{float:none}.nav-tabs.nav-justified>li>a{text-align:center;margin-bottom:5px}.nav-tabs.nav-justified>.dropdown .dropdown-menu{top:auto;left:auto}@media (min-width:768px){.nav-tabs.nav-justified>li{display:table-cell;width:1%}.nav-tabs.nav-justified>li>a{margin-bottom:0}}.nav-tabs.nav-justified>li>a{margin-right:0;border-radius:4px}.nav-tabs.nav-justified>.active>a,.nav-tabs.nav-justified>.active>a:hover,.nav-tabs.nav-justified>.active>a:focus{border:1px solid #ddd}@media (min-width:768px){.nav-tabs.nav-justified>li>a{border-bottom:1px solid #ddd;border-radius:4px 4px 0 0}.nav-tabs.nav-justified>.active>a,.nav-tabs.nav-justified>.active>a:hover,.nav-tabs.nav-justified>.active>a:focus{border-bottom-color:#fff}}.nav-pills>li{float:left}.nav-pills>li>a{border-radius:4px}.nav-pills>li+li{margin-left:2px}.nav-pills>li.active>a,.nav-pills>li.active>a:hover,.nav-pills>li.active>a:focus{color:#fff;background-color:#337ab7}.nav-stacked>li{float:none}.nav-stacked>li+li{margin-top:2px;margin-left:0}.nav-justified{width:100%}.nav-justified>li{float:none}.nav-justified>li>a{text-align:center;margin-bottom:5px}.nav-justified>.dropdown .dropdown-menu{top:auto;left:auto}@media (min-width:768px){.nav-justified>li{display:table-cell;width:1%}.nav-justified>li>a{margin-bottom:0}}.nav-tabs-justified{border-bottom:0}.nav-tabs-justified>li>a{margin-right:0;border-radius:4px}.nav-tabs-justified>.active>a,.nav-tabs-justified>.active>a:hover,.nav-tabs-justified>.active>a:focus{border:1px solid #ddd}@media (min-width:768px){.nav-tabs-justified>li>a{border-bottom:1px solid #ddd;border-radius:4px 4px 0 0}.nav-tabs-justified>.active>a,.nav-tabs-justified>.active>a:hover,.nav-tabs-justified>.active>a:focus{border-bottom-color:#fff}}.tab-content>.tab-pane{display:none}.tab-content>.active{display:block}.nav-tabs .dropdown-menu{margin-top:-1px;border-top-right-radius:0;border-top-left-radius:0}.navbar{position:relative;min-height:50px;margin-bottom:20px;border:1px solid transparent}@media (min-width:768px){.navbar{border-radius:4px}}@media (min-width:768px){.navbar-header{float:left}}.navbar-collapse{overflow-x:visible;padding-right:15px;padding-left:15px;border-top:1px solid transparent;-webkit-box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);box-shadow:inset 0 1px 0 rgba(255,255,255,0.1);-webkit-overflow-scrolling:touch}.navbar-collapse.in{overflow-y:auto}@media (min-width:768px){.navbar-collapse{width:auto;border-top:0;-webkit-box-shadow:none;box-shadow:none}.navbar-collapse.collapse{display:block !important;height:auto !important;padding-bottom:0;overflow:visible !important}.navbar-collapse.in{overflow-y:visible}.navbar-fixed-top .navbar-collapse,.navbar-static-top .navbar-collapse,.navbar-fixed-bottom .navbar-collapse{padding-left:0;padding-right:0}}.navbar-fixed-top .navbar-collapse,.navbar-fixed-bottom .navbar-collapse{max-height:340px}@media (max-device-width:480px) and (orientation:landscape){.navbar-fixed-top .navbar-collapse,.navbar-fixed-bottom .navbar-collapse{max-height:200px}}.container>.navbar-header,.container-fluid>.navbar-header,.container>.navbar-collapse,.container-fluid>.navbar-collapse{margin-right:-15px;margin-left:-15px}@media (min-width:768px){.container>.navbar-header,.container-fluid>.navbar-header,.container>.navbar-collapse,.container-fluid>.navbar-collapse{margin-right:0;margin-left:0}}.navbar-static-top{z-index:1000;border-width:0 0 1px}@media (min-width:768px){.navbar-static-top{border-radius:0}}.navbar-fixed-top,.navbar-fixed-bottom{position:fixed;right:0;left:0;z-index:1030}@media (min-width:768px){.navbar-fixed-top,.navbar-fixed-bottom{border-radius:0}}.navbar-fixed-top{top:0;border-width:0 0 1px}.navbar-fixed-bottom{bottom:0;margin-bottom:0;border-width:1px 0 0}.navbar-brand{float:left;padding:15px 15px;font-size:18px;line-height:20px;height:50px}.navbar-brand:hover,.navbar-brand:focus{text-decoration:none}.navbar-brand>img{display:block}@media (min-width:768px){.navbar>.container .navbar-brand,.navbar>.container-fluid .navbar-brand{margin-left:-15px}}.navbar-toggle{position:relative;float:right;margin-right:15px;padding:9px 10px;margin-top:8px;margin-bottom:8px;background-color:transparent;background-image:none;border:1px solid transparent;border-radius:4px}.navbar-toggle:focus{outline:0}.navbar-toggle .icon-bar{display:block;width:22px;height:2px;border-radius:1px}.navbar-toggle .icon-bar+.icon-bar{margin-top:4px}@media (min-width:768px){.navbar-toggle{display:none}}.navbar-nav{margin:7.5px -15px}.navbar-nav>li>a{padding-top:10px;padding-bottom:10px;line-height:20px}@media (max-width:767px){.navbar-nav .open .dropdown-menu{position:static;float:none;width:auto;margin-top:0;background-color:transparent;border:0;-webkit-box-shadow:none;box-shadow:none}.navbar-nav .open .dropdown-menu>li>a,.navbar-nav .open .dropdown-menu .dropdown-header{padding:5px 15px 5px 25px}.navbar-nav .open .dropdown-menu>li>a{line-height:20px}.navbar-nav .open .dropdown-menu>li>a:hover,.navbar-nav .open .dropdown-menu>li>a:focus{background-image:none}}@media (min-width:768px){.navbar-nav{float:left;margin:0}.navbar-nav>li{float:left}.navbar-nav>li>a{padding-top:15px;padding-bottom:15px}}.navbar-form{margin-left:-15px;margin-right:-15px;padding:10px 15px;border-top:1px solid transparent;border-bottom:1px solid transparent;-webkit-box-shadow:inset 0 1px 0 rgba(255,255,255,0.1),0 1px 0 rgba(255,255,255,0.1);box-shadow:inset 0 1px 0 rgba(255,255,255,0.1),0 1px 0 rgba(255,255,255,0.1);margin-top:8px;margin-bottom:8px}@media (min-width:768px){.navbar-form .form-group{display:inline-block;margin-bottom:0;vertical-align:middle}.navbar-form .form-control{display:inline-block;width:auto;vertical-align:middle}.navbar-form .form-control-static{display:inline-block}.navbar-form .input-group{display:inline-table;vertical-align:middle}.navbar-form .input-group .input-group-addon,.navbar-form .input-group .input-group-btn,.navbar-form .input-group .form-control{width:auto}.navbar-form .input-group>.form-control{width:100%}.navbar-form .control-label{margin-bottom:0;vertical-align:middle}.navbar-form .radio,.navbar-form .checkbox{display:inline-block;margin-top:0;margin-bottom:0;vertical-align:middle}.navbar-form .radio label,.navbar-form .checkbox label{padding-left:0}.navbar-form .radio input[type="radio"],.navbar-form .checkbox input[type="checkbox"]{position:relative;margin-left:0}.navbar-form .has-feedback .form-control-feedback{top:0}}@media (max-width:767px){.navbar-form .form-group{margin-bottom:5px}.navbar-form .form-group:last-child{margin-bottom:0}}@media (min-width:768px){.navbar-form{width:auto;border:0;margin-left:0;margin-right:0;padding-top:0;padding-bottom:0;-webkit-box-shadow:none;box-shadow:none}}.navbar-nav>li>.dropdown-menu{margin-top:0;border-top-right-radius:0;border-top-left-radius:0}.navbar-fixed-bottom .navbar-nav>li>.dropdown-menu{margin-bottom:0;border-top-right-radius:4px;border-top-left-radius:4px;border-bottom-right-radius:0;border-bottom-left-radius:0}.navbar-btn{margin-top:8px;margin-bottom:8px}.navbar-btn.btn-sm{margin-top:10px;margin-bottom:10px}.navbar-btn.btn-xs{margin-top:14px;margin-bottom:14px}.navbar-text{margin-top:15px;margin-bottom:15px}@media (min-width:768px){.navbar-text{float:left;margin-left:15px;margin-right:15px}}@media (min-width:768px){.navbar-left{float:left !important}.navbar-right{float:right !important;margin-right:-15px}.navbar-right~.navbar-right{margin-right:0}}.navbar-default{background-color:#f8f8f8;border-color:#e7e7e7}.navbar-default .navbar-brand{color:#777}.navbar-default .navbar-brand:hover,.navbar-default .navbar-brand:focus{color:#5e5e5e;background-color:transparent}.navbar-default .navbar-text{color:#777}.navbar-default .navbar-nav>li>a{color:#777}.navbar-default .navbar-nav>li>a:hover,.navbar-default .navbar-nav>li>a:focus{color:#333;background-color:transparent}.navbar-default .navbar-nav>.active>a,.navbar-default .navbar-nav>.active>a:hover,.navbar-default .navbar-nav>.active>a:focus{color:#555;background-color:#e7e7e7}.navbar-default .navbar-nav>.disabled>a,.navbar-default .navbar-nav>.disabled>a:hover,.navbar-default .navbar-nav>.disabled>a:focus{color:#ccc;background-color:transparent}.navbar-default .navbar-toggle{border-color:#ddd}.navbar-default .navbar-toggle:hover,.navbar-default .navbar-toggle:focus{background-color:#ddd}.navbar-default .navbar-toggle .icon-bar{background-color:#888}.navbar-default .navbar-collapse,.navbar-default .navbar-form{border-color:#e7e7e7}.navbar-default .navbar-nav>.open>a,.navbar-default .navbar-nav>.open>a:hover,.navbar-default .navbar-nav>.open>a:focus{background-color:#e7e7e7;color:#555}@media (max-width:767px){.navbar-default .navbar-nav .open .dropdown-menu>li>a{color:#777}.navbar-default .navbar-nav .open .dropdown-menu>li>a:hover,.navbar-default .navbar-nav .open .dropdown-menu>li>a:focus{color:#333;background-color:transparent}.navbar-default .navbar-nav .open .dropdown-menu>.active>a,.navbar-default .navbar-nav .open .dropdown-menu>.active>a:hover,.navbar-default .navbar-nav .open .dropdown-menu>.active>a:focus{color:#555;background-color:#e7e7e7}.navbar-default .navbar-nav .open .dropdown-menu>.disabled>a,.navbar-default .navbar-nav .open .dropdown-menu>.disabled>a:hover,.navbar-default .navbar-nav .open .dropdown-menu>.disabled>a:focus{color:#ccc;background-color:transparent}}.navbar-default .navbar-link{color:#777}.navbar-default .navbar-link:hover{color:#333}.navbar-default .btn-link{color:#777}.navbar-default .btn-link:hover,.navbar-default .btn-link:focus{color:#333}.navbar-default .btn-link[disabled]:hover,fieldset[disabled] .navbar-default .btn-link:hover,.navbar-default .btn-link[disabled]:focus,fieldset[disabled] .navbar-default .btn-link:focus{color:#ccc}.navbar-inverse{background-color:#222;border-color:#080808}.navbar-inverse .navbar-brand{color:#9d9d9d}.navbar-inverse .navbar-brand:hover,.navbar-inverse .navbar-brand:focus{color:#fff;background-color:transparent}.navbar-inverse .navbar-text{color:#9d9d9d}.navbar-inverse .navbar-nav>li>a{color:#9d9d9d}.navbar-inverse .navbar-nav>li>a:hover,.navbar-inverse .navbar-nav>li>a:focus{color:#fff;background-color:transparent}.navbar-inverse .navbar-nav>.active>a,.navbar-inverse .navbar-nav>.active>a:hover,.navbar-inverse .navbar-nav>.active>a:focus{color:#fff;background-color:#080808}.navbar-inverse .navbar-nav>.disabled>a,.navbar-inverse .navbar-nav>.disabled>a:hover,.navbar-inverse .navbar-nav>.disabled>a:focus{color:#444;background-color:transparent}.navbar-inverse .navbar-toggle{border-color:#333}.navbar-inverse .navbar-toggle:hover,.navbar-inverse .navbar-toggle:focus{background-color:#333}.navbar-inverse .navbar-toggle .icon-bar{background-color:#fff}.navbar-inverse .navbar-collapse,.navbar-inverse .navbar-form{border-color:#101010}.navbar-inverse .navbar-nav>.open>a,.navbar-inverse .navbar-nav>.open>a:hover,.navbar-inverse .navbar-nav>.open>a:focus{background-color:#080808;color:#fff}@media (max-width:767px){.navbar-inverse .navbar-nav .open .dropdown-menu>.dropdown-header{border-color:#080808}.navbar-inverse .navbar-nav .open .dropdown-menu .divider{background-color:#080808}.navbar-inverse .navbar-nav .open .dropdown-menu>li>a{color:#9d9d9d}.navbar-inverse .navbar-nav .open .dropdown-menu>li>a:hover,.navbar-inverse .navbar-nav .open .dropdown-menu>li>a:focus{color:#fff;background-color:transparent}.navbar-inverse .navbar-nav .open .dropdown-menu>.active>a,.navbar-inverse .navbar-nav .open .dropdown-menu>.active>a:hover,.navbar-inverse .navbar-nav .open .dropdown-menu>.active>a:focus{color:#fff;background-color:#080808}.navbar-inverse .navbar-nav .open .dropdown-menu>.disabled>a,.navbar-inverse .navbar-nav .open .dropdown-menu>.disabled>a:hover,.navbar-inverse .navbar-nav .open .dropdown-menu>.disabled>a:focus{color:#444;background-color:transparent}}.navbar-inverse .navbar-link{color:#9d9d9d}.navbar-inverse .navbar-link:hover{color:#fff}.navbar-inverse .btn-link{color:#9d9d9d}.navbar-inverse .btn-link:hover,.navbar-inverse .btn-link:focus{color:#fff}.navbar-inverse .btn-link[disabled]:hover,fieldset[disabled] .navbar-inverse .btn-link:hover,.navbar-inverse .btn-link[disabled]:focus,fieldset[disabled] .navbar-inverse .btn-link:focus{color:#444}.label{display:inline;padding:.2em .6em .3em;font-size:75%;font-weight:bold;line-height:1;color:#fff;text-align:center;white-space:nowrap;vertical-align:baseline;border-radius:.25em}a.label:hover,a.label:focus{color:#fff;text-decoration:none;cursor:pointer}.label:empty{display:none}.btn .label{position:relative;top:-1px}.label-default{background-color:#777}.label-default[href]:hover,.label-default[href]:focus{background-color:#5e5e5e}.label-primary{background-color:#337ab7}.label-primary[href]:hover,.label-primary[href]:focus{background-color:#286090}.label-success{background-color:#5cb85c}.label-success[href]:hover,.label-success[href]:focus{background-color:#449d44}.label-info{background-color:#5bc0de}.label-info[href]:hover,.label-info[href]:focus{background-color:#31b0d5}.label-warning{background-color:#f0ad4e}.label-warning[href]:hover,.label-warning[href]:focus{background-color:#ec971f}.label-danger{background-color:#d9534f}.label-danger[href]:hover,.label-danger[href]:focus{background-color:#c9302c}.panel{margin-bottom:20px;background-color:#fff;border:1px solid transparent;border-radius:4px;-webkit-box-shadow:0 1px 1px rgba(0,0,0,0.05);box-shadow:0 1px 1px rgba(0,0,0,0.05)}.panel-body{padding:15px}.panel-heading{padding:10px 15px;border-bottom:1px solid transparent;border-top-right-radius:3px;border-top-left-radius:3px}.panel-heading>.dropdown .dropdown-toggle{color:inherit}.panel-title{margin-top:0;margin-bottom:0;font-size:16px;color:inherit}.panel-title>a,.panel-title>small,.panel-title>.small,.panel-title>small>a,.panel-title>.small>a{color:inherit}.panel-footer{padding:10px 15px;background-color:#f5f5f5;border-top:1px solid #ddd;border-bottom-right-radius:3px;border-bottom-left-radius:3px}.panel>.list-group,.panel>.panel-collapse>.list-group{margin-bottom:0}.panel>.list-group .list-group-item,.panel>.panel-collapse>.list-group .list-group-item{border-width:1px 0;border-radius:0}.panel>.list-group:first-child .list-group-item:first-child,.panel>.panel-collapse>.list-group:first-child .list-group-item:first-child{border-top:0;border-top-right-radius:3px;border-top-left-radius:3px}.panel>.list-group:last-child .list-group-item:last-child,.panel>.panel-collapse>.list-group:last-child .list-group-item:last-child{border-bottom:0;border-bottom-right-radius:3px;border-bottom-left-radius:3px}.panel>.panel-heading+.panel-collapse>.list-group .list-group-item:first-child{border-top-right-radius:0;border-top-left-radius:0}.panel-heading+.list-group .list-group-item:first-child{border-top-width:0}.list-group+.panel-footer{border-top-width:0}.panel>.table,.panel>.table-responsive>.table,.panel>.panel-collapse>.table{margin-bottom:0}.panel>.table caption,.panel>.table-responsive>.table caption,.panel>.panel-collapse>.table caption{padding-left:15px;padding-right:15px}.panel>.table:first-child,.panel>.table-responsive:first-child>.table:first-child{border-top-right-radius:3px;border-top-left-radius:3px}.panel>.table:first-child>thead:first-child>tr:first-child,.panel>.table-responsive:first-child>.table:first-child>thead:first-child>tr:first-child,.panel>.table:first-child>tbody:first-child>tr:first-child,.panel>.table-responsive:first-child>.table:first-child>tbody:first-child>tr:first-child{border-top-left-radius:3px;border-top-right-radius:3px}.panel>.table:first-child>thead:first-child>tr:first-child td:first-child,.panel>.table-responsive:first-child>.table:first-child>thead:first-child>tr:first-child td:first-child,.panel>.table:first-child>tbody:first-child>tr:first-child td:first-child,.panel>.table-responsive:first-child>.table:first-child>tbody:first-child>tr:first-child td:first-child,.panel>.table:first-child>thead:first-child>tr:first-child th:first-child,.panel>.table-responsive:first-child>.table:first-child>thead:first-child>tr:first-child th:first-child,.panel>.table:first-child>tbody:first-child>tr:first-child th:first-child,.panel>.table-responsive:first-child>.table:first-child>tbody:first-child>tr:first-child th:first-child{border-top-left-radius:3px}.panel>.table:first-child>thead:first-child>tr:first-child td:last-child,.panel>.table-responsive:first-child>.table:first-child>thead:first-child>tr:first-child td:last-child,.panel>.table:first-child>tbody:first-child>tr:first-child td:last-child,.panel>.table-responsive:first-child>.table:first-child>tbody:first-child>tr:first-child td:last-child,.panel>.table:first-child>thead:first-child>tr:first-child th:last-child,.panel>.table-responsive:first-child>.table:first-child>thead:first-child>tr:first-child th:last-child,.panel>.table:first-child>tbody:first-child>tr:first-child th:last-child,.panel>.table-responsive:first-child>.table:first-child>tbody:first-child>tr:first-child th:last-child{border-top-right-radius:3px}.panel>.table:last-child,.panel>.table-responsive:last-child>.table:last-child{border-bottom-right-radius:3px;border-bottom-left-radius:3px}.panel>.table:last-child>tbody:last-child>tr:last-child,.panel>.table-responsive:last-child>.table:last-child>tbody:last-child>tr:last-child,.panel>.table:last-child>tfoot:last-child>tr:last-child,.panel>.table-responsive:last-child>.table:last-child>tfoot:last-child>tr:last-child{border-bottom-left-radius:3px;border-bottom-right-radius:3px}.panel>.table:last-child>tbody:last-child>tr:last-child td:first-child,.panel>.table-responsive:last-child>.table:last-child>tbody:last-child>tr:last-child td:first-child,.panel>.table:last-child>tfoot:last-child>tr:last-child td:first-child,.panel>.table-responsive:last-child>.table:last-child>tfoot:last-child>tr:last-child td:first-child,.panel>.table:last-child>tbody:last-child>tr:last-child th:first-child,.panel>.table-responsive:last-child>.table:last-child>tbody:last-child>tr:last-child th:first-child,.panel>.table:last-child>tfoot:last-child>tr:last-child th:first-child,.panel>.table-responsive:last-child>.table:last-child>tfoot:last-child>tr:last-child th:first-child{border-bottom-left-radius:3px}.panel>.table:last-child>tbody:last-child>tr:last-child td:last-child,.panel>.table-responsive:last-child>.table:last-child>tbody:last-child>tr:last-child td:last-child,.panel>.table:last-child>tfoot:last-child>tr:last-child td:last-child,.panel>.table-responsive:last-child>.table:last-child>tfoot:last-child>tr:last-child td:last-child,.panel>.table:last-child>tbody:last-child>tr:last-child th:last-child,.panel>.table-responsive:last-child>.table:last-child>tbody:last-child>tr:last-child th:last-child,.panel>.table:last-child>tfoot:last-child>tr:last-child th:last-child,.panel>.table-responsive:last-child>.table:last-child>tfoot:last-child>tr:last-child th:last-child{border-bottom-right-radius:3px}.panel>.panel-body+.table,.panel>.panel-body+.table-responsive,.panel>.table+.panel-body,.panel>.table-responsive+.panel-body{border-top:1px solid #ddd}.panel>.table>tbody:first-child>tr:first-child th,.panel>.table>tbody:first-child>tr:first-child td{border-top:0}.panel>.table-bordered,.panel>.table-responsive>.table-bordered{border:0}.panel>.table-bordered>thead>tr>th:first-child,.panel>.table-responsive>.table-bordered>thead>tr>th:first-child,.panel>.table-bordered>tbody>tr>th:first-child,.panel>.table-responsive>.table-bordered>tbody>tr>th:first-child,.panel>.table-bordered>tfoot>tr>th:first-child,.panel>.table-responsive>.table-bordered>tfoot>tr>th:first-child,.panel>.table-bordered>thead>tr>td:first-child,.panel>.table-responsive>.table-bordered>thead>tr>td:first-child,.panel>.table-bordered>tbody>tr>td:first-child,.panel>.table-responsive>.table-bordered>tbody>tr>td:first-child,.panel>.table-bordered>tfoot>tr>td:first-child,.panel>.table-responsive>.table-bordered>tfoot>tr>td:first-child{border-left:0}.panel>.table-bordered>thead>tr>th:last-child,.panel>.table-responsive>.table-bordered>thead>tr>th:last-child,.panel>.table-bordered>tbody>tr>th:last-child,.panel>.table-responsive>.table-bordered>tbody>tr>th:last-child,.panel>.table-bordered>tfoot>tr>th:last-child,.panel>.table-responsive>.table-bordered>tfoot>tr>th:last-child,.panel>.table-bordered>thead>tr>td:last-child,.panel>.table-responsive>.table-bordered>thead>tr>td:last-child,.panel>.table-bordered>tbody>tr>td:last-child,.panel>.table-responsive>.table-bordered>tbody>tr>td:last-child,.panel>.table-bordered>tfoot>tr>td:last-child,.panel>.table-responsive>.table-bordered>tfoot>tr>td:last-child{border-right:0}.panel>.table-bordered>thead>tr:first-child>td,.panel>.table-responsive>.table-bordered>thead>tr:first-child>td,.panel>.table-bordered>tbody>tr:first-child>td,.panel>.table-responsive>.table-bordered>tbody>tr:first-child>td,.panel>.table-bordered>thead>tr:first-child>th,.panel>.table-responsive>.table-bordered>thead>tr:first-child>th,.panel>.table-bordered>tbody>tr:first-child>th,.panel>.table-responsive>.table-bordered>tbody>tr:first-child>th{border-bottom:0}.panel>.table-bordered>tbody>tr:last-child>td,.panel>.table-responsive>.table-bordered>tbody>tr:last-child>td,.panel>.table-bordered>tfoot>tr:last-child>td,.panel>.table-responsive>.table-bordered>tfoot>tr:last-child>td,.panel>.table-bordered>tbody>tr:last-child>th,.panel>.table-responsive>.table-bordered>tbody>tr:last-child>th,.panel>.table-bordered>tfoot>tr:last-child>th,.panel>.table-responsive>.table-bordered>tfoot>tr:last-child>th{border-bottom:0}.panel>.table-responsive{border:0;margin-bottom:0}.panel-group{margin-bottom:20px}.panel-group .panel{margin-bottom:0;border-radius:4px}.panel-group .panel+.panel{margin-top:5px}.panel-group .panel-heading{border-bottom:0}.panel-group .panel-heading+.panel-collapse>.panel-body,.panel-group .panel-heading+.panel-collapse>.list-group{border-top:1px solid #ddd}.panel-group .panel-footer{border-top:0}.panel-group .panel-footer+.panel-collapse .panel-body{border-bottom:1px solid #ddd}.panel-default{border-color:#ddd}.panel-default>.panel-heading{color:#333;background-color:#f5f5f5;border-color:#ddd}.panel-default>.panel-heading+.panel-collapse>.panel-body{border-top-color:#ddd}.panel-default>.panel-heading .badge{color:#f5f5f5;background-color:#333}.panel-default>.panel-footer+.panel-collapse>.panel-body{border-bottom-color:#ddd}.panel-primary{border-color:#337ab7}.panel-primary>.panel-heading{color:#fff;background-color:#337ab7;border-color:#337ab7}.panel-primary>.panel-heading+.panel-collapse>.panel-body{border-top-color:#337ab7}.panel-primary>.panel-heading .badge{color:#337ab7;background-color:#fff}.panel-primary>.panel-footer+.panel-collapse>.panel-body{border-bottom-color:#337ab7}.panel-success{border-color:#d6e9c6}.panel-success>.panel-heading{color:#3c763d;background-color:#dff0d8;border-color:#d6e9c6}.panel-success>.panel-heading+.panel-collapse>.panel-body{border-top-color:#d6e9c6}.panel-success>.panel-heading .badge{color:#dff0d8;background-color:#3c763d}.panel-success>.panel-footer+.panel-collapse>.panel-body{border-bottom-color:#d6e9c6}.panel-info{border-color:#bce8f1}.panel-info>.panel-heading{color:#31708f;background-color:#d9edf7;border-color:#bce8f1}.panel-info>.panel-heading+.panel-collapse>.panel-body{border-top-color:#bce8f1}.panel-info>.panel-heading .badge{color:#d9edf7;background-color:#31708f}.panel-info>.panel-footer+.panel-collapse>.panel-body{border-bottom-color:#bce8f1}.panel-warning{border-color:#faebcc}.panel-warning>.panel-heading{color:#8a6d3b;background-color:#fcf8e3;border-color:#faebcc}.panel-warning>.panel-heading+.panel-collapse>.panel-body{border-top-color:#faebcc}.panel-warning>.panel-heading .badge{color:#fcf8e3;background-color:#8a6d3b}.panel-warning>.panel-footer+.panel-collapse>.panel-body{border-bottom-color:#faebcc}.panel-danger{border-color:#ebccd1}.panel-danger>.panel-heading{color:#a94442;background-color:#f2dede;border-color:#ebccd1}.panel-danger>.panel-heading+.panel-collapse>.panel-body{border-top-color:#ebccd1}.panel-danger>.panel-heading .badge{color:#f2dede;background-color:#a94442}.panel-danger>.panel-footer+.panel-collapse>.panel-body{border-bottom-color:#ebccd1}.well{min-height:20px;padding:19px;margin-bottom:20px;background-color:#f5f5f5;border:1px solid #e3e3e3;border-radius:4px;-webkit-box-shadow:inset 0 1px 1px rgba(0,0,0,0.05);box-shadow:inset 0 1px 1px rgba(0,0,0,0.05)}.well blockquote{border-color:#ddd;border-color:rgba(0,0,0,0.15)}.well-lg{padding:24px;border-radius:6px}.well-sm{padding:9px;border-radius:3px}.clearfix:before,.clearfix:after,.dl-horizontal dd:before,.dl-horizontal dd:after,.form-horizontal .form-group:before,.form-horizontal .form-group:after,.nav:before,.nav:after,.navbar:before,.navbar:after,.navbar-header:before,.navbar-header:after,.navbar-collapse:before,.navbar-collapse:after,.panel-body:before,.panel-body:after{content:" ";display:table}.clearfix:after,.dl-horizontal dd:after,.form-horizontal .form-group:after,.nav:after,.navbar:after,.navbar-header:after,.navbar-collapse:after,.panel-body:after{clear:both}.center-block{display:block;margin-left:auto;margin-right:auto}.pull-right{float:right !important}.pull-left{float:left !important}.hide{display:none !important}.show{display:block !important}.invisible{visibility:hidden}.text-hide{font:0/0 a;color:transparent;text-shadow:none;background-color:transparent;border:0}.hidden{display:none !important}.affix{position:fixed}@-ms-viewport{width:device-width}.visible-xs,.visible-sm,.visible-md,.visible-lg{display:none !important}.visible-xs-block,.visible-xs-inline,.visible-xs-inline-block,.visible-sm-block,.visible-sm-inline,.visible-sm-inline-block,.visible-md-block,.visible-md-inline,.visible-md-inline-block,.visible-lg-block,.visible-lg-inline,.visible-lg-inline-block{display:none !important}@media (max-width:767px){.visible-xs{display:block !important}table.visible-xs{display:table !important}tr.visible-xs{display:table-row !important}th.visible-xs,td.visible-xs{display:table-cell !important}}@media (max-width:767px){.visible-xs-block{display:block !important}}@media (max-width:767px){.visible-xs-inline{display:inline !important}}@media (max-width:767px){.visible-xs-inline-block{display:inline-block !important}}@media (min-width:768px) and (max-width:991px){.visible-sm{display:block !important}table.visible-sm{display:table !important}tr.visible-sm{display:table-row !important}th.visible-sm,td.visible-sm{display:table-cell !important}}@media (min-width:768px) and (max-width:991px){.visible-sm-block{display:block !important}}@media (min-width:768px) and (max-width:991px){.visible-sm-inline{display:inline !important}}@media (min-width:768px) and (max-width:991px){.visible-sm-inline-block{display:inline-block !important}}@media (min-width:992px) and (max-width:1199px){.visible-md{display:block !important}table.visible-md{display:table !important}tr.visible-md{display:table-row !important}th.visible-md,td.visible-md{display:table-cell !important}}@media (min-width:992px) and (max-width:1199px){.visible-md-block{display:block !important}}@media (min-width:992px) and (max-width:1199px){.visible-md-inline{display:inline !important}}@media (min-width:992px) and (max-width:1199px){.visible-md-inline-block{display:inline-block !important}}@media (min-width:1200px){.visible-lg{display:block !important}table.visible-lg{display:table !important}tr.visible-lg{display:table-row !important}th.visible-lg,td.visible-lg{display:table-cell !important}}@media (min-width:1200px){.visible-lg-block{display:block !important}}@media (min-width:1200px){.visible-lg-inline{display:inline !important}}@media (min-width:1200px){.visible-lg-inline-block{display:inline-block !important}}@media (max-width:767px){.hidden-xs{display:none !important}}@media (min-width:768px) and (max-width:991px){.hidden-sm{display:none !important}}@media (min-width:992px) and (max-width:1199px){.hidden-md{display:none !important}}@media (min-width:1200px){.hidden-lg{display:none !important}}.visible-print{display:none !important}@media print{.visible-print{display:block !important}table.visible-print{display:table !important}tr.visible-print{display:table-row !important}th.visible-print,td.visible-print{display:table-cell !important}}.visible-print-block{display:none !important}@media print{.visible-print-block{display:block !important}}.visible-print-inline{display:none !important}@media print{.visible-print-inline{display:inline !important}}.visible-print-inline-block{display:none !important}@media print{.visible-print-inline-block{display:inline-block !important}}@media print{.hidden-print{display:none !important}}
    `,
  "custom.css": `
    /* Space out content a bit */
    body {
        padding-top: 20px;
        padding-bottom: 20px;
    }

    /* Everything but the jumbotron gets side spacing for mobile first views */
    .header,
    .marketing,
    .footer {
        padding-right: 15px;
        padding-left: 15px;
    }

    /* Custom page header */
    .header {
        padding-bottom: 20px;
        border-bottom: 1px solid #e5e5e5;
    }
    /* Make the masthead heading the same height as the navigation */
    .header h3 {
        margin-top: 0;
        margin-bottom: 0;
        line-height: 40px;
    }

    /* Custom page footer */
    .footer {
        padding-top: 19px;
        color: #777;
        border-top: 1px solid #e5e5e5;
    }

    /* Customize container */
    @media (min-width: 768px) {
        .container {
            max-width: 730px;
        }
    }
    .container-narrow > hr {
        margin: 30px 0;
    }

    /* Main marketing message and sign up button */
    .jumbotron {
        text-align: center;
        border-bottom: 1px solid #e5e5e5;
    }
    .jumbotron .btn {
        padding: 14px 24px;
        font-size: 21px;
    }

    /* Supporting marketing content */
    .marketing {
        margin: 40px 0;
    }
    .marketing p + h4 {
        margin-top: 28px;
    }

    .container{
        margin: auto;
    }

    /* Responsive: Portrait tablets and up */
    @media screen and (min-width: 768px) {
        /* Remove the padding we set earlier */
        .header,
        .marketing,
        .footer {
            padding-right: 0;
            padding-left: 0;
        }
        /* Space out the masthead */
        .header {
            margin-bottom: 30px;
        }
        /* Remove the bottom border on the jumbotron for visual effect */
        .jumbotron {
            border-bottom: 0;
        }
    }
    `
};

// sri4node.ts
var ajv2 = new Ajv2({
  // 2023-10: do not enable strict yet as it might break existing api's
  // (for example: an object with 'properties' & 'required', but missing type: 'object'
  // would suddenly fail because it is strictly speaking invalid json-schema)
  // strict: true,
  logger: {
    log: (output) => {
      debug("general", output);
    },
    warn: (output) => {
      debug("general", output);
    },
    error: console.error
  }
});
addFormats2(ajv2);
var ajvWithCoerceTypes = new Ajv2({
  strict: true,
  coerceTypes: true
});
addFormats2(ajvWithCoerceTypes);
function forceSecureSockets(req, res, next) {
  const isHttps = req.headers["x-forwarded-proto"] === "https";
  if (!isHttps && req.get("Host").indexOf("localhost") < 0 && req.get("Host").indexOf("127.0.0.1") < 0) {
    res.redirect(`https://${req.get("Host")}${req.url}`);
  } else {
    next();
  }
}
function getSchema(req, resp) {
  const type = req.route.path.split("/").slice(0, req.route.path.split("/").length - 1).join("/");
  const mapping = typeToMapping(type);
  resp.set("Content-Type", "application/json");
  resp.send(mapping.schema);
}
function getDocs(req, resp) {
  const typeToMappingMap = typeToConfig(global.sri4node_configuration.resources);
  const type = req.route.path.split("/").slice(0, req.route.path.split("/").length - 1).join("/");
  if (type in typeToMappingMap) {
    const mapping = typeToMappingMap[type];
    resp.locals.path = req._parsedUrl.pathname;
    resp.write(resource({ resource: mapping, queryUtils: queryUtils_exports }));
    resp.end();
  } else if (req.route.path === "/docs") {
    resp.write(index({ config: global.sri4node_configuration }));
    resp.end();
  } else {
    resp.status(404).send("Not Found");
  }
}
var getResourcesOverview = (_req, resp) => {
  resp.set("Content-Type", "application/json");
  const resourcesToSend = {};
  global.sri4node_configuration.resources.forEach((resource2) => {
    const resourceName = resource2.type.substring(1);
    resourcesToSend[resourceName] = {
      docs: `${resource2.type}/docs`,
      schema: `${resource2.type}/schema`,
      href: resource2.type
    };
    if (resource2.schema) {
      resourcesToSend[resourceName].description = resource2.schema.title;
    }
  });
  resp.send(resourcesToSend);
};
function checkRequiredFields(mapping, information) {
  const table = tableFromMapping(mapping);
  const idx = mapping.type;
  if (!information[idx]) {
    throw new Error(`Table '${table}' seems to be missing in the database.`);
  }
  const mandatoryFields = ["key", "$$meta.created", "$$meta.modified", "$$meta.deleted"];
  mandatoryFields.forEach((field) => {
    if (!(field in information[idx])) {
      throw new Error(`Mapping '${mapping.type}' lacks mandatory field '${field}'`);
    }
  });
}
var middlewareErrorWrapper = (fun) => (req, resp) => __async(void 0, null, function* () {
  try {
    yield fun(req, resp);
  } catch (err) {
    error(
      "____________________________ E R R O R (middlewareErrorWrapper) ___________________________"
    );
    error(err);
    error("STACK:");
    error(err.stack);
    error(
      "___________________________________________________________________________________________"
    );
    resp.status(500).send(`Internal Server Error. [${stringifyError(err)}]`);
  }
});
process.on("unhandledRejection", (err) => {
  console.log(err);
  throw err;
});
var handleRequest = (sriRequest, func, mapping) => __async(void 0, null, function* () {
  var _a, _b;
  const { dbT } = sriRequest;
  let result;
  if (sriRequest.isBatchRequest) {
    result = yield func(
      sriRequest,
      global.sriInternalUtils
    );
  } else {
    const job = [
      func,
      [dbT, sriRequest, mapping, global.sriInternalUtils]
    ];
    [result] = settleResultsToSriResults(
      yield phaseSyncedSettle([job], {
        beforePhaseHooks: global.sri4node_configuration.beforePhase
      })
    );
    if (result instanceof SriError || ((_b = (_a = result == null ? void 0 : result.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError") {
      throw result;
    }
    if (sriRequest.streamStarted === void 0 || !sriRequest.streamStarted()) {
      yield applyHooks(
        "transform response",
        mapping == null ? void 0 : mapping.transformResponse,
        (f) => f(dbT, sriRequest, result),
        sriRequest
      );
    }
  }
  return result;
});
var handleServerTiming = (req, resp, sriRequest) => __async(void 0, null, function* () {
  var _a;
  const logEnabled = isLogChannelEnabled("server-timing");
  const hdrEnable = ((_a = sriRequest.headers) == null ? void 0 : _a["request-server-timing"]) !== void 0;
  let serverTiming = "";
  if ((logEnabled || hdrEnable) && sriRequest.serverTiming !== void 0) {
    emtReportToServerTiming(req, resp, sriRequest);
    const notNullEntries = Object.entries(sriRequest.serverTiming).filter(
      ([_property, value2]) => value2 > 0
    );
    if (notNullEntries.length > 0) {
      serverTiming = notNullEntries.map(
        ([property, value2]) => `${property};dur=${(Math.round(value2 * 100) / 100).toFixed(2)}`
      ).join(", ");
      if (logEnabled) {
        debug("server-timing", serverTiming);
      }
      if (hdrEnable) {
        if (resp.headersSent) {
          sriRequest.outStream.addTrailers({
            "Server-Timing": serverTiming
          });
        } else {
          resp.set("Server-Timing", serverTiming);
        }
      }
    }
  }
});
var expressWrapper = (dbR, dbW, func, sriConfig, mapping, isStreamingRequest, isBatchRequest, readOnly0) => function(req, resp, _next) {
  return __async(this, null, function* () {
    var _a, _b, _c, _d;
    let t = null;
    let endTask;
    let resolveTx;
    let rejectTx;
    let readOnly;
    const reqMsgStart = `${req.method} ${req.path}`;
    debug("requests", `${reqMsgStart} starting.`);
    const hrstart = process.hrtime();
    resp.on("finish", () => {
      const hrend = process.hrtime(hrstart);
      debug("requests", `${reqMsgStart} took ${hrend[0] * 1e3 + hrend[1] / 1e6} ms`);
    });
    debug("trace", "Starting express wrapper");
    let sriRequest;
    try {
      let batchRoutingDuration = 0;
      if (isBatchRequest) {
        const hrStart2 = process.hrtime();
        matchBatch(req);
        const hrDuration = process.hrtime(hrStart2);
        batchRoutingDuration = hrtimeToMilliseconds(hrDuration);
        const mapReadOnly = (a) => {
          if (Array.isArray(a)) {
            return a.map(mapReadOnly);
          }
          return a.match.handler.readOnly;
        };
        readOnly = _7.flatten((_a = req.body) == null ? void 0 : _a.map(mapReadOnly)).every((e) => e);
      } else {
        readOnly = readOnly0;
      }
      global.overloadProtection.startPipeline();
      const reqId = httpContext3.get("reqId");
      if (reqId !== void 0) {
        resp.set("vsko-req-id", reqId);
      } else {
        console.log("no reqId ???");
      }
      const hrStartStartTransaction = process.hrtime();
      if (readOnly === true) {
        ({ t, endTask } = yield startTask(dbR));
      } else {
        ({ tx: t, resolveTx, rejectTx } = yield startTransaction(dbW));
      }
      const hrElapsedStartTransaction = process.hrtime(hrStartStartTransaction);
      sriRequest = generateSriRequest(req, resp, {
        isBatchRequest,
        readOnly,
        mapping: mapping || void 0,
        isStreamingRequest,
        dbT: t
      });
      setServerTimingHdr(
        sriRequest,
        "db-starttask",
        hrtimeToMilliseconds(hrElapsedStartTransaction)
      );
      req.on("close", (_err) => {
        sriRequest.reqCancelled = true;
      });
      yield applyHooks(
        "transform request",
        sriConfig.transformRequest || [],
        (f) => f(req, sriRequest, t),
        sriRequest
      );
      setServerTimingHdr(sriRequest, "batch-routing", batchRoutingDuration);
      const result = yield handleRequest(sriRequest, func, mapping);
      const terminateDb = (error1, readOnly1) => __async(this, null, function* () {
        if (readOnly1 === true) {
          debug("db", "++ Processing went OK. Closing database task. ++");
          yield endTask();
        } else if (error1) {
          if (req.query.dryRun === "true") {
            debug(
              "db",
              "++ Error during processing in dryRun mode. Rolling back database transaction."
            );
          } else {
            debug("db", "++ Error during processing. Rolling back database transaction.");
          }
          yield rejectTx();
        } else if (req.query.dryRun === "true") {
          debug("db", "++ Processing went OK in dryRun mode. Rolling back database transaction.");
          yield rejectTx();
        } else {
          debug("db", "++ Processing went OK. Committing database transaction.");
          yield resolveTx();
        }
      });
      if (resp.headersSent) {
        if (result.status < 300) {
          yield terminateDb(false, readOnly);
        } else {
          yield terminateDb(true, readOnly);
        }
        yield handleServerTiming(req, resp, sriRequest);
        (_b = sriRequest.outStream) == null ? void 0 : _b.end();
      } else {
        if (result.status < 300) {
          yield terminateDb(false, readOnly);
        } else {
          yield terminateDb(true, readOnly);
        }
        yield handleServerTiming(req, resp, sriRequest);
        if (result.headers) {
          resp.set(result.headers);
        }
        resp.status(result.status);
        if (result.body && Array.isArray(result.body.results)) {
          resp.setHeader("Content-Type", "application/json; charset=utf-8");
          if (result.body.$$meta) {
            resp.write(`{"$$meta": ${JSON.stringify(result.body.$$meta)}, "results": [
`);
          }
          const total = result.body.results.length;
          result.body.results.forEach(
            (record, index2) => resp.write(`${JSON.stringify(record)}${index2 + 1 < total ? "," : ""}
`)
          );
          resp.write("]");
          Object.entries(result.body).filter(([key]) => !["$$meta", "results"].includes(key)).forEach(([key, value2]) => resp.write(`,
"${key}": ${JSON.stringify(value2)}`));
          resp.write("\n}");
          resp.end();
        } else if (result.body !== void 0) {
          resp.send(result.body);
        } else {
          resp.send();
        }
      }
      yield applyHooks(
        "afterRequest",
        sriConfig.afterRequest || [],
        (f) => f(sriRequest),
        sriRequest
      );
      if (global.sri4node_configuration.logdebug && global.sri4node_configuration.logdebug.statuses !== void 0) {
        setImmediate(() => {
          handleRequestDebugLog(result.status);
        });
      }
    } catch (err) {
      yield applyHooks(
        "errorHandler",
        sriConfig.errorHandler || [],
        (f) => f(sriRequest, err),
        sriRequest
      );
      if (t != null) {
        if (readOnly === true) {
          debug("db", "++ Exception caught. Closing database task. ++");
          yield endTask();
        } else {
          debug("db", "++ Exception caught. Rolling back database transaction. ++");
          yield rejectTx();
        }
      }
      if (resp.headersSent) {
        error(
          "____________________________ E R R O R (expressWrapper)____________________________________"
        );
        error(err);
        error(JSON.stringify(err, null, 2));
        error("STACK:");
        error(err.stack);
        error(
          "___________________________________________________________________________________________"
        );
        error("NEED TO DESTROY STREAMING REQ");
        resp.on("drain", () => __async(this, null, function* () {
          yield resp.destroy();
          error("[drain event] Stream is destroyed.");
        }));
        resp.on("finish", () => __async(this, null, function* () {
          yield resp.destroy();
          error("[finish event] Stream is destroyed.");
        }));
        resp.write(
          "\n\n\n____________________________ E R R O R (expressWrapper)____________________________________\n"
        );
        resp.write(err.toString());
        resp.write(JSON.stringify(err, null, 2));
        resp.write(
          "\n___________________________________________________________________________________________\n"
        );
        while (resp.write("       ")) {
        }
      } else if (err instanceof SriError || ((_d = (_c = err == null ? void 0 : err.__proto__) == null ? void 0 : _c.constructor) == null ? void 0 : _d.name) === "SriError") {
        if (err.status > 0) {
          const reqId = httpContext3.get("reqId");
          if (reqId !== void 0) {
            err.body.vskoReqId = reqId;
            err.headers["vsko-req-id"] = reqId;
          }
          resp.set(err.headers).status(err.status).send(err.body);
        }
      } else {
        error(
          "____________________________ E R R O R (expressWrapper)____________________________________"
        );
        error(err);
        error("STACK:");
        error(err.stack);
        error(
          "___________________________________________________________________________________________"
        );
        resp.status(500).send(`Internal Server Error. [${stringifyError(err)}]`);
      }
      if (global.sri4node_configuration.logdebug && global.sri4node_configuration.logdebug.statuses !== void 0) {
        setImmediate(() => {
          console.log("GOING TO CALL handleRequestDebugLog");
          handleRequestDebugLog(err.status ? err.status : 500);
        });
      }
    } finally {
      global.overloadProtection.endPipeline();
    }
  });
};
var toArray = (resource2, name) => {
  if (resource2[name] === void 0) {
    resource2[name] = [];
  } else if (resource2[name] === null) {
    console.log(`WARNING: handler '${name}' was set to 'null' -> assume []`);
    resource2[name] = [];
  } else if (!Array.isArray(resource2[name])) {
    resource2[name] = [resource2[name]];
  }
};
var utils = {
  // Utilities to run arbitrary SQL in validation, beforeupdate, afterupdate, etc..
  executeSQL: pgExec,
  prepareSQL,
  convertListResourceURLToSQL: getSQLFromListResource,
  addReferencingResources,
  // removed pgInit and pgResult, but kept pgConnect for now (in case someoine wants to use the
  // db, dbW and/or dbR properties)
  pgConnect,
  // still here for backwards compatibility, in most cases we assume that using an
  // internalSriRerquest would be sufficient
  transformRowToObject,
  transformObjectToRow,
  typeToMapping,
  tableFromMapping,
  urlToTypeAndKey,
  parseResource
  // should be deprecated in favour of a decent url parsing mechanism
};
function configure(app, sriConfig) {
  return __async(this, null, function* () {
    app.disable("x-powered-by");
    try {
      sriConfig.resources.forEach((resource2) => {
        [
          "beforeRead",
          "afterRead",
          "beforeUpdate",
          "afterUpdate",
          "beforeInsert",
          "afterInsert",
          "beforeDelete",
          "afterDelete",
          "customRoutes",
          "transformResponse"
        ].forEach((name) => toArray(resource2, name));
        if (resource2.listResultDefaultIncludeCount === void 0) {
          resource2.listResultDefaultIncludeCount = true;
        }
      });
      ["beforePhase", "transformRequest", "transformInternalRequest"].forEach(
        (name) => toArray(sriConfig, name)
      );
      sriConfig.beforePhase = [
        ...sriConfig.beforePhase || [],
        beforePhaseQueryByKey
      ];
      sriConfig.beforePhase = [
        ...sriConfig.beforePhase || [],
        beforePhaseInsertUpdateDelete
      ];
      if (sriConfig.bodyParserLimit === void 0) {
        sriConfig.bodyParserLimit = "5mb";
      }
      sriConfig.resources.forEach((resourceDefinition) => {
        if (!resourceDefinition.onlyCustom) {
          if (resourceDefinition.query === void 0) {
            resourceDefinition.query = { defaultFilter };
          }
          if (resourceDefinition.map) {
            Object.keys(resourceDefinition.map).forEach((key) => {
              var _a, _b, _c;
              if (((_b = (_a = resourceDefinition.map) == null ? void 0 : _a[key]) == null ? void 0 : _b.references) !== void 0 && resourceDefinition.query && ((_c = resourceDefinition.query) == null ? void 0 : _c[key]) === void 0) {
                resourceDefinition.query[key] = filterReferencedType(
                  resourceDefinition.map[key].references,
                  key
                );
              }
            });
          }
          if (resourceDefinition.schema === void 0) {
            throw new Error(`Schema definition is missing for '${resourceDefinition.type}' !`);
          }
          const keyPropertyDefinition = findPropertyInJsonSchema(resourceDefinition.schema, "key");
          if (keyPropertyDefinition === null) {
            throw new Error(`Key is not defined in the schema of '${resourceDefinition.type}' !`);
          }
          if (keyPropertyDefinition.pattern === guid("foo").pattern) {
            resourceDefinition.singleResourceRegex = new RegExp(
              `^${resourceDefinition.type}/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$`
            );
          } else if (keyPropertyDefinition.type === numeric("foo").type) {
            resourceDefinition.singleResourceRegex = new RegExp(
              `^${resourceDefinition.type}/([0-9]+)$`
            );
          } else if (keyPropertyDefinition.type === string("foo").type) {
            resourceDefinition.singleResourceRegex = new RegExp(
              `^${resourceDefinition.type}/(\\w+)$`
            );
          } else {
            throw new Error(`Key type of resource ${resourceDefinition.type} unknown!`);
          }
          resourceDefinition.listResourceRegex = new RegExp(
            `^${resourceDefinition.type}(?:[?#]\\S*)?$`
          );
          try {
            debug("general", `Going to compile JSON schema of ${resourceDefinition.type}`);
            resourceDefinition.validateKey = ajvWithCoerceTypes.compile(keyPropertyDefinition);
            resourceDefinition.validateSchema = ajv2.compile(resourceDefinition.schema);
          } catch (err) {
            console.error("===============================================================");
            console.error(`Compiling JSON schema of ${resourceDefinition.type} failed:`);
            console.error("");
            console.error(`Schema: ${JSON.stringify(resourceDefinition.schema, null, 2)}`);
            console.error("");
            console.error(`Error: ${err.message}`);
            console.error("===============================================================");
            process.exit(1);
          }
        }
      });
      sriConfig.resources.forEach((mapping) => {
        if (mapping.metaType === void 0) {
          error(`WARNING: metaType missing for resource ${mapping.type}`);
          mapping.metaType = "NOT SPECIFIED";
        }
      });
      sriConfig.utils = utils;
      if (sriConfig.batchConcurrency === void 0) {
        sriConfig.batchConcurrency = 4;
      }
      if (sriConfig.logdebug !== void 0) {
        sriConfig.logdebug = createDebugLogConfigObject(sriConfig.logdebug);
      }
      global.sri4node_configuration = sriConfig;
      const db = yield pgConnect(sriConfig);
      const dbR = db;
      const dbW = db;
      const pgp2 = getPgp();
      yield applyHooks("start up", sriConfig.startUp || [], (f) => f(db, pgp2));
      const currentInformationSchema = yield informationSchema(dbR, sriConfig);
      global.sri4node_configuration.informationSchema = currentInformationSchema;
      const { statement_timeout } = sriConfig.databaseConnectionParameters;
      const timeoutForCheckQueries = Math.max(
        5e3,
        typeof statement_timeout === "number" ? statement_timeout : 5e3
      );
      yield pMap8(
        sriConfig.resources,
        (mapping) => __async(this, null, function* () {
          var _a, _b;
          if (!mapping.onlyCustom) {
            const schema = ((_a = sriConfig.databaseConnectionParameters) == null ? void 0 : _a.schema) || ((_b = sriConfig.databaseLibraryInitOptions) == null ? void 0 : _b.schema);
            const schemaName = Array.isArray(schema) ? schema[0] : schema == null ? void 0 : schema.toString();
            yield installVersionIncTriggerOnTable(
              dbW,
              tableFromMapping(mapping),
              schemaName,
              timeoutForCheckQueries
            );
          }
        }),
        { concurrency: 1 }
      );
      checkSriConfigWithDb(sriConfig, currentInformationSchema);
      const generatePgColumnSet = (columnNames, type, table) => {
        const columns = columnNames.map((cname) => {
          const cConf = {
            name: cname
          };
          if (cname.includes(".")) {
            cConf.prop = `_${cname.replace(/\./g, "_")}`;
            cConf.init = (c) => c.source[cname];
          }
          const cType = global.sri4node_configuration.informationSchema[type][cname].type;
          const cElementType = global.sri4node_configuration.informationSchema[type][cname].element_type;
          if (cType !== "text") {
            if (cType === "ARRAY") {
              cConf.cast = `${cElementType}[]`;
            } else {
              cConf.cast = cType;
            }
          }
          if (cname === "key") {
            cConf.cnd = true;
          }
          return new pgp2.helpers.Column(cConf);
        });
        return new pgp2.helpers.ColumnSet(columns, { table });
      };
      global.sri4node_configuration.pgColumns = Object.fromEntries(
        sriConfig.resources.filter((resource2) => !resource2.onlyCustom).map((resource2) => {
          const { type } = resource2;
          const table = tableFromMapping(typeToMapping(type));
          const columns = JSON.parse(`[${sqlColumnNames(typeToMapping(type))}]`).filter(
            (cname) => !cname.startsWith("$$meta.")
          );
          const ret = {};
          ret.insert = new pgp2.helpers.ColumnSet(columns, { table });
          const dummyUpdateRow = transformObjectToRow({}, resource2, false);
          ret.update = generatePgColumnSet(
            [.../* @__PURE__ */ new Set(["key", "$$meta.modified", ...Object.keys(dummyUpdateRow)])],
            type,
            table
          );
          ret.delete = generatePgColumnSet(
            ["key", "$$meta.modified", "$$meta.deleted"],
            type,
            table
          );
          return [table, ret];
        })
      );
      global.sri4node_loaded_plugins = /* @__PURE__ */ new Map();
      global.sri4node_install_plugin = (plugin) => __async(this, null, function* () {
        console.log(`Installing plugin ${util.inspect(plugin)}`);
        if (plugin.uuid !== void 0 && global.sri4node_loaded_plugins.has(plugin.uuid)) {
          return;
        }
        yield plugin.install(global.sri4node_configuration, dbW);
        if (plugin.uuid !== void 0) {
          debug("general", `Loaded plugin ${plugin.uuid}.`);
          global.sri4node_loaded_plugins.set(plugin.uuid, plugin);
        }
      });
      if (sriConfig.plugins !== void 0) {
        yield pMap8(
          sriConfig.plugins,
          (plugin) => __async(this, null, function* () {
            yield global.sri4node_install_plugin(plugin);
          }),
          { concurrency: 1 }
        );
      }
      global.overloadProtection = overloadProtectionFactory(sriConfig.overloadProtection);
      app.use((_req, res, next) => __async(this, null, function* () {
        var _a, _b;
        if (global.overloadProtection.canAccept()) {
          next();
        } else {
          debug("overloadProtection", "DROPPED REQ");
          if (((_a = sriConfig.overloadProtection) == null ? void 0 : _a.retryAfter) !== void 0) {
            res.set("Retry-After", (_b = sriConfig.overloadProtection) == null ? void 0 : _b.retryAfter.toString());
          }
          res.status(503).send([
            {
              code: "too.busy",
              msg: "The request could not be processed as the server is too busy right now. Try again later."
            }
          ]);
        }
      }));
      const emt = installEMT(app);
      if (global.sri4node_configuration.forceSecureSockets) {
        app.use(forceSecureSockets);
      }
      app.use(emt.instrument(compression(), "mw-compression"));
      app.use(
        emt.instrument(
          bodyParser.json({ limit: sriConfig.bodyParserLimit, strict: false }),
          "mw-bodyparser"
        )
      );
      const returnFileFromDocsStatic = (_req, res) => {
        res.write(staticFiles[_req.params.file]);
        res.end();
      };
      app.get("/docs/static/:file", returnFileFromDocsStatic);
      app.put(
        "/log",
        middlewareErrorWrapper((req, resp) => {
          const err = req.body;
          console.log("Client side error :");
          err.stack.split("\n").forEach((line) => console.log(line));
          resp.end();
        })
      );
      app.get("/docs", middlewareErrorWrapper(getDocs));
      app.get("/resources", middlewareErrorWrapper(getResourcesOverview));
      app.post("/setlogdebug", (req, resp, _next) => {
        global.sri4node_configuration.logdebug = createDebugLogConfigObject(req.body);
        resp.send("OK");
      });
      app.use(httpContext3.middleware);
      app.use((req, res, next) => {
        httpContext3.ns.bindEmitter(req);
        httpContext3.ns.bindEmitter(res);
        let reqId;
        if (req.headers["x-request-id"] !== void 0) {
          reqId = req.headers["x-request-id"];
        } else if (req.headers["x-amz-cf-id"] !== void 0) {
          reqId = req.headers["x-amz-cf-id"];
        } else {
          reqId = shortid.generate();
        }
        if (sriConfig.id !== void 0) {
          reqId = `${sriConfig.id}#${reqId}`;
        }
        httpContext3.set("reqId", reqId);
        next();
      });
      yield pMap8(
        sriConfig.resources,
        (mapping) => __async(this, null, function* () {
          var _a;
          if (!mapping.onlyCustom) {
            if (((_a = mapping.map) == null ? void 0 : _a.key) === void 0) {
              mapping.map = __spreadProps(__spreadValues({}, mapping.map), {
                key: {}
              });
            }
            checkRequiredFields(mapping, sriConfig.informationSchema);
            if (mapping.query === void 0) {
              mapping.query = {};
            }
            if (mapping.map.from && mapping.map.to) {
              mapping.query = __spreadValues(__spreadValues({}, mapping.query), relationsFilter_exports);
            }
            app.get(`${mapping.type}/schema`, middlewareErrorWrapper(getSchema));
            app.get(`${mapping.type}/docs`, middlewareErrorWrapper(getDocs));
            app.get(`${mapping.type}/docs/static/:file`, returnFileFromDocsStatic);
          }
        }),
        { concurrency: 1 }
      );
      if (sriConfig.enableGlobalBatch) {
        const globalBatchPath = `${sriConfig.globalBatchRoutePrefix !== void 0 ? sriConfig.globalBatchRoutePrefix : ""}/batch`;
        debug("general", `registering route ${globalBatchPath} - PUT/POST`);
        debug("general", `registering route ${`${globalBatchPath}_streaming`} - PUT/POST`);
        app.put(
          globalBatchPath,
          expressWrapper(dbR, dbW, batchOperation, sriConfig, null, false, true, false)
        );
        app.post(
          globalBatchPath,
          expressWrapper(dbR, dbW, batchOperation, sriConfig, null, false, true, false)
        );
        app.put(
          `${globalBatchPath}_streaming`,
          expressWrapper(dbR, dbW, batchOperationStreaming, sriConfig, null, true, true, false)
        );
        app.post(
          `${globalBatchPath}_streaming`,
          expressWrapper(dbR, dbW, batchOperationStreaming, sriConfig, null, true, true, false)
        );
      }
      const batchHandlerMap = sriConfig.resources.reduce(
        (acc, mapping) => {
          var _a;
          const crudRoutes = [
            {
              route: `${mapping.type}/:key`,
              verb: "GET",
              func: getRegularResource,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: true,
              isBatch: false
            },
            {
              route: `${mapping.type}/:key`,
              verb: "PUT",
              func: createOrUpdateRegularResource,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: false,
              isBatch: false
            },
            {
              route: `${mapping.type}/:key`,
              verb: "PATCH",
              func: patchRegularResource,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: false,
              isBatch: false
            },
            {
              route: `${mapping.type}/:key`,
              verb: "DELETE",
              func: deleteRegularResource,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: false,
              isBatch: false
            },
            {
              route: mapping.type,
              verb: "GET",
              func: getListResource,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: true,
              isBatch: false
            },
            // // a check operation to determine wether lists A is part of list B
            {
              route: `${mapping.type}/isPartOf`,
              verb: "POST",
              func: isPartOf,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: true,
              isBatch: false
            }
          ];
          const batchRoutes = [
            // [`${mapping.type}/batch`, 'PUT', batch.batchOperation, sriConfig, mapping, false, false, true],
            {
              route: `${mapping.type}/batch`,
              verb: "PUT",
              func: batchOperation,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: false,
              isBatch: true
            },
            // [`${mapping.type}/batch`, 'POST', batch.batchOperation, sriConfig, mapping, false, false, true],
            {
              route: `${mapping.type}/batch`,
              verb: "POST",
              func: batchOperation,
              config: sriConfig,
              mapping,
              streaming: false,
              readOnly: false,
              isBatch: true
            },
            // [`${mapping.type}/batch_streaming`, 'PUT', batch.batchOperationStreaming, sriConfig, mapping, true, false, true],
            {
              route: `${mapping.type}/batch_streaming`,
              verb: "PUT",
              func: batchOperationStreaming,
              config: sriConfig,
              mapping,
              streaming: true,
              readOnly: false,
              isBatch: true
            },
            // [`${mapping.type}/batch_streaming`, 'POST', batch.batchOperationStreaming, sriConfig, mapping, true, false, true],
            {
              route: `${mapping.type}/batch_streaming`,
              verb: "POST",
              func: batchOperationStreaming,
              config: sriConfig,
              mapping,
              streaming: true,
              readOnly: false,
              isBatch: true
            }
          ];
          (_a = mapping.customRoutes) == null ? void 0 : _a.forEach((cr) => {
            const customMapping = _7.cloneDeep(mapping);
            if (isLikeCustomRouteDefinition(cr) && "alterMapping" in cr && cr.alterMapping !== void 0) {
              cr.alterMapping(customMapping);
            } else if ("transformResponse" in cr && cr.transformResponse) {
              customMapping.transformResponse = [
                ...customMapping.transformResponse || [],
                cr.transformResponse
              ];
            }
            cr.httpMethods.forEach((method) => {
              if (isLikeCustomRouteDefinition(cr)) {
                const crudPath = mapping.type + cr.like;
                customMapping.query = __spreadValues(__spreadValues({}, customMapping.query), cr.query);
                const likeMatches = crudRoutes.filter(
                  ({ route, verb }) => route === crudPath && verb === method.toUpperCase()
                );
                if (likeMatches.length === 0) {
                  console.log(
                    `
WARNING: customRoute like ${crudPath} - ${method} not found => ignored.
`
                  );
                } else {
                  const { verb, func, streaming, readOnly } = likeMatches[0];
                  acc.push({
                    route: crudPath + cr.routePostfix,
                    verb,
                    func,
                    config: sriConfig,
                    mapping: customMapping,
                    streaming,
                    readOnly,
                    isBatch: false
                  });
                }
              } else if (isStreamingCustomRouteDefinition(cr)) {
                const { streamingHandler } = cr;
                acc.push({
                  route: mapping.type + cr.routePostfix,
                  verb: method.toUpperCase(),
                  func: (_phaseSyncer, tx, sriRequest, _mapping1) => __async(this, null, function* () {
                    var _a2, _b;
                    if (sriRequest.isBatchPart) {
                      throw new SriError({
                        status: 400,
                        errors: [
                          {
                            code: "streaming.not.allowed.in.batch",
                            msg: "Streaming mode cannot be used inside a batch."
                          }
                        ]
                      });
                    }
                    if (cr.busBoy) {
                      try {
                        sriRequest.busBoy = busboy(__spreadProps(__spreadValues({}, cr.busBoyConfig), {
                          headers: sriRequest.headers
                        }));
                      } catch (err) {
                        throw new SriError({
                          status: 400,
                          errors: [
                            {
                              code: "error.initialising.busboy",
                              msg: `Error during initialisation of busboy: ${err}`
                            }
                          ]
                        });
                      }
                    }
                    if (cr.beforeStreamingHandler !== void 0) {
                      try {
                        const result = yield cr.beforeStreamingHandler(
                          tx,
                          sriRequest,
                          customMapping,
                          global.sriInternalUtils
                        );
                        if (result !== void 0) {
                          const { status, headers } = result;
                          headers.forEach(([k, v]) => {
                            if (sriRequest.setHeader) {
                              sriRequest.setHeader(k, v);
                            }
                          });
                          if (sriRequest.setStatus) {
                            sriRequest.setStatus(status);
                          }
                        }
                      } catch (err) {
                        if (err instanceof SriError || ((_b = (_a2 = err == null ? void 0 : err.__proto__) == null ? void 0 : _a2.constructor) == null ? void 0 : _b.name) === "SriError") {
                          throw err;
                        } else {
                          throw new SriError({ status: 500, errors: [`${util.format(err)}`] });
                        }
                      }
                    }
                    let keepAliveTimer = null;
                    let stream2;
                    const streamEndEmitter = new EventEmitter3();
                    const streamDonePromise = pEvent4(streamEndEmitter, "done");
                    if (cr.binaryStream) {
                      stream2 = sriRequest.outStream;
                    } else {
                      if (sriRequest.setHeader) {
                        sriRequest.setHeader("Content-Type", "application/json; charset=utf-8");
                      }
                      stream2 = createReadableStream(true);
                      const JsonStream = new JsonStreamStringify(stream2);
                      JsonStream.pipe(sriRequest.outStream);
                      sriRequest.outStream.write("");
                      keepAliveTimer = setInterval(() => {
                        sriRequest.outStream.write(" ");
                        if (sriRequest.outStream instanceof ServerResponse) {
                          sriRequest.outStream.flush();
                        }
                      }, sriConfig.streamingKeepAliveTimeoutMillis || 2e4);
                    }
                    sriRequest.outStream.on("close", () => streamEndEmitter.emit("done"));
                    const streamingHandlerPromise = streamingHandler(
                      tx,
                      sriRequest,
                      stream2,
                      global.sriInternalUtils
                    );
                    if (cr.busBoy && sriRequest.busBoy) {
                      sriRequest.inStream.pipe(sriRequest.busBoy);
                    }
                    try {
                      yield streamingHandlerPromise;
                    } finally {
                      if (keepAliveTimer !== null) {
                        clearInterval(keepAliveTimer);
                      }
                    }
                    if (cr.binaryStream) {
                      stream2.end();
                    } else {
                      stream2.push(null);
                    }
                    yield streamDonePromise;
                    return { status: 200 };
                  }),
                  config: sriConfig,
                  mapping: customMapping,
                  streaming: true,
                  readOnly: method.toUpperCase() === "GET" ? true : !!cr.readOnly,
                  isBatch: false
                });
              } else if (cr.handler !== void 0) {
                const { handler } = cr;
                acc.push({
                  route: mapping.type + cr.routePostfix,
                  verb: method.toUpperCase(),
                  func: (phaseSyncer, tx, sriRequest, _mapping) => __async(this, null, function* () {
                    yield phaseSyncer.phase();
                    yield phaseSyncer.phase();
                    yield phaseSyncer.phase();
                    if (cr.beforeHandler !== void 0) {
                      yield cr.beforeHandler(
                        tx,
                        sriRequest,
                        customMapping,
                        global.sriInternalUtils
                      );
                    }
                    yield phaseSyncer.phase();
                    const result = yield handler(
                      tx,
                      sriRequest,
                      customMapping,
                      global.sriInternalUtils
                    );
                    yield phaseSyncer.phase();
                    yield phaseSyncer.phase();
                    if (cr.afterHandler !== void 0) {
                      yield cr.afterHandler(
                        tx,
                        sriRequest,
                        customMapping,
                        result,
                        global.sriInternalUtils
                      );
                    }
                    yield phaseSyncer.phase();
                    return result;
                  }),
                  config: sriConfig,
                  mapping: customMapping,
                  streaming: false,
                  readOnly: method.toUpperCase() === "GET" ? true : !!cr.readOnly,
                  isBatch: false
                });
              } else {
                throw new Error("No handlers defined");
              }
            });
          });
          acc.push(...batchRoutes);
          if (!mapping.onlyCustom) {
            acc.push(...crudRoutes);
          }
          return acc;
        },
        []
      );
      const internalSriRequest = (internalReq) => __async(this, null, function* () {
        const match = matchHref(internalReq.href, internalReq.verb);
        const sriRequest = generateSriRequest(
          void 0,
          void 0,
          void 0,
          match,
          void 0,
          void 0,
          internalReq
        );
        yield applyHooks(
          "transform internal sriRequest",
          match.handler.config.transformInternalRequest || [],
          (f) => f(internalReq.dbT, sriRequest, internalReq.parentSriRequest),
          sriRequest
        );
        const result = yield handleRequest(sriRequest, match.handler.func, match.handler.mapping);
        return JSON.parse(JSON.stringify(result));
      });
      global.sri4node_internal_interface = internalSriRequest;
      const sriInternalUtils = {
        internalSriRequest
      };
      global.sriInternalUtils = sriInternalUtils;
      const sriServerInstance = {
        pgp: pgp2,
        db,
        app,
        // informationSchema: currentInformationSchema, // maybe later
        close: () => __async(this, null, function* () {
          db && (yield db.$pool.end());
        })
      };
      batchHandlerMap.forEach(
        ({ route, verb, func, config, mapping, streaming, readOnly, isBatch }) => {
          debug("general", `registering route ${route} - ${verb} - ${readOnly}`);
          app[verb.toLowerCase()](
            route,
            emt.instrument(
              expressWrapper(dbR, dbW, func, config, mapping, streaming, isBatch, readOnly),
              "express-wrapper"
            )
          );
        }
      );
      sriConfig.batchHandlerMap = _7.groupBy(
        batchHandlerMap.map(
          ({ route, verb, func, config, mapping, streaming, readOnly, isBatch }) => ({
            route: new Route(route),
            verb,
            func,
            config,
            mapping,
            streaming,
            readOnly,
            isBatch
          })
        ),
        (e) => e.verb
      );
      app.get("/", (_req, res) => res.redirect("/resources"));
      console.log(
        "___________________________ SRI4NODE INITIALIZATION DONE _____________________________"
      );
      return sriServerInstance;
    } catch (err) {
      console.error(
        "___________________________ SRI4NODE INITIALIZATION ERROR _____________________________"
      );
      console.error(err);
      process.exit(1);
    }
  });
}
export {
  SriError,
  configure,
  debugAnyChannelAllowed as debug,
  error,
  isLikeCustomRouteDefinition,
  isNonStreamingCustomRouteDefinition,
  isStreamingCustomRouteDefinition,
  mapUtils_exports as mapUtils,
  queryUtils_exports as queryUtils,
  schemaUtils_exports as schemaUtils,
  utils
};
//# sourceMappingURL=sri4node.esm.mjs.map
