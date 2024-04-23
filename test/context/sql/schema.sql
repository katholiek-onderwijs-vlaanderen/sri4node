
DO
$schema$
BEGIN

  SET search_path TO sri4node;
  -- CREATE SCHEMA IF NOT EXISTS sri4node;

  -- check if table communities exists
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'communities') THEN

    CREATE TABLE IF NOT EXISTS "communities" (
      "key" uuid unique,
      "name" text unique,
      "street" text not null,
      "streetnumber" text not null,
      "streetbus" text,
      "zipcode" text not null,
      "city" text not null,
      "phone" text,
      "email" text not null,
      "adminpassword" text not null,
      "website" text,
      "facebook" text unique,
      "currencyname" text not null,
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "persons" (
      "key" uuid unique,
      "firstname" text not null,
      "lastname" text not null,
      "street" text,
      "streetnumber" text,
      "streetbus" text,
      "zipcode" text,
      "city" text,
      "phone" text,
      "email" text unique,
      "balance" integer not null,
      "password" text,
      "community" uuid references "communities"(key),
      -- never, daily, weekly, instant
      "mail4elas" text default 'never', -- default : don't spam.
      "picture" bytea,
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "transactions" (
      "key" uuid unique,
      "transactiontimestamp" timestamp with time zone not null default (now() at time zone 'utc'),
      "fromperson" uuid references "persons"(key),
      "toperson" uuid references "persons"(key),
      "description" text,
      "amount" integer not null,
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "messages" (
      "key" uuid unique,
      "person" uuid references "persons"(key),
      "posted" timestamp with time zone not null default (now() at time zone 'utc'),
      "type" text not null,
      "title" text not null,
      "description" text,
      "amount" integer,
      "unit" text,
      "community" uuid references "communities"(key),
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "table" (
      "key" uuid unique,
      "select" text,
      "from" text,
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "selfreferential" (
        "key" uuid unique,
        "name" text not null,
        "parent" uuid references "selfreferential"(key),
        "$$meta.deleted" boolean default false,
        "$$meta.modified" timestamp with time zone not null default current_timestamp,
        "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "jsonb" (
        "key" uuid unique,
        "details" jsonb,
        "foo" jsonb,
        "$$meta.deleted" boolean default false,
        "$$meta.modified" timestamp with time zone not null default current_timestamp,
        "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "alldatatypes" (
        "key" uuid unique,
        "id" numeric,
        "text" text,
        "text2" text,
        "texts" text[],
        "publication" timestamp with time zone,
        "publications" timestamp with time zone[],
        "number" numeric,
        "numbers" numeric[],
        "numberint" integer,
        "numberbigint" bigint,
        "numbersmallint" smallint,
        "numberdecimal" decimal,
        "numberreal" real,
        "numberdoubleprecision" double precision,
        "numbersmallserial" smallserial,
        "numberserial" serial,
        "numberbigserial" bigserial,
        "textvarchar" varchar,
        "textchar" char(64),
        "$$meta.deleted" boolean default false,
        "$$meta.modified" timestamp with time zone not null default current_timestamp,
        "$$meta.created" timestamp with time zone not null default current_timestamp,
        -- added automatically if missing on startup, but this will check
        -- if it also works if it already exists
        "$$meta.version" integer DEFAULT 0
    );

    -- Between 2018 and 2023-10 the auto-created-at-startup triggers to increment the version
    -- contained the name of the schema
    -- This was problematic because it could lead to duplicated triggers when copying
    -- an api to another schema
    -- The fix from 2023-10 will try to remove the 'old' trigger first, and this is why we will add
    -- such an old trigger here, in order to make sure that it gets removed properly.
    -- The test in testModified that will check that version gets incremented by exactly 1 should
    -- fail if this does not work properly
    CREATE FUNCTION vsko_resource_version_inc_function() RETURNS TRIGGER AS '
      BEGIN
        NEW."$$meta.version" := OLD."$$meta.version" + 1;
        RETURN NEW;
      END' LANGUAGE 'plpgsql';

    CREATE TRIGGER vsko_resource_version_trigger_sri4node_alldatatypes BEFORE UPDATE ON "alldatatypes"
    FOR EACH ROW EXECUTE PROCEDURE vsko_resource_version_inc_function();


    -- In order to test whether the other triggers will not be touched, create another function
    -- that does nothing, and use it in a trigger with another name
    CREATE FUNCTION vsko_do_nothing_function() RETURNS TRIGGER AS '
      BEGIN
        RETURN NEW;
      END' LANGUAGE 'plpgsql';
    CREATE TRIGGER vsko_do_nothing_trigger_alldatatypes BEFORE UPDATE ON "alldatatypes"
    FOR EACH ROW EXECUTE PROCEDURE vsko_do_nothing_function();

    CREATE TABLE IF NOT EXISTS "packages" (
      "key" uuid unique,
      "name" text,
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "countries" (
      "key" text,
      "name" text,
      "position" jsonb,
      "cities" jsonb,
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "countries2" (
      "key" text,
      "name" text,
      "position" jsonb,
      "cities" jsonb,
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "products" (
      "key" uuid unique,
      "name" text,
      "category" text,
      "package" uuid REFERENCES "packages" (key),
      "package2" uuid REFERENCES "packages" (key),
      "package3" uuid REFERENCES "packages" (key),
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "relations" (
      key uuid primary key,
      "from" uuid REFERENCES messages (key),
      "to" uuid REFERENCES messages (key),
      type text,
      startdate timestamp with time zone,
      enddate timestamp with time zone,
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "personrelations" (
      key uuid primary key,
      "from" uuid REFERENCES persons (key),
      "to" uuid REFERENCES persons (key),
      type text,
      startdate timestamp with time zone,
      enddate timestamp with time zone,
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "foos" (
      "key" uuid primary key,
      "bar" int,
      "$$meta.deleted" boolean default false CHECK ("$$meta.deleted" != true),
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "invalidschema" (
      "key" uuid primary key,
      "bar" int,
      "$$meta.deleted" boolean default false CHECK ("$$meta.deleted" != true),
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "complexschema" (
      "key" uuid primary key,
      "foo" jsonb,
      "bar" text,
      "$$meta.deleted" boolean default false CHECK ("$$meta.deleted" != true),
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );


    CREATE TABLE IF NOT EXISTS "invalidconfig1" (
      "key" uuid primary key,
      "baR" int,
      "$$meta.deleted" boolean default false CHECK ("$$meta.deleted" != true),
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "invalidconfig2" (
      "key" uuid primary key,
      "bar" int,
      "$$meta.deleted" boolean default false CHECK ("$$meta.deleted" != true),
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "cities" (
      "key" int4 unique,
      "name" text,
      "nisCode" int,
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "bars" (
      "key" uuid primary key,
      "foo" text,
      "$$meta.deleted" boolean default false,
      "$$meta.modified" timestamp with time zone not null default current_timestamp,
      "$$meta.created" timestamp with time zone not null default current_timestamp
    );

    CREATE TABLE IF NOT EXISTS "hooktests" (
      "key" uuid primary key,
      "ref" uuid,
      "msg" text
    );

  END IF;

END
$schema$;
