#!/bin/bash
# clean database
cat sql/clean.sql | sudo sudo -u postgres psql $PSQL_VERSION_OPT

# create database
cat sql/schema.sql sql/testdata.sql | sudo sudo -u postgres psql $PSQL_VERSION_OPT

# grant privileges
cat sql/privileges.sql | sudo sudo -u postgres psql $PSQL_VERSION_OPT
