SET search_path TO sri4node;

DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "transactions" CASCADE;
DROP TABLE IF EXISTS "persons" CASCADE;
DROP TABLE IF EXISTS "communities" CASCADE;
DROP TABLE IF EXISTS "table" CASCADE;

CREATE TABLE "communities" (
  "guid" text unique,
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
  "guid" text unique,
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
  "community" text references "communities"(guid),
  -- never, daily, weekly, instant
  "mail4elas" text default 'never' -- default : don't spam.
);

CREATE TABLE "transactions" (
  "guid" text unique,
  "transactiontimestamp" timestamp with time zone not null default (now() at time zone 'utc'),
  "fromperson" text references "persons"(guid),
  "toperson" text references "persons"(guid),
  "description" text,
  "amount" integer not null
);

CREATE TABLE "messages" (
  "guid" text unique,
  "person" text references "persons"(guid),
  "posted" timestamp with time zone not null default (now() at time zone 'utc'),
  "type" text not null,
  "title" text not null,
  "description" text,
  "amount" integer,
  "unit" text,
  "community" text references "communities"(guid)
);

CREATE TABLE "table" (
  "guid" text unique,
  "select" text,
  "from" text
);