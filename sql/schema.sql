CREATE SCHEMA sri4node;

SET search_path TO sri4node;

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
  "currencyname" text not null,
  "$$meta.deleted" boolean default false,
  "$$meta.modified" timestamp with time zone not null default current_timestamp,
  "$$meta.created" timestamp with time zone not null default current_timestamp
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
  "mail4elas" text default 'never', -- default : don't spam.
  "$$meta.deleted" boolean default false,
  "$$meta.modified" timestamp with time zone not null default current_timestamp,
  "$$meta.created" timestamp with time zone not null default current_timestamp
);

CREATE TABLE "transactions" (
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

CREATE TABLE "messages" (
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

CREATE TABLE "table" (
  "key" uuid unique,
  "select" text,
  "from" text,
  "$$meta.deleted" boolean default false,
  "$$meta.modified" timestamp with time zone not null default current_timestamp,
  "$$meta.created" timestamp with time zone not null default current_timestamp
);

CREATE TABLE "selfreferential" (
    "key" uuid unique,
    "name" text not null,
    "parent" uuid references "selfreferential"(key),
    "$$meta.deleted" boolean default false,
    "$$meta.modified" timestamp with time zone not null default current_timestamp,
    "$$meta.created" timestamp with time zone not null default current_timestamp
);

CREATE TABLE "jsonb" (
    "key" uuid unique,
    "details" jsonb,
    "$$meta.deleted" boolean default false,
    "$$meta.modified" timestamp with time zone not null default current_timestamp,
    "$$meta.created" timestamp with time zone not null default current_timestamp
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
    "textchar" char(64),
    "$$meta.deleted" boolean default false,
    "$$meta.modified" timestamp with time zone not null default current_timestamp,
    "$$meta.created" timestamp with time zone not null default current_timestamp
);

CREATE TABLE "packages" (
  "key" uuid unique,
  "name" text,
  "$$meta.deleted" boolean default false,
  "$$meta.modified" timestamp with time zone not null default current_timestamp,
  "$$meta.created" timestamp with time zone not null default current_timestamp
);

CREATE TABLE "products" (
  "key" uuid unique,
  "name" text,
  "category" text,
  "package" uuid REFERENCES "packages" (key),
  "$$meta.deleted" boolean default false,
  "$$meta.modified" timestamp with time zone not null default current_timestamp,
  "$$meta.created" timestamp with time zone not null default current_timestamp
);

CREATE TABLE "relations" (
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

CREATE TABLE "personrelations" (
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