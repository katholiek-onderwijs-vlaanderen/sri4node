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
exports.beforePhaseInsertUpdateDelete = exports.beforePhaseQueryByKey = exports.deleteRegularResource = exports.patchRegularResource = exports.createOrUpdateRegularResource = exports.getRegularResource = void 0;
const lodash_1 = __importDefault(require("lodash"));
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const fast_json_patch_1 = __importDefault(require("fast-json-patch"));
const p_map_1 = __importDefault(require("p-map"));
const typeDefinitions_1 = require("./typeDefinitions");
const common_1 = require("./common");
const queryObject_1 = require("./queryObject");
const hooks_1 = require("./hooks");
const expand = __importStar(require("./expand"));
const ajv = new ajv_1.default({ coerceTypes: true }); // options can be passed, e.g. {allErrors: true}
(0, ajv_formats_1.default)(ajv);
const makeMultiError = (type) => () => new typeDefinitions_1.SriError({
    status: 409,
    errors: [
        {
            code: `multi.${type}.failed`,
            msg: `An error occurred during multi row ${type}. There is no indication which request(s)/row(s) caused the error, ` +
                `to find out more information retry with individual ${type}s.`,
        },
    ],
});
const multiInsertError = makeMultiError("insert");
const multiUpdateError = makeMultiError("update");
const multiDeleteError = makeMultiError("delete");
function queryByKeyRequestKey(sriRequest, mapping, key) {
    var _a;
    (0, common_1.debug)("trace", `queryByKeyRequestKey(${key})`);
    const { type } = mapping;
    const parentSriRequest = (0, common_1.getParentSriRequest)(sriRequest);
    if ((0, common_1.findPropertyInJsonSchema)(mapping.schema, "key") && mapping.validateKey) {
        const validKey = mapping.validateKey(key);
        if (!validKey) {
            throw new typeDefinitions_1.SriError({
                status: 400,
                errors: ((_a = mapping.validateKey.errors) === null || _a === void 0 ? void 0 : _a.map((e) => ({ code: "key.invalid", key, err: e }))) || [],
            });
        }
    }
    if (parentSriRequest.queryByKeyFetchList === undefined) {
        parentSriRequest.queryByKeyFetchList = {};
    }
    if (parentSriRequest.queryByKeyFetchList[type] === undefined) {
        parentSriRequest.queryByKeyFetchList[type] = [];
    }
    parentSriRequest.queryByKeyFetchList[type].push(key);
}
function queryByKeyGetResult(sriRequest, mapping, key, wantsDeleted) {
    (0, common_1.debug)("trace", `queryByKeyGetResult(${key})`);
    const { type } = mapping;
    const parentSriRequest = (0, common_1.getParentSriRequest)(sriRequest);
    if (parentSriRequest.queryByKeyResults === undefined ||
        parentSriRequest.queryByKeyResults[type] === undefined) {
        const msg = `The function queryByKey did not produce the expected output for key ${key} and type ${type}`;
        (0, common_1.error)(msg);
        throw new typeDefinitions_1.SriError({
            status: 500,
            errors: [
                {
                    code: "fetching.key.failed",
                    type,
                    key,
                    msg,
                },
            ],
        });
    }
    const row = parentSriRequest.queryByKeyResults[type][key];
    if (row !== undefined) {
        if (row["$$meta.deleted"] && !wantsDeleted) {
            return { code: "resource.gone" };
        }
        return { code: "found", object: (0, common_1.transformRowToObject)(row, mapping) };
    }
    return { code: "not.found" };
}
const beforePhaseQueryByKey = function (sriRequestMap, _jobMap, _pendingJobs) {
    return __awaiter(this, void 0, void 0, function* () {
        const sriRequest = (0, common_1.getParentSriRequestFromRequestMap)(sriRequestMap);
        if (sriRequest.queryByKeyFetchList !== undefined) {
            const types = Object.keys(sriRequest.queryByKeyFetchList);
            const results = yield (0, p_map_1.default)(types, (type) => __awaiter(this, void 0, void 0, function* () {
                const keys = sriRequest.queryByKeyFetchList[type];
                const table = (0, common_1.tableFromMapping)((0, common_1.typeToMapping)(type));
                const columns = (0, common_1.sqlColumnNames)((0, common_1.typeToMapping)(type));
                const query = (0, queryObject_1.prepareSQL)(`select-rows-by-key-from-${table}`);
                const keyDbType = global.sri4node_configuration.informationSchema[type].key.type;
                query
                    .sql(`SELECT ${columns}
                       FROM UNNEST(`)
                    .param(keys).sql(`::${keyDbType}[]) "key"
                       INNER JOIN "${table}" USING ("key");`);
                const rows = yield (0, common_1.pgExec)(sriRequest.dbT, query); // pass no sriRequest because timing is already registered in beforePhase hook
                return Object.fromEntries(rows.map((r) => [r.key, r]));
            }), { concurrency: 3 });
            sriRequest.queryByKeyResults = Object.fromEntries(lodash_1.default.zip(types, results));
            delete sriRequest.queryByKeyFetchList;
        }
    });
};
exports.beforePhaseQueryByKey = beforePhaseQueryByKey;
function getRegularResource(phaseSyncer, tx, sriRequest, mapping) {
    return __awaiter(this, void 0, void 0, function* () {
        const { key } = sriRequest.params;
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        yield phaseSyncer.phase();
        yield (0, hooks_1.applyHooks)("before read", mapping.beforeRead || [], (f) => f(tx, sriRequest), sriRequest);
        yield phaseSyncer.phase();
        queryByKeyRequestKey(sriRequest, mapping, key);
        yield phaseSyncer.phase();
        const result = queryByKeyGetResult(sriRequest, mapping, key, sriRequest.query["$$meta.deleted"] === "true" || sriRequest.query["$$meta.deleted"] === "any");
        if (result.code == "resource.gone") {
            throw new typeDefinitions_1.SriError({
                status: 410,
                errors: [{ code: "resource.gone", msg: "Resource is gone" }],
            });
        }
        else if (result.code == "not.found") {
            throw new typeDefinitions_1.SriError({ status: 404, errors: [{ code: "not.found", msg: "Not Found" }] });
        }
        const element = result.object;
        sriRequest.containsDeleted = element.$$meta.deleted;
        element.$$meta.type = mapping.metaType;
        (0, common_1.debug)("trace", "* executing expansion");
        yield expand.executeExpansion(tx, sriRequest, [element], mapping);
        yield phaseSyncer.phase();
        (0, common_1.debug)("trace", "* executing afterRead functions on results");
        yield (0, hooks_1.applyHooks)("after read", mapping.afterRead || [], (f) => f(tx, sriRequest, [
            {
                permalink: element.$$meta.permalink,
                incoming: null,
                stored: element,
            },
        ]), sriRequest);
        yield phaseSyncer.phase();
        return { status: 200, body: element };
    });
}
exports.getRegularResource = getRegularResource;
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
            code: (0, common_1.errorAsCode)(e.message || ""),
            err: e,
        }));
    }
    return null;
}
/**
 * Will fetch the previous version from DB, patch it, then continue as if it were a regular PUT
 *
 * @param {PhaseSyncer} phaseSyncer
 * @param {IDatabase} tx
 * @param {TSriRequest} sriRequest
 * @param {TResourceDefinition} mapping
 * @param {*} previousQueriedByKey
 */
