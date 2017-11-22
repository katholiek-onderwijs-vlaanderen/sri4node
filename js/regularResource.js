const configuration = global.configuration

const _ = require('lodash')
const { Validator } = require('jsonschema')
const parse = require('url-parse')

const { debug, cl, typeToConfig, tableFromMapping, sqlColumnNames, pgExec, mapColumnsToObject, errorAsCode,
        executeOnFunctions, SriError, startTransaction, getCountResult } = require('./common.js');
const expand = require('./expand.js');
const hooks = require('./hooks.js')
var queryobject = require('./queryObject.js');
const prepare = queryobject.prepareSQL; 



async function queryByKey(config, db, mapping, key, wantsDeleted) {
  'use strict';
  debug(`** queryByKey(${key})`);
  const columns = sqlColumnNames(mapping);
  const table = tableFromMapping(mapping);

  if (mapping.schema && mapping.schema.properties.key) {
    const result = (new Validator()).validate(key, mapping.schema.properties.key);
    if (result.errors.length > 0) {
      throw new SriError(400, result.errors.map( e => ({code: 'key.invalid', msg: 'key ' + e.message}) ))
    }
  }

  const query = prepare('select-row-by-key-from-' + table);
  const sql = `select ${columns}, "$$meta.deleted", "$$meta.created", "$$meta.modified" from "${table}" where "key" = `
  query.sql(sql).param(key);
  const rows= await pgExec(db, query)
  if (rows.length === 1) {
    const row = rows[0];
    if (row['$$meta.deleted'] && !wantsDeleted) {
      throw new SriError(410, [{code: 'resource.gone', msg: 'Resource is gone'}])
    } else {
      const result = {};
      debug('** mapping columns to JSON object');
      mapColumnsToObject(config, mapping, row, result);
      debug('** executing onread functions');
      executeOnFunctions(config, mapping, 'onread', result);

      result.$$meta = _.pickBy({ // keep only properties with defined non-null value (requires lodash - behaves different as underscores _.pick())
          deleted: row['$$meta.deleted'],
          created: row['$$meta.created'],
          modified: row['$$meta.modified']
        })
      result.$$meta.permalink = mapping.type + '/' + key;      
      debug('** queryResult of queryByKey() : ');
      debug(result);      
      return result
    }
  } else if (rows.length === 0) {
    throw new SriError(404, [{code: 'not.found', msg: 'Not Found'}])
  } else {
    msg = 'More than one entry with key ' + key + ' found for ' + mapping.type;
    debug(msg);
    throw SriError(500, [{code: 'duplicate.key', msg: msg}])
  }
}




