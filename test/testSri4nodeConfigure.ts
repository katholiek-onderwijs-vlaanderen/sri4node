// Utility methods for calling the SRI interface
import { assert } from 'chai';
import { TSriServerInstance } from '../js/typeDefinitions';

/**
 * These tests depend on the fact that sriConfig.databaseConnectionParameters.connectionInitSql
 * will insert a new record in the db_connections table.
 *
 * This way we can check if that table contains the expected records.
 */
module.exports = function (testContext: { sriServerInstance: null | TSriServerInstance }, httpClient) {
  describe('sriConfig.databaseConnectionParameters.connectionInitSql', function () {
    it('connectionInitSql should be executed', async function () {
      // make sure at least one conncetion is made by doing an api call
      const response = await httpClient.get({path: '/communities?orderBy=name'});

      assert.equal(response.status, 200, 'response.status is not as expected');

      const db = (testContext.sriServerInstance as TSriServerInstance).db;

      // check if the table is not empty, indicating that the connectionInitSql was executed
      const rows = await db.any('select * from db_connections');
      console.log("rows", JSON.stringify(rows, null, 2));
      assert.isAbove(rows.length, 0, 'db_connections table is empty');
    });

  });

  describe('sriConfig.startUp hook', function () {
    it.skip('startup hook should be executed', async () => {
      // TODO
    });
  });

  describe('sri4node should do some DB changes if needed', function () {
    it.skip('add $$meta.version fields if missing', async () => {
      // TODO
    });
    it.skip('add version update trigger if missing', async () => {
      // TODO
    });
    it.skip('remove OLD version update trigger (the one with schema in the name) if missing', async () => {
      // TODO
    });
  });
};
