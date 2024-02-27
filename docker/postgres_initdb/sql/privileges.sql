CREATE USER sri4node WITH PASSWORD 'sri4node';
GRANT ALL PRIVILEGES ON SCHEMA sri4node TO sri4node;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sri4node TO sri4node;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sri4node TO sri4node;
ALTER USER sri4node SET search_path = sri4node;

CREATE FUNCTION exec(text) returns text language plpgsql volatile
  AS $f$
    BEGIN
      EXECUTE $1;
      RETURN $1;
    END;
$f$;

SELECT exec('ALTER TABLE sri4node.' ||
            quote_ident(s.relname) || ' OWNER TO sri4node')
  FROM (SELECT relname
          FROM pg_class c JOIN pg_namespace n ON (c.relnamespace = n.oid)
         WHERE nspname = 'sri4node' AND
               relkind IN ('r','S','v') ORDER BY relkind = 'S') s;