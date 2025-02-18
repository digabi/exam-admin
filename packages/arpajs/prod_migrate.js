#!/usr/bin/env node
'use strict'

/* eslint-disable no-console */

const program = require('commander')
const Promise = require('bluebird')
const using = Promise.using

program
  .usage('[options]')
  .option(
    '-a --destinationArpaDBUrl <url>',
    'PostgreSQL connection string to destination Arpa database (postgres://...)'
  )
  .parse(process.argv)

if (!program.destinationArpaDBUrl) {
  program.outputHelp()
  process.exit(1)
}

const pgrmArpa = require('pg-using-bluebird')({ dbUrl: program.destinationArpaDBUrl })

function migrateHeldExam() {
  return using(pgrmArpa.getTransaction(), tx => {
    return tx
      .queryAsync(`select distinct(exam_uuid) from answer_paper where held_exam_uuid is null`)
      .tap(logRows)
      .then(getRows)
      .then(answerPaperRowsWithoutHeldExam =>
        Promise.map(answerPaperRowsWithoutHeldExam, handleAnswerPaper, { concurrency: 1000 })
      )

    function handleAnswerPaper(answerPaperRow, index) {
      if (index % 100 === 0) console.log(`${index}th answer paper row returned`)
      const examUuid = answerPaperRow.exam_uuid
      return tx
        .queryAsync(
          `insert into held_exam (exam_uuid, answer_emails_sent)
select exam_uuid, answer_emails_sent from exam where exam_uuid=$1 returning held_exam_uuid`,
          [examUuid]
        )
        .then(getFirstRow)
        .then(heldExamResult =>
          tx.queryAsync(`update answer_paper set held_exam_uuid=$1 where exam_uuid=$2`, [
            heldExamResult.held_exam_uuid,
            examUuid
          ])
        )
    }
  })
}

migrateHeldExam()
  .then(() => pgrmArpa.end())
  .catch(e => {
    console.log(e)
    process.exit(1)
  })

function getRows(result) {
  return result.rows
}

function getFirstRow(result) {
  return result.rows.length > 0 ? result.rows[0] : undefined
}

function logRows(result) {
  console.log(`returned ${result.rows.length}`)
}
