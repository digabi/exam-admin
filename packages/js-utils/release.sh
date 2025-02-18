#!/bin/bash

set -e

npx release-npm-and-js $@

NODE_VERSION=`sed "s/\([^.]*\)\..*/\1/g" .nvmrc`
git tag -f latest-node-${NODE_VERSION}

cat << EOF
######################################
OBS! Creating release for node v${NODE_VERSION}
######################################
EOF
