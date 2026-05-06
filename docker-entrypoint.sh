#!/bin/sh
set -e

if [ -n "$GIRL_AGENT_PROFILE" ]; then
  exec node dist/cli.js --profile="$GIRL_AGENT_PROFILE"
else
  exec node dist/cli.js
fi
