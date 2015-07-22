#!/bin/bash
cat sql/schema.sql sql/testdata.sql | psql