function preparePatchInsideTransaction(phaseSyncer, tx, sriRequest, mapping) {
    return __awaiter(this, void 0, void 0, function* () {
        const { key } = sriRequest.params;
        const patch = (sriRequest.body || []);
        // const patch:Operation[] = sriRequest.body?.map((b) => b.body as unknown as Operation) || [];
        (0, common_1.debug)("trace", `PATCH processing starting key ${key}`);
        queryByKeyRequestKey(sriRequest, mapping, key);
        yield phaseSyncer.phase();
        const result = queryByKeyGetResult(sriRequest, mapping, key, false);
        if (result.code !== "found") {
            // it wouldn't make sense to PATCH a deleted resource I guess?
            throw new typeDefinitions_1.SriError({
                status: 410,
                errors: [{ code: "resource.gone", msg: "Resource is gone" }],
            });
        }
        // overwrite the body with the patched previous record
        try {
            // RFC6902 (with 'op' and 'path'), RFC7396 (just a sparse object) NOT currently supported
            sriRequest.body = fast_json_patch_1.default.applyPatch(result.object, patch, true, false).newDocument;
            (0, common_1.debug)("trace", `Patched resource looks like this: ${JSON.stringify(sriRequest.body, null, 2)}`);
        }
        catch (e) {
            throw new typeDefinitions_1.SriError({
                status: 400,
                errors: [{ code: "patch.invalid", msg: "The patch could not be applied.", error: e }],
            });
        }
        // from now on behave like a PUT of the patched object
        return preparePutInsideTransaction(phaseSyncer, tx, sriRequest, mapping, result);
    });
}
/**
 *
 * @param {*} phaseSyncer
 * @param {*} tx
 * @param {*} sriRequest
 * @param {*} mapping
 * @param {*} previousQueriedByKey if we've already queried the database for the object with the key
 * (result of queryByKey(tx, mapping, key, true)) then we can give to this function so it shouldn't
 * run the same query again. Useful for implementing a PATCH which will simply behave as if it were
 * a PUT after patching.
 */
