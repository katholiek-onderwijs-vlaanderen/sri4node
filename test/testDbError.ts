import { assert, config } from "chai";
import exec from "await-exec";
import { Server } from "http";
import { TSriServerInstance } from "../sri4node";
import { getConfiguration } from "./context";

/**
 * Connect to the database in order to have a separate connection to the database that can be used
 * to break the other connections and test the error handling of the server.
 */
async function breakDbConnections(sriServerInstance: TSriServerInstance | null) {
  // TODO: This assumes docker compose is used which makes it a lot harder to run the tests inside a docker container
  // So if we run tests inside a docker container, it would be better to close the connections
  // await exec(
  //   `cd ./docker && docker compose stop sri4nodepostgresdbfortests && docker compose up --wait sri4nodepostgresdbfortests`,
  // );

  const sri4nodeConfig = getConfiguration();
  const dbConnection = sriServerInstance?.pgp(sri4nodeConfig.databaseConnectionParameters);
  if (!dbConnection) {
    throw new Error("[breakDbconnections] Database connection is not available");
  }

  // const result = await dbConnection?.query("SELECT * FROM pg_stat_activity WHERE /* pg_stat_activity.datname = 'postgres' AND */ pid <> pg_backend_pid();");

  // close all connections to the database, except for the current one
  await dbConnection?.query(
    `SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = 'postgres' AND
      pid <> pg_backend_pid();`,
  );
}

module.exports = function (
  httpClient,
  testContext: { server: null | Server; sriServerInstance: null | TSriServerInstance },
) {
  describe("Database connection errors", () => {
    it("db connection reset during task", async () => {
      const responsePromise = httpClient.get({
        path: "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple_slow",
        auth: "kevin",
      });

      let responsePromiseResolved = false;
      responsePromise.then(function () {
        responsePromiseResolved = true;
      });

      await breakDbConnections(testContext.sriServerInstance);

      assert.equal(
        responsePromiseResolved,
        false,
        "The slow request is supposed to be still pending. Maybe the docker restart took too long?",
      );

      const response = await responsePromise;
      assert.equal(response.status, 500);
      assert(
        response.body.errors[0].msg.includes(
          "Client has encountered a connection error and is not queryable",
        ),
        "Expected error message is missing",
      );

      // after the failed request due to database restart, a new request should succeed
      const response2 = await httpClient.get({
        path: "/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849",
      });
      assert.equal(response2.status, 200);
      assert.equal(response2.body.name, "LETS, Regio Dendermonde");
    });
    it("db connection reset during transaction", async () => {
      const responsePromise = httpClient.post({
        path: "/persons/de32ce31-af0c-4620-988e-1d0de282ee9d/simple_slow",
        auth: "kevin",
      });

      let responsePromiseResolved = false;
      responsePromise.then(function () {
        responsePromiseResolved = true;
      });

      await breakDbConnections(testContext.sriServerInstance);

      assert.equal(
        responsePromiseResolved,
        false,
        "The slow request is supposed to be still pending. Maybe the docker restart took too long?",
      );

      const response = await responsePromise;
      assert.equal(response.status, 500);
      assert(
        response.body.errors[0].msg.includes(
          "Client has encountered a connection error and is not queryable",
        ),
        "Expected error message is missing",
      );

      // after the failed request due to database restart, a new request should succeed
      const response2 = await httpClient.get({
        path: "/communities/8bf649b4-c50a-4ee9-9b02-877aa0a71849",
      });
      assert.equal(response2.status, 200);
      assert.equal(response2.body.name, "LETS, Regio Dendermonde");
    });
  });
};