async function getRegularResource(db, me, reqUrl, reqParams, reqBody) {
  'use strict';
  const resources = global.configuration.resources
  const { type, key } = urlToTypeAndKey(reqUrl)
  const typeToMapping = typeToConfig(resources);
  const mapping = typeToMapping[type];

  debug('* query by key');
  const element = await queryByKey(resources, db, mapping, key,
                                   reqParams['$$meta.deleted'] === 'true' || reqParams['$$meta.deleted'] === 'any');

  debug('* executing expansion');
  await expand.executeExpansion(db, [element], mapping, resources, reqParams.expand, me, reqUrl);

  debug('* executing afterread functions on results');
  await hooks.applyHooks('after read', mapping.afterread, f => f(db, me, reqUrl, 'read', element))

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

const urlToTypeAndKey = (url) => {
  // const type = url.split('/').slice(0, url.split('/').length - 1).join('/');
  // const key = url.replace(type, '').substr(1);

  const parsedUrl = parse(url);
  const pathName = parsedUrl.pathname.replace(/\/$/, '') 
  const parts = pathName.split('/')
  const type = _.initial(parts).join('/')
  const key = _.last(parts)

  return { type, key }
}




/* eslint-disable */
async function executePutInsideTransaction(tx, me, reqUrl, reqBody) {
  'use strict';
  var { type, key } = urlToTypeAndKey(reqUrl)

//TODO: strip '/validation' earlier and use boolean where nescessary
  // special case - validation
  if (key == 'validate') {
    key = reqBody.key;
  }

  debug('PUT processing starting. Request body :');
  debug(reqBody);
  debug('Key received on URL : ' + key);

  const resources = global.configuration.resources
  const typeToMapping = typeToConfig(resources);
  const mapping = typeToMapping[type];
  const table = tableFromMapping(mapping);

  debug('Validating schema.');
  if (mapping.schema) {
    const validationErrors  = getSchemaValidationErrors(reqBody, mapping.schema);
    if (validationErrors) {
      errors = { validationErrors }
      throw new SriError(409, [{code: 'validation.errors', msg: 'Validation error(s)', errors }])
    } else {
      debug('Schema validation passed.');
    }
  }

  await hooks.applyHooks('validation', mapping.validate, f => f(body, tx))

  // create an object that only has mapped properties
  var k, value, referencedType, referencedMapping, parts, refkey;
  const element = {};
  for (k in mapping.map) {
    if (mapping.map.hasOwnProperty(k)) {
      if (reqBody.hasOwnProperty(k)) {
        element[k] = reqBody[k];
      }
    }
  }
  debug('Mapped incomming object according to configuration');

  // check and remove types from references.
  for (k in mapping.map) {
    if (mapping.map.hasOwnProperty(k)) {
      if (mapping.map[k].references && typeof element[k] != 'undefined') {
        value = element[k].href;
        if (!value) {
          throw new SriError(409, [{code: 'no.href.inside.reference', msg: 'No href found inside reference ' + k}])
        }
        referencedType = mapping.map[k].references;
        referencedMapping = typeToMapping[referencedType];
        type = value.replace(value.split(referencedType)[1], '');
        refkey = value.replace(type, '').substr(1);
        if (type === referencedMapping.type) {
          element[k] = refkey;
        } else {
          const msg = 'Faulty reference detected [' + element[key].href + '], ' +
            'detected [' + type + '] expected [' + referencedMapping.type + ']'
          cl(msg);
          throw new SriError(409, [{code: 'faulty.reference', msg: msg}])
        }
      }
    }
  }
  debug('Converted references to values for update');

  const countquery = prepare('check-resource-exists-' + table);
  countquery.sql('select count(*) from ' + table + ' where "key" = ').param(key);
  const count = await getCountResult(tx, countquery) 
  if (count === 1) {
    executeOnFunctions(resources, mapping, 'onupdate', element);

    var update = prepare('update-' + table);
    update.sql('update "' + table + '" set "$$meta.modified" = current_timestamp ');
    for (var k in element) {
      if (k !== '$$meta.created' && k !== '$$meta.modified' && element.hasOwnProperty(k)) {
        update.sql(',\"' + k + '\"' + '=').param(element[k]);
      }
    }
    update.sql(' where "$$meta.deleted" = false and "key" = ').param(key);
    update.sql(' returning key')

    const rows = await pgExec(tx, update)
    if (rows.length !== 1) {
      debug('No row affected - resource is gone');
      throw new SriError(410, [{code: 'resource.gone', msg: 'Resource is gone'}])
    } else {
      await hooks.applyHooks('after update', mapping.afterupdate, f => f(tx, me, reqUrl, 'update', {body: reqBody}))
      return { status: 200 }
    }
  } else {
    element.key = key;
    executeOnFunctions(resources, mapping, 'oninsert', element);

    var insert = prepare('insert-' + table);
    insert.sql('insert into "' + table + '" (').keys(element).sql(') values (').values(element).sql(') ');
    insert.sql(' returning key') // to be able to check rows.length
    const rows = await pgExec(tx, insert) 
    if (rows.length != 1) {
      debug('No row affected ?!');
      throw new SriError(500, [{code: 'insert.failed', msg: 'No row affected.'}])
    } else {
      await hooks.applyHooks('after insert', mapping.afterinsert, f => f(tx, me, reqUrl, 'create', {body: reqBody}))
      return { status: 201 }
    }
  }

}
/* eslint-enable */


async function validate(db, me, reqUrl, reqParams, reqBody) {
  'use strict';
  debug('* sri4node VALIDATE processing invoked.');
  const strippedReqUrl = reqUrl.replace('validate', reqBody.key)
  const {tx, resolveTx, rejectTx} = await startTransaction(db)
  const result = await executePutInsideTransaction(tx, me, strippedReqUrl, reqBody);
  debug('VALIDATE processing went OK. Rolling back database transaction.');
  rejectTx()
  return result
}




async function createOrUpdate(db, me, reqUrl, reqParams, reqBody) {
  'use strict';
  debug('* sri4node PUT processing invoked.');
  const {tx, resolveTx, rejectTx} = await startTransaction(db)
  const result = await executePutInsideTransaction(tx, me, reqUrl, reqBody)
  debug('PUT processing went OK. Committing database transaction.');
  resolveTx()
  return result
}




async function deleteResource(db, me, reqUrl, reqParams, reqBody) {
  'use strict';
  debug('sri4node DELETE invoked');
  const { type, key } = urlToTypeAndKey(reqUrl)
  const mapping = typeToConfig(global.configuration.resources)[type];
  const table = tableFromMapping(mapping);

  const {tx, resolveTx, rejectTx} = await startTransaction(db)
  
  const deletequery = prepare('delete-by-key-' + table);
  const sql = 'update ' + table + ' set "$$meta.deleted" = true, "$$meta.modified" = current_timestamp '
               + 'where "$$meta.deleted" = false and "key" = ';
  deletequery.sql(sql).param(key);
  deletequery.sql(' returning key') // to be able to check rows.length
  const rows = await pgExec(tx, deletequery);
  if (rows.length === 0) {
    debug('No row affected - the resource is already gone');
    throw new SriError(410, [{code: 'resource.gone', msg: 'Resource is gone'}])
  } else { // eslint-disable-line
    debug('Processing afterdelete');
    await hooks.applyHooks('after delete', mapping.afterdelete, f => f(tx, me, reqUrl, 'delete', null))
  }
  debug('DELETE processing went OK. Committing database transaction.');
  resolveTx()
  return { status: 200 }
}

// await db.tx( tx => async () => {
//     const deletequery = prepare('delete-by-key-' + table);
//     const sql = 'update ' + table + ' set "$$meta.deleted" = true, "$$meta.modified" = current_timestamp ';
//                  + 'where "$$meta.deleted" = false and "key" = ';
//     deletequery.sql(sql).param(key);
//     results = await pgExec(tx, deletequery);
//     if (results.rowCount === 0) {
//       debug('No row affected - the resource is already gone');
//       return { status: 410 }
//     } else { // eslint-disable-line
//       debug('Processing afterdelete');
//       await hooks.applyHooks('after delete', mapping.afterdelete, f => f(tx, [{path: reqUrl, body: reqBody}], me))
//     }
//     debug('DELETE processing went OK. Committing database transaction.');
//     return
//   })
exports = module.exports = {
  getRegularResource: getRegularResource,
  createOrUpdate: createOrUpdate,
  deleteResource: deleteResource,
  validate: validate
}