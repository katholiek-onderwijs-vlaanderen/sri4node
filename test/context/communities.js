const pMap = require('p-map');
const { debug, SriError, mergeObject, pgExec } = require('../../js/common.js');
const queryobject = require('../../js/queryObject.js');
const prepare = queryobject.prepareSQL; 


exports = module.exports = function (roa, extra) {
  'use strict';

  var $m = roa.mapUtils;
  var $s = roa.schemaUtils;
  var $q = roa.queryUtils;
  var $u = roa.utils;

  async function invalidQueryParameter() {
    throw new SriError({status: 404, errors: [{code: 'invalid.query.parameter'}]})
  }

  function disallowOneCommunity(forbiddenKey) {
    return async function ( tx, sriRequest, elements ) {
      if (sriRequest.httpMethod === 'GET') {
        await pMap( elements, async (e) => {
          if ( sriRequest.path === '/communities/' + forbiddenKey ||
                (sriRequest.query.expand !== undefined && e.permalink === '/communities/' + forbiddenKey) ) {

            debug('mocha', 'security method disallowedOneCommunity for ' + forbiddenKey + ' denies access');
            throw new sriRequest.SriError({status: 403, errors: [{code: 'forbidden'}]})
          }
        }, {concurrency: 1})
      } 
    } 
  }


  // Don't really need the extra parameters when using CTE.
  async function parameterWithExtraQuery(value, select, param, tx, count) {
    if (count) {
      const query = prepare('create-allcommunitykeys');
      query.sql('CREATE TEMPORARY TABLE allcommunitykeys ON COMMIT DROP AS SELECT key FROM communities');
      await pgExec(tx, query)
      
      select.sql(' AND "key" NOT IN (SELECT "key" FROM "allcommunitykeys") ');
    } else {
      select.sql(' AND "key" NOT IN (SELECT "key" FROM "allcommunitykeys") ');
    }
  }

  async function parameterWithExtraQuery2(value, select, param, tx, count) {
    if (count) {
      const query = prepare('create-allcommunitykeys2');
      query.sql('CREATE TEMPORARY TABLE allcommunitykeys2 ON COMMIT DROP AS SELECT key FROM communities');
      await pgExec(tx, query)

      select.sql(' AND "key" NOT IN (SELECT "key" FROM "allcommunitykeys2") ');
    } else {
      select.sql(' AND "key" NOT IN (SELECT "key" FROM "allcommunitykeys2") ');
    }
  }


  async function addMessageCountToCommunities( tx, sriRequest, elements ) {
    debug('mocha', 'addMessageCountToCommunities');
    debug('mocha', elements);

    if (elements.length > 0) {
      // Lets do this efficiently. Remember that we receive an array of elements.
      // We query the message counts in a single select.
      // e.g. select community,count(*) from messages group by community having
      // community in ('8bf649b4-c50a-4ee9-9b02-877aa0a71849','57561082-1506-41e8-a57e-98fee9289e0c');
      const keyToElement = {};
      const keys = elements.map( ({ permalink, stored }) => {
        const key = permalink.split('/')[2]
        keyToElement[key] = stored;
        return key;
      })

      const query = prepare();
      query.sql('SELECT community, count(*) as messagecount FROM messages GROUP BY community HAVING community in (');
      query.array(keys);
      query.sql(')');
      const rows = await pgExec(tx, query)
      rows.forEach( row => keyToElement[row.community].$$messagecount = parseInt(row.messagecount, 10) )
    }
  }

  var ret = {
    type: '/communities',
    metaType: 'SRI4NODE_COMMUNITY',
    'public': false, // eslint-disable-line
    cache: {
      ttl: 0,
      type: 'local'
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A local group in the LETS system.',
      type: 'object',
      properties: {
        key: $s.guid('Key of this group.'),
        name: $s.string('Name of this group. Normally named \'LETS [locale]\'.'),
        street: $s.string('Street of the organisational seat address.'),
        streetnumber: $s.string('Street number of the organisational seat address.'),
        streetbus: $s.string('Postal box of the organisational seat address.'),
        zipcode: $s.belgianzipcode('4 digit postal code of the city for the organisational seat address.'),
        city: $s.string('City for the organisational seat address.'),
        phone: $s.phone('Contact phone number for the group.'),
        email: $s.email('Contact email for the group.'),
        adminpassword: $s.string('Administrative password for the group.'),
        website: $s.url('Website URL for the group.'),
        facebook: $s.url('URL to the facebook page of the group.'),
        currencyname: $s.string('Name of the local currency for the group.')
      },
      required: ['name', 'street', 'streetnumber', 'zipcode',
                 'city', 'phone', 'email', 'currencyname']
    },
    map: {
      name: {},
      street: {},
      streetnumber: {},
      streetbus: {
        columnToField: [ $m.removeifnull ]
      },
      zipcode: {},
      city: {},
      // Only allow create/update to set adminpassword, never show on output.
      // I made adminpassword NOT REQUIRED, but then with every PUT it would disappear if it weren't there
      // So with these kind of resources (where output differs from input) only PATCH really makes sense
      adminpassword: {
        columnToField: [ $m.remove ]
      },
      phone: {
        columnToField: [ $m.removeifnull ]
      },
      email: {},
      facebook: {
        columnToField: [ $m.removeifnull ]
      },
      website: {
        columnToField: [ $m.removeifnull ]
      },
      currencyname: {}
    },
    query: {
      invalidQueryParameter: invalidQueryParameter,
      parameterWithExtraQuery: parameterWithExtraQuery,
      parameterWithExtraQuery2: parameterWithExtraQuery2,
      hrefs: $q.filterHrefs,
      defaultFilter: $q.defaultFilter
    },
    afterRead: [
      // Add the result of a select query to the outgoing resource
      // SELECT count(*) FROM messages where community = [this community]
      // For example :
      // $$messagecount: 17
      addMessageCountToCommunities,
      disallowOneCommunity('6531e471-7514-43cc-9a19-a72cf6d27f4c')
    ]
  };

  mergeObject(extra, ret);
  return ret;
};
