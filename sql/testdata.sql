-- groups
INSERT INTO "communities" VALUES ('8bf649b4-c50a-4ee9-9b02-877aa0a71849','LETS Regio Dendermonde', 'Beekveldstraat', '1A', '2', '9280', 'Lebbeke', '0495940592', 'letsdendermonde@gmail.com','admin','http://www.letsdendermonde.be','https://www.facebook.com/pages/LETS-Regio-Dendermonde/113915938675095?ref=ts&fref=ts','duim');
INSERT INTO "communities" VALUES ('57561082-1506-41e8-a57e-98fee9289e0c','LETS Aalst-Oudenaarde', 'Wellekensstraat', '45', null, '9300', 'Aalst', null, 'PeterD@steunpuntwelzijn.be', 'admin', 'http://www.welzijn.net/www_wp/sociaalweefsel/letsao/', null, 'iets');
INSERT INTO "communities" VALUES ('6531e471-7514-43cc-9a19-a72cf6d27f4c','LETS Zele', 'Stationsstraat', '25', null, '9240', 'Zele', null, 'letszele@gmail.com', 'admin', 'http://www.letszele.be/', null, 'pluim');
INSERT INTO "communities" VALUES ('1edb2754-8481-4996-ae5b-ec33c903ee4d','LETS Hamme', 'Neerstraat', '12', null, '9220', 'Hamme', null, 'letshamme@gmail.com', 'admin', 'http://www.letshamme.be/', null, 'zaadjes');

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
INSERT INTO "table" VALUES ('select-value','from-value');