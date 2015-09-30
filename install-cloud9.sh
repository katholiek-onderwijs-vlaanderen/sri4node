#!/bin/bash
sudo apt-get remove -y --purge postgresql-9.3
echo "deb http://apt.postgresql.org/pub/repos/apt/ trusty-pgdg main" > /tmp/repo
sudo cp /tmp/repo /etc/apt/sources.list.d/pgdg.list
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt-get update
sudo apt-get install -y postgresql-9.4
curl -sL https://deb.nodesource.com/setup_4.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g npm@2
npm install
npm run createdb
cp env.example .env