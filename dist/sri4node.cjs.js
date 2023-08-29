var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
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
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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

// index.ts
var sri4node_exports = {};
__export(sri4node_exports, {
  SriError: () => SriError,
  configure: () => configure,
  debug: () => debugAnyChannelAllowed,
  error: () => error,
  isLikeCustomRouteDefinition: () => isLikeCustomRouteDefinition,
  isNonStreamingCustomRouteDefinition: () => isNonStreamingCustomRouteDefinition,
  isStreamingCustomRouteDefinition: () => isStreamingCustomRouteDefinition,
  mapUtils: () => mapUtils_exports,
  queryUtils: () => queryUtils_exports,
  schemaUtils: () => schemaUtils_exports,
  utils: () => utils
});
module.exports = __toCommonJS(sri4node_exports);

// sri4node.ts
var import_lodash7 = __toESM(require("lodash"));
var util = __toESM(require("util"));
var import_ajv2 = __toESM(require("ajv"));
var import_ajv_formats2 = __toESM(require("ajv-formats"));
var import_compression = __toESM(require("compression"));
var import_body_parser = __toESM(require("body-parser"));
var import_express = __toESM(require("express"));
var import_route_parser = __toESM(require("route-parser"));
var import_p_map8 = __toESM(require("p-map"));
var import_busboy = __toESM(require("busboy"));
var import_events4 = __toESM(require("events"));
var import_p_event4 = __toESM(require("p-event"));
var import_express_http_context3 = __toESM(require("express-http-context"));
var import_shortid = __toESM(require("shortid"));
var import_pug = __toESM(require("pug"));

