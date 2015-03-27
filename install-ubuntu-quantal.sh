#!/bin/bash
npm install
sudo service postgresql start
sudo apt-get install postgresql-contrib-9.1 uuid
echo "REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM sri4node" | sudo sudo -u postgres psql
echo "REVOKE ALL PRIVILEGES ON DATABASE postgres FROM sri4node" | sudo sudo -u postgres psql
echo "DROP USER sri4node" | sudo sudo -u postgres psql
echo "CREATE USER sri4node WITH PASSWORD 'sri4node'" | sudo sudo -u postgres psql

# construct tables.
./create-database.sh

echo "GRANT ALL PRIVILEGES ON DATABASE postgres TO sri4node" | sudo sudo -u postgres psql
echo "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO sri4node" | sudo sudo -u postgres psql
