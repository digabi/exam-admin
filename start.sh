#!/usr/bin/env bash

set -euxo pipefail

arpajs=/app/packages/arpajs
cache=/app/.cache
db_created=$cache/db-created
demo_data_created=$cache/demo-data-created

sleep 2

if [ ! -f "$db_created" ]; then
  echo "Creating database"
  "$arpajs/db/scripts/create-db.sh" -d arpa "$arpajs/db/schema/create_db_extensions.sql"
  psql -q -f "$arpajs/db/schema/create_db.sql" arpa
  touch "$db_created"
  echo "Database created"
fi

(cd "$arpajs" && ./bin/run-migrations.js)

if [ ! -f "$demo_data_created" ]; then
  echo "Creating demo data"
  psql -q -f "$arpajs/db/schema/fixture.sql" arpa
  touch "$demo_data_created"
  echo "Demo data created"
fi

npx lerna run --stream start
