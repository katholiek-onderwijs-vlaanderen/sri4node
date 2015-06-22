SET search_path TO sri4node;

DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "transactions" CASCADE;
DROP TABLE IF EXISTS "persons" CASCADE;
DROP TABLE IF EXISTS "communities" CASCADE;
DROP TABLE IF EXISTS "table" CASCADE;

CREATE TABLE "communities" (
  "key" text unique,
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
  "key" text unique,
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
  "community" text references "communities"(key),
  -- never, daily, weekly, instant
  "mail4elas" text default 'never' -- default : don't spam.
);

CREATE TABLE "transactions" (
  "key" text unique,
  "transactiontimestamp" timestamp with time zone not null default (now() at time zone 'utc'),
  "fromperson" text references "persons"(key),
  "toperson" text references "persons"(key),
  "description" text,
  "amount" integer not null
);

CREATE TABLE "messages" (
  "key" text unique,
  "person" text references "persons"(key),
  "posted" timestamp with time zone not null default (now() at time zone 'utc'),
  "type" text not null,
  "title" text not null,
  "description" text,
  "amount" integer,
  "unit" text,
  "community" text references "communities"(key)
);

CREATE TABLE "table" (
  "key" text unique,
  "select" text,
  "from" text
);