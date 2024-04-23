-- MAKE SURE EACH STATEMENT IS ON A SINGLE LINE !!!
-- WE NEED TO EXECUTE THIS SCRIPT LINE BY LINE, OTHERWISE THE $$meta.created dates are all the same,
-- and unfortunately in our tests we use the insert order to determine the order of the results.


-- SET LOCAL statement_timeout = '1min';

-- DO
-- $testdata$
-- BEGIN

SET search_path TO sri4node;

-- -- only do this if the communities table is currently empty
-- IF NOT EXISTS (SELECT 1 FROM communities) THEN

-- groups
INSERT INTO "communities" VALUES ('8bf649b4-c50a-4ee9-9b02-877aa0a71849','LETS, Regio Dendermonde', 'Beekveldstraat', '1A', '2', '9280', 'Lebbeke', '0495940592', 'letsdendermonde@gmail.com','admin','http://www.letsdendermonde.be','https://www.facebook.com/pages/LETS-Regio-Dendermonde/113915938675095?ref=ts&fref=ts','duim');
INSERT INTO "communities" VALUES ('57561082-1506-41e8-a57e-98fee9289e0c','LETS, Aalst-Oudenaarde', 'Wellekensstraat', '45', null, '9300', 'Aalst', null, 'PeterD@steunpuntwelzijn.be', 'admin', 'http://www.welzijn.net/www_wp/sociaalweefsel/letsao/', null, 'iets');
INSERT INTO "communities" VALUES ('6531e471-7514-43cc-9a19-a72cf6d27f4c','LETS, Zele', 'Stationsstraat', '25', null, '9240', 'Zele', null, 'letszele@gmail.com', 'admin', 'http://www.letszele.be/', null, 'pluim');
INSERT INTO "communities" VALUES ('1edb2754-8481-4996-ae5b-ec33c903ee4d','LETS, Hamme', 'Neerstraat', '12', null, '9220', 'Hamme', null, 'letshamme@gmail.com', 'admin', 'http://www.letshamme.be/', null, 'zaadjes');

-- persons
-- Dendermonde
INSERT INTO "persons" VALUES ('9abe4102-6a29-4978-991e-2a30655030e6','Sabine','De Waele','Beekveldstraat','1A','2','9280','Lebbeke','0495541522','sabine@email.be', -10, 'pwd', '8bf649b4-c50a-4ee9-9b02-877aa0a71849');
INSERT INTO "persons" VALUES ('2f11714a-9c45-44d3-8cde-cd37eb0c048b','Nicole','De Gols','Kleinzand','25',NULL,'9200','Grembergen','052318252','nicole@email.be', 35, 'pwd', '8bf649b4-c50a-4ee9-9b02-877aa0a71849');
INSERT INTO "persons" VALUES ('da6dcc12-c46f-4626-a965-1a00536131b2','Ingrid','Ohno','Konkelgoedstraat','14',NULL,'9280','Lebbeke','052448322','ingrid@email.be', 0, 'pwd', '8bf649b4-c50a-4ee9-9b02-877aa0a71849');
INSERT INTO "persons" VALUES ('692fa054-33ec-4a28-87eb-53df64e3d09d','Daniella','Sloots','Donckstraat','6',NULL,'9200','Dendermonde','0492887722','daniella@email.be', 0, 'pwd', '8bf649b4-c50a-4ee9-9b02-877aa0a71849');
-- Aalst-Oudenaarde
INSERT INTO "persons" VALUES ('82565813-943e-4d1a-ac58-8b4cbc865bdb','Steven','Plas','Mierenstraat','1B',NULL,'9310','Meldert','052112233','steven@email.be', -25, 'pwd', '57561082-1506-41e8-a57e-98fee9289e0c');
-- Zele
INSERT INTO "persons" VALUES ('de32ce31-af0c-4620-988e-1d0de282ee9d','Kevin','Boon','Markt','32',NULL,'9240','Zele','052422336','kevin@email.be', 0, 'pwd', '6531e471-7514-43cc-9a19-a72cf6d27f4c');
-- Hamme
INSERT INTO "persons" VALUES ('ab0fb783-0d36-4511-8ca5-9e29390eea4a','Eddy','Declercq','Sleepstraat','2',NULL,'9220','Hamme','052228877','eddy@email.be', 0, 'pwd', '1edb2754-8481-4996-ae5b-ec33c903ee4d');
INSERT INTO "persons" VALUES ('838524ec-d267-11eb-bbb0-8f3f35e5f1f8','Sam','ter Braak','Neerstraat','140',NULL,'9220','Hamme','052228899','sam@email.be', 0, 'pwd', '1edb2754-8481-4996-ae5b-ec33c903ee4d');

