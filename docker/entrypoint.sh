#!/bin/sh
set -eu
node dist/deploy-commands.js
exec node dist/index.js
