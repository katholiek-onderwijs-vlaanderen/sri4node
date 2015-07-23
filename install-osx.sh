#!/bin/bash
npm install
echo "CREATE EXTENSION 'uuid-ossp'" | psql -U postgres
echo "CREATE SCHEMA sri4node" | psql -U postgres
echo "REVOKE ALL PRIVILEGES ON SCHEMA sri4node FROM sri4node" | psql -U postgres
echo "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA sri4node FROM sri4node" | psql -U postgres
echo "REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sri4node FROM sri4node" | psql -U postgres
echo "DROP USER sri4node" | psql -U postgres
echo "CREATE USER sri4node WITH PASSWORD 'sri4node'" | psql -U postgres

# construct tables.
./create-database-osx.sh

echo "GRANT ALL PRIVILEGES ON SCHEMA sri4node TO sri4node" | psql -U postgres
echo "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sri4node TO sri4node" | psql -U postgres
echo "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sri4node TO sri4node" | psql -U postgres
echo "ALTER USER sri4node SET search_path = sri4node" | psql -U postgres