-- transactions
INSERT INTO "transactions" VALUES ('147d360c-2bdf-4b6e-a210-3cb8ddf3ce9d', '2014-10-11 04:05:06', '9abe4102-6a29-4978-991e-2a30655030e6','2f11714a-9c45-44d3-8cde-cd37eb0c048b', 'Heerlijke aardperen', 10);
INSERT INTO "transactions" VALUES ('8371eda9-56bc-41d5-af26-bc81caf3166a', '2014-10-13 04:05:06', '82565813-943e-4d1a-ac58-8b4cbc865bdb','2f11714a-9c45-44d3-8cde-cd37eb0c048b', 'Weckpotten', 25);

-- messages
INSERT INTO "messages" VALUES ('ad9ff799-7727-4193-a34a-09f3819c3479', '9abe4102-6a29-4978-991e-2a30655030e6', '2014-10-12 04:05:06', 'request', 'Oppas bij mij thuis op dinsdag 14/10 van 19u tot 22u30.', 'Ik mag naar een vergadering gaan in Dendermonde. Mijn zoontjes (8 en 6) gaan rond 20u15 slapen, daarna kan je dus doen waar je zin in hebt. TV, internet, een boek lezen...', 15, 'uur', '8bf649b4-c50a-4ee9-9b02-877aa0a71849');
INSERT INTO "messages" VALUES ('cf328c0a-7793-4b01-8544-bea8854147ab', '9abe4102-6a29-4978-991e-2a30655030e6', '2014-10-13 06:01:06', 'request', 'Wie kent Windows (versie 7) goed ?', 'Soms weet ik dat iets bestaat in windows, maar weet ik niet zo goed hoe ik het zelf kan instellen. Is er iemand met goede kennis van Windows ?', 20, 'uur', '8bf649b4-c50a-4ee9-9b02-877aa0a71849');
INSERT INTO "messages" VALUES ('d70c98ca-9559-47db-ade6-e5da590b2435', '9abe4102-6a29-4978-991e-2a30655030e6', '2014-10-13 07:02:06', 'offer', 'Rabarberchutney', 'Zelfgemaakte chutney van rabarber met abrikoos, limoen, gember, pepertjes en nog andere kruiden.',   9, 'potje', '8bf649b4-c50a-4ee9-9b02-877aa0a71849');
INSERT INTO "messages" VALUES ('a391efaf-485e-45bb-8688-87d7bdfee9f6', '2f11714a-9c45-44d3-8cde-cd37eb0c048b', '2014-10-14 07:02:06', 'request', 'Beamer lenen.', 'Heeft er iemand een beamer te leen? We willen graag eens een filmavondje doen !',   null, null, '8bf649b4-c50a-4ee9-9b02-877aa0a71849');
INSERT INTO "messages" VALUES ('e1332ca8-a886-4581-8159-11f0568011b8', '2f11714a-9c45-44d3-8cde-cd37eb0c048b', '2014-10-15 09:01:06', 'request', 'Wie heeft een meter om leidingen in muur te traceren ?', 'Zou een rek willen ophangen en wil zeker zijn dat er niks loopt.',   null, null, '8bf649b4-c50a-4ee9-9b02-877aa0a71849');
INSERT INTO "messages" VALUES ('7f5f646c-8f0b-4ce6-97ce-8549b8b78234', '82565813-943e-4d1a-ac58-8b4cbc865bdb', '2014-10-11 01:02:06', 'offer', 'Lets Kerstmarkt - zat. 13 dec', 'WANNEER? zaterdag 13 december 2014 WAAR? HuisElf.',   null, null, '57561082-1506-41e8-a57e-98fee9289e0c');
INSERT INTO "messages" VALUES ('5a2747d4-ed99-4ceb-9058-8152e34f4cd5', 'de32ce31-af0c-4620-988e-1d0de282ee9d', '2014-10-13 14:02:22', 'offer', 'Vervoer van Sint-Niklaas naar Lebbeke en terug, voor een Letser die allerlei leuke zelfgemaakte dingen op onze Letsmarkt wil aanbieden maar zelf geen vervoer heeft. 13/12', '', null, null, '6531e471-7514-43cc-9a19-a72cf6d27f4c');