// js/common.ts
var import_pg_promise = __toESM(require("pg-promise"));
var import_pg_monitor = __toESM(require("pg-monitor"));
var import_uuid = require("uuid");
var import_stream = require("stream");
var import_lodash = __toESM(require("lodash"));

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
function array(description) {
  const ret = {
    type: "array",
    description
  };
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
      Object.entries(patchedSchema.properties).map((e) => [e[0], patchSchemaToDisallowAdditionalProperties(e[1])])
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
var import_peggy = __toESM(require("peggy"));

// js/common.ts
var import_url = __toESM(require("url"));
var import_events = __toESM(require("events"));
var import_p_event = __toESM(require("p-event"));
var import_path = __toESM(require("path"));
var import_stream2 = __toESM(require("stream"));
var import_peggy2 = __toESM(require("peggy"));
var import_express_http_context = __toESM(require("express-http-context"));

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
    const reqId = import_express_http_context.default.get("reqId");
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
  const reqId = import_express_http_context.default.get("reqId");
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
  app.use(init((_req, _res) => {
  }));
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
    return { channels: /* @__PURE__ */ new Set(["general", "trace", "requests", "server-timing"]) };
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
  const reqId = import_express_http_context.default.get("reqId");
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
  const parsedUrl = import_url.default.parse(urlToParse);
  const pathName = (_a = parsedUrl.pathname) == null ? void 0 : _a.replace(/\/$/, "");
  const parts = pathName == null ? void 0 : pathName.split("/");
  const type = import_lodash.default.initial(parts).join("/");
  const key = import_lodash.default.last(parts);
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
  const pp = import_path.default.parse(u1);
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
  ret = ret.replace(/[^a-z0-9 ]/gmi, "");
  ret = ret.replace(/ /gmi, ".");
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
  const columnNames = summary ? Object.keys(mapping.map).filter((c) => !(mapping.map[c].excludeOn !== void 0 && mapping.map[c].excludeOn.toLowerCase() === "summary")) : Object.keys(mapping.map);
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
  Object.assign(element.$$meta, import_lodash.default.pickBy({
    // keep only properties with defined non-null value (requires lodash - behaves different as underscores _.pick())
    deleted: row["$$meta.deleted"],
    created: row["$$meta.created"],
    modified: row["$$meta.modified"]
  }));
  element.$$meta.permalink = `${resourceMapping.type}/${row.key}`;
  element.$$meta.version = row["$$meta.version"];
  return element;
}
function checkSriConfigWithDb(sriConfig) {
  sriConfig.resources.forEach((resourceMapping) => {
    const map = resourceMapping.map || {};
    Object.keys(map).forEach((key) => {
      if (global.sri4node_configuration.informationSchema[resourceMapping.type][key] === void 0) {
        const dbFields = Object.keys(global.sri4node_configuration.informationSchema[resourceMapping.type]).sort();
        const caseInsensitiveIndex = dbFields.map((c) => c.toLowerCase()).indexOf(key.toLowerCase());
        if (caseInsensitiveIndex >= 0) {
          console.error(`
[CONFIGURATION PROBLEM] No database column found for property '${key}' as specified in sriConfig of resource '${resourceMapping.type}'. It is probably a case mismatch because we did find a column named '${dbFields[caseInsensitiveIndex]}'instead.`);
        } else {
          console.error(`
[CONFIGURATION PROBLEM] No database column found for property '${key}' as specified in sriConfig of resource '${resourceMapping.type}'. All available column names are ${dbFields.join(", ")}`);
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
    var _a;
    if (map[key].references && obj[key] !== void 0) {
      const permalink2 = obj[key].href;
      if (!permalink2) {
        throw new SriError({ status: 409, errors: [{ code: "no.href.inside.reference", msg: `No href found inside reference ${key}` }] });
      }
      const expectedType = map[key].references;
      const { type: refType, key: refKey } = urlToTypeAndKey(permalink2);
      if (refType === expectedType) {
        row[key] = refKey;
      } else {
        const msg = `Faulty reference detected [${permalink2}], detected [${refType}] expected [${expectedType}].`;
        console.log(msg);
        throw new SriError({ status: 409, errors: [{ code: "faulty.reference", msg }] });
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
    const fieldTypeObject = ((_a = resourceMapping.schema.properties) == null ? void 0 : _a[key]) ? resourceMapping.schema.properties[key].type : null;
    if (fieldTypeDb === "jsonb" && fieldTypeObject === "array") {
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
    pgp = (0, import_pg_promise.default)(pgpInitOptionsUpdated);
    if (extraOptions.monitor) {
      import_pg_monitor.default.attach(pgpInitOptionsUpdated);
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
      console.warn("defaultdatabaseurl config property has been deprecated, use databaseConnectionParameters.connectionString instead");
    }
    if (sri4nodeConfig.maxConnections) {
      console.warn("maxConnections config property has been deprecated, use databaseConnectionParameters.max instead");
    }
    if (sri4nodeConfig.dbConnectionInitSql) {
      console.warn("dbConnectionInitSql config property has been deprecated, use databaseConnectionParameters.connectionInitSql instead");
    }
    if (process.env.PGP_MONITOR) {
      console.warn("environemtn variable PGP_MONITOR has been deprecated, set config property databaseLibraryInitOptions.pgMonitor to true instead");
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
      idleTimeoutMillis: 144e5
    }, sri4nodeConfig.databaseConnectionParameters);
    console.log(`Using database connection object : [${JSON.stringify(cn)}]`);
    return pgp(cn);
  });
}
function pgExec(db, query, sriRequest) {
  return __async(this, null, function* () {
    const { sql, values } = query.toParameterizedSql();
    debug("sql", () => pgp.as.format(sql, values));
    const hrstart = process.hrtime();
    const result = yield db.query(sql, values);
    const hrElapsed = process.hrtime(hrstart);
    if (sriRequest) {
      setServerTimingHdr(sriRequest, "db", hrtimeToMilliseconds(hrElapsed));
    }
    return result;
  });
}
function pgResult(db, query, sriRequest) {
  return __async(this, null, function* () {
    const { sql, values } = query.toParameterizedSql();
    debug("sql", () => pgp.as.format(sql, values));
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
    const eventEmitter = new import_events.default();
    const txWrapper = (emitter) => __async(this, null, function* () {
      try {
        yield db.tx({ mode }, (tx) => __async(this, null, function* () {
          emitter.emit("txEvent", tx);
          const how = yield (0, import_p_event.default)(emitter, "terminate");
          if (how === "reject") {
            throw "txRejected";
          }
        }));
        emitter.emit("txDone");
      } catch (err) {
        if (err !== "txRejected") {
          emitter.emit("txDone", err);
        } else {
          emitter.emit("txDone");
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
        const res = yield (0, import_p_event.default)(eventEmitter, "txDone");
        if (res !== void 0) {
          throw res;
        }
      });
      return { tx, resolveTx: terminateTx("resolve"), rejectTx: terminateTx("reject") };
    } catch (err) {
      error("CAUGHT ERROR: ");
      error(JSON.stringify(err), err);
      throw new SriError({ status: 503, errors: [{ code: "too.busy", msg: "The request could not be processed as the database is too busy right now. Try again later." }] });
    }
  });
}
function startTask(db) {
  return __async(this, null, function* () {
    debug("db", "++ Starting database task.");
    const emitter = new import_events.default();
    const taskWrapper = (emitter2) => __async(this, null, function* () {
      try {
        yield db.task((t) => __async(this, null, function* () {
          emitter2.emit("tEvent", t);
          yield (0, import_p_event.default)(emitter2, "terminate");
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
        const res = yield (0, import_p_event.default)(emitter, "tDone");
        debug("db", "db task done.");
        if (res !== void 0) {
          throw res;
        }
      });
      return { t, endTask };
    } catch (err) {
      error("CAUGHT ERROR: ");
      error(JSON.stringify(err));
      throw new SriError({ status: 503, errors: [{ code: "too.busy", msg: "The request could not be processed as the database is too busy right now. Try again later." }] });
    }
  });
}
function installVersionIncTriggerOnTable(db, tableName, schemaName) {
  return __async(this, null, function* () {
    const tgname = `vsko_resource_version_trigger_${schemaName !== void 0 ? schemaName : ""}_${tableName}`;
    const plpgsql = `
    DO $___$
    BEGIN
      -- 1. add column '$$meta.version' if not yet present
      IF NOT EXISTS (
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
          AND column_name = '$$meta.version'
          ${schemaName !== void 0 ? `AND table_schema = '${schemaName}'` : ""}
      ) THEN
        ALTER TABLE "${tableName}" ADD "$$meta.version" integer DEFAULT 0;
      END IF;

      -- 2. create func vsko_resource_version_inc_function if not yet present
      IF NOT EXISTS (SELECT proname from pg_proc p INNER JOIN pg_namespace ns ON (p.pronamespace = ns.oid)
                      WHERE proname = 'vsko_resource_version_inc_function'
                      ${schemaName !== void 0 ? `AND nspname = '${schemaName}'` : "AND nspname = 'public'"}
                    ) THEN
        CREATE FUNCTION ${schemaName !== void 0 ? schemaName : "public"}.vsko_resource_version_inc_function() RETURNS OPAQUE AS '
        BEGIN
          NEW."$$meta.version" := OLD."$$meta.version" + 1;
          RETURN NEW;
        END' LANGUAGE 'plpgsql';
      END IF;

      -- 3. create trigger 'vsko_resource_version_trigger_${tableName}' if not yet present
      IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = '${tgname}') THEN
          CREATE TRIGGER ${tgname} BEFORE UPDATE ON "${tableName}"
          FOR EACH ROW EXECUTE PROCEDURE ${schemaName !== void 0 ? schemaName : "public"}.vsko_resource_version_inc_function();
      END IF;
    END
    $___$
    LANGUAGE 'plpgsql';
  `;
    yield db.query(plpgsql);
  });
}
function getCountResult(tx, countquery, sriRequest) {
  return __async(this, null, function* () {
    const [{ count }] = yield pgExec(tx, countquery, sriRequest);
    return parseInt(count, 10);
  });
}
function tableFromMapping(mapping) {
  return mapping.table || import_lodash.default.last(mapping.type.split("/"));
}
function isEqualSriObject(obj1, obj2, mapping) {
  const relevantProperties = Object.keys(mapping.map);
  function customizer(val, key, _obj) {
    if (mapping.schema.properties[key] && mapping.schema.properties[key].format === "date-time") {
      return new Date(val).getTime();
    }
    if (global.sri4node_configuration.informationSchema[mapping.type][key] && global.sri4node_configuration.informationSchema[mapping.type][key].type === "bigint") {
      return BigInt(val);
    }
  }
  const o1 = import_lodash.default.cloneDeepWith(import_lodash.default.pickBy(obj1, (val, key) => val !== null && val != void 0 && relevantProperties.includes(key)), customizer);
  const o2 = import_lodash.default.cloneDeepWith(import_lodash.default.pickBy(obj2, (val, key) => val !== null && val != void 0 && relevantProperties.includes(key)), customizer);
  return import_lodash.default.isEqualWith(o1, o2);
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
    error("____________________________ E R R O R (settleResultsToSriResults)_________________________");
    error(stringifyError(err));
    if (err && err.stack) {
      error("STACK:");
      error(err.stack);
    }
    error("___________________________________________________________________________________________");
    return new SriError({ status: 500, errors: [{ code: "internal.server.error", msg: `Internal Server Error. [${stringifyError(err)}}]` }] });
  });
}
function createReadableStream(objectMode = true) {
  const s = new import_stream.Readable({ objectMode });
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
    id: (0, import_uuid.v4)(),
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
    inStream: new import_stream2.default.Readable(),
    outStream: new import_stream2.default.Writable(),
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
      body: batchElement.body == null ? null : import_lodash.default.isObject(batchElement.body) ? batchElement.body : JSON.parse(batchElement.body),
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
        throw Error("[generateSriRequest] basicConfig.isStreamingRequest is true, but expressResponse argument is missing");
      }
      const inStream = new import_stream2.default.PassThrough({ allowHalfOpen: false, emitClose: true });
      const outStream = new import_stream2.default.PassThrough({ allowHalfOpen: false, emitClose: true });
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
      body: batchElement.body == null ? null : import_lodash.default.isObject(batchElement.body) ? batchElement.body : JSON.parse(batchElement.body),
      sriType: batchHandlerAndParams.handler.mapping.type,
      isBatchPart: true
    });
  }
  throw Error("[generateSriRequest] Unable to generate an SriRequest based on the given combination of parameters");
}

// js/batch.ts
var import_lodash2 = __toESM(require("lodash"));
var import_p_map3 = __toESM(require("p-map"));
var import_p_each_series = __toESM(require("p-each-series"));
var import_url2 = __toESM(require("url"));
var import_JSONStream = __toESM(require("JSONStream"));
var import_events3 = __toESM(require("events"));
var import_p_event3 = __toESM(require("p-event"));
var import_express_http_context2 = __toESM(require("express-http-context"));

// js/hooks.ts
var import_p_map = __toESM(require("p-map"));
function applyHooks(type, functions, applyFun, sriRequest) {
  return __async(this, null, function* () {
    var _a, _b;
    if (functions && functions.length > 0) {
      try {
        debug("hooks", `applyHooks-${type}: going to apply ${functions.length} functions`);
        yield (0, import_p_map.default)(functions, (fun) => __async(this, null, function* () {
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
        }), { concurrency: 1 });
      } catch (err) {
        if (err instanceof SriError || ((_b = (_a = err == null ? void 0 : err.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError") {
          throw err;
        } else {
          console.log("_______________________ H O O K S - E R R O R _____________________________________________");
          console.log(err);
          console.log(err.stack);
          console.log(Object.prototype.toString.call(err));
          console.log("___________________________________________________________________________________________");
          throw new SriError({ status: 500, errors: [{ code: errorAsCode(`${type} failed`), msg: stringifyError(err) }] });
        }
      }
    } else {
      debug("hooks", `applyHooks-${type}: no ${type} functions registered.`);
    }
  });
}

// js/phaseSyncedSettle.ts
var import_p_settle = __toESM(require("p-settle"));
var import_p_event2 = __toESM(require("p-event"));
var import_p_map2 = __toESM(require("p-map"));
var import_emitter_queue = __toESM(require("emitter-queue"));
var import_events2 = __toESM(require("events"));
var import_uuid2 = require("uuid");
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
    this.id = (0, import_uuid2.v4)();
    this.phaseCntr = 0;
    this.jobEmitter = (0, import_emitter_queue.default)(new import_events2.default());
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
      const result = yield (0, import_p_event2.default)(this.jobEmitter, ["sriError", "ready"]);
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
var splitListAt = (list, index) => [list.slice(0, index), list.slice(index)];
function phaseSyncedSettle(_0) {
  return __async(this, arguments, function* (jobList, { concurrency, beforePhaseHooks } = {}) {
    var _a, _b;
    const ctrlEmitter = (0, import_emitter_queue.default)(new import_events2.default());
    const jobMap = new Map(
      jobList.map(([fun, args]) => new PhaseSyncer(fun, args, ctrlEmitter)).map((phaseSyncer) => [phaseSyncer.id, phaseSyncer])
    );
    const pendingJobs = new Set(jobMap.keys());
    const sriRequestMap = new Map(
      [...jobMap.entries()].map(([id, phaseSyncer]) => [id, phaseSyncer.sriRequest])
    );
    const sriRequestIDToPhaseSyncerMap = new Map(
      [...jobMap.entries()].map(([_id, phaseSyncer]) => [phaseSyncer.sriRequest.id, phaseSyncer])
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
          error("ERROR: PhaseSyncer: unexpected startQueuedJob() call while max number of concurrent jobs is still running ! -> NOT starting queued job");
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
      ctrlEmitter.on("stepDone", errorHandlingWrapper((id, stepnr) => __async(this, null, function* () {
        debug_log(id, `*step ${stepnr}* done.`);
        phasePendingJobs.delete(id);
        if (getParentSriRequestFromRequestMap(sriRequestMap).reqCancelled) {
          throw new SriError({ status: 0, errors: [{ code: "cancelled", msg: "Request cancelled by client." }] });
        }
        if (phasePendingJobs.size === 0) {
          debug_log(id, " Starting new phase.");
          yield startNewPhase();
        } else {
          debug_log(id, " Starting queued job.");
          startQueuedJob();
        }
      })));
      ctrlEmitter.on("jobDone", errorHandlingWrapper((id) => __async(this, null, function* () {
        debug_log(id, "*JOB* done.");
        pendingJobs.delete(id);
        queuedJobs.delete(id);
        phasePendingJobs.delete(id);
        if (phasePendingJobs.size === 0) {
          yield startNewPhase();
        } else {
          startQueuedJob();
        }
      })));
      ctrlEmitter.on("jobFailed", errorHandlingWrapper((id) => __async(this, null, function* () {
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
          yield (0, import_p_map2.default)(pendingJobs, (id2) => __async(this, null, function* () {
            var _a2, _b2, _c;
            const job = jobMap.get(id2);
            if (job === void 0) {
              throw new Error("[jobFailed] Job is undefined, which is unexpected...");
            } else if (job.sriRequest === void 0 || !(parent.multiInsertFailed && ((_a2 = parent.putRowsToInsertIDs) == null ? void 0 : _a2.includes(job == null ? void 0 : job.sriRequest.id))) && !(parent.multiUpdateFailed && ((_b2 = parent.putRowsToUpdateIDs) == null ? void 0 : _b2.includes(job == null ? void 0 : job.sriRequest.id))) && !(parent.multiDeleteFailed && ((_c = parent.rowsToDeleteIDs) == null ? void 0 : _c.includes(job == null ? void 0 : job.sriRequest.id)))) {
              job == null ? void 0 : job.jobEmitter.queue(
                "sriError",
                new SriError({ status: 202, errors: [{ code: "cancelled", msg: "Request cancelled due to failure in accompanying request in batch." }] })
              );
            }
          }));
        }
        if (phasePendingJobs.size === 0) {
          yield startNewPhase();
        } else {
          yield startQueuedJob();
        }
      })));
      yield startNewPhase();
      return (0, import_p_settle.default)([...jobMap.values()].map((phaseSyncer) => phaseSyncer.jobPromise));
    } catch (err) {
      console.warn("WARN: error in phase syncer");
      console.warn(err);
      console.warn(JSON.stringify(err));
      let sriError;
      if (err instanceof SriError || ((_b = (_a = err == null ? void 0 : err.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError") {
        sriError = err;
      } else {
        sriError = new SriError({ status: 500, errors: [{ code: "phase.synced.settle.failed", err: err.toString() }] });
      }
      pendingJobs.forEach((id) => {
        var _a2;
        (_a2 = jobMap.get(id)) == null ? void 0 : _a2.jobEmitter.queue(
          "sriError",
          new SriError({
            status: 202,
            errors: [{ code: "cancelled", msg: "Request cancelled due to failure in accompanying request in batch." }]
          })
        );
      });
      yield (0, import_p_settle.default)([...jobMap.values()].map((phaseSyncer) => phaseSyncer.jobPromise));
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
    throw new SriError({ status: 400, errors: [{ code: "no.verb", msg: `No VERB stated for ${href}.` }] });
  }
  const parsedUrl = import_url2.default.parse(href, true);
  const queryParams = parsedUrl.query;
  const path3 = (parsedUrl.pathname || "").replace(/\/$/, "");
  const batchHandlerMap = global.sri4node_configuration.batchHandlerMap;
  const matches = batchHandlerMap[verb].map((handler2) => ({ handler: handler2, match: handler2.route.match(path3) })).filter(({ match }) => match !== false);
  if (matches.length > 1) {
    console.log(`WARNING: multiple handler functions match for batch request ${path3}. Only first will be used. Check configuration.`);
  } else if (matches.length === 0) {
    throw new SriError({ status: 404, errors: [{ code: "no.matching.route", msg: `No route found for ${verb} on ${path3}.` }] });
  }
  const { handler } = import_lodash2.default.first(matches);
  const routeParams = import_lodash2.default.first(matches).match;
  return {
    handler,
    path: path3,
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
      errors: [{
        code: "batch.body.invalid",
        msg: "Batch body should be JSON array.",
        body: reqBody
      }]
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
          throw new SriError({ status: 400, errors: [{ code: "batch.not.allowed.in.batch", msg: "Nested /batch requests are not allowed, use 1 batch with sublists inside the batch JSON." }] });
        }
        if (!((_a = match.path) == null ? void 0 : _a.startsWith(batchBase))) {
          throw new SriError({ status: 400, errors: [{ code: "href.across.boundary", msg: "Only requests within (sub) path of /batch request are allowed." }] });
        }
        if (match.queryParams.dryRun === "true") {
          throw new SriError({ status: 400, errors: [{ code: "dry.run.not.allowed.in.batch", msg: "The dryRun query parameter is only allowed for the batch url itself (/batch?dryRun=true), not for hrefs inside a batch request." }] });
        }
        element.match = match;
      });
    } else {
      throw new SriError({ status: 400, errors: [{ code: "batch.invalid.type.mix", msg: "A batch array should contain either all objects or all (sub)arrays." }] });
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
          debug("batch", "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
          debug("batch", "| Handling batch list");
          debug("batch", "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
          return (0, import_p_map3.default)(
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
            const batchJobs = yield (0, import_p_map3.default)(batch, (batchElement) => __async(this, null, function* () {
              var _a;
              if (!batchElement.verb) {
                throw new SriError({ status: 400, errors: [{ code: "verb.missing", msg: "VERB is not specified." }] });
              }
              debug("batch", "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
              debug("batch", `| Executing /batch section ${batchElement.verb} - ${batchElement.href} `);
              debug("batch", "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
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
              return [match.handler.func, [tx, innerSriRequest, match.handler.mapping, internalUtils]];
            }), { concurrency: 1 });
            const results = settleResultsToSriResults(
              yield phaseSyncedSettle(batchJobs, {
                concurrency: batchConcurrency,
                beforePhaseHooks: global.sri4node_configuration.beforePhase
              })
            );
            if (results.some((e) => {
              var _a, _b;
              return e instanceof SriError || ((_b = (_a = e == null ? void 0 : e.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError";
            }) && sriRequest.readOnly === false) {
              batchFailed = true;
            }
            yield (0, import_p_each_series.default)(
              results,
              (res, idx) => __async(this, null, function* () {
                var _a, _b;
                const [_tx, innerSriRequest, mapping, internalUtils2] = batchJobs[idx][1];
                if (!(res instanceof SriError || ((_b = (_a = res == null ? void 0 : res.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError")) {
                  yield applyHooks(
                    "transform response",
                    mapping.transformResponse || [],
                    (f) => f(tx, innerSriRequest, res, internalUtils2)
                  );
                }
              })
            );
            return results.map((res, idx) => {
              const [_tx, innerSriRequest, _mapping] = batchJobs[idx][1];
              res.href = innerSriRequest.originalUrl;
              res.verb = innerSriRequest.httpMethod;
              delete res.sriRequestID;
              return res;
            });
          }
          return batch.map((_e) => new SriError({ status: 202, errors: [{ code: "cancelled", msg: "Request cancelled due to failure in accompanying request in batch." }] }));
        }
        batchFailed = true;
        throw new SriError({ status: 400, errors: [{ code: "batch.invalid.type.mix", msg: "A batch array should contain either all objects or all (sub)arrays." }] });
      });
      const batchResults = import_lodash2.default.flatten(yield handleBatchInBatchOperation(reqBody, sriRequest.dbT));
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
        debug("batch", "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
        debug("batch", "| Handling batch list");
        debug("batch", "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
        return (0, import_p_map3.default)(
          batch,
          (element) => __async(void 0, null, function* () {
            const result = yield handleBatchStreaming(
              element,
              tx
            );
            return result;
          }),
          { concurrency: 1 }
        );
      }
      if (batch.every((element) => typeof element === "object" && !Array.isArray(element))) {
        if (!batchFailed) {
          const batchJobs = yield (0, import_p_map3.default)(batch, (batchElement) => __async(void 0, null, function* () {
            var _a;
            if (!batchElement.verb) {
              throw new SriError({ status: 400, errors: [{ code: "verb.missing", msg: "VERB is not specified." }] });
            }
            debug("batch", "\u250C\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
            debug("batch", `| Executing /batch section ${batchElement.verb} - ${batchElement.href} `);
            debug("batch", "\u2514\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500");
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
              return [match.handler.func, [tx, innerSriRequest, match.handler.mapping, internalUtils]];
            } else {
              throw new SriError({ status: 500, errors: [{ code: "batch.missing.match", msg: "" }] });
            }
          }), { concurrency: 1 });
          const results = settleResultsToSriResults(yield phaseSyncedSettle(batchJobs, {
            concurrency: batchConcurrency,
            beforePhaseHooks: global.sri4node_configuration.beforePhase
          }));
          if (results.some((e) => {
            var _a, _b;
            return e instanceof SriError || ((_b = (_a = e == null ? void 0 : e.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError";
          })) {
            batchFailed = true;
          }
          yield (0, import_p_each_series.default)(
            results,
            (res, idx) => __async(void 0, null, function* () {
              var _a, _b;
              const [_tx, innerSriRequest, mapping] = batchJobs[idx][1];
              if (!(res instanceof SriError || ((_b = (_a = res == null ? void 0 : res.__proto__) == null ? void 0 : _a.constructor) == null ? void 0 : _b.name) === "SriError")) {
                yield applyHooks(
                  "transform response",
                  mapping.transformResponse || [],
                  (f) => f(tx, innerSriRequest, res)
                );
              }
            })
          );
          return results.map((res, idx) => {
            const [_tx, innerSriRequest, _mapping] = batchJobs[idx][1];
            res.href = innerSriRequest.originalUrl;
            res.verb = innerSriRequest.httpMethod;
            delete res.sriRequestID;
            stream2.push(res);
            return res.status;
          });
        }
        batch.forEach((_e) => stream2.push({ status: 202, errors: [{ code: "cancelled", msg: "Request cancelled due to failure in accompanying request in batch." }] }));
        return 202;
      }
      batchFailed = true;
      throw new SriError({ status: 400, errors: [{ code: "batch.invalid.type.mix", msg: "A batch array should contain either all objects or all (sub)arrays." }] });
    });
    if (sriRequest.setHeader) {
      const reqId = import_express_http_context2.default.get("reqId");
      if (reqId !== void 0) {
        sriRequest.setHeader("vsko-req-id", reqId);
      }
      if (sriRequest.headers["request-server-timing"]) {
        sriRequest.setHeader("Trailer", "Server-Timing");
      }
      sriRequest.setHeader("Content-Type", "application/json; charset=utf-8");
    }
    const stream2 = createReadableStream(true);
    stream2.pipe(import_JSONStream.default.stringify()).pipe(sriRequest.outStream, { end: false });
    keepAliveTimer = setInterval(() => {
      sriRequest.outStream.write("");
    }, 15e3);
    const streamEndEmitter = new import_events3.default();
    const streamDonePromise = (0, import_p_event3.default)(streamEndEmitter, "done");
    stream2.on("end", () => streamEndEmitter.emit("done"));
    sriRequest.outStream.write("{");
    sriRequest.outStream.write('"results":');
    if (!sriRequest.dbT)
      throw new Error("sriRequest containsno db transaction to work on");
    const batchResults = import_lodash2.default.flatten(
      yield handleBatchStreaming(reqBody, sriRequest.dbT)
    );
    const status = batchResults.some((e) => e === 403) ? 403 : Math.max(200, ...batchResults);
    stream2.push(null);
    stream2.destroy();
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
      if (x && x.length && x.length > 0) {
        for (let i = 0; i < x.length; i++) {
          this.param(x[i]);
          if (i < x.length - 1) {
            this.text += ",";
          }
        }
      }
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
          const index2 = text.indexOf(parameterPattern);
          if (index2 === -1) {
            const msg = "Parameter count in query does not add up. Too few parameters in the query string";
            error(`** ${msg}`);
            throw new Error(msg);
          } else {
            const prefix = text.substring(0, index2);
            const postfix = text.substring(index2 + parameterPattern.length, text.length);
            text = `${prefix}$${paramCount}${postfix}`;
            paramCount += 1;
          }
        }
        const index = text.indexOf(parameterPattern);
        if (index !== -1) {
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
  let path3;
  let matches;
  const pattern = /^(.*?)(CaseSensitive)?(Not)?(Greater(OrEqual)?|After|Less(OrEqual)?|Before|In|RegEx|Contains|Overlaps)?$/;
  if ((matches = key.match(pattern)) !== null) {
    key = matches[1];
    prefix = matches[2];
    postfix = matches[3];
    operator = matches[4];
  }
  if (parameter.indexOf(".") > -1 && parameter.indexOf("$$meta") == -1) {
    path3 = key;
    key = parameter.split(".")[0];
  }
  return {
    key,
    operator,
    prefix,
    postfix,
    path: path3
  };
}
function filterString(select, filter, value2, mapping) {
  let values;
  const not = filter.postfix === "Not";
  const sensitive = filter.prefix === "CaseSensitive";
  const tablename = tableFromMapping(mapping);
  if (filter.operator === "Greater" && not && sensitive || filter.operator === "Less" && !not && sensitive) {
    select.sql(` AND (${tablename}."${filter.key}"::text COLLATE "C") < `).param(value2);
  } else if (filter.operator === "Greater" && !not && sensitive || filter.operator === "Less" && not && sensitive) {
    select.sql(` AND (${tablename}."${filter.key}"::text COLLATE "C") > `).param(value2);
  } else if (filter.operator === "Greater" && not && !sensitive || filter.operator === "Less" && !not && !sensitive) {
    select.sql(` AND LOWER(${tablename}."${filter.key}"::text) < LOWER(`).param(value2).sql(")");
  } else if (filter.operator === "Greater" && !not && !sensitive || filter.operator === "Less" && not && !sensitive) {
    select.sql(` AND LOWER(${tablename}."${filter.key}"::text) > LOWER(`).param(value2).sql(")");
  } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && not && sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && !not && sensitive) {
    select.sql(` AND (${tablename}."${filter.key}"::text COLLATE "C") <= `).param(value2);
  } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && !not && sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && not && sensitive) {
    select.sql(` AND (${tablename}."${filter.key}"::text COLLATE "C") >= `).param(value2);
  } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && not && !sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && !not && !sensitive) {
    select.sql(` AND LOWER(${tablename}."${filter.key}"::text) <= LOWER(`).param(value2).sql(")");
  } else if ((filter.operator === "GreaterOrEqual" || filter.operator === "After") && !not && !sensitive || (filter.operator === "LessOrEqual" || filter.operator === "Before") && not && !sensitive) {
    select.sql(` AND LOWER(${tablename}."${filter.key}"::text) >= LOWER(`).param(value2).sql(")");
  } else if (filter.operator === "In" && not && sensitive) {
    values = value2.split(",");
    select.sql(` AND (${tablename}."${filter.key}"::text NOT IN (`).array(values).sql(`) OR ${filter.key}::text IS NULL)`);
  } else if (filter.operator === "In" && !not && sensitive) {
    values = value2.split(",");
    select.sql(` AND ${tablename}."${filter.key}"::text IN (`).array(values).sql(")");
  } else if (filter.operator === "In" && not && !sensitive) {
    values = value2.split(",").map((v) => v.toLowerCase());
    select.sql(` AND (LOWER(${tablename}."${filter.key}"::text) NOT IN (`).array(values).sql(`) OR ${filter.key}::text IS NULL)`);
  } else if (filter.operator === "In" && !not && !sensitive) {
    values = value2.split(",").map((v) => v.toLowerCase());
    select.sql(` AND LOWER(${tablename}."${filter.key}"::text) IN (`).array(values).sql(")");
  } else if (filter.operator === "RegEx" && not && sensitive) {
    select.sql(` AND ${tablename}."${filter.key}"::text !~ `).param(value2);
  } else if (filter.operator === "RegEx" && !not && sensitive) {
    select.sql(` AND ${tablename}."${filter.key}"::text ~ `).param(value2);
  } else if (filter.operator === "RegEx" && not && !sensitive) {
    select.sql(` AND ${tablename}."${filter.key}"::text !~* `).param(value2);
  } else if (filter.operator === "RegEx" && !not && !sensitive) {
    select.sql(` AND ${tablename}."${filter.key}"::text ~* `).param(value2);
  } else if (filter.operator === "Contains" && not && sensitive) {
    select.sql(` AND (${tablename}."${filter.key}"::text NOT LIKE `).param(`%${value2}%`).sql(` OR ${filter.key}::text IS NULL)`);
  } else if (filter.operator === "Contains" && !not && sensitive) {
    select.sql(` AND ${tablename}."${filter.key}"::text LIKE `).param(`%${value2}%`);
  } else if (filter.operator === "Contains" && not && !sensitive) {
    select.sql(` AND (${tablename}."${filter.key}"::text NOT ILIKE `).param(`%${value2}%`).sql(` OR ${filter.key}::text IS NULL)`);
  } else if (filter.operator === "Contains" && !not && !sensitive) {
    select.sql(` AND ${tablename}."${filter.key}"::text ILIKE `).param(`%${value2}%`);
  } else if (not && sensitive) {
    select.sql(` AND (${tablename}."${filter.key}"::text <> `).param(value2).sql(` OR ${filter.key}::text IS NULL)`);
  } else if (!not && sensitive) {
    select.sql(` AND ${tablename}."${filter.key}"::text = `).param(value2);
  } else if (not && !sensitive) {
    select.sql(` AND (LOWER(${tablename}."${filter.key}"::text) <> `).param(value2.toLowerCase()).sql(` OR ${filter.key}::text IS NULL)`);
  } else {
    select.sql(` AND LOWER(${tablename}."${filter.key}"::text) = `).param(value2.toLowerCase());
  }
}
function filterNumericOrTimestamp(select, filter, value2, _mapping, baseType) {
  if (!filter.postfix && filter.operator === "Less" || filter.operator === "Greater" && filter.postfix === "Not") {
    select.sql(` AND "${filter.key}" < `).param(value2);
  } else if (!filter.postfix && (filter.operator === "LessOrEqual" || filter.operator === "Before") || (filter.operator === "GreaterOrEqual" || filter.operator === "After") && filter.postfix === "Not") {
    select.sql(` AND "${filter.key}" <= `).param(value2);
  } else if (!filter.postfix && filter.operator === "Greater" || filter.operator === "Less" && filter.postfix === "Not") {
    select.sql(` AND "${filter.key}" > `).param(value2);
  } else if (!filter.postfix && (filter.operator === "GreaterOrEqual" || filter.operator === "After") || (filter.operator === "LessOrEqual" || filter.operator === "Before") && filter.postfix === "Not") {
    select.sql(` AND ("${filter.key}" >= `).param(value2);
    if (baseType === "timestamp") {
      select.sql(` OR "${filter.key}" IS NULL)`);
    } else {
      select.sql(")");
    }
  } else if (filter.operator === "In") {
    if (filter.postfix === "Not") {
      select.sql(` AND ("${filter.key}" NOT IN (`).array(value2.split(",")).sql(`) OR "${filter.key}" IS NULL)`);
    } else {
      select.sql(` AND "${filter.key}" IN (`).array(value2.split(",")).sql(")");
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
        errors: [{
          code: "invalid.array.filter",
          parameter: filter.operator,
          message: "Invalid array filter operator."
        }]
      });
    }
    select.sql(")");
  }
}
function filterBoolean(select, filter, value2) {
  if (value2 !== "any") {
    if (filter.postfix === "Not") {
      select.sql(" AND NOT ");
    } else {
      select.sql(" AND ");
    }
    select.sql(`"${filter.key}" = `).param(value2);
  }
}
function filterJson(select, filter, value2, _mapping) {
  const { path: path3 } = filter;
  if (path3 == null) {
    throw new SriError({
      status: 404,
      errors: [{
        code: "invalid.query.property",
        parameter: filter.key,
        message: "There is no valid path defined, use '.' to define path."
      }]
    });
  } else {
    let jsonKey = "";
    path3.split(".").forEach((part) => {
      if (jsonKey === "") {
        jsonKey = `"${part}"`;
      } else {
        jsonKey = `(${jsonKey})::json->>'${part}'`;
      }
    });
    jsonKey = `(${jsonKey})`;
    const not = filter.postfix === "Not";
    const sensitive = filter.prefix === "CaseSensitive";
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
      select.sql(` AND (${jsonKey}::text NOT IN (`).array(values).sql(`) OR ${filter.key}::text IS NULL)`);
    } else if (filter.operator === "In" && !not && sensitive) {
      const values = value2.split(",");
      select.sql(` AND ${jsonKey}::text IN (`).array(values).sql(")");
    } else if (filter.operator === "In" && not && !sensitive) {
      const values = value2.split(",").map((v) => v.toLowerCase());
      select.sql(` AND (LOWER(${jsonKey}::text) NOT IN (`).array(values).sql(`) OR ${filter.key}::text IS NULL)`);
    } else if (filter.operator === "In" && !not && !sensitive) {
      const values = value2.split(",").map((v) => v.toLowerCase());
      select.sql(` AND LOWER(${jsonKey}::text) IN (`).array(values).sql(")");
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
function defaultFilter(valueEnc, query, parameter, mapping) {
  const value2 = decodeURIComponent(valueEnc);
  const filter = analyseParameter(parameter);
  const { informationSchema: informationSchema2 } = global.sri4node_configuration;
  const idx = mapping.type;
  const field = informationSchema2[idx][filter.key];
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
    filterGeneral(query, value2, getTextFieldsFromTable(informationSchema2[idx]));
  } else {
    throw new SriError({
      status: 404,
      errors: [{
        code: "invalid.query.parameter",
        parameter,
        possibleParameters: Object.keys(informationSchema2[idx])
      }]
    });
  }
}

// js/queryUtils.ts
function filterHrefs(href, query, mapping) {
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
            errors: [{
              code: "parameter.referenced.type.invalid.value",
              msg: `Parameter '${columnname}' should start with '${`${resourcetype}/`}'.`,
              parameter: columnname,
              value: permalink2
            }]
          });
        }
        const key = permalink2.split("/")[permalink2.split("/").length - 1];
        return key;
      });
      query.sql(` and "${columnname}" in (`).array(keys).sql(") ");
    }
  };
}
function modifiedSince(value2, query, mapping) {
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
var import_lodash3 = __toESM(require("lodash"));
function informationSchema(db, sriConfig) {
  return __async(this, null, function* () {
    var _a;
    const tableNames = import_lodash3.default.uniq(sriConfig.resources.map((mapping) => tableFromMapping(mapping)));
    const query = prepareSQL("information-schema");
    const { schema } = sriConfig.databaseConnectionParameters;
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
        WHERE table_name in (`
    ).array(tableNames).sql(") and table_schema = ").param(schemaParam);
    const rowsByTable = import_lodash3.default.groupBy(yield pgExec(db, query), (r) => r.table_name);
    return Object.fromEntries(
      sriConfig.resources.filter((mapping) => !mapping.onlyCustom).map((mapping) => {
        return [
          mapping.type,
          Object.fromEntries(
            rowsByTable[tableFromMapping(mapping)].map((c) => [c.column_name, { type: c.data_type, element_type: c.element_type }])
          )
        ];
      })
    );
  });
}

// js/listResource.ts
var import_lodash5 = __toESM(require("lodash"));
var import_p_map5 = __toESM(require("p-map"));
var import_p_filter = __toESM(require("p-filter"));
var import_url3 = __toESM(require("url"));

// js/expand.ts
var import_lodash4 = __toESM(require("lodash"));
var import_p_map4 = __toESM(require("p-map"));
var checkRecurse = (expandpath) => {
  const parts = expandpath.split(".");
  if (parts.length > 1) {
    return { expand: import_lodash4.default.first(parts), recurse: true, recursepath: import_lodash4.default.tail(parts).join(".") };
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
        throw new SriError({ status: 404, errors: [{ code: "expansion.failed", msg: `Cannot expand [${expand}] because it is not mapped.` }] });
      } else {
        const keysToExpand = elements.reduce(
          (acc, element) => {
            if (element[expand]) {
              const targetlink = element[expand].href;
              const targetkey = import_lodash4.default.last(targetlink.split("/"));
              if (!acc.includes(targetkey) && !element[expand].$$expanded) {
                acc.push(targetkey);
              }
            }
            return acc;
          },
          []
        );
        if (keysToExpand.length > 0) {
          const targetType = mapping.map[expand].references;
          const typeToMapping2 = typeToConfig(resources);
          const targetMapping = typeToMapping2[targetType];
          if (targetMapping === void 0) {
            throw new SriError({ status: 400, errors: [{ code: "expand.across.boundary", msg: "Only references to resources defined in the same sri4node configuration as the referer can be expanded." }] });
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
          const expandedElementsDict = import_lodash4.default.fromPairs(
            expandedElements.map((obj) => [obj.$$meta.permalink, obj])
          );
          debug("trace", "expand - executing afterRead functions on expanded resources");
          yield applyHooks(
            "after read",
            targetMapping.afterRead,
            (f) => f(
              db,
              sriRequest,
              expandedElements.map(
                (e) => ({ permalink: e.$$meta.permalink, incoming: null, stored: e })
              )
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
        yield (0, import_p_map4.default)(
          paths,
          (path3) => executeSingleExpansion(db, sriRequest, expandedElements, mapping, resources, path3)
        );
        debug("trace", "expand - expansion done");
      }
    }
  });
}

// js/listResource.ts
var DEFAULT_LIMIT = 30;
var MAX_LIMIT = 500;
function applyRequestParameters(mapping, query, urlparameters, tx, count) {
  return __async(this, null, function* () {
    const standardParameters = ["orderBy", "descending", "limit", "keyOffset", "expand", "hrefs", "modifiedSince", "$$includeCount", "offset"];
    if (mapping.query) {
      yield (0, import_p_map5.default)(
        Object.keys(urlparameters),
        (key) => __async(this, null, function* () {
          if (!standardParameters.includes(key)) {
            if (mapping.query[key] || mapping.query.defaultFilter) {
              if (!mapping.query[key] && mapping.query.defaultFilter) {
                yield mapping.query.defaultFilter(urlparameters[key], query, key, mapping, tx);
              } else {
                yield mapping.query[key](urlparameters[key], query, key, tx, count, mapping, urlparameters);
              }
            } else {
              throw new SriError({ status: 404, errors: [{ code: "unknown.query.parameter", parameter: key }] });
            }
          } else if (key === "hrefs" && urlparameters.hrefs) {
            filterHrefs(urlparameters.hrefs, query, mapping);
          } else if (key === "modifiedSince") {
            modifiedSince(urlparameters.modifiedSince, query, mapping);
          }
        }),
        { concurrency: 1 }
      );
    }
  });
}
function getSQLFromListResource(mapping, parameters, count, tx, query) {
  return __async(this, null, function* () {
    const table = tableFromMapping(mapping);
    let sql;
    let columns;
    if (parameters.expand && parameters.expand.toLowerCase() === "none") {
      if (parameters.orderBy) {
        columns = parameters.orderBy.split(",").map((v) => `"${v}"`).join(",");
      } else {
        columns = '"key","$$meta.created"';
      }
    } else {
      columns = sqlColumnNames(
        mapping,
        parameters.expand && parameters.expand.toLowerCase() === "summary"
      );
    }
    if (count) {
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
    yield applyRequestParameters(mapping, query, parameters, tx, count);
  });
}
var applyOrderAndPagingParameters = (query, queryParams, mapping, queryLimit, maxlimit, keyOffset, offset) => {
  const { orderBy, descending } = queryParams;
  let orderKeys = ["$$meta.created", "key"];
  if (orderBy !== void 0) {
    orderKeys = orderBy.split(",");
    const invalidOrderByKeys = orderKeys.filter((k) => k !== "$$meta.created" && k !== "$$meta.modified" && !mapping.map[k]);
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
    orderKeys.forEach(
      (_k, idx) => {
        if (idx > 0) {
          query.sql(",");
        }
        query.param(keyValues[idx]);
      }
    );
    query.sql(")");
  }
  query.sql(` order by ${orderKeys.map((k) => `"${k}" ${descending === "true" ? "desc" : "asc"}`).join(",")}`);
  const isGetAllExpandNone = queryLimit === "*" && queryParams.expand !== void 0 && queryParams.expand.toLowerCase() === "none";
  if (!isGetAllExpandNone) {
    if (queryLimit > maxlimit || queryLimit === "*") {
      throw new SriError(
        {
          status: 409,
          errors: [
            {
              code: "invalid.limit.parameter",
              type: "ERROR",
              message: `The maximum allowed limit is ${maxlimit}`
            }
          ]
        }
      );
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
    if (!queryParams.expand || (queryParams.expand.toLowerCase() === "full" || queryParams.expand.toLowerCase() === "summary" || queryParams.expand.indexOf("results") === 0)) {
      element.$$expanded = transformRowToObject(currentrow, mapping);
      element.$$expanded.$$meta.type = mapping.metaType;
    } else if (queryParams.expand && queryParams.expand.toLowerCase() === "none") {
    } else if (queryParams.expand) {
      const msg = `listResource - expand value unknown : ${queryParams.expand}`;
      debug("trace", msg);
      throw new SriError({
        status: 400,
        errors: [{
          code: "parameter.value.unknown",
          msg: `Unknown value [${queryParams.expand}] for 'expand' parameter. The possible values are 'NONE', 'SUMMARY' and 'FULL'.`,
          parameter: "expand",
          value: queryParams.expand,
          possibleValues: ["NONE", "SUMMARY", "FULL"]
        }]
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
      const o = import_lodash5.default.get(lastElement, k);
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
    yield applyHooks(
      "before read",
      mapping.beforeRead || [],
      (f) => f(
        tx,
        sriRequest
      ),
      sriRequest
    );
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
      throw new SriError({ status: 400, errors: [{ code: "a.href.and.b.hrefs.needs.to.specified" }] });
    }
    if (Array.isArray(sriRequest.body.a.href)) {
      throw new SriError({ status: 400, errors: [{ code: "a.href.must.be.single.value" }] });
    }
    if (!Array.isArray(sriRequest.body.b.hrefs)) {
      throw new SriError({ status: 400, errors: [{ code: "b.hrefs.must.be.array" }] });
    }
    const urlA = sriRequest.body.a.href;
    const typeA = matchUrl(urlA, mapping);
    const resultList = yield (0, import_p_filter.default)(sriRequest.body.b.hrefs, (urlB) => __async(this, null, function* () {
      const typeB = matchUrl(urlB, mapping);
      if (typeB.type === "single") {
        if (typeA.type === "single") {
          return typeA.key === typeB.key;
        }
        return false;
      }
      const { query: paramsB } = import_url3.default.parse(urlB, true);
      const queryB = prepareSQL();
      try {
        yield getSQLFromListResource(mapping, paramsB, false, tx, queryB);
      } catch (err) {
        throw new SriError({ status: 400, errors: [{ code: "resource.b.raised.error", url: urlB, err }] });
      }
      const sqlB = queryB.text;
      const valuesB = queryB.params;
      const query = prepareSQL();
      if (typeA.type === "single") {
        query.sql(`SELECT EXISTS ( SELECT key from (${sqlB}) as temp WHERE key='${typeA.key}' )  as result;`);
        query.params.push(...valuesB);
      } else {
        const { query: paramsA } = import_url3.default.parse(urlA, true);
        const queryA = prepareSQL();
        try {
          yield getSQLFromListResource(mapping, paramsA, false, tx, queryA);
        } catch (err) {
          throw new SriError({ status: 400, errors: [{ code: "resource.a.raised.error", url: urlA, err }] });
        }
        const sqlA = queryA.text;
        const valuesA = queryA.params;
        query.sql(`SELECT NOT EXISTS ( SELECT key from (${sqlA}) as a WHERE NOT EXISTS (SELECT 1 FROM (${sqlB}) as b WHERE a.key = b.key)) as result;`);
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
var import_lodash6 = __toESM(require("lodash"));
var import_ajv = __toESM(require("ajv"));
var import_ajv_formats = __toESM(require("ajv-formats"));
var import_fast_json_patch = __toESM(require("fast-json-patch"));
var import_p_map6 = __toESM(require("p-map"));
var ajv = new import_ajv.default({ coerceTypes: true });
(0, import_ajv_formats.default)(ajv);
var makeMultiError = (type) => () => new SriError({
  status: 409,
  errors: [{
    code: `multi.${type}.failed`,
    msg: `An error occurred during multi row ${type}. There is no indication which request(s)/row(s) caused the error, to find out more information retry with individual ${type}s.`
  }]
});
var multiInsertError = makeMultiError("insert");
var multiUpdateError = makeMultiError("update");
var multiDeleteError = makeMultiError("delete");
function queryByKeyRequestKey(sriRequest, mapping, key) {
  var _a;
  debug("trace", `queryByKeyRequestKey(${key})`);
  const { type } = mapping;
  const parentSriRequest = getParentSriRequest(sriRequest);
  if (mapping.schema && mapping.schema.properties && mapping.schema.properties.key && mapping.validateKey) {
    const validKey = mapping.validateKey(key);
    if (!validKey) {
      throw new SriError({ status: 400, errors: ((_a = mapping.validateKey.errors) == null ? void 0 : _a.map((e) => ({ code: "key.invalid", key, err: e }))) || [] });
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
      errors: [{
        code: "fetching.key.failed",
        type,
        key,
        msg
      }]
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
      const results = yield (0, import_p_map6.default)(types, (type) => __async(this, null, function* () {
        const keys = sriRequest.queryByKeyFetchList[type];
        const table = tableFromMapping(typeToMapping(type));
        const columns = sqlColumnNames(typeToMapping(type));
        const query = prepareSQL(`select-rows-by-key-from-${table}`);
        const keyDbType = global.sri4node_configuration.informationSchema[type].key.type;
        query.sql(`SELECT ${columns}
                       FROM UNNEST(`).param(keys).sql(`::${keyDbType}[]) "key"
                       INNER JOIN "${table}" USING ("key");`);
        const rows = yield pgExec(sriRequest.dbT, query);
        return Object.fromEntries(rows.map((r) => [r.key, r]));
      }), { concurrency: 3 });
      sriRequest.queryByKeyResults = Object.fromEntries(import_lodash6.default.zip(types, results));
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
    yield applyHooks(
      "before read",
      mapping.beforeRead || [],
      (f) => f(
        tx,
        sriRequest
      ),
      sriRequest
    );
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
      throw new SriError({ status: 410, errors: [{ code: "resource.gone", msg: "Resource is gone" }] });
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
      (f) => f(tx, sriRequest, [{
        permalink: element.$$meta.permalink,
        incoming: null,
        stored: element
      }]),
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
    console.log(schema);
    console.log("Document was : ");
    console.log(json);
    return (validateSchema.errors || []).map((e) => ({ code: errorAsCode(e.message || ""), err: e }));
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
      throw new SriError({ status: 410, errors: [{ code: "resource.gone", msg: "Resource is gone" }] });
    }
    try {
      sriRequest.body = import_fast_json_patch.default.applyPatch(result.object, patch, true, false).newDocument;
      debug("trace", `Patched resource looks like this: ${JSON.stringify(sriRequest.body, null, 2)}`);
    } catch (e) {
      throw new SriError({ status: 400, errors: [{ code: "patch.invalid", msg: "The patch could not be applied.", error: e }] });
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
      throw new SriError({ status: 400, errors: [{ code: "key.mismatch", msg: "Key in the request url does not match the key in the body." }] });
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
        throw new SriError({ status: 409, errors: [{ code: "validation.errors", msg: "Validation error(s)", errors }] });
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
        throw new SriError({ status: 500, errors: [{ code: "delete.failed", msg: "Removal of soft deleted resource failed." }] });
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
      yield (0, import_p_map6.default)(types, (type) => __async(this, null, function* () {
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
      yield (0, import_p_map6.default)(types, (type) => __async(this, null, function* () {
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
      yield (0, import_p_map6.default)(types, (type) => __async(this, null, function* () {
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
        (f) => f(sriRequest.dbT, sriRequest, [{ permalink: state.permalink, incoming: state.obj, stored: null }]),
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
      (f) => f(sriRequest.dbT, sriRequest, [{ permalink: state.permalink, incoming: state.obj, stored: state.prevObj }]),
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
        throw new SriError({ status: 409, errors: [{ code: "db.constraint.violation", msg: err.detail }] });
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
        throw new SriError({ status: 409, errors: [{ code: "db.constraint.violation", msg: err.detail }] });
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
              throw new SriError({ status: 202, errors: [{ code: "transaction.failed", msg: "Request cancelled due to database error generated by accompanying request in batch." }] });
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
        throw new SriError({ status: 409, errors: [{ code: "db.constraint.violation", msg: err.detail }] });
      } else {
        throw err;
      }
    }
  });
}

// js/utilLib.ts
var import_p_map7 = __toESM(require("p-map"));
function addReferencingResources(type, column, targetkey, excludeOnExpand) {
  return function(tx, sriRequest, elements) {
    return __async(this, null, function* () {
      const { resources } = global.sri4node_configuration;
      const typeToMapping2 = typeToConfig(resources);
      const mapping = typeToMapping2[type];
      if (Array.isArray(sriRequest.query.expand)) {
        throw new SriError({ status: 500, errors: [{ code: "multiple.expand.query.parameters.not.allowed", msg: 'Only one "expand" query parameter value can be specified.' }] });
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
        yield (0, import_p_map7.default)(rows, (row) => __async(this, null, function* () {
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
        debug("overloadProtection", `overloadProtection - canAccept ${extraDrop} - ${usedPipelines} - ${config.maxPipelines}`);
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
        debug("overloadProtection", `overloadProtection - startPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`);
        return nrServed;
      }
      return null;
    },
    endPipeline: (nr = 1) => {
      if (config !== void 0) {
        usedPipelines -= nr;
        debug("overloadProtection", `overloadProtection - endPipeline(${nr}) => ${usedPipelines}/${config.maxPipelines}`);
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
function fromTypesFilter(value2, select, _key, _database, _count, mapping) {
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
function toTypesFilter(value2, select, _key, _database, _count, mapping) {
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
function fromsFilter(value2, select, _key, _database, _count, mapping) {
  if (value2) {
    const table = tableFromMapping(mapping);
    const froms = value2.split(",").map((val) => val.split("/")[val.split("/").length - 1]);
    select.sql(` AND ${table}.from in (`).array(froms).sql(")");
  }
}
function tosFilter(value2, select, _key, _database, _count, mapping) {
  if (value2) {
    const table = tableFromMapping(mapping);
    const tos = value2.split(",").map((val) => val.split("/")[val.split("/").length - 1]);
    select.sql(` AND ${table}.to in (`).array(tos).sql(")");
  }
}

// sri4node.ts
var import_http = require("http");
var import_json_stream_stringify = require("json-stream-stringify");
var import_path2 = __toESM(require("path"));
var dirname = import_path2.default.resolve(process.cwd());
var ajv2 = new import_ajv2.default({ coerceTypes: true, logger: {
  log: (output) => {
    debug("general", output);
  },
  warn: (output) => {
    debug("general", output);
  },
  error: console.error
} });
(0, import_ajv_formats2.default)(ajv2);
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
    resp.render("resource", { resource: mapping, queryUtils: queryUtils_exports });
  } else if (req.route.path === "/docs") {
    resp.render("index", { config: global.sri4node_configuration });
  } else {
    resp.status(404).send("Not Found");
  }
}
var getResourcesOverview = (_req, resp) => {
  resp.set("Content-Type", "application/json");
  const resourcesToSend = {};
  global.sri4node_configuration.resources.forEach((resource) => {
    const resourceName = resource.type.substring(1);
    resourcesToSend[resourceName] = {
      docs: `${resource.type}/docs`,
      schema: `${resource.type}/schema`,
      href: resource.type
    };
    if (resource.schema) {
      resourcesToSend[resourceName].description = resource.schema.title;
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
    error("____________________________ E R R O R (middlewareErrorWrapper) ___________________________");
    error(err);
    error("STACK:");
    error(err.stack);
    error("___________________________________________________________________________________________");
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
    result = yield func(sriRequest, global.sriInternalUtils);
  } else {
    const job = [func, [dbT, sriRequest, mapping, global.sriInternalUtils]];
    [result] = settleResultsToSriResults(
      yield phaseSyncedSettle(
        [job],
        { beforePhaseHooks: global.sri4node_configuration.beforePhase }
      )
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
    const notNullEntries = Object.entries(sriRequest.serverTiming).filter(([_property, value2]) => value2 > 0);
    if (notNullEntries.length > 0) {
      serverTiming = notNullEntries.map(([property, value2]) => `${property};dur=${(Math.round(value2 * 100) / 100).toFixed(2)}`).join(", ");
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
        readOnly = import_lodash7.default.flatten((_a = req.body) == null ? void 0 : _a.map(mapReadOnly)).every((e) => e);
      } else {
        readOnly = readOnly0;
      }
      global.overloadProtection.startPipeline();
      const reqId = import_express_http_context3.default.get("reqId");
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
      setServerTimingHdr(sriRequest, "db-starttask", hrtimeToMilliseconds(hrElapsedStartTransaction));
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
            debug("db", "++ Error during processing in dryRun mode. Rolling back database transaction.");
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
            (record, index) => resp.write(`${JSON.stringify(record)}${index + 1 < total ? "," : ""}
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
        error("____________________________ E R R O R (expressWrapper)____________________________________");
        error(err);
        error(JSON.stringify(err, null, 2));
        error("STACK:");
        error(err.stack);
        error("___________________________________________________________________________________________");
        error("NEED TO DESTROY STREAMING REQ");
        resp.write("\n\n\n____________________________ E R R O R (expressWrapper)____________________________________\n");
        resp.write(err.toString());
        resp.write(JSON.stringify(err, null, 2));
        resp.write("\n___________________________________________________________________________________________\n");
        yield new Promise((resolve, _reject) => {
          setImmediate(() => __async(this, null, function* () {
            yield resp.destroy();
            resolve(void 0);
            error("Stream is destroyed.");
          }));
        });
      } else if (err instanceof SriError || ((_d = (_c = err == null ? void 0 : err.__proto__) == null ? void 0 : _c.constructor) == null ? void 0 : _d.name) === "SriError") {
        if (err.status > 0) {
          const reqId = import_express_http_context3.default.get("reqId");
          if (reqId !== void 0) {
            err.body.vskoReqId = reqId;
            err.headers["vsko-req-id"] = reqId;
          }
          resp.set(err.headers).status(err.status).send(err.body);
        }
      } else {
        error("____________________________ E R R O R (expressWrapper)____________________________________");
        error(err);
        error("STACK:");
        error(err.stack);
        error("___________________________________________________________________________________________");
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
var toArray = (resource, name) => {
  if (resource[name] === void 0) {
    resource[name] = [];
  } else if (resource[name] === null) {
    console.log(`WARNING: handler '${name}' was set to 'null' -> assume []`);
    resource[name] = [];
  } else if (!Array.isArray(resource[name])) {
    resource[name] = [resource[name]];
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
      sriConfig.resources.forEach((resource) => {
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
        ].forEach((name) => toArray(resource, name));
        if (resource.listResultDefaultIncludeCount === void 0) {
          resource.listResultDefaultIncludeCount = true;
        }
      });
      ["beforePhase", "transformRequest", "transformInternalRequest"].forEach((name) => toArray(sriConfig, name));
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
          if (resourceDefinition.schema.properties === void 0) {
            throw new Error(`Schema definition invalid for '${resourceDefinition.type}' !`);
          }
          if (resourceDefinition.schema.properties.key === void 0) {
            throw new Error(`Key is not defined in the schema of '${resourceDefinition.type}' !`);
          }
          if (resourceDefinition.schema.properties.key.pattern === guid("foo").pattern) {
            resourceDefinition.singleResourceRegex = new RegExp(`^${resourceDefinition.type}/([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$`);
          } else if (resourceDefinition.schema.properties.key.type === numeric("foo").type) {
            resourceDefinition.singleResourceRegex = new RegExp(`^${resourceDefinition.type}/([0-9]+)$`);
          } else if (resourceDefinition.schema.properties.key.type === string("foo").type) {
            resourceDefinition.singleResourceRegex = new RegExp(`^${resourceDefinition.type}/(\\w+)$`);
          } else {
            throw new Error(`Key type of resource ${resourceDefinition.type} unknown!`);
          }
          resourceDefinition.listResourceRegex = new RegExp(`^${resourceDefinition.type}(?:[?#]\\S*)?$`);
          try {
            debug("general", `Going to compile JSON schema of ${resourceDefinition.type}`);
            resourceDefinition.validateKey = ajv2.compile(resourceDefinition.schema.properties.key);
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
      yield (0, import_p_map8.default)(
        sriConfig.resources,
        (mapping) => __async(this, null, function* () {
          var _a, _b;
          if (!mapping.onlyCustom) {
            const schema = ((_a = sriConfig.databaseConnectionParameters) == null ? void 0 : _a.schema) || ((_b = sriConfig.databaseLibraryInitOptions) == null ? void 0 : _b.schema);
            const schemaName = Array.isArray(schema) ? schema[0] : schema == null ? void 0 : schema.toString();
            yield installVersionIncTriggerOnTable(dbW, tableFromMapping(mapping), schemaName);
          }
        }),
        { concurrency: 1 }
      );
      const currentInformationSchema = yield informationSchema(dbR, sriConfig);
      global.sri4node_configuration.informationSchema = currentInformationSchema;
      checkSriConfigWithDb(sriConfig);
      const pgp2 = getPgp();
      const generatePgColumnSet = (columnNames, type, table) => {
        const columns = columnNames.map((cname) => {
          const col = { name: cname };
          if (cname.includes(".")) {
            col.prop = `_${cname.replace(/\./g, "_")}`;
            col.init = (c) => c.source[cname];
          }
          const cType = global.sri4node_configuration.informationSchema[type][cname].type;
          const cElementType = global.sri4node_configuration.informationSchema[type][cname].element_type;
          if (cType !== "text") {
            if (cType === "ARRAY") {
              col.cast = `${cElementType}[]`;
            } else {
              col.cast = cType;
            }
          }
          if (cname === "key") {
            col.cnd = true;
          }
          return col;
        });
        return new pgp2.helpers.ColumnSet(columns, { table });
      };
      global.sri4node_configuration.pgColumns = Object.fromEntries(
        sriConfig.resources.filter((resource) => !resource.onlyCustom).map((resource) => {
          const { type } = resource;
          const table = tableFromMapping(typeToMapping(type));
          const columns = JSON.parse(`[${sqlColumnNames(typeToMapping(type))}]`).filter((cname) => !cname.startsWith("$$meta."));
          const ret = {};
          ret.insert = new pgp2.helpers.ColumnSet(columns, { table });
          const dummyUpdateRow = transformObjectToRow({}, resource, false);
          ret.update = generatePgColumnSet([.../* @__PURE__ */ new Set(["key", "$$meta.modified", ...Object.keys(dummyUpdateRow)])], type, table);
          ret.delete = generatePgColumnSet(["key", "$$meta.modified", "$$meta.deleted"], type, table);
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
        yield (0, import_p_map8.default)(sriConfig.plugins, (plugin) => __async(this, null, function* () {
          yield global.sri4node_install_plugin(plugin);
        }), { concurrency: 1 });
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
          res.status(503).send([{ code: "too.busy", msg: "The request could not be processed as the server is too busy right now. Try again later." }]);
        }
      }));
      const emt = installEMT(app);
      if (global.sri4node_configuration.forceSecureSockets) {
        app.use(forceSecureSockets);
      }
      app.use(emt.instrument((0, import_compression.default)(), "mw-compression"));
      app.use(emt.instrument(import_body_parser.default.json({ limit: sriConfig.bodyParserLimit, strict: false }), "mw-bodyparser"));
      app.use("/docs/static", import_express.default.static(`${dirname}/js/docs/static`));
      app.engine(".pug", import_pug.default.__express);
      app.set("view engine", "pug");
      app.set("views", `${dirname}/js/docs`);
      app.put("/log", middlewareErrorWrapper((req, resp) => {
        const err = req.body;
        console.log("Client side error :");
        err.stack.split("\n").forEach((line) => console.log(line));
        resp.end();
      }));
      app.get("/docs", middlewareErrorWrapper(getDocs));
      app.get("/resources", middlewareErrorWrapper(getResourcesOverview));
      app.post("/setlogdebug", (req, resp, _next) => {
        global.sri4node_configuration.logdebug = createDebugLogConfigObject(req.body);
        resp.send("OK");
      });
      app.use(import_express_http_context3.default.middleware);
      app.use((req, res, next) => {
        import_express_http_context3.default.ns.bindEmitter(req);
        import_express_http_context3.default.ns.bindEmitter(res);
        let reqId;
        if (req.headers["x-request-id"] !== void 0) {
          reqId = req.headers["x-request-id"];
        } else if (req.headers["x-amz-cf-id"] !== void 0) {
          reqId = req.headers["x-amz-cf-id"];
        } else {
          reqId = import_shortid.default.generate();
        }
        if (sriConfig.id !== void 0) {
          reqId = `${sriConfig.id}#${reqId}`;
        }
        import_express_http_context3.default.set("reqId", reqId);
        next();
      });
      yield (0, import_p_map8.default)(
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
            app.use(`${mapping.type}/docs/static`, import_express.default.static(`${dirname}/js/docs/static`));
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
            const customMapping = import_lodash7.default.cloneDeep(mapping);
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
                  console.log(`
WARNING: customRoute like ${crudPath} - ${method} not found => ignored.
`);
                } else {
                  const {
                    verb,
                    func,
                    streaming,
                    readOnly
                  } = likeMatches[0];
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
                      throw new SriError({ status: 400, errors: [{ code: "streaming.not.allowed.in.batch", msg: "Streaming mode cannot be used inside a batch." }] });
                    }
                    if (cr.busBoy) {
                      try {
                        sriRequest.busBoy = (0, import_busboy.default)(__spreadProps(__spreadValues({}, cr.busBoyConfig), { headers: sriRequest.headers }));
                      } catch (err) {
                        throw new SriError({ status: 400, errors: [{ code: "error.initialising.busboy", msg: `Error during initialisation of busboy: ${err}` }] });
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
                    const streamEndEmitter = new import_events4.default();
                    const streamDonePromise = (0, import_p_event4.default)(streamEndEmitter, "done");
                    if (cr.binaryStream) {
                      stream2 = sriRequest.outStream;
                    } else {
                      if (sriRequest.setHeader) {
                        sriRequest.setHeader("Content-Type", "application/json; charset=utf-8");
                      }
                      stream2 = createReadableStream(true);
                      const JsonStream = new import_json_stream_stringify.JsonStreamStringify(stream2);
                      JsonStream.pipe(sriRequest.outStream);
                      keepAliveTimer = setInterval(() => {
                        sriRequest.outStream.write(" ");
                        if (sriRequest.outStream instanceof import_http.ServerResponse) {
                          sriRequest.outStream.flush();
                        }
                      }, sriConfig.streamingKeepAliveTimeoutMillis || 2e4);
                    }
                    sriRequest.outStream.on("close", () => streamEndEmitter.emit("done"));
                    const streamingHandlerPromise = streamingHandler(tx, sriRequest, stream2, global.sriInternalUtils);
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
                  readOnly: !!cr.readOnly,
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
                      yield cr.beforeHandler(tx, sriRequest, customMapping, global.sriInternalUtils);
                    }
                    yield phaseSyncer.phase();
                    const result = yield handler(tx, sriRequest, customMapping, global.sriInternalUtils);
                    yield phaseSyncer.phase();
                    yield phaseSyncer.phase();
                    if (cr.afterHandler !== void 0) {
                      yield cr.afterHandler(tx, sriRequest, customMapping, result, global.sriInternalUtils);
                    }
                    yield phaseSyncer.phase();
                    return result;
                  }),
                  config: sriConfig,
                  mapping: customMapping,
                  streaming: false,
                  readOnly: !!cr.readOnly,
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
      yield applyHooks("start up", sriConfig.startUp || [], (f) => f(db, sriServerInstance));
      batchHandlerMap.forEach(
        ({
          route,
          verb,
          func,
          config,
          mapping,
          streaming,
          readOnly,
          isBatch
        }) => {
          debug("general", `registering route ${route} - ${verb} - ${readOnly}`);
          app[verb.toLowerCase()](
            route,
            emt.instrument(expressWrapper(dbR, dbW, func, config, mapping, streaming, isBatch, readOnly), "express-wrapper")
          );
        }
      );
      sriConfig.batchHandlerMap = import_lodash7.default.groupBy(
        batchHandlerMap.map(
          ({
            route,
            verb,
            func,
            config,
            mapping,
            streaming,
            readOnly,
            isBatch
          }) => ({
            route: new import_route_parser.default(route),
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
      console.log("___________________________ SRI4NODE INITIALIZATION DONE _____________________________");
      return sriServerInstance;
    } catch (err) {
      console.error("___________________________ SRI4NODE INITIALIZATION ERROR _____________________________");
      console.error(err);
      process.exit(1);
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SriError,
  configure,
  debug,
  error,
  isLikeCustomRouteDefinition,
  isNonStreamingCustomRouteDefinition,
  isStreamingCustomRouteDefinition,
  mapUtils,
  queryUtils,
  schemaUtils,
  utils
});
//# sourceMappingURL=sri4node.cjs.js.map
