#!/bin/bash
cat sql/schema.sql sql/testdata.sql | sudo sudo -u postgres psql
