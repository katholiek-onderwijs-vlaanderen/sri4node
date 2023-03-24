import * as uuid from 'uuid';
import { THttpMethod, TResourceDefinition } from '../../sri4node';

module.exports = function (sri4node) : TResourceDefinition {

  const doBeforeHook = async (tx, sriRequest, operation) => {
    await tx.none(`INSERT INTO hooktests VALUES ('${uuid.v4()}', '${sriRequest.id}', '${operation}');`);
  };

  const doAfterHook = async (tx, sriRequest, operation) => {
    const result = await tx.query(`SELECT * FROM hooktests WHERE ref='${sriRequest.id}';`);
    if (result.length !== 1) {
      throw new sriRequest.SriError({ status: 500, errors: [{ code: 'unexpected.nr.rows.in.hookstests' }] });
    }
    if (result[0].msg !== operation) {
      throw new sriRequest.SriError({ status: 500, errors: [{ code: 'unexpected.content.in.hookstests' }] });
    }
  };

  const $s = sri4node.schemaUtils;

  const r : TResourceDefinition = {
    type: '/bars',
    metaType: 'SRI4NODE_BAR',
    map: {
      key: {},
      foo: {},
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'Bar',
      type: 'object',
      properties: {
        key: $s.guid('Identifier.'),
        foo: $s.string('Just a string.'),
      },
      required: ['key', 'foo']
    },

    beforeRead: [ async (tx, sriRequest) => {
      await doBeforeHook(tx, sriRequest, 'read');
    }],
    beforeInsert: [ async (tx, sriRequest) => {
      await doBeforeHook(tx, sriRequest, 'insert');
    }],
    beforeUpdate: [ async (tx, sriRequest) => {
      await doBeforeHook(tx, sriRequest, 'update');
    }],
    beforeDelete: [ async (tx, sriRequest) => {
      await doBeforeHook(tx, sriRequest, 'delete');
    }],

    afterRead: [ async (tx, sriRequest) => {
      await doAfterHook(tx, sriRequest, 'read');
    }],
    afterInsert: [ async (tx, sriRequest) => { 
      await doAfterHook(tx, sriRequest, 'insert');
    }],
    afterUpdate: [ async (tx, sriRequest) => {
      await doAfterHook(tx, sriRequest, 'update');
    }],
    afterDelete: [ async (tx, sriRequest) => {
      await doAfterHook(tx, sriRequest, 'delete');
    }],

    customRoutes: [
      {
        routePostfix: '/only_custom_via_internal_interface',
        httpMethods: ['GET'],
        handler: async (tx, sriRequest, customMapping, internalUtils) => {
          const getRequest = {
            href: '/onlyCustom',
            verb: 'GET' as THttpMethod,
            dbT: tx,
            parentSriRequest: sriRequest,
          };

          return internalUtils.internalSriRequest(getRequest);
        },
      },
      {
        routePostfix: '/simple_like_via_internal_interface',
        httpMethods: ['GET'],
        handler: async (tx, sriRequest, _customMapping, internalUtils) => {
          const getRequest = {
            href: '/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simpleLike',
            verb: 'GET' as THttpMethod,
            dbT: tx,
            parentSriRequest: sriRequest,
          };

          return internalUtils.internalSriRequest(getRequest);
        },
      },
      {
        routePostfix: '/proxy_internal_interface',
        httpMethods: ['POST'],
        handler: async (tx, sriRequest, _customMapping, internalUtils) => {
          if (!sriRequest.query.href || Array.isArray(sriRequest.query.href)) {
            return {
              status: 500,
              body: 'One "href" query value is required.'
            }
          }
          if (!sriRequest.query.method || Array.isArray(sriRequest.query.method)) {
            return {
              status: 500,
              body: 'One "verb" query value is required.'
            }
          }
          const intRequest = {
            href: sriRequest.query.href,
            verb: sriRequest.query.method as THttpMethod,
            dbT: tx,
            parentSriRequest: sriRequest,
            body: sriRequest.body,
          };

          return internalUtils.internalSriRequest(intRequest);
        },
      },
    ],
  };
  return r;
};
