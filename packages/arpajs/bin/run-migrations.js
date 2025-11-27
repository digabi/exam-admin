#!/usr/bin/env node
async function run() {
  try {
    const { loadConfig } = require('../dist/config')
    await loadConfig()

    const { runMigrations } = require('../dist/db/local-pg-resource-management')
    await runMigrations(false)
    process.exit(0)
  } catch (e) {
    console.error('Failed running migrations', e.toString())
    process.exit(1)
  }
}
run()
