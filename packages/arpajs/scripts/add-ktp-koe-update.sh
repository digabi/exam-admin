#!/bin/bash

cd "$(dirname "$0")" || exit 1

mkdir -p ../dist

if [ -d ../ktp-update ]; then
  zip --junk-paths ../dist/ktp-update.zip ../ktp-update/*
fi

if [ -d ../koe-update ]; then
  zip --junk-paths ../dist/koe-update.zip ../koe-update/*
fi
