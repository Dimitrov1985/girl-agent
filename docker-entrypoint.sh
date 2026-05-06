#!/bin/sh
set -e

ARGS=""
[ -n "$GIRL_AGENT_PROFILE" ] && ARGS="$ARGS --profile=$GIRL_AGENT_PROFILE"
ARGS="$ARGS --web=3000"

exec node dist/cli.js $ARGS
