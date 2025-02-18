#!/bin/bash

cd "$(dirname "$0")" || exit 1

mkdir -p ../dist

if [ -f ../server/nsa-scripts.zip ]; then
  cp -v ../server/nsa-scripts.zip ../dist/
fi

if [ -f ../server/s3_encrypt.pub ]; then
  cp -v ../server/s3_encrypt.pub ../dist/
fi
