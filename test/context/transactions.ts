import * as pMap from 'p-map';
import * as common from '../../js/common';
import prepareSQL from '../../js/queryObject';

export = module.exports = function (sri4node, extra) {
  const $m = sri4node.mapUtils;
  const $s = sri4node.schemaUtils;
  const $u = sri4node.utils;

  const ret = {
    type: '/transactions',
    metaType: 'SRI4NODE_TRANSACTION',
    'public': false, // eslint-disable-line
    map: {
      key: {},
      transactiontimestamp: {
        fieldToColumn: [$m.now],
      },
      fromperson: {
        references: '/persons',
      },
      toperson: {
        references: '/persons',
      },
      description: {},
      amount: {},
    },
    schema: {
      $schema: 'http://json-schema.org/schema#',
      title: 'A single transaction between 2 people.',
      type: 'object',
      properties: {
        key: $s.guid('GUID for this transaction.'),
        transactiontimestamp: $s.timestamp('Date and time when the transaction was recorded.'),
        fromperson: $s.permalink('/persons', 'A permalink to the person that sent currency.'),
        toperson: $s.permalink('/persons', 'A permalink to the person that received currency.'),
        description: $s.string('A description, entered by the person sending, of the transaction.'),
        amount: $s.numeric('The amount of currency sent. '
                           + 'This unit is expressed as 20 units/hour, '
                           + 'irrelevant of the group\'s currency settings.'),
      },
      required: ['fromperson', 'toperson', 'description', 'amount'],
    },
    afterInsert: [
      async function (tx, sriRequest, elements) {
        await pMap(elements, async ({ incoming }) => {
          const { amount } = incoming;
          const tokey = incoming.toperson.href.split('/')[2];

          const query = prepareSQL();
          query.sql('update persons set balance = (balance + ')
            .param(amount).sql(') where key = ').param(tokey);

          await common.pgExec(tx, query);
        }, { concurrency: 1 });
      },
      async function (tx, sriRequest, elements) {
        await pMap(elements, async ({ incoming }) => {
          const { amount } = incoming;
          const fromkey = incoming.fromperson.href.split('/')[2];

          const query = prepareSQL();
          query.sql('update persons set balance = (balance - ')
            .param(amount).sql(') where key = ').param(fromkey);

          await common.pgExec(tx, query);
        }, { concurrency: 1 });
      },
    ],
    afterUpdate: [
      function (tx, sriRequest, elements) {
        throw new sriRequest.SriError({ status: 401, errors: [{ code: 'update.on.transactions.not.allowed' }] });
      },
    ],
  };

  common.mergeObject(extra, ret);
  return ret;
};
