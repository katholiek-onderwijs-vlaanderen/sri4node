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
    it('startup hook should be executed', async () => {
      // in context.ts, the startup hook will make a change to the database
      // so we can check here whether that change actually had any effect
      assert.equal(
        (
          await testContext.sriServerInstance?.db.one(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.triggers
              WHERE trigger_name = 'vsko_do_nothing_trigger_countries'
                AND trigger_schema = 'sri4node'
                AND event_object_table = 'countries'
            ) as trigger_exists
          `)
        )?.trigger_exists,
        true,
        "The trigger named vsko_do_nothing_trigger_countries should have been created at startup"
      );
    });
  });

  describe('sri4node should do some DB changes if needed', function () {
    it('add $$meta.version fields if missing', async () => {
      assert.equal(
        (
          await testContext.sriServerInstance?.db.one(`
          SELECT EXISTS (
            SELECT 1
            FROM   information_schema.columns
            WHERE  table_name   = 'messages'
            AND    column_name  = '$$meta.version'
          ) as column_exists;
        `)
        )?.column_exists,
        true,
        "Although schema.sql does not define a $$meta.version column, it should have been added by sri4node at startup"
      );
    });

    it('add version update trigger if missing', async () => {
      assert.equal(
        (
          await testContext.sriServerInstance?.db.one(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.triggers
              WHERE trigger_name = 'vsko_resource_version_trigger_alldatatypes'
                AND trigger_schema = 'sri4node'
                AND event_object_table = 'alldatatypes'
            ) as trigger_exists
          `)
        )?.trigger_exists,
        true,
        "The trigger named vsko_resource_version_trigger_alldatatypes should have been created at startup"
      );
    });

    it("remove OLD version update trigger (the one with schema in the name) if it exists (but no other triggers)", async () => {
      assert.equal(
        (
          await testContext.sriServerInstance?.db.one(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.triggers
              WHERE trigger_name = 'vsko_resource_version_trigger_sri4node_alldatatypes'
                AND trigger_schema = 'sri4node'
                AND event_object_table = 'alldatatypes'
            ) as trigger_exists
          `)
        )?.trigger_exists,
        false,
        "The 'old' trigger named vsko_resource_version_trigger_sri4node_alldatatypes (which contains the schema name sri4node) should have been dropped at startup"
      );

      // assert.equal(resultOldVersionTrigger, null, "The 'old' trigger named vsko_resource_version_trigger_sri4node_alldatatypes (which contains the schema name sri4node) should have been dropped at startup");

      assert.equal(
        (
          await testContext.sriServerInstance?.db.one(`
            SELECT EXISTS (
              SELECT 1 FROM information_schema.triggers
              WHERE trigger_name = 'vsko_do_nothing_trigger_alldatatypes'
                AND trigger_schema = 'sri4node'
                AND event_object_table = 'alldatatypes'
            ) as trigger_exists
          `)
        )?.trigger_exists,
        true,
        "The other trigger named vsko_do_nothing_trigger_alldatatypes should NOT have been dropped at startup"
      );
    });
  });
};
