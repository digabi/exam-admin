#!/usr/bin/env node
'use strict'

const program = require('commander')
const _ = require('lodash')
const path = require('path')

program.usage('yo|abitti file ...').parse(process.argv)

if (program.args.length < 2) {
  program.outputHelp()
}

const validatorPath =
  _.first(program.args) === 'yo' ? '../dist-cjs/exam-validators/yo' : '../dist-cjs/exam-validators/abitti'
const validator = require(validatorPath)

const validateExam = examFileName => {
  let examJson

  try {
    examJson = require(path.resolve(examFileName))
  } catch (e) {
    console.log('*** ERROR: Exam file', examFileName, 'is not valid JSON:', e) // eslint-disable-line no-console
    return false
  }

  const validateExamContentFieldsResult = validator.validateExamContentFields(examJson)

  if (validateExamContentFieldsResult.valid) {
    console.log('*   Exam file', examFileName, 'is valid with uniq IDs') // eslint-disable-line no-console
    return true
  }

  console.log('*** ERROR: Exam file', examFileName, 'is not valid:') // eslint-disable-line no-console

  validateExamContentFieldsResult.errors.forEach(error => {
    const elemPath = error.field
      .replace(new RegExp('.([0-9]+)', 'g'), (str, index) => `[${index}]`)
      .replace(/^data\./, '')
    console.log(error.field, ':', error.message, "'", _.get(examJson, elemPath), "'\n") // eslint-disable-line no-console
  })

  return false
}

const allValid = _.tail(program.args).reduce(
  (isPreviousExamValid, exam) => (validateExam(exam) ? isPreviousExamValid : false),
  true
)

process.exit(allValid ? 0 : 1)
