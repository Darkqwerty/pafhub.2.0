#!/bin/sh
set -eu

mkdir -p /app/db
mkdir -p /app/content
for name in games steam rawg f95; do
    if [ ! -e "/app/db/${name}.json" ]; then
        cp "/app/seed/${name}.json" "/app/db/${name}.json"
    fi
done

# DSM ACLs on bind-mounted shared folders may deny the node UID even after the
# mount owner is changed. Keep the API process as container root so it can read
# and write the explicitly mounted data directories.
exec node /app/server/dist/index.js
