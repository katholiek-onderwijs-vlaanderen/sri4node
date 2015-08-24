SET search_path TO sri4node;

DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "transactions" CASCADE;
DROP TABLE IF EXISTS "persons" CASCADE;
DROP TABLE IF EXISTS "communities" CASCADE;
DROP TABLE IF EXISTS "table" CASCADE;
DROP TABLE IF EXISTS "selfreferential" CASCADE;
DROP TABLE IF EXISTS "jsonb" CASCADE;
DROP TABLE IF EXISTS "alldatatypes" CASCADE;

CREATE TABLE "communities" (
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
  "currencyname" text not null
);

CREATE TABLE "persons" (
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
  "mail4elas" text default 'never' -- default : don't spam.
);

CREATE TABLE "transactions" (
  "key" uuid unique,
  "transactiontimestamp" timestamp with time zone not null default (now() at time zone 'utc'),
  "fromperson" uuid references "persons"(key),
  "toperson" uuid references "persons"(key),
  "description" text,
  "amount" integer not null
);

CREATE TABLE "messages" (
  "key" uuid unique,
  "person" uuid references "persons"(key),
  "posted" timestamp with time zone not null default (now() at time zone 'utc'),
  "type" text not null,
  "title" text not null,
  "description" text,
  "amount" integer,
  "unit" text,
  "community" uuid references "communities"(key)
);

CREATE TABLE "table" (
  "key" uuid unique,
  "select" text,
  "from" text
);

CREATE TABLE "selfreferential" (
    "key" uuid unique,
    "name" text not null,
    "parent" uuid references "selfreferential"(key)
);

CREATE TABLE "jsonb" (
    "key" uuid unique,
    "details" jsonb
);

CREATE TABLE "alldatatypes" (
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
    "textchar" char(64)
);
