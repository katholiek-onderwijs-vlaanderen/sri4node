#!/bin/bash

SCRIPTDIR=$(cd $(dirname "${BASH_SOURCE[0]}") && pwd)
PSQL_CMD="psql -U postgres"

# clean database
cat "$SCRIPTDIR/sql/clean.sql" | $PSQL_CMD

# create database
cat "$SCRIPTDIR/sql/schema.sql" "$SCRIPTDIR/sql/testdata.sql" | $PSQL_CMD

# grant privileges
cat "$SCRIPTDIR/sql/privileges.sql" | $PSQL_CMD
