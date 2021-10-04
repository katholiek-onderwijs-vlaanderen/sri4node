#!/bin/bash
if [ $OSTYPE == 'linux-gnu' ]
then
  sudo service postgresql start
  export PSQL_CMD="sudo -u postgres psql $PSQL_VERSION_OPT"
else
  export PSQL_CMD="psql -U postgres"
fi
echo Operating system $OSTYPE, using postgres command : $PSQL_CMD

# clean database
cat sql/clean.sql | $PSQL_CMD

# create database
cat sql/schema.sql sql/testdata.sql | $PSQL_CMD

# grant privileges
cat sql/privileges.sql | $PSQL_CMD
