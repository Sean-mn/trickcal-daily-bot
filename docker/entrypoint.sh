#!/bin/sh
npx prisma migrate deploy
exec node dist/index.js
