import _ from 'lodash';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import jsonPatch from 'fast-json-patch';
import pMap from 'p-map';
import { Operation } from 'fast-json-patch';
import { SriError, TSriRequest, TBeforePhase, TResourceDefinition } from './typeDefinitions';
import {
  debug, error, sqlColumnNames, pgExec, pgResult, transformRowToObject, transformObjectToRow,
  errorAsCode, isEqualSriObject, setServerTimingHdr, getParentSriRequest,
  getParentSriRequestFromRequestMap, tableFromMapping, typeToMapping, getPgp, findPropertyInJsonSchema,
} from './common';
import { prepareSQL } from './queryObject';
import { applyHooks } from './hooks';

import * as expand from './expand';
// import { expand } from './expand';
import { PhaseSyncer } from './phaseSyncedSettle';
import { IDatabase } from 'pg-promise';

const ajv = new Ajv({ coerceTypes: true }); // options can be passed, e.g. {allErrors: true}
addFormats(ajv);

const makeMultiError = (type) => () => new SriError({
  status: 409,
  errors: [{
    code: `multi.${type}.failed`,
    msg: `An error occurred during multi row ${type}. There is no indication which request(s)/row(s) caused the error, `
      + `to find out more information retry with individual ${type}s.`,
  }],
});

const multiInsertError = makeMultiError('insert');
const multiUpdateError = makeMultiError('update');
const multiDeleteError = makeMultiError('delete');

