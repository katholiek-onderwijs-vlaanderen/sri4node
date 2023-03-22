import * as pMap from 'p-map';
import * as pEvent from 'p-event';
import * as sleep from 'await-sleep';
import * as fs from 'fs';
import * as streamEqual from 'stream-equal';

import { TSriRequest } from '../../sri4node';

module.exports = function (sri4node) {
  const isHrefAPermalink = function (href) {
    return href.match(/^\/[a-z\/]*\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/);
  };

  const $m = sri4node.mapUtils;
  const $s = sri4node.schemaUtils;
  const $q = sri4node.queryUtils;
  const $u = sri4node.utils;

  const checkMe = async function (tx, sriRequest, elements) {
    if (sriRequest.userObject === undefined) {
      throw new sriRequest.SriError({ status: 401, errors: [{ code: 'unauthorized' }] });
    }
  };

  const failOnBadUser = async function (tx, sriRequest, elements) {
    if (sriRequest.userObject.email === 'daniella@email.be') {
      throw new Error('BAD User');
    }
  };

  const forbidUser = async function (tx, sriRequest, elements) {
    if (sriRequest.userObject.email === 'ingrid@email.be') {
      throw new sriRequest.SriError({ status: 403, errors: [{ code: 'forbidden' }] });
    }
  };

  const checkElements = async function (tx, sriRequest, elements) {
    let element;
    if (!Array.isArray(elements)) {
      throw new Error('`elements` is not an array');
    }

    element = elements[0];
    if (!element.hasOwnProperty('permalink') || !isHrefAPermalink(element.permalink)
          || !element.hasOwnProperty('incoming') || !element.hasOwnProperty('stored')) {
      throw new Error('`elements` object in the array has wrong format');
    }
  };

  const restrictReadPersons = async function (tx, sriRequest, elements) {
    // A secure function must take into account that a GET operation
    // can be either a GET for a regular resource, or a GET for a
    // list resource.
    await pMap(elements, async (e:any) => {
      const url = e.permalink;
      if (url === '/persons') {
        // Should allways restrict to /me community.
        if (sriRequest.query.communities) {
          if (sriRequest.query.communities === sriRequest.userObject.community.href) {
            sri4node.debug('mocha', '** restrictReadPersons resolves.');
          } else {
            sri4node.debug('mocha', '** restrictReadPersons rejecting - can only request persons from your own community.');
            throw new sriRequest.SriError({ status: 403, errors: [{ code: 'forbidden' }] });
          }
        } else {
          sri4node.debug('mocha', '** restrictReadPersons rejecting - must specify ?communities=... for GET on list resources');
          throw new sriRequest.SriError({ status: 403, errors: [{ code: 'forbidden' }] });
        }
      } else {
        const key = url.split('/')[2];
        const myCommunityKey = sriRequest.userObject.community.href.split('/')[2];
        sri4node.debug('mocha', `community key = ${myCommunityKey}`);

        const query = sri4node.utils.prepareSQL('check-person-is-in-my-community');
        query.sql('select count(*) from persons where key = ')
          .param(key).sql(' and community = ').param(myCommunityKey);
        const [row] = await sri4node.utils.executeSQL(tx, query);
        if (parseInt(row.count, 10) === 1) {
          sri4node.debug('mocha', '** restrictReadPersons resolves.');
        } else {
          sri4node.debug('mocha', `row.count = ${row.count}`);
          sri4node.debug('mocha', `** security method restrictedReadPersons denies access. ${key} ${myCommunityKey}`);
          throw new sriRequest.SriError({ status: 403, errors: [{ code: 'forbidden' }] });
        }
      } /* end handling regular resource request */
    }, { concurrency: 1 });
  };

  function disallowOnePerson(forbiddenKey) {
    return async function (tx, sriRequest, elements) {
      const { key } = sriRequest.params;
      if (key === forbiddenKey) {
        sri4node.debug('mocha', `security method disallowedOnePerson for ${forbiddenKey} denies access`);
        throw new sriRequest.SriError({ status: 403, errors: [{ code: 'forbidden' }] });
      }
    };
  }

  function returnSriTypeForOnePerson() {
    return async function (tx, sriRequest, elements) {
      const { key } = sriRequest.params;
      if (sriRequest.userObject.email === 'sam@email.be') {
        sri4node.debug('mocha', 'security method returnSriTypeForOnePerson returns sriType.');
        throw new sriRequest.SriError({ status: 200, errors: [{ foo: 'bar', sriType: sriRequest.sriType, type: 'TEST' }] });
      }
    };
  }

  async function simpleOutput(tx, sriRequest, customMapping) {
    const query = sri4node.utils.prepareSQL('get-simple-person');
    query.sql('select firstname, lastname from persons where key = ').param(sriRequest.params.key);
    const rows = await sri4node.utils.executeSQL(tx, query);
    if (rows.length === 0) {
      throw 'NOT FOUND'; // not an SriError to test getting error 500 in such a case
    } else if (rows.length === 1) {
      return { status: 200, body: { firstname: rows[0].firstname, lastname: rows[0].lastname } };
    } else {
      throw new sriRequest.SriError({ status: 409, errors: [{ code: 'key.not.unique' }] });
    }
  }

  return {
    type: '/persons',
    metaType: 'SRI4NODE_PERSON',
    'public': false, // eslint-disable-line
    map: {
      firstname: {},
      lastname: {},
      street: {},
      streetnumber: {},
      streetbus: {
        columnToField: [$m.removeifnull],
      },
      zipcode: {},
      city: {},
      phone: {
        columnToField: [$m.removeifnull],
      },
      email: {
        columnToField: [$m.removeifnull],
      },
      balance: {
        fieldToColumn: [(key, row, isNewResource) => {
          if (isNewResource) {
            $m.value(0)(key, row);
          } else {
            $m.remove(key, row);
          }
        }],
      },
      mail4elas: {},
      community: {
        references: '/communities',
      },
      picture: {
        columnToField: [$m.base64enc],
      },
    },
    customRoutes: [
      {
        routePostfix: '/:key/sritype',
        httpMethods: ['GET'],
        handler: simpleOutput,
        beforeHandler: returnSriTypeForOnePerson(),
      },
      {
        routePostfix: '/:key/simple',
        httpMethods: ['GET'],
        handler: simpleOutput,
        beforeHandler: disallowOnePerson('da6dcc12-c46f-4626-a965-1a00536131b2'), // Ingrid Ohno
      },
      {
        routePostfix: '/:key/simple_slow',
        httpMethods: ['GET'],
        handler: async (tx, sriRequest, customMapping) => {
          await sleep(2000);
          return simpleOutput(tx, sriRequest, customMapping);
        },
        beforeHandler: disallowOnePerson('da6dcc12-c46f-4626-a965-1a00536131b2'), // Ingrid Ohno
      },
      {
        like: '/:key',
        routePostfix: '/simpleLike',
        httpMethods: ['GET'],
        alterMapping: (mapping) => {
          mapping.transformResponse = [
            async function (tx, sriRequest, result) {
              // just a very basic query to test if we can speak with the database
              const qResult = await tx.query('SELECT 1 AS foo;');
              if (qResult[0].foo !== 1) {
                throw new sriRequest.SriError({ status: 500, errors: [{ code: 'unexpected.query.result.in.transform.response' }] });
              };

              const simple = {
                firstname: result.body.firstname,
                lastname: result.body.lastname,
              };
              result.body = simple;
            },
          ],
          mapping.afterRead = [checkMe];
        },
      },
      {
        like: '/:key',
        routePostfix: '/simpleLike2',
        httpMethods: ['GET'],
        transformResponse: async function (tx, sriRequest, result) {
          const simple = {
            firstname: result.body.firstname,
            lastname: result.body.lastname,
          };
          result.body = simple;
        },
      },
      // a custom 'like' route to check if 'query' overwrite is working
      {
        like: '',
        routePostfix: '/likeWithCommunitiesError',
        httpMethods: ['GET'],
        alterMapping: (mapping) => mapping,
        query: {
          communities: () => {
            throw new sri4node.SriError({ status: 404, errors: [{ code: 'invalid.query.parameter' }] });
          }
        }
      },
      {
        routePostfix: '/downStreamJSON',
        httpMethods: ['GET'],
        streamingHandler: async (tx, sriRequest, stream) => {
          stream.push({ firstname: 'Rita', lastname: 'James' });
          await sleep(2000);
          stream.push({ firstname: 'Regina', lastname: 'Sullivan' });
        },
      },
      {
        routePostfix: '/downStreamBinary',
        httpMethods: ['GET'],
        binaryStream: true,
        beforeStreamingHandler: async (tx, sriRequest, customMapping) => ({
          status: 200,
          headers: [
            ['Content-Disposition', 'inline; filename=test.jpg'],
            ['content-Type', 'image/jpeg'],
          ],
        }),
        streamingHandler: async (tx, sriRequest, stream) => {
          const fstream = fs.createReadStream('test/files/test.jpg');
          fstream.pipe(stream);

          // wait until fstream is done
          await pEvent(fstream, 'end');
        },
      },
      {
        routePostfix: '/:key/upStream',
        httpMethods: ['POST'],
        busBoy: true,
        readOnly: false,
        beforeStreamingHandler: async (tx, sriRequest, customMapping) => {
        // set header + http return code
        },
        streamingHandler: async (tx, sriRequest: TSriRequest, stream) => {
          if (sriRequest.userData) {
            sriRequest.userData.attachmentsRcvd = [];  // TODO: set attachmentsRcvd type as { string, Promise }[]
          } else {
            sriRequest.userData = { attachmentsRcvd: [] };  // TODO: set attachmentsRcvd type as { string, Promise }[]
          }
          if (sriRequest.busBoy !== undefined) {
            sriRequest.busBoy.on('file', async (fieldname, file, info) => {
              const { filename, encoding, mimeType } = info;
              console.log(`File [${fieldname}]: filename: ${filename}, encoding: ${encoding}, mimetype: ${mimeType}`);
              if (filename === 'test.jpg') {
                if (mimeType !== 'image/jpeg') {
                  throw `Unexpected mimetype! got ${mimeType}`;
                }
                const fileRead = fs.createReadStream('test/files/test.jpg');
                const equalPromise = streamEqual.default(file, fileRead);
                sriRequest.userData.attachmentsRcvd.push({ filename, equalPromise });
              } else if (filename === 'test.pdf') {
                if (mimeType !== 'application/pdf') {
                  throw `Unexpected mimetype! got ${mimeType}`;
                }
                const fileRead = fs.createReadStream('test/files/test.pdf');
                const equalPromise = streamEqual.default(file, fileRead);
                sriRequest.userData.attachmentsRcvd.push({ filename, equalPromise });
              } else {
                throw `Unexpected file received: ${filename}`;
              }
            });
            // wait until busboy is done
            await pEvent(sriRequest.busBoy, 'close');
            console.log('busBoy is done');
          }

          if (sriRequest.userData.attachmentsRcvd.length !== 2) {
            throw `Unexpected number attachments posted ${sriRequest.userData.attachmentsRcvd.length}`;
          }
          if (sriRequest.userData.attachmentsRcvd[0].filename !== 'test.jpg' || sriRequest.userData.attachmentsRcvd[1].filename !== 'test.pdf') {
            throw 'Attachment test.jpg or test.pdf is missing';
          }
          await pMap(sriRequest.userData.attachmentsRcvd, async ({ filename, equalPromise }) => {
            const equal = await equalPromise;
            if (equal !== true) {
              throw `Posted ${filename} does not match file on disk!`;
            }
          }, { concurrency: 1 });

          // store jpg attachment as person picture
          const data = fs.readFileSync('test/files/test.jpg');
          await tx.none('UPDATE persons SET picture=${data} WHERE key=${key}', {
            data,
            key: sriRequest.params.key,
          });

          stream.push('OK');
        },
      },

    ],
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'An object representing a person taking part in the LETS system.',
      type: 'object',
      properties: {
        key: $s.guid(''),
        firstname: $s.string('First name of the person.'),
        lastname: $s.string('Last name of the person.'),
        street: $s.string('Streetname of the address of residence.'),
        streetnumber: $s.string('Street number of the address of residence.'),
        streetbus: $s.string('Postal box of the address of residence.'),
        zipcode: $s.belgianzipcode('4 digit postal code of the city for the address of residence.'),
        city: $s.string('City for the address of residence.'),
        phone: $s.phone('The telephone number for this person. Can be a fixed or mobile phone number.'),
        email: $s.email('The email address the person can be reached on. '
          + 'It should be unique to this person. '
          + 'The email should not be shared with others.'),
        mail4elas: {
          type: 'string',
          description: 'Describes if, and how often this person wants messages to be emailed.',
          enum: ['never', 'daily', 'weekly', 'instant'],
        },
        balance: $s.numeric('Balance of the person.'),
        community: $s.permalink('/communities', 'Permalink to community.'),
        picture: $s.string('Picture (base64 encoded)'),
      },
      required: ['firstname', 'lastname', 'street', 'streetnumber', 'zipcode', 'city', 'mail4elas'],
    },
    query: {
      communities: $q.filterReferencedType('/communities', 'community'),
      defaultFilter: $q.defaultFilter,
    },
    afterRead: [
      $u.addReferencingResources('/transactions', 'fromperson', '$$transactions'),
      $u.addReferencingResources('/transactions', 'fromperson', '$$transactionsBackwardsCompatibleT', true),
      $u.addReferencingResources('/transactions', 'fromperson', '$$transactionsBackwardsCompatibleF', false),
      $u.addReferencingResources('/transactions', 'fromperson', '$$transactionsExcludeOnSummary', ['summary']),
      $u.addReferencingResources('/transactions', 'fromperson', '$$transactionsExcludeOnFull', ['full']),
      $u.addReferencingResources('/transactions', 'fromperson', '$$transactionsExcludeOnFullAndSummary', ['full', 'summary']),
      $u.addReferencingResources('/transactions', 'fromperson', '$$transactionsEmptyExclude', []),
      checkMe,
      failOnBadUser,
      forbidUser,

      restrictReadPersons,
      disallowOnePerson('da6dcc12-c46f-4626-a965-1a00536131b2'), // Ingrid Ohno
      returnSriTypeForOnePerson(),
    ],
    afterUpdate: [
      checkMe, checkElements, failOnBadUser, forbidUser,
    ],
    afterInsert: [checkMe, checkElements, failOnBadUser, forbidUser],
    afterDelete: [
      checkMe, checkElements, failOnBadUser, forbidUser,
    ],

  };
};