function preparePutInsideTransaction(phaseSyncer, tx, sriRequest, mapping, previousQueriedByKey = undefined) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = sriRequest.params.key;
        const obj = sriRequest.body;
        const table = (0, common_1.tableFromMapping)(mapping);
        (0, common_1.debug)("trace", `PUT processing starting for key ${key}`);
        if (obj.key !== undefined && obj.key.toString() !== key) {
            throw new typeDefinitions_1.SriError({
                status: 400,
                errors: [
                    { code: "key.mismatch", msg: "Key in the request url does not match the key in the body." },
                ],
            });
        }
        // Treat fields with explicit null values the same as missing fields.
        // We remove them now, before validation (otherwise validation will fail). They will be set
        // to null again in 'transformObjectToRow' (just as fields missing in the original request).
        // ^^^^^ this sounds like a bad idea... jsonschema allows you to define null as a valid option.
        Object.keys(obj).forEach((k) => {
            if (obj[k] === null) {
                delete obj[k];
            }
        });
        (0, common_1.debug)("trace", "Validating schema.");
        if (mapping.schema) {
            // if (!mapping.schemaWithoutAdditionalProperties) {
            //   mapping.schemaWithoutAdditionalProperties = schemaUtils.patchSchemaToDisallowAdditionalProperties(mapping.schema)
            // }
            const hrstart = process.hrtime();
            const validationErrors = getSchemaValidationErrors(obj, mapping.schema, mapping.validateSchema);
            if (validationErrors !== null) {
                const errors = { validationErrors };
                const schemaUrl = `https://${sriRequest.headers["host"]}${mapping.type}/schema`;
                throw new typeDefinitions_1.SriError({
                    status: 409,
                    errors: [{ code: "validation.errors", msg: "Validation error(s)", errors, schemaUrl }],
                });
            }
            else {
                (0, common_1.debug)("trace", "Schema validation passed.");
            }
            const hrend = process.hrtime(hrstart);
            (0, common_1.setServerTimingHdr)(sriRequest, "schema-validation", hrend[0] * 1000 + hrend[1] / 1000000);
        }
        const permalink = mapping.type + "/" + key;
        let result;
        if (previousQueriedByKey !== undefined) {
            // In this case no 'await phaseSyncer.phase()' is necessary because this happens in case of patch
            // and preparePatchInsideTransaction() has already done an 'await phaseSyncer.phase()' while querying
            // the resource.
            result = previousQueriedByKey;
        }
        else {
            queryByKeyRequestKey(sriRequest, mapping, key);
            yield phaseSyncer.phase();
            result = queryByKeyGetResult(sriRequest, mapping, key, false);
        }
        if (result.code == "resource.gone") {
            // we are dealing with a PUT on a deleted resource
            //  -> treat this as a new CREATE
            //  -> remove old resource from DATABASE and then continue the "insert" code path
            const deleteQ = (0, queryObject_1.prepareSQL)("delete-" + table);
            deleteQ.sql(`delete from "${table}" where "key" = `).param(key);
            const deleteRes = yield (0, common_1.pgResult)(tx, deleteQ, sriRequest);
            if (deleteRes.rowCount !== 1) {
                (0, common_1.debug)("trace", "Removal of soft deleted resource failed ?!");
                (0, common_1.debug)("trace", JSON.stringify(deleteRes));
                throw new typeDefinitions_1.SriError({
                    status: 500,
                    errors: [{ code: "delete.failed", msg: "Removal of soft deleted resource failed." }],
                });
            }
        }
        sriRequest.containsDeleted = false;
        yield phaseSyncer.phase();
        if (result.code != "found") {
            // insert new element
            yield (0, hooks_1.applyHooks)("before insert", mapping.beforeInsert || [], (f) => f(tx, sriRequest, [{ permalink: permalink, incoming: obj, stored: null }]), sriRequest);
            yield phaseSyncer.phase();
            const newRow = (0, common_1.transformObjectToRow)(obj, mapping, true);
            newRow.key = key;
            const type = mapping.type;
            const parentSriRequest = (0, common_1.getParentSriRequest)(sriRequest);
            if (parentSriRequest.putRowsToInsert === undefined) {
                parentSriRequest.putRowsToInsert = {};
            }
            if (parentSriRequest.putRowsToInsert[type] === undefined) {
                parentSriRequest.putRowsToInsert[type] = [];
            }
            if (parentSriRequest.putRowsToInsertIDs === undefined) {
                parentSriRequest.putRowsToInsertIDs = [];
            }
            parentSriRequest.putRowsToInsert[type].push(newRow);
            parentSriRequest.putRowsToInsertIDs.push(sriRequest.id);
            return { opType: "insert", obj, permalink };
        }
        else {
            // update existing element
            const prevObj = result.object;
            yield (0, hooks_1.applyHooks)("before update", mapping.beforeUpdate || [], (f) => f(tx, sriRequest, [{ permalink: permalink, incoming: obj, stored: prevObj }]), sriRequest);
            yield phaseSyncer.phase();
            // If new resource is the same as the one in the database => don't update the resource. Otherwise meta
            // data fields 'modified date' and 'version' are updated. PUT should be idempotent.
            if ((0, common_1.isEqualSriObject)(prevObj, obj, mapping)) {
                (0, common_1.debug)("trace", "Putted resource does NOT contain changes -> ignore PUT.");
                yield phaseSyncer.phase();
                yield phaseSyncer.phase();
                yield phaseSyncer.phase();
                return { retVal: { status: 200 } };
            }
            const updateRow = (0, common_1.transformObjectToRow)(obj, mapping, false);
            updateRow["$$meta.modified"] = new Date();
            const type = mapping.type;
            const parentSriRequest = (0, common_1.getParentSriRequest)(sriRequest);
            if (parentSriRequest.putRowsToUpdate === undefined) {
                parentSriRequest.putRowsToUpdate = {};
            }
            if (parentSriRequest.putRowsToUpdate[type] === undefined) {
                parentSriRequest.putRowsToUpdate[type] = [];
            }
            if (parentSriRequest.putRowsToUpdateIDs === undefined) {
                parentSriRequest.putRowsToUpdateIDs = [];
            }
            parentSriRequest.putRowsToUpdate[type].push(updateRow);
            parentSriRequest.putRowsToUpdateIDs.push(sriRequest.id);
            return { opType: "update", obj, prevObj, permalink };
        }
    });
}
function beforePhaseInsertUpdateDelete(sriRequestMap, _jobMap, _pendingJobs) {
    return __awaiter(this, void 0, void 0, function* () {
        const sriRequest = (0, common_1.getParentSriRequestFromRequestMap)(sriRequestMap);
        const throwIfDbTUndefined = (sriReq) => {
            if ((sriReq === null || sriReq === void 0 ? void 0 : sriReq.dbT) === undefined) {
                throw new Error("[beforePhaseInsertUpdateDelete] Expected sriRequest.dbT to be defined");
            }
        };
        throwIfDbTUndefined(sriRequest);
        const pgp = (0, common_1.getPgp)();
        delete sriRequest.multiInsertFailed;
        delete sriRequest.multiUpdateFailed;
        delete sriRequest.multiDeleteFailed;
        // INSERT
        const putRowsToInsert = sriRequest.putRowsToInsert;
        if (putRowsToInsert !== undefined) {
            const types = Object.keys(putRowsToInsert);
            yield (0, p_map_1.default)(types, (type) => __awaiter(this, void 0, void 0, function* () {
                var _a;
                const rows = putRowsToInsert[type];
                const table = (0, common_1.tableFromMapping)((0, common_1.typeToMapping)(type));
                const cs = global.sri4node_configuration.pgColumns[table].insert;
                // generating a multi-row insert query:
                const query = pgp.helpers.insert(rows, cs);
                try {
                    yield ((_a = sriRequest.dbT) === null || _a === void 0 ? void 0 : _a.none(query));
                }
                catch (err) {
                    sriRequest.multiInsertFailed = true;
                    if (err.code === "25P02") {
                        // postgres transaction aborted error -> caused by earlier error
                        sriRequest.multiDeleteError = err;
                    }
                    if (rows.length === 1) {
                        sriRequest.multiInsertError = err;
                    }
                }
            }));
        }
        sriRequest.putRowsToInsert = undefined;
        // UPDATE
        const putRowsToUpdate = sriRequest.putRowsToUpdate;
        if (putRowsToUpdate !== undefined) {
            const types = Object.keys(putRowsToUpdate);
            yield (0, p_map_1.default)(types, (type) => __awaiter(this, void 0, void 0, function* () {
                var _b;
                const rows = putRowsToUpdate[type];
                const table = (0, common_1.tableFromMapping)((0, common_1.typeToMapping)(type));
                const cs = global.sri4node_configuration.pgColumns[table].update;
                const keyDbType = global.sri4node_configuration.informationSchema[type].key.type;
                const update = `${pgp.helpers.update(rows, cs)} WHERE "$$meta.deleted" = false AND v.key::${keyDbType} = t.key::${keyDbType}`;
                try {
                    yield ((_b = sriRequest.dbT) === null || _b === void 0 ? void 0 : _b.none(update));
                }
                catch (err) {
                    sriRequest.multiUpdateFailed = true;
                    if (err.code === "25P02") {
                        // postgres transaction aborted error -> caused by earlier error
                        sriRequest.multiDeleteError = err;
                    }
                    if (rows.length === 1) {
                        sriRequest.multiUpdateError = err;
                    }
                }
            }));
        }
        sriRequest.putRowsToUpdate = undefined;
        // DELETE
        const rowsToDelete = sriRequest.rowsToDelete;
        if (rowsToDelete !== undefined) {
            const types = Object.keys(rowsToDelete);
            yield (0, p_map_1.default)(types, (type) => __awaiter(this, void 0, void 0, function* () {
                var _c;
                const rows = rowsToDelete[type];
                const table = (0, common_1.tableFromMapping)((0, common_1.typeToMapping)(type));
                const cs = global.sri4node_configuration.pgColumns[table].delete;
                const keyDbType = global.sri4node_configuration.informationSchema[type].key.type;
                const update = `${pgp.helpers.update(rows, cs)} WHERE t."$$meta.deleted" = false AND v.key::${keyDbType} = t.key::${keyDbType}`;
                try {
                    yield ((_c = sriRequest.dbT) === null || _c === void 0 ? void 0 : _c.none(update));
                }
                catch (err) {
                    sriRequest.multiDeleteFailed = true;
                    if (err.code === "25P02") {
                        // postgres transaction aborted error -> caused by earlier error
                        sriRequest.multiDeleteError = err;
                    }
                    if (rows.length === 1) {
                        sriRequest.multiDeleteError = err;
                    }
                }
            }));
        }
        sriRequest.rowsToDelete = undefined;
    });
}
exports.beforePhaseInsertUpdateDelete = beforePhaseInsertUpdateDelete;
function handlePutResult(phaseSyncer, sriRequest, mapping, state) {
    return __awaiter(this, void 0, void 0, function* () {
        const parentSriRequest = (0, common_1.getParentSriRequest)(sriRequest);
        if (state.opType === "insert") {
            if (parentSriRequest.multiInsertFailed) {
                if (parentSriRequest.multiInsertError !== undefined) {
                    const err = parentSriRequest.multiInsertError;
                    throw err;
                }
                else {
                    throw multiInsertError();
                }
            }
            yield phaseSyncer.phase();
            yield (0, hooks_1.applyHooks)("after insert", mapping.afterInsert, (f) => f(sriRequest.dbT, sriRequest, [
                { permalink: state.permalink, incoming: state.obj, stored: null },
            ]), sriRequest);
            yield phaseSyncer.phase();
            return { status: 201 };
        }
        if (parentSriRequest.multiUpdateFailed) {
            if (parentSriRequest.multiUpdateError !== undefined) {
                const err = parentSriRequest.multiUpdateError;
                throw err;
            }
            else {
                throw multiUpdateError();
            }
        }
        yield phaseSyncer.phase();
        yield (0, hooks_1.applyHooks)("after update", mapping.afterUpdate || [], (f) => f(sriRequest.dbT, sriRequest, [
            { permalink: state.permalink, incoming: state.obj, stored: state.prevObj },
        ]), sriRequest);
        yield phaseSyncer.phase();
        return { status: 200 };
    });
}
function createOrUpdateRegularResource(phaseSyncer, tx, sriRequest, mapping) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        yield phaseSyncer.phase();
        (0, common_1.debug)("trace", "* sri4node PUT processing invoked.");
        try {
            const state = yield preparePutInsideTransaction(phaseSyncer, tx, sriRequest, mapping);
            if (state.retVal !== undefined) {
                return state.retVal;
            }
            yield phaseSyncer.phase();
            const retVal = yield handlePutResult(phaseSyncer, sriRequest, mapping, state);
            return retVal;
        }
        catch (err) {
            // intercept db constraint violation errors and return 409 error
            if (err.constraint !== undefined) {
                throw new typeDefinitions_1.SriError({
                    status: 409,
                    errors: [{ code: "db.constraint.violation", msg: err.detail }],
                });
            }
            else {
                if (!(err instanceof typeDefinitions_1.SriError || ((_b = (_a = err === null || err === void 0 ? void 0 : err.__proto__) === null || _a === void 0 ? void 0 : _a.constructor) === null || _b === void 0 ? void 0 : _b.name))) {
                    throw new typeDefinitions_1.SriError({ status: 500, errors: [{ code: "sql.error", msg: err.message, err }] });
                }
                throw err;
            }
        }
    });
}
exports.createOrUpdateRegularResource = createOrUpdateRegularResource;
function patchRegularResource(phaseSyncer, tx, sriRequest, mapping) {
    return __awaiter(this, void 0, void 0, function* () {
        yield phaseSyncer.phase();
        (0, common_1.debug)("trace", "* sri4node PATCH processing invoked.");
        try {
            const state = yield preparePatchInsideTransaction(phaseSyncer, tx, sriRequest, mapping);
            if (state.retVal !== undefined) {
                return state.retVal;
            }
            yield phaseSyncer.phase();
            const retVal = yield handlePutResult(phaseSyncer, sriRequest, mapping, state);
            return retVal;
        }
        catch (err) {
            // intercept db constraint violation errors and return 409 error
            if (err.constraint !== undefined) {
                console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
                console.log(err);
                console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~");
                throw new typeDefinitions_1.SriError({
                    status: 409,
                    errors: [{ code: "db.constraint.violation", msg: err.detail }],
                });
            }
            else {
                throw err;
            }
        }
    });
}
exports.patchRegularResource = patchRegularResource;
function deleteRegularResource(phaseSyncer, tx, sriRequest, mapping) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield phaseSyncer.phase();
            (0, common_1.debug)("trace", "sri4node DELETE invoked");
            const { key } = sriRequest.params;
            queryByKeyRequestKey(sriRequest, mapping, key);
            yield phaseSyncer.phase();
            const result = queryByKeyGetResult(sriRequest, mapping, key, sriRequest.query["$$meta.deleted"] === "true" || sriRequest.query["$$meta.deleted"] === "any");
            if (result.code != "found") {
                (0, common_1.debug)("trace", "No row affected - the resource is already gone");
                yield phaseSyncer.phase();
                yield phaseSyncer.phase();
                yield phaseSyncer.phase();
                yield phaseSyncer.phase();
            }
            else {
                sriRequest.containsDeleted = false;
                yield phaseSyncer.phase();
                const prevObj = result.object;
                yield (0, hooks_1.applyHooks)("before delete", mapping.beforeDelete || [], (f) => f(tx, sriRequest, [{ permalink: sriRequest.path, incoming: null, stored: prevObj }]), sriRequest);
                yield phaseSyncer.phase();
                const deleteRow = {
                    key,
                    "$$meta.modified": new Date(),
                    "$$meta.deleted": true,
                };
                const { type } = mapping;
                const parentSriRequest = (0, common_1.getParentSriRequest)(sriRequest);
                if (parentSriRequest.rowsToDelete === undefined) {
                    parentSriRequest.rowsToDelete = {};
                }
                if (parentSriRequest.rowsToDelete[type] === undefined) {
                    parentSriRequest.rowsToDelete[type] = [];
                }
                if (parentSriRequest.rowsToDeleteIDs === undefined) {
                    parentSriRequest.rowsToDeleteIDs = [];
                }
                parentSriRequest.rowsToDelete[type].push(deleteRow);
                parentSriRequest.rowsToDeleteIDs.push(sriRequest.id);
                yield phaseSyncer.phase(); // at beginning of this phase deletes will be executed in one request for all concurrent batch deletes
                if (parentSriRequest.multiDeleteFailed) {
                    if (parentSriRequest.multiDeleteError !== undefined) {
                        if (parentSriRequest.multiDeleteError.code === "25P02") {
                            // postgres transaction aborted error -> caused by earlier error
                            throw new typeDefinitions_1.SriError({
                                status: 202,
                                errors: [
                                    {
                                        code: "transaction.failed",
                                        msg: "Request cancelled due to database error generated by accompanying request in batch.",
                                    },
                                ],
                            });
                        }
                        const err = parentSriRequest.multiDeleteError;
                        throw err;
                    }
                    else {
                        throw multiDeleteError();
                    }
                }
                yield phaseSyncer.phase();
                yield (0, hooks_1.applyHooks)("after delete", mapping.afterDelete || [], (f) => f(tx, sriRequest, [{ permalink: sriRequest.path, incoming: null, stored: prevObj }]), sriRequest);
            }
            yield phaseSyncer.phase();
            return { status: 200 };
        }
        catch (err) {
            // intercept db constraint violation errors and return 409 error
            if (err.constraint !== undefined) {
                throw new typeDefinitions_1.SriError({
                    status: 409,
                    errors: [{ code: "db.constraint.violation", msg: err.detail }],
                });
            }
            else {
                throw err;
            }
        }
    });
}
exports.deleteRegularResource = deleteRegularResource;
//# sourceMappingURL=regularResource.js.map