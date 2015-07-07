#!/bin/bash
npm install
echo "CREATE EXTENSION 'uuid-ossp'" | sudo sudo -u postgres psql 
echo "CREATE SCHEMA sri4node" | sudo sudo -u postgres psql 
echo "REVOKE ALL PRIVILEGES ON SCHEMA sri4node FROM sri4node" | sudo sudo -u postgres psql 
echo "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA sri4node FROM sri4node" | sudo sudo -u postgres psql 
echo "REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sri4node FROM sri4node" | sudo sudo -u postgres psql 
echo "DROP USER sri4node" | sudo sudo -u postgres psql 
echo "CREATE USER sri4node WITH PASSWORD 'sri4node'" | sudo sudo -u postgres psql 

# construct tables.
./create-database.sh

echo "GRANT ALL PRIVILEGES ON SCHEMA sri4node TO sri4node" | sudo sudo -u postgres psql 
echo "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA sri4node TO sri4node" | sudo sudo -u postgres psql 
echo "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA sri4node TO sri4node" | sudo sudo -u postgres psql 
echo "ALTER USER sri4node SET search_path = sri4node" | sudo sudo -u postgres psql 