-- A table with protected keywords. To check if sri4node does proper escaping of table and column names.
INSERT INTO "table" VALUES ('fe12be5b-2334-4cb8-9b04-7f51e63553bd','select-value','from-value');

-- A table that refers to itsels, used to test recursive query support via recursive CTEs.
INSERT INTO "selfreferential" VALUES ('247caf52-9c58-44f1-97f8-de1a9766e990','level0',null);
INSERT INTO "selfreferential" VALUES ('b8c020bf-0505-407c-a8ad-88044d741712','level1','247caf52-9c58-44f1-97f8-de1a9766e990');
INSERT INTO "selfreferential" VALUES ('55ac49a0-34c8-4c33-9c8b-acfcb1578a91','level2','b8c020bf-0505-407c-a8ad-88044d741712');
INSERT INTO "selfreferential" VALUES ('ab142ea6-7e79-4f93-82d3-8866b0c8d46b','level3','55ac49a0-34c8-4c33-9c8b-acfcb1578a91');

-- A table that contains a JSONB column, for testing JSONB column support
INSERT INTO jsonb values ('10f00e9a-f953-488b-84fe-24b31ee9d504','{"productDeliveryOptions": [ {"product": "/store/products/f02a30b0-0bd9-49a3-9a14-3b71130b187c", "deliveryOption":"/store/deliveryoptions/362c4fd7-42e1-4668-8cfc-a479cc8e374a"}]}', '{"href": "/foo/362c4fd7-42e1-4668-8cfc-a479cc8e374a"}');
INSERT INTO jsonb values ('400882f3-38c7-4b4f-8f75-d76effeae59f','{"productDeliveryOptions": [ {"product": "/store/products/3c29f798-5cc3-461b-b43d-c1b8ba2fa67a", "deliveryOption":"/store/deliveryoptions/362c4fd7-42e1-4668-8cfc-a479cc8e374a"}]}', '{"href": "/foo/8bf649b4-c50a-4ee9-9b02-877aa0a71849"}');
INSERT INTO jsonb values ('70f06f9d-e376-4404-9e17-10f93a14fedb','{"productDeliveryOptions": [ {"product": "/store/products/3c29f798-5cc3-461b-b43d-c1b8ba2fa67a", "deliveryOption":"/store/deliveryoptions/b9fc5ae0-b245-4d57-a7da-42c5747c2043"}]}', '{"href": "/foo/b9fc5ae0-b245-4d57-a7da-42c5747c2043"}');

