const _ = require('lodash')
const { Validator } = require('jsonschema')
const jiff = require('jiff');

const { debug, cl, typeToConfig, tableFromMapping, sqlColumnNames, pgExec, transformRowToObject, transformObjectToRow, errorAsCode,
        executeOnFunctions, SriError, getCountResult, isEqualSriObject } = require('./common.js');
const expand = require('./expand.js');
const hooks = require('./hooks.js');
const queryobject = require('./queryObject.js');
const prepare = queryobject.prepareSQL;
const schemaUtils = require('./schemaUtils');


async function queryByKey(tx, mapping, key, wantsDeleted) {
  'use strict';
  debug(`** queryByKey(${key})`);
  const columns = sqlColumnNames(mapping);
  const table = tableFromMapping(mapping);

  if (mapping.schema && mapping.schema.properties.key) {
    const result = (new Validator()).validate(key, mapping.schema.properties.key);
    if (result.errors.length > 0) {
      throw new SriError({status: 400, errors: result.errors.map( e => ({code: 'key.invalid', msg: 'key ' + e.message}) )})
    }
  }

  const query = prepare('select-row-by-key-from-' + table);
  const sql = `select ${columns} from "${table}" where "key" = `
  query.sql(sql).param(key);
  const rows = await pgExec(tx, query)
  if (rows.length === 1) {
    const row = rows[0];
    if (row['$$meta.deleted'] && !wantsDeleted) {
      return { code: 'resource.gone' }
    } else {
      debug('** transforming row to JSON object');
      return { code: 'found', object: transformRowToObject(row, mapping) }
    }
  } else if (rows.length === 0) {
    return { code: 'not.found' }
  } else {
    msg = `More than one entry with key ${key} found for ${mapping.type}`;
    debug(msg);
    throw SriError({status: 500, errors: [{code: 'duplicate.key', msg: msg}]})
  }
}




async function getRegularResource(phaseSyncer, tx, sriRequest, mapping) {
  'use strict';
  const key = sriRequest.params.key

  await phaseSyncer.phase()

  await hooks.applyHooks( 'before read', 
                          mapping.beforeRead, 
                          f => f( tx, 
                                  sriRequest
                                )
                        )                                      


  await phaseSyncer.phase()
  debug('* query by key');
  const result = await queryByKey(tx, mapping, key,
                                   sriRequest.query['$$meta.deleted'] === 'true'
                                          || sriRequest.query['$$meta.deleted'] === 'any');

  if (result.code == 'resource.gone') {
    throw new SriError({status: 410, errors: [{code: 'resource.gone', msg: 'Resource is gone'}]})
  } else if (result.code == 'not.found') {
    throw new SriError({status: 404, errors: [{code: 'not.found', msg: 'Not Found'}]})
  }

  const element = result.object

  element['$$meta'].type = mapping.metaType;

  debug('* executing expansion');
  await expand.executeExpansion(tx, sriRequest, [element], mapping);

  await phaseSyncer.phase()

  debug('* executing afterRead functions on results');
  await hooks.applyHooks( 'after read',
                          mapping.afterRead,
                          f => f(tx, sriRequest, [{ permalink: element.$$meta.permalink
                                                  , incoming: null
                                                  , stored: element }] )
                        )

  await phaseSyncer.phase()

  return { status: 200, body: element }
}

function getSchemaValidationErrors(json, schema) {
  'use strict';
  var result = (new Validator()).validate(json, schema);

  const ret = {}
  var i, current, err;

  if (result.errors && result.errors.length > 0) {
    cl('Schema validation revealed errors.');
    cl(result.errors);
    cl('JSON schema was : ');
    cl(schema);
    cl('Document was : ');
    cl(json);
    ret.errors = [];
    ret.document = json;
    for (i = 0; i < result.errors.length; i++) {
      current = result.errors[i];
      err = {};
      err.code = errorAsCode(current.message);
      if (current.property && current.property.indexOf('instance.') === 0) {
        err.path = current.property.substring(9);
      }
      ret.errors.push(err);
    }
    return ret;
  } else {
    return null;
  }
}

/**
 * Will fetch the previous version from DB, patch it, then continue as if it were a regular PUT
 *
 * @param {*} phaseSyncer
 * @param {*} tx
 * @param {*} sriRequest
 * @param {*} mapping
 * @param {*} previousQueriedByKey
 */
