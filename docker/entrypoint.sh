#!/bin/sh
set -eu
npx prisma migrate deploy
node dist/deploy-commands.js
exec node dist/index.js
