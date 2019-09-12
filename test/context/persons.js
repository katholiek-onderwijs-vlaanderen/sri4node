const pMap = require('p-map'); 
const pEvent = require('p-event'); 
const sleep = require('await-sleep');
const fs = require('fs');
const streamEqual = require('stream-equal');
const util = require('util');

var common = require('../../js/common.js');
var cl = common.cl;
const queryobject = require('../../js/queryObject.js');
const prepare = queryobject.prepareSQL; 
const utils = require('../utils.js')(null);

exports = module.exports = function (roa, logverbose, extra) {
  'use strict';

  function debug(x) {
    if (logverbose) {
      cl(x);
    }
  }

  var isHrefAPermalink = function (href) {
    return href.match(/^\/[a-z\/]*\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/);
  };

  var $m = roa.mapUtils;
  var $s = roa.schemaUtils;
  var $q = roa.queryUtils;
  var $u = roa.utils;

  const checkMe = async function( tx, sriRequest, elements ) {
    if (sriRequest.userObject === undefined) {
      throw new sriRequest.SriError({status: 401, errors: [{code: 'unauthorized'}]})
    }
  }

  const failOnBadUser = async function( tx, sriRequest, elements ) {
    if (sriRequest.userObject.email === 'daniella@email.be') {
      throw new Error('BAD User')
    }
  };

  const forbidUser = async function( tx, sriRequest, elements ) {
    if (sriRequest.userObject.email === 'ingrid@email.be') {
      throw new sriRequest.SriError({status: 403, errors: [{code: 'forbidden'}]})
    }
  };

  const checkElements = async function( tx, sriRequest, elements ) {
    var element;
    if (!Array.isArray(elements)) {
      throw new Error('`elements` is not an array');
    }

    element = elements[0];
    if ( !element.hasOwnProperty('permalink') || !isHrefAPermalink(element.permalink)
          || !element.hasOwnProperty('incoming') || !element.hasOwnProperty('stored') ) {
      throw new Error('`elements` object in the array has wrong format');
    }
  };


  const restrictReadPersons = async function( tx, sriRequest, elements ) {
    // A secure function must take into account that a GET operation
    // can be either a GET for a regular resource, or a GET for a
    // list resource.
    await pMap( elements, async (e) => {
      const url = e.permalink;
      if (url === '/persons') {
        // Should allways restrict to /me community.
        if (sriRequest.query.communities) {
          if (sriRequest.query.communities === sriRequest.userObject.community.href) {
            debug('** restrictReadPersons resolves.');
          } else {
            cl('** restrictReadPersons rejecting - can only request persons from your own community.');
            throw new sriRequest.SriError({status: 403, errors: [{code: 'forbidden'}]})
          }
        } else {
          cl('** restrictReadPersons rejecting - must specify ?communities=... for GET on list resources');
          throw new sriRequest.SriError({status: 403, errors: [{code: 'forbidden'}]})
        }
      } else {
        const key = url.split('/')[2];     
        const myCommunityKey = sriRequest.userObject.community.href.split('/')[2];
        debug('community key = ' + myCommunityKey);

        const query = prepare('check-person-is-in-my-community');
        query.sql('select count(*) from persons where key = ')
          .param(key).sql(' and community = ').param(myCommunityKey);
        const [ row ] = await common.pgExec(tx, query)
        if (parseInt(row.count, 10) === 1) {
          debug('** restrictReadPersons resolves.');
        } else {
          debug('row.count = ' + row.count);
          debug('** security method restrictedReadPersons denies access.', key, myCommunityKey);
          throw new sriRequest.SriError({status: 403, errors: [{code: 'forbidden'}]})
        }
       
      } /* end handling regular resource request */

    }, { concurrency: 1})
  
  };

  function disallowOnePerson(forbiddenKey) {
    return async function (tx, sriRequest, elements) {
      const key = sriRequest.params.key;
      if (key === forbiddenKey) {
        cl('security method disallowedOnePerson for ' + forbiddenKey + ' denies access');
        throw new sriRequest.SriError({status: 403, errors: [{code: 'forbidden'}]})
      } 
    };
  }


  async function simpleOutput(tx, sriRequest, customMapping) {
    const query =prepare('get-simple-person');
    query.sql('select firstname, lastname from persons where key = ').param(sriRequest.params.key);
    const rows = await common.pgExec(tx, query)
    if (rows.length === 0) {
      throw 'NOT FOUND'  // not an SriError to test getting error 500 in such a case
    } else if (rows.length === 1) {
      return { status: 200, body: {firstname: rows[0].firstname, lastname: rows[0].lastname} };
    } else {
      throw new sriRequest.SriError({status: 409, errors: [{code: 'key.not.unique'}]})
    }
  }



  var ret = {
    type: '/persons',
    metaType: 'SRI4NODE_PERSON',
    'public': false, // eslint-disable-line
    map: {
      firstname: {},
      lastname: {},
      street: {},
      streetnumber: {},
      streetbus: {
        columnToField: [ $m.removeifnull ]
      },
      zipcode: {},
      city: {},
      phone: {
        columnToField: [ $m.removeifnull ]
      },
      email: {
        columnToField: [ $m.removeifnull ]
      },
      balance: {
        fieldToColumn: [(key, row, isNewResource) => {
          if (isNewResource) {
            $m.value(0)(key, row)
          } else {
            $m.remove(key, row)
          }
        }]
      },
      mail4elas: {},
      community: {
        references: '/communities'
      }
    },
    customRoutes: [
      { routePostfix: '/:key/simple'
      , httpMethods: ['GET']
      , handler:  simpleOutput
      , beforeHandler: disallowOnePerson('da6dcc12-c46f-4626-a965-1a00536131b2')  // Ingrid Ohno
      },
      { like: "/:key"
      , routePostfix: "/simpleLike"
      , httpMethods: ['GET']
      , alterMapping: (mapping) => {
                              mapping.transformResponse = [  
                                  function (tx, sriRequest, result) {
                                    const simple = { firstname: result.body.firstname
                                                   , lastname: result.body.lastname }
                                    result.body = simple                                    
                                  }
                              ],
                              mapping.afterRead = [ checkMe ]
                            }
      },
      { routePostfix: "/downStreamJSON"
      , httpMethods: ['GET']
      , streamingHandler: async (tx, sriRequest, stream) => {
          stream.push({firstname: 'Rita', lastname: 'James'})
          await sleep(2000);
          stream.push({firstname: 'Regina', lastname: 'Sullivan'})
        }
      },
      { routePostfix: "/downStreamBinary"
      , httpMethods: ['GET']
      , binaryStream: true
      , beforeStreamingHandler: async (tx, sriRequest, customMapping) => {
          return  { status: 200
                  , headers: [
                      [ 'Content-Disposition', 'inline; filename=test.jpg' ],
                      [ 'Content-Type', 'image/jpeg' ]
                    ]
                  }
        }      
      , streamingHandler: async (tx, sriRequest, stream) => {
          var fstream = fs.createReadStream('test/files/test.jpg');
          fstream.pipe(stream);

          // wait until fstream is done
          await pEvent(fstream, 'end')
        }
      },
      { routePostfix: "/upStream"
      , httpMethods: ['POST']
      , busBoy: true
      , beforeStreamingHandler: async (tx, sriRequest, customMapping) => {
        // set header + http return code
        }
      , streamingHandler: async (tx, sriRequest, stream) => {
          sriRequest.attachmentsRcvd = []
          sriRequest.busBoy.on('file', async function(fieldname, file, filename, encoding, mimetype) {
            console.log('File [' + fieldname + ']: filename: ' + filename + ', encoding: ' + encoding + ', mimetype: ' + mimetype);
            if (filename === 'test.jpg') {
              if (mimetype !== 'image/jpeg') {
                throw 'Unexpected mimetype! got ' + mimetype
              }
              const fileRead = fs.createReadStream('test/files/test.jpg');
              const equalPromise = util.promisify(streamEqual)(file, fileRead);
              sriRequest.attachmentsRcvd.push({filename, equalPromise})
            } else if (filename === 'test.pdf') {
              if (mimetype !== 'application/pdf') {
                throw 'Unexpected mimetype! got ' + mimetype
              }
              const fileRead = fs.createReadStream('test/files/test.pdf');
              const equalPromise = util.promisify(streamEqual)(file, fileRead);
              sriRequest.attachmentsRcvd.push({filename, equalPromise})
            } else {
              throw 'Unexpected file received: ' + filename
            }
          });
          // wait until busboy is done
          await pEvent(sriRequest.busBoy, 'finish')
          console.log('busBoy is done')

          if (sriRequest.attachmentsRcvd.length !== 2) {
            throw 'Unexpected number attachments posted ' + sriRequest.attachmentsRcvd.length
          }
          if (sriRequest.attachmentsRcvd[0].filename !== 'test.jpg' || sriRequest.attachmentsRcvd[1].filename !== 'test.pdf') {
            throw 'Attachment test.jpg or test.pdf is missing'
          }
          await pMap(sriRequest.attachmentsRcvd, async ({filename, equalPromise}) => {
            const equal = await equalPromise
            if (equal !== true) {
              throw `Posted ${filename} does not match file on disk!`
            }            
          }, {concurrency: 1})

          stream.push('OK')
        }        
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
        email: $s.email('The email address the person can be reached on. ' +
          'It should be unique to this person. ' +
          'The email should not be shared with others.'),
        mail4elas: {
          type: 'string',
          description: 'Describes if, and how often this person wants messages to be emailed.',
          enum: ['never', 'daily', 'weekly', 'instant']
        },
        balance: $s.numeric('Balance of the person.'),
        community: $s.permalink('/communities', 'Permalink to community.'),
      },
      required: ['firstname', 'lastname', 'street', 'streetnumber', 'zipcode', 'city', 'mail4elas']
    },
    query: {
      communities: $q.filterReferencedType('/communities', 'community'),
      defaultFilter: $q.defaultFilter
    },
    afterRead: [
      $u.addReferencingResources('/transactions', 'fromperson', '$$transactions'),
      $u.addReferencingResources('/transactions', 'fromperson', '$$transactionsExpanded', true),
      checkMe,
      failOnBadUser,
      forbidUser,

      restrictReadPersons,
      disallowOnePerson('da6dcc12-c46f-4626-a965-1a00536131b2')  // Ingrid Ohno
    ],
    afterUpdate: [
      checkMe, checkElements, failOnBadUser, forbidUser
    ],
    afterInsert: [checkMe, checkElements, failOnBadUser, forbidUser],
    afterDelete: [
      checkMe, checkElements, failOnBadUser, forbidUser
    ],

    transformRequest: utils.lookForBasicAuthUser
  };

  common.mergeObject(extra, ret);
  return ret;
};