function queryByKeyRequestKey(sriRequest: TSriRequest, mapping: TResourceDefinition, key: string) {
  debug('trace', `queryByKeyRequestKey(${key})`);
  const { type } = mapping;
  const parentSriRequest = getParentSriRequest(sriRequest);

  if (findPropertyInJsonSchema(mapping.schema, "key") && mapping.validateKey) {
    const validKey = mapping.validateKey(key);
    if (!validKey) {
      throw new SriError({ status: 400, errors: mapping.validateKey.errors?.map((e) => ({ code: 'key.invalid', key, err: e })) || [] });
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

function queryByKeyGetResult(sriRequest: TSriRequest, mapping: TResourceDefinition, key: string, wantsDeleted: boolean) {
  debug('trace', `queryByKeyGetResult(${key})`);
  const { type } = mapping;
  const parentSriRequest = getParentSriRequest(sriRequest);

  if (parentSriRequest.queryByKeyResults === undefined || parentSriRequest.queryByKeyResults[type] === undefined) {
    const msg = `The function queryByKey did not produce the expected output for key ${key} and type ${type}`;
    error(msg);
    throw new SriError({
      status: 500,
      errors: [{
        code: 'fetching.key.failed', type, key, msg,
      }],
    });
  }

  const row = parentSriRequest.queryByKeyResults[type][key];
  if (row !== undefined) {
    if (row['$$meta.deleted'] && !wantsDeleted) {
      return { code: 'resource.gone' };
    }
    return { code: 'found', object: transformRowToObject(row, mapping) };
  }
  return { code: 'not.found' };
}

const beforePhaseQueryByKey: TBeforePhase = async function (sriRequestMap, _jobMap, _pendingJobs) {
  const sriRequest = getParentSriRequestFromRequestMap(sriRequestMap);
  if (sriRequest.queryByKeyFetchList !== undefined) {
    const types = Object.keys(sriRequest.queryByKeyFetchList);
    const results = await pMap(types, async (type) => {
      const keys = sriRequest.queryByKeyFetchList[type];
      const table = tableFromMapping(typeToMapping(type));
      const columns = sqlColumnNames(typeToMapping(type));
      const query = prepareSQL(`select-rows-by-key-from-${table}`);
      const keyDbType = global.sri4node_configuration.informationSchema[type].key.type;
      query.sql(`SELECT ${columns}
                       FROM UNNEST(`)
        .param(keys)
        .sql(`::${keyDbType}[]) "key"
                       INNER JOIN "${table}" USING ("key");`);

      const rows = await pgExec(sriRequest.dbT, query); // pass no sriRequest because timing is already registered in beforePhase hook

      return Object.fromEntries(rows.map((r) => [r.key, r]));
    }, { concurrency: 3 });

    sriRequest.queryByKeyResults = Object.fromEntries(_.zip(types, results));
    delete sriRequest.queryByKeyFetchList;
  }
}

async function getRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequest, mapping: TResourceDefinition) {
  const { key } = sriRequest.params;

  await phaseSyncer.phase();
  await phaseSyncer.phase();
  await phaseSyncer.phase();

  await applyHooks('before read',
    mapping.beforeRead || [],
    (f) => f(tx,
      sriRequest),
    sriRequest);

  await phaseSyncer.phase();

  queryByKeyRequestKey(sriRequest, mapping, key);

  await phaseSyncer.phase();

  const result = queryByKeyGetResult(sriRequest, mapping, key,
    sriRequest.query['$$meta.deleted'] === 'true'
    || sriRequest.query['$$meta.deleted'] === 'any');

  if (result.code == 'resource.gone') {
    throw new SriError({ status: 410, errors: [{ code: 'resource.gone', msg: 'Resource is gone' }] });
  } else if (result.code == 'not.found') {
    throw new SriError({ status: 404, errors: [{ code: 'not.found', msg: 'Not Found' }] });
  }

  const element = result.object;

  sriRequest.containsDeleted = element.$$meta.deleted;

  element.$$meta.type = mapping.metaType;

  debug('trace', '* executing expansion');
  await expand.executeExpansion(tx, sriRequest, [element], mapping);

  await phaseSyncer.phase();

  debug('trace', '* executing afterRead functions on results');
  await applyHooks('after read',
    mapping.afterRead || [],
    (f) => f(tx, sriRequest, [{
      permalink: element.$$meta.permalink,
      incoming: null,
      stored: element,
    }]),
    sriRequest);

  await phaseSyncer.phase();

  return { status: 200, body: element };
}

function getSchemaValidationErrors(json, schema, validateSchema) {
  const valid = validateSchema(json);
  if (!valid) {
    console.log('Schema validation revealed errors.');
    console.log(validateSchema.errors);
    console.log('JSON schema was : ');
    console.log(JSON.stringify(schema, null, 2));
    console.log('Document was : ');
    console.log(JSON.stringify(json, null, 2));
    return (validateSchema.errors || []).map((e) => ({ code: errorAsCode(e.message || ''), err: e }));
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
async function preparePatchInsideTransaction(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequest, mapping: TResourceDefinition) {
  const { key } = sriRequest.params;
  const patch = (sriRequest.body || []) as Operation[];
  // const patch:Operation[] = sriRequest.body?.map((b) => b.body as unknown as Operation) || [];

  debug('trace', `PATCH processing starting key ${key}`);

  if ('view' in mapping) {
    throw new SriError({ status: 405, errors: [{ code: 'patch.not.allowed', msg: 'PATCH is not allowed on this view resource.' }] });
  }

  queryByKeyRequestKey(sriRequest, mapping, key);
  await phaseSyncer.phase();
  const result = queryByKeyGetResult(sriRequest, mapping, key, false);

  if (result.code !== 'found') {
    // it wouldn't make sense to PATCH a deleted resource I guess?
    throw new SriError({ status: 410, errors: [{ code: 'resource.gone', msg: 'Resource is gone' }] });
  }

  // overwrite the body with the patched previous record
  try {
    // RFC6902 (with 'op' and 'path'), RFC7396 (just a sparse object) NOT currently supported
    sriRequest.body = jsonPatch.applyPatch(result.object, patch, true, false).newDocument;
    debug('trace', `Patched resource looks like this: ${JSON.stringify(sriRequest.body, null, 2)}`);
  } catch (e) {
    throw new SriError({ status: 400, errors: [{ code: 'patch.invalid', msg: 'The patch could not be applied.', error: e }] });
  }

  // from now on behave like a PUT of the patched object
  return preparePutInsideTransaction(phaseSyncer, tx, sriRequest, mapping, result);
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
async function preparePutInsideTransaction(phaseSyncer: PhaseSyncer, tx: any, sriRequest: TSriRequest,
  mapping: TResourceDefinition, previousQueriedByKey: any = undefined) {
  const key = sriRequest.params.key;
  const obj = sriRequest.body
  const table = tableFromMapping(mapping);

  debug('trace', `PUT processing starting for key ${key}`);

  if ('view' in mapping) {
    throw new SriError({ status: 405, errors: [{ code: 'put.not.allowed', msg: 'PUT is not allowed on this view resource.' }] });
  }

  if (obj.key !== undefined && obj.key.toString() !== key) {
    throw new SriError({ status: 400, errors: [{ code: 'key.mismatch', msg: 'Key in the request url does not match the key in the body.' }] })
  }

  // Treat fields with explicit null values the same as missing fields.
  // We remove them now, before validation (otherwise validation will fail). They will be set
  // to null again in 'transformObjectToRow' (just as fields missing in the original request).
  Object.keys(obj).forEach(k => {
    if (obj[k] === null) { delete obj[k] }
  })

  debug('trace', 'Validating schema.');
  if (mapping.schema) {
    // if (!mapping.schemaWithoutAdditionalProperties) {
    //   mapping.schemaWithoutAdditionalProperties = schemaUtils.patchSchemaToDisallowAdditionalProperties(mapping.schema)
    // }

    const hrstart = process.hrtime();
    const validationErrors = getSchemaValidationErrors(obj, mapping.schema, mapping.validateSchema);
    if (validationErrors !== null) {
      const errors = { validationErrors };
      const schemaUrl = `https://${sriRequest.headers['host']}${mapping.type}/schema`;
      throw new SriError({ status: 409, errors: [{ code: 'validation.errors', msg: 'Validation error(s)', errors, schemaUrl }] })
    } else {
      debug('trace', 'Schema validation passed.');
    }
    const hrend = process.hrtime(hrstart);
    setServerTimingHdr(sriRequest, 'schema-validation', hrend[0] * 1000 + hrend[1] / 1000000);
  }

  const permalink = mapping.type + '/' + key

  let result;
  if (previousQueriedByKey !== undefined) {
    // In this case no 'await phaseSyncer.phase()' is necessary because this happens in case of patch
    // and preparePatchInsideTransaction() has already done an 'await phaseSyncer.phase()' while querying
    // the resource.
    result = previousQueriedByKey
  } else {
    queryByKeyRequestKey(sriRequest, mapping, key);
    await phaseSyncer.phase();
    result = queryByKeyGetResult(sriRequest, mapping, key, false);
  }

  if (result.code == 'resource.gone') {
    // we are dealing with a PUT on a deleted resource
    //  -> treat this as a new CREATE
    //  -> remove old resource from DATABASE and then continue the "insert" code path

    const deleteQ = prepareSQL('delete-' + table);
    deleteQ.sql(`delete from "${table}" where "key" = `).param(key);

    const deleteRes = await pgResult(tx, deleteQ, sriRequest);

    if (deleteRes.rowCount !== 1) {
      debug('trace', 'Removal of soft deleted resource failed ?!');
      debug('trace', JSON.stringify(deleteRes))
      throw new SriError({ status: 500, errors: [{ code: 'delete.failed', msg: 'Removal of soft deleted resource failed.' }] })
    }
  }

  sriRequest.containsDeleted = false;
  await phaseSyncer.phase();

  if (result.code != 'found') {
    // insert new element

    await applyHooks('before insert'
      , mapping.beforeInsert || []
      , f => f(tx, sriRequest, [{ permalink: permalink, incoming: obj, stored: null }])
      , sriRequest
    )

    await phaseSyncer.phase()

    const newRow: any = transformObjectToRow(obj, mapping, true)
    newRow.key = key;

    const type = mapping.type;
    const parentSriRequest = getParentSriRequest(sriRequest);
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

    return { opType: 'insert', obj, permalink };
  } else {
    // update existing element
    const prevObj = result.object

    await applyHooks('before update'
      , mapping.beforeUpdate || []
      , f => f(tx, sriRequest, [{ permalink: permalink, incoming: obj, stored: prevObj }])
      , sriRequest)

    await phaseSyncer.phase()

    // If new resource is the same as the one in the database => don't update the resource. Otherwise meta
    // data fields 'modified date' and 'version' are updated. PUT should be idempotent.
    if (isEqualSriObject(prevObj, obj, mapping)) {
      debug('trace', 'Putted resource does NOT contain changes -> ignore PUT.');
      await phaseSyncer.phase();
      await phaseSyncer.phase();
      await phaseSyncer.phase();
      return { retVal: { status: 200 } }
    }

    const updateRow = transformObjectToRow(obj, mapping, false)
    updateRow["$$meta.modified"] = new Date();

    const type = mapping.type;
    const parentSriRequest = getParentSriRequest(sriRequest);
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

    return { opType: 'update', obj, prevObj, permalink };
  }

}

async function beforePhaseInsertUpdateDelete(sriRequestMap, _jobMap, _pendingJobs) {
  const sriRequest: TSriRequest = getParentSriRequestFromRequestMap(sriRequestMap);

  const throwIfDbTUndefined = (sriReq: TSriRequest): void => {
    if (sriReq?.dbT === undefined) {
      throw new Error('[beforePhaseInsertUpdateDelete] Expected sriRequest.dbT to be defined');
    }
  }
  throwIfDbTUndefined(sriRequest);

  const pgp = getPgp();

  delete sriRequest.multiInsertFailed;
  delete sriRequest.multiUpdateFailed;
  delete sriRequest.multiDeleteFailed;

  // INSERT
  const putRowsToInsert = sriRequest.putRowsToInsert;
  if (putRowsToInsert !== undefined) {
    const types = Object.keys(putRowsToInsert);
    await pMap(types, async (type) => {
      const rows = putRowsToInsert[type];
      const table = tableFromMapping(typeToMapping(type));
      const cs = global.sri4node_configuration.pgColumns[table].insert;

      // generating a multi-row insert query:
      const query = pgp.helpers.insert(rows, cs);
      try {
        await sriRequest.dbT?.none(query);
      } catch (err) {
        sriRequest.multiInsertFailed = true;
        if (err.code === '25P02') {
          // postgres transaction aborted error -> caused by earlier error
          sriRequest.multiDeleteError = err;
        }
        if (rows.length === 1) {
          sriRequest.multiInsertError = err;
        }
      }
    });
  }
  sriRequest.putRowsToInsert = undefined;

  // UPDATE
  const putRowsToUpdate = sriRequest.putRowsToUpdate;
  if (putRowsToUpdate !== undefined) {
    const types = Object.keys(putRowsToUpdate);
    await pMap(types, async (type) => {
      const rows = putRowsToUpdate[type];

      const table = tableFromMapping(typeToMapping(type));
      const cs = global.sri4node_configuration.pgColumns[table].update;
      const keyDbType = global.sri4node_configuration.informationSchema[type].key.type;
      const update = `${pgp.helpers.update(rows, cs)} WHERE "$$meta.deleted" = false AND v.key::${keyDbType} = t.key::${keyDbType}`;

      try {
        await sriRequest.dbT?.none(update);
      } catch (err) {
        sriRequest.multiUpdateFailed = true;
        if (err.code === '25P02') {
          // postgres transaction aborted error -> caused by earlier error
          sriRequest.multiDeleteError = err;
        }
        if (rows.length === 1) {
          sriRequest.multiUpdateError = err;
        }
      }
    });
  }
  sriRequest.putRowsToUpdate = undefined;

  // DELETE
  const rowsToDelete = sriRequest.rowsToDelete;
  if (rowsToDelete !== undefined) {
    const types = Object.keys(rowsToDelete);
    await pMap(types, async (type) => {
      const rows = rowsToDelete[type];

      const table = tableFromMapping(typeToMapping(type));
      const cs = global.sri4node_configuration.pgColumns[table].delete;
      const keyDbType = global.sri4node_configuration.informationSchema[type].key.type;
      const update = `${pgp.helpers.update(rows, cs)} WHERE t."$$meta.deleted" = false AND v.key::${keyDbType} = t.key::${keyDbType}`;

      try {
        await sriRequest.dbT?.none(update);
      } catch (err) {
        sriRequest.multiDeleteFailed = true;
        if (err.code === '25P02') {
          // postgres transaction aborted error -> caused by earlier error
          sriRequest.multiDeleteError = err;
        }
        if (rows.length === 1) {
          sriRequest.multiDeleteError = err;
        }
      }
    });
  }
  sriRequest.rowsToDelete = undefined;
}

async function handlePutResult(phaseSyncer: PhaseSyncer, sriRequest: TSriRequest, mapping: TResourceDefinition, state) {
  const parentSriRequest = getParentSriRequest(sriRequest);
  if (state.opType === 'insert') {
    if (parentSriRequest.multiInsertFailed) {
      if (parentSriRequest.multiInsertError !== undefined) {
        const err = parentSriRequest.multiInsertError;
        throw err;
      } else {
        throw multiInsertError();
      }
    }

    await phaseSyncer.phase();

    await applyHooks('after insert',
      mapping.afterInsert,
      (f) => f(sriRequest.dbT, sriRequest, [{ permalink: state.permalink, incoming: state.obj, stored: null }]),
      sriRequest);

    await phaseSyncer.phase();

    return { status: 201 };
  }
  if (parentSriRequest.multiUpdateFailed) {
    if (parentSriRequest.multiUpdateError !== undefined) {
      const err = parentSriRequest.multiUpdateError;
      throw err;
    } else {
      throw multiUpdateError();
    }
  }

  await phaseSyncer.phase();

  await applyHooks('after update',
    mapping.afterUpdate || [],
    (f) => f(sriRequest.dbT, sriRequest, [{ permalink: state.permalink, incoming: state.obj, stored: state.prevObj }]),
    sriRequest);

  await phaseSyncer.phase();

  return { status: 200 };
}

async function createOrUpdateRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequest, mapping: TResourceDefinition) {
  await phaseSyncer.phase();
  debug('trace', '* sri4node PUT processing invoked.');
  try {
    const state = await preparePutInsideTransaction(phaseSyncer, tx, sriRequest, mapping);
    if (state.retVal !== undefined) {
      return state.retVal;
    }
    await phaseSyncer.phase();
    const retVal = await handlePutResult(phaseSyncer, sriRequest, mapping, state);
    return retVal;
  } catch (err) {
    // intercept db constraint violation errors and return 409 error
    if (err.constraint !== undefined) {
      throw new SriError({ status: 409, errors: [{ code: 'db.constraint.violation', msg: err.detail }] });
    } else {
      if (!(err instanceof SriError || err?.__proto__?.constructor?.name)) {
        throw new SriError({ status: 500, errors: [{ code: 'sql.error', msg: err.message, err }] });
      }
      throw err;
    }
  }
}

async function patchRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequest, mapping: TResourceDefinition) {
  await phaseSyncer.phase();
  debug('trace', '* sri4node PATCH processing invoked.');
  try {
    const state = await preparePatchInsideTransaction(phaseSyncer, tx, sriRequest, mapping);
    if (state.retVal !== undefined) {
      return state.retVal;
    }
    await phaseSyncer.phase();
    const retVal = await handlePutResult(phaseSyncer, sriRequest, mapping, state);
    return retVal;
  } catch (err) {
    // intercept db constraint violation errors and return 409 error
    if (err.constraint !== undefined) {
      console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      console.log(err);
      console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      throw new SriError({ status: 409, errors: [{ code: 'db.constraint.violation', msg: err.detail }] });
    } else {
      throw err;
    }
  }
}

async function deleteRegularResource(phaseSyncer: PhaseSyncer, tx: IDatabase<unknown>, sriRequest: TSriRequest, mapping: TResourceDefinition) {
  try {
    await phaseSyncer.phase();

    debug('trace', 'sri4node DELETE invoked');

    if ('view' in mapping) {
      throw new SriError({ status: 405, errors: [{ code: 'delete.not.allowed', msg: 'DELETE is not allowed on this view resource.' }] });
    }

    const { key } = sriRequest.params;

    queryByKeyRequestKey(sriRequest, mapping, key);

    await phaseSyncer.phase();

    const result = queryByKeyGetResult(sriRequest, mapping, key,
      sriRequest.query['$$meta.deleted'] === 'true'
      || sriRequest.query['$$meta.deleted'] === 'any');

    if (result.code != 'found') {
      debug('trace', 'No row affected - the resource is already gone');
      await phaseSyncer.phase();
      await phaseSyncer.phase();
      await phaseSyncer.phase();
      await phaseSyncer.phase();
    } else {
      sriRequest.containsDeleted = false;

      await phaseSyncer.phase();

      const prevObj = result.object;
      await applyHooks('before delete',
        mapping.beforeDelete || [],
        (f) => f(tx, sriRequest, [{ permalink: sriRequest.path, incoming: null, stored: prevObj }]),
        sriRequest);

      await phaseSyncer.phase();

      const deleteRow = {
        key,
        '$$meta.modified': new Date(),
        '$$meta.deleted': true,
      };

      const { type } = mapping;
      const parentSriRequest = getParentSriRequest(sriRequest);
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

      await phaseSyncer.phase(); // at beginning of this phase deletes will be executed in one request for all concurrent batch deletes

      if (parentSriRequest.multiDeleteFailed) {
        if (parentSriRequest.multiDeleteError !== undefined) {
          if (parentSriRequest.multiDeleteError.code === '25P02') {
            // postgres transaction aborted error -> caused by earlier error
            throw new SriError({ status: 202, errors: [{ code: 'transaction.failed', msg: 'Request cancelled due to database error generated by accompanying request in batch.' }] });
          }
          const err = parentSriRequest.multiDeleteError;
          throw err;
        } else {
          throw multiDeleteError();
        }
      }

      await phaseSyncer.phase();

      await applyHooks('after delete',
        mapping.afterDelete || [],
        (f) => f(tx, sriRequest, [{ permalink: sriRequest.path, incoming: null, stored: prevObj }]),
        sriRequest);
    }
    await phaseSyncer.phase();
    return { status: 200 };
  } catch (err) {
    // intercept db constraint violation errors and return 409 error
    if (err.constraint !== undefined) {
      throw new SriError({ status: 409, errors: [{ code: 'db.constraint.violation', msg: err.detail }] });
    } else {
      throw err;
    }
  }
}

export {
  getRegularResource,
  createOrUpdateRegularResource,
  patchRegularResource,
  deleteRegularResource,
  beforePhaseQueryByKey,
  beforePhaseInsertUpdateDelete,
};
