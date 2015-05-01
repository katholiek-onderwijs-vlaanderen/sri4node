-- Needed for uuid_generate_v4() function.
CREATE EXTENSION "uuid-ossp";

DROP TABLE IF EXISTS "interletssettings";
DROP TABLE IF EXISTS "interletsapprovals";

DROP TABLE IF EXISTS "messages";
DROP TABLE IF EXISTS "transactions";
DROP TABLE IF EXISTS "persons";
DROP TABLE IF EXISTS "communities";

CREATE TABLE "communities" (
  "guid" character varying(36) unique,
  "name" character varying(256) unique,
  "street" character varying(256) not null,
  "streetnumber" character varying(16) not null,
  "streetbus" character varying(16),
  "zipcode" character varying(4) not null,
  "city" character varying(64) not null,
  "phone" character varying(32),
  "email" character varying(64) not null,
  "adminpassword" character varying(64) not null,
  "website" character varying(256),
  "facebook" character varying(256) unique,
  "currencyname" character varying(32) not null
);

CREATE TABLE "persons" (
  "guid" character varying(36) unique,
  "firstname" character varying(128) not null,
  "lastname" character varying(128) not null,
  "street" character varying(256),
  "streetnumber" character varying(16),
  "streetbus" character varying(16),
  "zipcode" character varying(4),
  "city" character varying(64),
  "phone" character varying(32),
  "email" character varying(64) unique,
  "balance" integer not null,
  "password" character varying(64),
  "community" character varying(36) references "communities"(guid),
  -- never, daily, weekly, instant
  "mail4elas" character varying(6) default 'never' -- default : don't spam.
);

CREATE TABLE "transactions" (
  "guid" character varying(36) unique,
  "transactiontimestamp" timestamp with time zone not null default (now() at time zone 'utc'),
  "fromperson" character varying(36) references "persons"(guid),
  "toperson" character varying(36) references "persons"(guid),
  "description" character varying(256),
  "amount" integer not null
);

CREATE TABLE "messages" (
  "guid" character varying(36) unique,
  "person" character varying(36) references "persons"(guid),
  "posted" timestamp with time zone not null default (now() at time zone 'utc'),
  "type" character varying(10) not null,
  "title" character varying(256) not null,
  "description" character varying(1024),
  "amount" integer,
  "unit" character varying(32),
  "community" character varying(36) references "communities"(guid)
);
