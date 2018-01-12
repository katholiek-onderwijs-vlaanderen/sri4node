const configuration = global.configuration

const _ = require('lodash')
const { Validator } = require('jsonschema')

const { debug, cl, typeToConfig, tableFromMapping, sqlColumnNames, pgExec, transformRowToObject, transformObjectToRow, errorAsCode,
        executeOnFunctions, SriError, startTransaction, getCountResult, urlToTypeAndKey, isEqualSriObject } = require('./common.js');
const expand = require('./expand.js');
const hooks = require('./hooks.js')
var queryobject = require('./queryObject.js');
const prepare = queryobject.prepareSQL; 



async function queryByKey(db, mapping, key, wantsDeleted) {
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
  const rows = await pgExec(db, query)
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




async function getRegularResource(db, sriRequest) {
  'use strict';
  const resources = global.configuration.resources
  const { type, key } = urlToTypeAndKey(sriRequest.path)
  const typeToMapping = typeToConfig(resources);
  const mapping = typeToMapping[type];

  debug('* query by key');
  const result = await queryByKey(db, mapping, key,
                                   sriRequest.query['$$meta.deleted'] === 'true' 
                                          || sriRequest.query['$$meta.deleted'] === 'any');

  if (result.code == 'resource.gone') {
    throw new SriError({status: 410, errors: [{code: 'resource.gone', msg: 'Resource is gone'}]})
  } else if (result.code == 'not.found') {
    throw new SriError({status: 404, errors: [{code: 'not.found', msg: 'Not Found'}]})
  }

  const element = result.object

  debug('* executing expansion');
  await expand.executeExpansion(db, sriRequest, [element], mapping, resources);

  debug('* executing afterread functions on results');
  await hooks.applyHooks( 'after read', 
                          mapping.afterread, 
                          f => f(db, sriRequest, [{ permalink: element.$$meta.permalink
                                                  , incoming: null
                                                  , stored: element }] )
                        )

  debug('* sending response to the client :');
  return { status: 200, body: element }
}


function getSchemaValidationErrors(json, schema) {
  'use strict';
  var v = new Validator();
  var result = v.validate(json, schema);

  var ret, i, current, err;

  if (result.errors && result.errors.length > 0) {
    cl('Schema validation revealed errors.');
    cl(result.errors);
    cl('JSON schema was : ');
    cl(schema);
    cl('Document was : ');
    cl(json);
    ret = {};
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
  }
}




/* eslint-disable */
async function executePutInsideTransaction(tx, sriRequest) {
  'use strict';
  const { type, key } = urlToTypeAndKey(sriRequest.path)
  const obj = sriRequest.body

  debug('PUT processing starting. Request object :');
  debug(obj);
  debug('Key received on URL : ' + key);

  if (obj.key !== key) {
    throw new SriError({status: 400, errors: [{code: 'key.mismatch', msg: 'Key in the request url does not match the key in the body.' }]})
  }

  // Treat fields with explicit null values the same as missing fields.
  // We remove them now, before validation (otherwise validation will fail). They will be set
  // to null again in 'transformObjectToRow' (just as fields missing in the original request).
  Object.keys(obj).forEach( k => {
    if (obj[k] === null) { delete obj[k] }
  })

  const resources = global.configuration.resources
  const typeToMapping = typeToConfig(resources);
  const resourceMapping = typeToMapping[type];
  const table = tableFromMapping(resourceMapping);

  debug('Validating schema.');
  if (resourceMapping.schema) {
    const validationErrors  = getSchemaValidationErrors(obj, resourceMapping.schema);
    if (validationErrors) {
      const errors = { validationErrors }
      throw new SriError({status: 409, errors: [{code: 'validation.errors', msg: 'Validation error(s)', errors }]})
    } else {
      debug('Schema validation passed.');
    }
  }

  const permalink = resourceMapping.type + '/' + key

  const result = await queryByKey(tx, resourceMapping, key, true)
  if (result.code != 'found') {
    // insert new element
    await hooks.applyHooks('before insert'
                          , resourceMapping.beforeinsert
                          , f => f(tx, sriRequest, [{ permalink: permalink, incoming: obj, stored: null}]))

    const newRow = transformObjectToRow(obj, resourceMapping)
    newRow.key = key;

    const insert = prepare('insert-' + table);
    insert.sql('insert into "' + table + '" (').keys(newRow).sql(') values (').values(newRow).sql(') ');
    insert.sql(' returning key') // to be able to check rows.length
    const insertRes = await pgExec(tx, insert) 
    if (insertRes.length === 1) {
      await hooks.applyHooks('after insert'
                            , resourceMapping.afterinsert
                            , f => f(tx, sriRequest, [{permalink: permalink, incoming: obj, stored: null}]))      
      return { status: 201 }      
    } else {
      debug('No row affected ?!');
      throw new SriError({status: 500, errors: [{code: 'insert.failed', msg: 'No row affected.'}]})
    }
  } else {
    // update existing element 
    const prevObj = result.object

    // If new resource is the same as the one in the database => don't update the resource. Otherwise meta 
    // data fields 'modified date' and 'version' are updated. PUT should be idempotent.
    if (isEqualSriObject(prevObj, obj, resourceMapping)) {
      debug('Putted resource does NOT contain changes -> ignore PUT.');
      return { status: 200 }
    }

    await hooks.applyHooks('before update'
                          , resourceMapping.beforeupdate
                          , f => f(tx, sriRequest, [{permalink: permalink, incoming: obj, stored: prevObj}]))

    const updateRow = transformObjectToRow(obj, resourceMapping)

    var update = prepare('update-' + table);
    update.sql(`update "${table}" set "$$meta.modified" = current_timestamp `);
    Object.keys(updateRow).forEach( key => {
      if (!key.startsWith('$$meta')) {
        update.sql(',\"' + key + '\"' + '=').param(updateRow[key]);
      }  
    })
    update.sql(' where "$$meta.deleted" = false and "key" = ').param(key);
    update.sql(' returning key')

    const updateRes = await pgExec(tx, update)
    if (updateRes.length === 1) {
      await hooks.applyHooks('after update'
                            , resourceMapping.afterupdate
                            , f => f(tx, sriRequest, [{permalink: permalink, incoming: obj, stored: prevObj}]))
      return { status: 200 }
    } else {
      debug('No row affected - resource is gone');
      throw new SriError({status: 410, errors: [{code: 'resource.gone', msg: 'Resource is gone'}]})
    }
  }

}
/* eslint-enable */



async function validate(db, sriRequest) {
  'use strict';
  debug('* sri4node VALIDATE processing invoked.');

  // adapt sriRequest as how it should be in case of a regular update/create request
  sriRequest.path = sriRequest.path.replace('validate', sriRequest.body.key)
  sriRequest.originalUrl = sriRequest.originalUrl.replace('validate', sriRequest.body.key)
  sriRequest.params['uuid'] = sriRequest.body.key

  const {tx, resolveTx, rejectTx} = await startTransaction(db)
  try {
    const result = await executePutInsideTransaction(tx, sriRequest);
    debug('VALIDATE processing went OK. Rolling back database transaction.');
    rejectTx()
    return result    
  } catch (err) {
    rejectTx()
    throw err
  }
}

async function createOrUpdate(db, sriRequest) {
  'use strict';
  debug('* sri4node PUT processing invoked.');
  const {tx, resolveTx, rejectTx} = await startTransaction(db)
  try {
    const result = await executePutInsideTransaction(tx, sriRequest)
    debug('PUT processing went OK. Committing database transaction.');
    resolveTx()
    return result
  } catch (err) {
    rejectTx()
    throw err
  }
}




async function deleteResource(db, sriRequest) {
  'use strict';
  debug('sri4node DELETE invoked');
  const { type, key } = urlToTypeAndKey(sriRequest.path)
  const resourceMapping = typeToConfig(global.configuration.resources)[type];
  const table = tableFromMapping(resourceMapping);

  const {tx, resolveTx, rejectTx} = await startTransaction(db)
  try {
    const result = await queryByKey(tx, resourceMapping, key, false)
    if (result.code != 'found') {
      debug('No row affected - the resource is already gone');
    } else {
      const prevObj = result.object
      await hooks.applyHooks('before delete'
                            , resourceMapping.beforedelete
                            , f => f(tx, sriRequest, [{ permalink: sriRequest.path, incoming: null, stored: prevObj}]))

      const deletequery = prepare('delete-by-key-' + table);
      const sql = `update ${table} set "$$meta.deleted" = true, "$$meta.modified" = current_timestamp `
                   + `where "$$meta.deleted" = false and "key" = `
      deletequery.sql(sql).param(key);
      deletequery.sql(' returning key') // to be able to check rows.length
      const rows = await pgExec(tx, deletequery);
      if (rows.length === 0) {
        debug('No row affected - the resource is already gone');
      } else { // eslint-disable-line
        debug('Processing afterdelete');
        await hooks.applyHooks('after delete'
                              , resourceMapping.afterdelete
                              , f => f(tx, sriRequest, [{ permalink: permalink, incoming: null, stored: prevObj}]))
      }
    }
    debug('DELETE processing went OK. Committing database transaction.');
    resolveTx()
    return { status: 200 }
  } catch (err) {
    rejectTx()
    throw err
  }    
}


exports = module.exports = {
  getRegularResource: getRegularResource,
  createOrUpdate: createOrUpdate,
  deleteResource: deleteResource,
  validate: validate
}