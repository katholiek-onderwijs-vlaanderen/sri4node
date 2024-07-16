-- 24-04: rest of the schema will be done in startiup hook from now on

CREATE SCHEMA IF NOT EXISTS sri4node;

/*
This table is used to test the sriConfig.databaseConnectionParameters.connectionInitSql
feature, and we will configure the tests so that a new row is added on every connection.
*/
CREATE TABLE sri4node."db_connections" (
  "connect_time" timestamp with time zone not null default current_timestamp
);
