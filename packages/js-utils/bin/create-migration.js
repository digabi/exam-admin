#!/usr/bin/env node
const moment = require('moment')
const fs = require('fs')
const path = require('path')

const timeStampPart = moment(new Date()).format('YYYYMMDD-HHmmss')

if (process.argv.length < 3) {
  console.log('Give migration name as parameter')
  process.exit(1)
}
const migrationFileName = `${timeStampPart}-${process.argv[2]}.sql`
const migrationFilePath = path.normalize(`${process.cwd()}/db/migrations/${migrationFileName}`)
fs.writeFileSync(migrationFilePath, '')

console.log(`New migration file ${migrationFilePath} created `)