async function executePatchInsideTransaction(phaseSyncer, tx, sriRequest, mapping) {
  'use strict';
  const key = sriRequest.params.key;
  const patch = sriRequest.body;

  debug('PATCH processing starting. Request object :');
  debug(patch);
  debug('Key received on URL : ' + key);

  const result = await queryByKey(tx, mapping, key, false)
  if (result.code != 'found') {
    // it wouldn't make sense to PATCH a deleted resource I guess?
    throw new SriError({status: 410, errors: [{code: 'resource.gone', msg: 'Resource is gone' }]})
  }

  // overwrite the body with the patched previous record
  try {
    // RFC6902 (with 'op' and 'path'), RFC7396 (just a sparse object) NOT currently supported
    sriRequest.body = jiff.patch(patch, result.object);
    debug(`Patched resource looks like this: ${JSON.stringify(sriRequest.body, null, 2)}`);
  } catch(e) {
    throw new SriError({status: 409, errors: [{code: 'patch.invalid', msg: 'The patch could not be applied.' }]});
  }

  // from now on behave like a PUT of the patched object
  return executePutInsideTransaction(phaseSyncer, tx, sriRequest, mapping, result);
}

/**
 *
 * @param {*} phaseSyncer
 * @param {*} tx
 * @param {*} sriRequest
 * @param {*} mapping
 * @param {*} previousQueriedByKey if we've already queried the database for the object with te key
 * (result of queryByKey(tx, mapping, key, true)) then we can give to this function so it shouldn't
 * run the same query again. Useful for implementing a PATCH which will simply behave as if it were
 * a PUT after patching.
 */
/* eslint-disable */
async function executePutInsideTransaction(phaseSyncer, tx, sriRequest, mapping, previousQueriedByKey) {
  'use strict';
  const key = sriRequest.params.key;
  const obj = sriRequest.body
  const table = tableFromMapping(mapping);

  debug('PUT processing starting. Request object :');
  debug(JSON.stringify(obj));
  debug('Key received on URL : ' + key);

  if (obj.key !== undefined && obj.key.toString() !== key) {
    throw new SriError({status: 400, errors: [{code: 'key.mismatch', msg: 'Key in the request url does not match the key in the body.' }]})
  }

  // Treat fields with explicit null values the same as missing fields.
  // We remove them now, before validation (otherwise validation will fail). They will be set
  // to null again in 'transformObjectToRow' (just as fields missing in the original request).
  Object.keys(obj).forEach( k => {
    if (obj[k] === null) { delete obj[k] }
  })

  debug('Validating schema.');
  if (mapping.schema) {
    if (!mapping.schemaWithoutAdditionalProperties) {
      mapping.schemaWithoutAdditionalProperties = schemaUtils.patchSchemaToDisallowAdditionalProperties(mapping.schema)
    }
    const validationErrors = getSchemaValidationErrors(obj, mapping.schema);
    if (validationErrors !== null) {
      const errors = { validationErrors }
      throw new SriError({status: 409, errors: [{code: 'validation.errors', msg: 'Validation error(s)', errors }]})
    } else {
      debug('Schema validation passed.');
    }
    // const validationErrors = getSchemaValidationErrors(obj, mapping.schemaWithoutAdditionalProperties);
    // if (validationErrors !== null) {
    //   const validationErrors2 = getSchemaValidationErrors(obj, mapping.schema);
    //   if (validationErrors2 !== null) {
    //     const errors = { validationErrors2 }
    //     throw new SriError({status: 409, errors: [{code: 'validation.errors', msg: 'Validation error(s)', errors }]})
    //   }
    //   else {
    //     debug('Schema validation passed, but object contains some additional properties...');
    //     // TODO: handle idempotence of updates when there are edditional properties (that won't be stored) in the object being PUT
    //   }
    // } else {
    //   debug('Schema validation passed.');
    // }
  }

  const permalink = mapping.type + '/' + key

  const result = previousQueriedByKey || await queryByKey(tx, mapping, key, true)
  if (result.code != 'found') {
    // insert new element
    await hooks.applyHooks('before insert'
                          , mapping.beforeInsert
                          , f => f(tx, sriRequest, [{ permalink: permalink, incoming: obj, stored: null}]))

    await phaseSyncer.phase()

    const newRow = transformObjectToRow(obj, mapping, true)
    newRow.key = key;

    const insert = prepare('insert-' + table);
    insert.sql('insert into "' + table + '" (').keys(newRow).sql(') values (').values(newRow).sql(') ');
    insert.sql(' returning key') // to be able to check rows.length
    const insertRes = await pgExec(tx, insert)
    if (insertRes.length === 1) {
      await phaseSyncer.phase()

      await hooks.applyHooks('after insert'
                            , mapping.afterInsert
                            , f => f(tx, sriRequest, [{permalink: permalink, incoming: obj, stored: null}]))

      await phaseSyncer.phase()

      return { status: 201 }
    } else {
      debug('No row affected ?!');
      throw new SriError({status: 500, errors: [{code: 'insert.failed', msg: 'No row affected.'}]})
    }
  } else {
    // update existing element
    const prevObj = result.object

    await hooks.applyHooks('before update'
                          , mapping.beforeUpdate
                          , f => f(tx, sriRequest, [{permalink: permalink, incoming: obj, stored: prevObj}]))

    await phaseSyncer.phase()

    // If new resource is the same as the one in the database => don't update the resource. Otherwise meta
    // data fields 'modified date' and 'version' are updated. PUT should be idempotent.
    if (isEqualSriObject(prevObj, obj, mapping)) {
      debug('Putted resource does NOT contain changes -> ignore PUT.');
      return { status: 200 }
    }
    
    const updateRow = transformObjectToRow(obj, mapping, false)

    var update = prepare('update-' + table);
    update.sql(`update "${table}" set "$$meta.modified" = date_trunc('milliseconds', current_timestamp)`);
    Object.keys(updateRow).forEach( key => {
      if (!key.startsWith('$$meta')) {
        update.sql(',\"' + key + '\"' + '=').param(updateRow[key]);
      }
    })
    update.sql(' where "$$meta.deleted" = false and "key" = ').param(key);
    update.sql(' returning key')

    const updateRes = await pgExec(tx, update)
    if (updateRes.length === 1) {
      await phaseSyncer.phase()

      await hooks.applyHooks('after update'
                            , mapping.afterUpdate
                            , f => f(tx, sriRequest, [{permalink: permalink, incoming: obj, stored: prevObj}]))

      await phaseSyncer.phase()

      return { status: 200 }
    } else {
      debug('No row affected - resource is gone');
      throw new SriError({status: 410, errors: [{code: 'resource.gone', msg: 'Resource is gone'}]})
    }
  }

}
/* eslint-enable */