-- Data for the generic Filters
INSERT INTO alldatatypes (key, id, text) values ('fd7e38e1-26c3-425e-9443-8a80722dfb16', 1, 'Value');
INSERT INTO alldatatypes (key, id, text) values ('de3d49e0-70df-4cf1-ad1e-6e8645049977', 2, 'A value with spaces');
INSERT INTO alldatatypes (key, id, number) values ('fc548cf1-67ca-4a19-be94-2e27c52b4826', 3, 16.11);
INSERT INTO alldatatypes (key, id, number) values ('aa9bd4a4-1f3d-4de2-b574-e99258907ec8', 4, 11);
INSERT INTO alldatatypes (key, id, publication) values ('c18388fb-69ec-49f0-8ef6-b4ae6c31cb51', 5, '2015-01-01T00:00:00+02:00');
INSERT INTO alldatatypes (key, id, publication) values ('45cb050f-cb40-455e-8456-75bf438dfd7b', 6, '2015-03-04T22:00:00-03:00');
INSERT INTO alldatatypes (key, id, texts) values ('5cd4aa7d-1bcf-472e-9684-0a2f2429a67d', 7, '{"Standard", "ROA", "interface"}');
INSERT INTO alldatatypes (key, id, texts) values ('1bd7c289-4f84-4e1b-94a4-f9df3ade3cd1', 8, '{"Resource", "oriented", "architecture"}');
INSERT INTO alldatatypes (key, id, numbers) values ('a8aa8ac4-0819-457e-9b23-c285bc62cdd1', 9, '{3, 5, 8, 13}');
INSERT INTO alldatatypes (key, id, numbers) values ('c4aec3a2-3901-47d6-9e5e-a2e9e6fef17d', 10, '{2, 3, 5, 7, 11}');
INSERT INTO alldatatypes (key, id, publications) values ('b8277193-13b8-4c9a-ba5e-78487fb5eb94', 11, '{"2015-01-01T00:00:00+02:00", "2015-04-01T00:00:00+02:00", "2015-07-01T00:00:00+02:00"}');
INSERT INTO alldatatypes (key, id, publications) values ('693ae016-44ec-4eed-aa92-6a1c20a387c4', 12, '{"2013-01-01T00:00:00+02:00", "2013-04-01T00:00:00+02:00", "2013-07-01T00:00:00+02:00"}');
INSERT INTO alldatatypes (key, id, text, text2, number) values ('10a54b9a-59b0-43f4-a799-0e83708aca26', 13, 'VSKO', 'this is for testing multiple', 450);
INSERT INTO alldatatypes (key, id, text, text2, number) values ('310338e1-37b0-4b26-a43c-75a6ba8b4bd0', 14, 'dienst informatica', 'for multiple q queries', 230);
INSERT INTO alldatatypes (key, id, text, text2, number) values ('5331b27e-36c9-4f51-a806-ae228367a79b', 15, 'combined unit', 'out of ideas', 1000);
INSERT INTO alldatatypes (key, id, numberint) values ('a531fee7-8650-4dfd-9021-bb56f152d6ee', 16, 2456);
INSERT INTO alldatatypes (key, id, numberint) values ('1920bff6-0ab1-4b6a-ad45-f3342118109b', 17, 1358);
INSERT INTO alldatatypes (key, id, numberbigint) values ('88230278-74c5-4546-90f9-5f44c4e68838', 18, 314159);
INSERT INTO alldatatypes (key, id, numberbigint) values ('5bfdf4bb-9e47-4e55-ab5a-d739866a095b', 19, 7500000000);
INSERT INTO alldatatypes (key, id, numbersmallint) values ('295273b7-5890-4bce-bd10-af65125fa05e', 20, -4159);
INSERT INTO alldatatypes (key, id, numbersmallint) values ('8ee0bbeb-7b60-4d0b-a16f-5a5c5910217d', 21, 7560);
INSERT INTO alldatatypes (key, id, numberdecimal) values ('35747d98-737b-44c1-8f20-d69030f1eb62', 22, -3424.234);
INSERT INTO alldatatypes (key, id, numberdecimal) values ('f5208d7e-2368-4868-8ec3-21cfefa3f3ce', 23, 456.222);
INSERT INTO alldatatypes (key, id, numberreal) values ('ffb9ad42-2c8f-465c-a28a-ef8c42d8841b', 24, 1200);
INSERT INTO alldatatypes (key, id, numberreal) values ('9628fe5c-792a-4812-8c00-742fb11aeca7', 25, 12000);
INSERT INTO alldatatypes (key, id, numberdoubleprecision) values ('52e920a2-348e-4573-8420-1c5537e2b088', 26, -12.121212);
INSERT INTO alldatatypes (key, id, numberdoubleprecision) values ('bbddbee1-05ce-4283-8472-4c0d19eafb5e', 27, 100.4545454);
INSERT INTO alldatatypes (key, id, numbersmallserial) values ('60930ed4-32fd-4c97-9e93-40d6730a9561', 28, 121);
INSERT INTO alldatatypes (key, id, numbersmallserial) values ('e2aad7ad-babb-4f88-8be9-b7f1f6550202', 29, 368);
INSERT INTO alldatatypes (key, id, numberserial) values ('1548a053-5ee3-4605-9e7b-4b83cb243b1b', 30, 1210);
INSERT INTO alldatatypes (key, id, numberserial) values ('e84b074a-6366-4248-9f63-20d491ba3891', 31, 3680);
INSERT INTO alldatatypes (key, id, numberbigserial) values ('ea1f9e87-e07c-4ec6-b7d9-b6d19c2038d6', 32, 12100);
INSERT INTO alldatatypes (key, id, numberbigserial) values ('7e3abc6e-0264-48c7-b968-bcc0a4bdc3e4', 33, 36800);
INSERT INTO alldatatypes (key, id, textvarchar) values ('5ff7f6e2-0280-4a1c-b659-ceb5522f6984', 34, 'varchar');
INSERT INTO alldatatypes (key, id, textvarchar) values ('2778802a-524f-47f5-a1c0-4e685ae53cf3', 35, 'not a text varchar');
INSERT INTO alldatatypes (key, id, textchar) values ('a419889a-314a-4b46-95c2-d860683a81c7', 36, 'char');
INSERT INTO alldatatypes (key, id, textchar) values ('628f96ef-7bbd-4d85-903d-eb290a402261', 37, 'not a text char');
INSERT INTO alldatatypes (key, id) values ('e7e49d48-010b-480d-9f90-cdcd802a3096', 38);

