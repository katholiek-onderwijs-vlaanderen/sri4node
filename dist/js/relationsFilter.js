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
Object.defineProperty(exports, "__esModule", { value: true });
exports.froms = exports.tos = exports.toTypes = exports.fromTypes = void 0;
const common = __importStar(require("./common"));
function fromTypesFilter(value, select, _key, _database, _doCount, mapping, _urlParameters) {
    var _a, _b;
    let sql;
    let fromCondition;
    let whereCondition;
    let fromTable;
    let types;
    if (value && ((_b = (_a = mapping.map) === null || _a === void 0 ? void 0 : _a.from) === null || _b === void 0 ? void 0 : _b.references)) {
        fromCondition = select.text.split(" from")[1];
        whereCondition = fromCondition.split("where")[1];
        fromCondition = fromCondition.split("where")[0];
        const table = common.tableFromMapping(mapping);
        types = value.split(",").join("','");
        fromTable =
            mapping.map.from.references.split("/")[mapping.map.from.references.split("/").length - 1];
        sql =
            select.text.indexOf("count") !== -1
                ? `select count(distinct ${table}.*)`
                : `select distinct ${table}.*`;
        sql += ` from ${fromCondition} JOIN ${fromTable} c on c.key = ${table}.from `;
        sql += ` where ${whereCondition}`;
        sql += ` AND c.type in ('${types}') AND c."$$meta.deleted" = false `;
        select.text = sql;
    }
}
exports.fromTypes = fromTypesFilter;
function toTypesFilter(value, select, _key, _database, _doCount, mapping, _urlParameters) {
    var _a, _b;
    let sql;
    let fromCondition;
    let whereCondition;
    let toTable;
    let types;
    if (value && ((_b = (_a = mapping.map) === null || _a === void 0 ? void 0 : _a.to) === null || _b === void 0 ? void 0 : _b.references)) {
        fromCondition = select.text.split(" from")[1];
        whereCondition = fromCondition.split("where")[1];
        fromCondition = fromCondition.split("where")[0];
        const table = common.tableFromMapping(mapping);
        types = value.split(",").join("','");
        toTable = mapping.map.to.references.split("/")[mapping.map.to.references.split("/").length - 1];
        sql =
            select.text.indexOf("count") !== -1
                ? `select count(distinct ${table}.*)`
                : `select distinct ${table}.*`;
        sql += ` FROM ${fromCondition} JOIN ${toTable} c2 on c2.key = ${table}.to `;
        sql += ` where ${whereCondition}`;
        sql += ` AND c2.type in ('${types}') AND c2."$$meta.deleted" = false `;
        select.text = sql;
    }
}
exports.toTypes = toTypesFilter;
function fromsFilter(value, select, _key, _database, _doCount, mapping, _urlParameters) {
    if (value) {
        const table = common.tableFromMapping(mapping);
        const froms = value.split(",").map((val) => val.split("/")[val.split("/").length - 1]);
        select.sql(` AND ${table}.from in (`).array(froms).sql(")");
    }
}
exports.froms = fromsFilter;
function tosFilter(value, select, _key, _database, _doCount, mapping, _urlParameters) {
    if (value) {
        const table = common.tableFromMapping(mapping);
        const tos = value.split(",").map((val) => val.split("/")[val.split("/").length - 1]);
        select.sql(` AND ${table}.to in (`).array(tos).sql(")");
    }
}
exports.tos = tosFilter;
//# sourceMappingURL=relationsFilter.js.map