async function createOrUpdateRegularResource(phaseSyncer, tx, sriRequest, mapping) {
  'use strict';
  await phaseSyncer.phase()
  debug('* sri4node PUT processing invoked.');
  try {
    return await executePutInsideTransaction(phaseSyncer, tx, sriRequest, mapping)
  } catch (err) {
    // intercept db constraint violation errors and return 409 error
    if ( err.constraint !== undefined ) {
      console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
      console.log(err)
      console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
      throw new SriError({status: 409, errors: [{code: 'db.constraint.violation', msg: err.detail}]})
    } else {
      throw err
    }
  }
}

async function patchRegularResource(phaseSyncer, tx, sriRequest, mapping) {
  'use strict';
  await phaseSyncer.phase()
  debug('* sri4node PATCH processing invoked.');
  try {
    return await executePatchInsideTransaction(phaseSyncer, tx, sriRequest, mapping)
  } catch (err) {
    // intercept db constraint violation errors and return 409 error
    if ( err.constraint !== undefined ) {
      console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
      console.log(err)
      console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~')
      throw new SriError({status: 409, errors: [{code: 'db.constraint.violation', msg: err.detail}]})
    } else {
      throw err
    }
  }
}

async function deleteRegularResource(phaseSyncer, tx, sriRequest, mapping) {
  'use strict';
  await phaseSyncer.phase()

  debug('sri4node DELETE invoked');
  const key = sriRequest.params.key;
  const table = tableFromMapping(mapping);

  const result = await queryByKey(tx, mapping, key, false)
  if (result.code != 'found') {
    debug('No row affected - the resource is already gone');
  } else {
    const prevObj = result.object
    await hooks.applyHooks('before delete'
                          , mapping.beforeDelete
                          , f => f(tx, sriRequest, [{ permalink: sriRequest.path, incoming: null, stored: prevObj}]))

    await phaseSyncer.phase()

    const deletequery = prepare('delete-by-key-' + table);
    const sql = `update ${table} set "$$meta.deleted" = true, "$$meta.modified" = current_timestamp `
                 + `where "$$meta.deleted" = false and "key" = `
    deletequery.sql(sql).param(key);
    deletequery.sql(' returning key') // to be able to check rows.length
    const rows = await pgExec(tx, deletequery);
    if (rows.length === 0) {
      debug('No row affected - the resource is already gone');
    } else { // eslint-disable-line
      await phaseSyncer.phase()

      debug('Processing afterdelete');
      await hooks.applyHooks('after delete'
                            , mapping.afterDelete
                            , f => f(tx, sriRequest, [{ permalink: sriRequest.path, incoming: null, stored: prevObj}]))
    }
  }
  await phaseSyncer.phase();
  return { status: 200 }
}




exports = module.exports = {
  getRegularResource,
  createOrUpdateRegularResource,
  patchRegularResource,
  deleteRegularResource,
}