-- Data for packages
INSERT INTO "packages" VALUES ('1edb2754-5684-4996-ae5b-ec33c903ee4d', 'Export');
INSERT INTO "packages" VALUES ('2edb2754-1598-4996-ae5b-ec33c903ee4d', 'Internal');

-- Data for products
INSERT INTO "products" VALUES ('1edb2754-5684-1234-ae5b-ec33c903ee4d', 'Shirt', 'Cloth', '1edb2754-5684-4996-ae5b-ec33c903ee4d', '1edb2754-5684-4996-ae5b-ec33c903ee4d', '1edb2754-5684-4996-ae5b-ec33c903ee4d');
INSERT INTO "products" VALUES ('1edb2754-5684-4567-ae5b-ec33c903ee4d', 'Hat', 'Cloth', '2edb2754-1598-4996-ae5b-ec33c903ee4d', '2edb2754-1598-4996-ae5b-ec33c903ee4d', '2edb2754-1598-4996-ae5b-ec33c903ee4d');
INSERT INTO "products" VALUES ('1edb2754-5684-7896-ae5b-ec33c903ee4d', 'Meat', 'Food', '1edb2754-5684-4996-ae5b-ec33c903ee4d', '1edb2754-5684-4996-ae5b-ec33c903ee4d', '1edb2754-5684-4996-ae5b-ec33c903ee4d');
INSERT INTO "products" VALUES ('1edb2754-5684-6547-ae5b-ec33c903ee4d', 'Rice', 'Food', '2edb2754-1598-4996-ae5b-ec33c903ee4d', NULL, NULL);


INSERT INTO "relations" (key, "from", "to", "type") VALUES ('3edb2754-5684-4996-ae5b-ec33c903ee4d', 'ad9ff799-7727-4193-a34a-09f3819c3479', 'd70c98ca-9559-47db-ade6-e5da590b2435', 'IS_RELATED');
INSERT INTO "relations" (key, "from", "to", "type") VALUES ('3edb2754-7412-4996-ae5b-ec33c903ee4d', 'cf328c0a-7793-4b01-8544-bea8854147ab', 'd70c98ca-9559-47db-ade6-e5da590b2435', 'IS_RELATED');
INSERT INTO "relations" (key, "from", "to", "type") VALUES ('3edb2754-3699-4996-ae5b-ec33c903ee4d', 'd70c98ca-9559-47db-ade6-e5da590b2435', 'a391efaf-485e-45bb-8688-87d7bdfee9f6', 'IS_PART_OF');
INSERT INTO "relations" (key, "from", "to", "type") VALUES ('3edb2754-8526-4996-ae5b-ec33c903ee4d', '7f5f646c-8f0b-4ce6-97ce-8549b8b78234', '5a2747d4-ed99-4ceb-9058-8152e34f4cd5', 'IS_PART_OF');

