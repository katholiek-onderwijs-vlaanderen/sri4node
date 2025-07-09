"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.informationSchema = void 0;
/*
Utility function for reading the information schema
of the database. Creates a global cache, and assumes
the information schema does not change at runtime.

It returns a 2-dimensional associative array that
can be accessed like this :

var is = require('./informationSchema')(database, configuration, logverbose);
var type = is['/communities']['phone'];
if(type === 'text') {
  // do something.
}
*/
const lodash_1 = __importDefault(require("lodash"));
const queryObject_1 = require("./queryObject");
const common = __importStar(require("./common"));
/**
 * Assumes that sriConfig.databaseConnectionParameters.schema is set to a single string !!!
 *
 */
function informationSchema(db, sriConfig) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const tableNames = lodash_1.default.uniq(sriConfig.resources.map((mapping) => common.tableFromMapping(mapping)));
        const query = (0, queryObject_1.prepareSQL)("information-schema");
        const { schema } = sriConfig.databaseConnectionParameters;
        let schemaParam = "public";
        if (Array.isArray(schema)) {
            // eslint-disable-next-line prefer-destructuring
            schemaParam = schema[0];
            // prefer-destructuring would make this kind of ugly
            // ([schemaParam] = schema);
        }
        else if (typeof schema === "function") {
            schemaParam = ((_a = (yield schema(db))) === null || _a === void 0 ? void 0 : _a.toString()) || schemaParam;
        }
        else if (schema) {
            schemaParam = schema;
        }
        if (tableNames.length === 0) {
            // avoid useless query (which will fail as well)
            return {};
        }
        query
            .sql(`SELECT c.table_name, c.column_name, c.data_type, e.data_type AS element_type from information_schema.columns c
          LEFT JOIN information_schema.element_types e
            ON ((c.table_catalog, c.table_schema, c.table_name, 'TABLE', c.dtd_identifier)
                      = (e.object_catalog, e.object_schema, e.object_name, e.object_type, e.collection_type_identifier))
          WHERE table_schema = `)
            .param(schemaParam)
            .sql(` AND`)
            .valueIn("c.table_name", tableNames);
        const rowsByTable = lodash_1.default.groupBy(yield common.pgExec(db, query), (r) => r.table_name);
        return Object.fromEntries(sriConfig.resources
            .filter((mapping) => !mapping.onlyCustom)
            .map((mapping) => {
            return [
                mapping.type,
                Object.fromEntries(rowsByTable[common.tableFromMapping(mapping)].map((c) => [
                    c.column_name,
                    { type: c.data_type, element_type: c.element_type },
                ])),
            ];
        }));
    });
}
exports.informationSchema = informationSchema;
//# sourceMappingURL=informationSchema.js.map