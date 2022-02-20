import * as common from '../../src/common';
import utilsFactory from '../utils';
const utils = utilsFactory(null);

export = module.exports = function (sri4node, extra) {


  var $m = sri4node.mapUtils;
  var $s = sri4node.schemaUtils;
  var $q = sri4node.queryUtils;
  var $u = sri4node.utils;

  async function messagesPostedSince(value, select) {
    select.sql(' and posted > ').param(value);
  }

  function validateMoreThan(field, max) {
    return async function (tx, sriRequest, elements) {
      elements.forEach( ({ incoming }) => {
        if (incoming.amount <= max) {
          common.debug('mocha', 'Should be more, or equal to ' + max);
          throw new sriRequest.SriError({status: 409, errors: [{code: 'not.enough'}]})
        }        
      } )
    };
  }

  async function addExtraKeysAfterRead( tx, sriRequest, elements ) {
    elements.forEach( ({ stored }) => {
      if (stored!=null) {
        stored.$$afterread = 'added by afterread method';
      }      
    })
  }

  var cteOneGuid = async function (value, select) {
    var cte = $u.prepareSQL();
    cte.sql('SELECT "key" FROM messages where title = ').param('Rabarberchutney');
    select.with(cte, 'cte');
    select.sql(' AND "key" IN (SELECT key FROM cte)');
  };

  var cteOneGuid2 = async function (value, select) {
    var cte = $u.prepareSQL();
    cte.sql('SELECT "key" FROM messages where title = ').param('Rabarberchutney');
    select.with(cte, 'cte2');
    select.sql(' AND "key" IN (SELECT key FROM cte2)');
  };

  var ret = {
    type: '/messages',
    metaType: 'SRI4NODE_MESSAGE',
    'public': false, // eslint-disable-line
    listResultDefaultIncludeCount: false,
    
    map: {
      person: {
        references: '/persons'
      },
      posted: {
        fieldToColumn: [ $m.now ]
      },
      type: {},
      title: {},
      description: {
        columnToField: [ $m.removeifnull ]
      },
      amount: {
        columnToField: [ $m.removeifnull ]
      },
      unit: {
        columnToField: [ $m.removeifnull ]
      },
      community: {
        references: '/communities'
      }
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A messages posted to the LETS members.',
      type: 'object',
      properties: {
        key: $s.guid('GUID for this message.'),
        person: $s.permalink('/persons', 'A permalink to the person that placed the message.'),
        type: {
          type: 'string',
          description: 'Is this message offering something, or is it requesting something ?',
          enum: ['offer', 'request']
        },
        title: $s.string('A short summary of the message. A plain text string.'),
        description: $s.string('A more elaborate description. An HTML string.'),
        amount: $s.numeric('Amount suggested by the author.'),
        unit: $s.string('Unit in which amount was suggested by the author.'),
        community: $s.permalink('/communities', 'In what community was the message placed ? ' +
                                'The permalink to the community.')
      },
      required: ['person', 'type', 'title', 'community']
    },
    query: {
      communities: $q.filterReferencedType('/communities', 'community'),
      postedSince: messagesPostedSince, // For compatability, to be removed.
      modifiedsince: messagesPostedSince,
      cteOneGuid: cteOneGuid,
      cteOneGuid2: cteOneGuid2,
      defaultFilter: $q.defaultFilter
    },
    afterRead: [
      addExtraKeysAfterRead
    ],
    afterInsert: [
      validateMoreThan('amount', 10),
      validateMoreThan('amount', 20)
    ],
    afterUpdate: [
      validateMoreThan('amount', 10),
      validateMoreThan('amount', 20)
    ],

    transformRequest: utils.lookForBasicAuthUser
  };

  common.mergeObject(extra, ret);
  return ret;
};