INSERT INTO "personrelations" (key, "from", "to", "type", "startdate", "enddate") VALUES ('4edb2754-5684-4996-ae5b-ec33c903ee4d', '2f11714a-9c45-44d3-8cde-cd37eb0c048b', '9abe4102-6a29-4978-991e-2a30655030e6', 'SON', '1000-01-01', null);
INSERT INTO "personrelations" (key, "from", "to", "type", "startdate", "enddate") VALUES ('4edb2754-7412-4996-ae5b-ec33c903ee4d', '82565813-943e-4d1a-ac58-8b4cbc865bdb', '9abe4102-6a29-4978-991e-2a30655030e6', 'SON', '1000-01-01', null);
INSERT INTO "personrelations" (key, "from", "to", "type", "startdate", "enddate") VALUES ('4edb2754-3699-4996-ae5b-ec33c903ee4d', 'da6dcc12-c46f-4626-a965-1a00536131b2', '9abe4102-6a29-4978-991e-2a30655030e6', 'DAUGHTER', '1000-01-01', null);
INSERT INTO "personrelations" (key, "from", "to", "type", "startdate", "enddate") VALUES ('4edb2754-8526-4996-ae5b-ec33c903ee4d', '692fa054-33ec-4a28-87eb-53df64e3d09d', '9abe4102-6a29-4978-991e-2a30655030e6', 'NICE', '1000-01-01', null);
INSERT INTO "personrelations" (key, "from", "to", "type", "startdate", "enddate") VALUES ('de9ffe6e-8130-11ed-9c45-eb33832319db', '82565813-943e-4d1a-ac58-8b4cbc865bdb', 'de32ce31-af0c-4620-988e-1d0de282ee9d', 'FRIEND', null, '2020-01-01');
INSERT INTO "personrelations" (key, "from", "to", "type", "startdate", "enddate") VALUES ('df0cee2a-8130-11ed-8207-5f6d92046f98', '82565813-943e-4d1a-ac58-8b4cbc865bdb', '838524ec-d267-11eb-bbb0-8f3f35e5f1f8', 'FRIEND', '2020-01-01', null);
INSERT INTO "personrelations" (key, "from", "to", "type", "startdate", "enddate") VALUES ('4a85ee3e-8133-11ed-8f58-97b87a2e6edd', '2f11714a-9c45-44d3-8cde-cd37eb0c048b', '82565813-943e-4d1a-ac58-8b4cbc865bdb', 'FRIEND', '2020-01-01', '9999-12-12');


INSERT INTO "foos" (key, "bar") VALUES ('cd6a4678-7dcf-11ec-b41e-0faad76b288d', 7);
INSERT INTO "foos" (key, "bar") VALUES ('7c85b45a-7ddd-11ec-8a3d-4742839ee2fd', 8);

INSERT INTO "bars" (key, "foo") VALUES ('5de9c352-2534-11ed-84bc-9bce6d5e13f9', 'Lorem');
INSERT INTO "bars" (key, "foo") VALUES ('6305824a-2534-11ed-8716-0f26acef3469', 'ipsum');
INSERT INTO "bars" (key, "foo") VALUES ('6c7b7a0a-2534-11ed-b655-d742b8ffa05c', 'dolor');
INSERT INTO "bars" (key, "foo") VALUES ('6cb3c284-2534-11ed-8489-4732ce3c7119', 'sit');

INSERT INTO "cities" (key, "name", "nisCode") VALUES (41002, 'Aalst', 41002);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (44001, 'Aalter', 44001);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (24001, 'Aarschot', 24001);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (11001, 'Aartselaar', 11001);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (23105, 'Affligem', 23105);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (52074, 'Aiseau-Presles', 52074);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (73001, 'Alken', 73001);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (38002, 'Alveringem', 38002);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (61003, 'Amay', 61003);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (63001, 'Amel', 63001);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (92003, 'Andenne', 92003);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (21001, 'Anderlecht', 21001);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (56001, 'Anderlues', 56001);
INSERT INTO "cities" (key, "name", "nisCode") VALUES (91005, 'Anhée', 91005);
INSERT INTO "cities" (key, "name", "nisCode", "$$meta.deleted" ) VALUES (99999, 'Anhée', 91005, true);

UPDATE "cities" SET "$$meta.modified"='2015-11-01', "$$meta.created"='2018-09-20 13:22:32.7814';

INSERT INTO "countries" (key, "name", "position") VALUES ('bd', 'Bangladesh', '{"latitude": 23.684994, "longitude": 90.356331}');
INSERT INTO "countries" (key, "name", "position") VALUES ('be', 'Belgium', '{"latitude": 50.503887, "longitude": 4.469936}');
INSERT INTO "countries" (key, "name", "position") VALUES ('bf', 'Burkina Faso', '{"latitude": 12.238333, "longitude": -1.561593}');

INSERT INTO "countries2" (key, "name", "position") VALUES ('bd', 'Bangladesh', '{"latitude": 23.684994, "longitude": 90.356331}');
INSERT INTO "countries2" (key, "name", "position") VALUES ('be', 'Belgium', '{"latitude": 50.503887, "longitude": 4.469936}');
INSERT INTO "countries2" (key, "name", "position") VALUES ('bf', 'Burkina Faso', '{"latitude": 12.238333, "longitude": -1.561593}');

-- END IF;

-- END
-- $testdata$;
