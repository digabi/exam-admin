#!/usr/bin/env node
const { runMigrations } = require('../dist/db/local-pg-resource-management')

async function run() {
  try {
    await runMigrations(false)
    process.exit(0)
  } catch (e) {
    console.error('Failed running migrations', e.toString())
    process.exit(1)
  }
}
run()
