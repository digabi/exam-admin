'use strict'

import _ from 'lodash'
import { pgrm } from './local-pg-resource-management'
import BPromise from 'bluebird'
const using = BPromise.using
import * as jsUtils from '@digabi/js-utils'
import * as token from '../crypt/token'
import { SQL } from 'sql-template-strings'

// language=PostgreSQL
const gradedAnswerPaperQuery = `
  select
    st.student_uuid,
    ap.answer_paper_id,
    st.first_names,
    st.last_name,
    st.email,
    ap.grading_text,
    ap.external_computer_allowed,
    a.answer_id,
    a.answer_content,
    a.question_id,
    sc.score_value,
    sc.comment,
    sc.metadata,
    a.pregrading_finished_at
  from student st
    join answer_paper ap on ap.student_uuid=st.student_uuid
    natural join held_exam
    left join answer a on a.answer_paper_id=ap.answer_paper_id
    left join score sc on sc.answer_id=a.answer_id`

export function getAnswerPaper(apId) {
  return using(pgrm.getTransaction(), tx =>
    tx.queryAsync(`${gradedAnswerPaperQuery} where ap.answer_paper_id = $1`, [apId])
  )
    .then(({ rows }) => rows)
    .then(groupAnswerPapersByStudent)
}

export function getAnswerPapersForHeldExam(heldExamUuid) {
  return using(pgrm.getTransaction(), tx =>
    tx.queryAsync(`${gradedAnswerPaperQuery} where held_exam.held_exam_uuid = $1`, [heldExamUuid])
  )
    .then(({ rows }) => rows)
    .then(groupAnswerPapersByStudent)
    .then(addAnswerPaperToken)
}

export async function getToken(heldExamUuid, studentUuid) {
  const [answerPaper] = await pgrm.queryRowsAsync(SQL`
      SELECT answer_paper_id
      FROM answer_paper
      WHERE held_exam_uuid = ${heldExamUuid}
        AND student_uuid = ${studentUuid}
  `)
  return token.answerPaperIdToToken(answerPaper.answer_paper_id)
}

const addAnswerPaperToken = students =>
  students.map(student => ({
    ...student,
    token: token.answerPaperIdToToken(student.answerPaperId)
  }))

function groupAnswerPapersByStudent(rows) {
  const students = rows.map(jsUtils.objectPropertiesToCamel)

  const grouped = _.groupBy(students, student => student.studentUuid)
  const joined = _.map(grouped, studentAndAnswer => {
    const st = extractStudent(_.first(studentAndAnswer))
    return _.assign(st, { answers: studentAndAnswer.map(extractAnswer).filter(emptyAnswer) })
  })
  return joined

  function emptyAnswer(answer) {
    return !!answer.id
  }
}

function extractStudent(studentAndAnswer) {
  const newStudent = _.pick(studentAndAnswer, [
    'answerPaperId',
    'externalComputerAllowed',
    'firstNames',
    'lastName',
    'studentUuid',
    'email',
    'gradingText'
  ])
  return newStudent
}

function extractAnswer(studentAndAnswer) {
  const newAnswer = _.pick(studentAndAnswer, [
    'answerId',
    'answerContent',
    'questionId',
    'scoreValue',
    'pregradingFinishedAt',
    'comment',
    'metadata'
  ])
  jsUtils.renameProperty(newAnswer, 'answerId', 'id')
  jsUtils.renameProperty(newAnswer, 'answerContent', 'content')
  return newAnswer
}

export function getStudentsForMailing(heldExamUuid) {
  // postgres 9.3 and ->> vs json_extract_path_text
  // language=PostgreSQL
  return using(pgrm.getTransaction(), tx =>
    tx
      .queryAsync(
        `
        SELECT
          first_names,
          email,
          answer_paper_id,
          exam.title as title
        FROM student
          NATURAL JOIN answer_paper
          NATURAL JOIN exam
          NATURAL JOIN held_exam
        WHERE held_exam_uuid=$1 AND email IS NOT NULL AND held_exam.held_exam_deletion_date IS NULL`,
        [heldExamUuid]
      )
      .then(result => result.rows.map(jsUtils.objectPropertiesToCamel))
  )
}

export function updateAnswersSentTime(heldExamUuid) {
  // language=PostgreSQL
  return using(pgrm.getTransaction(), tx =>
    tx
      .queryAsync(
        `
        UPDATE held_exam
        SET answer_emails_sent = now()
        where held_exam_uuid= $1 and held_exam.held_exam_deletion_date is null
        RETURNING answer_emails_sent`,
        [heldExamUuid]
      )
      .then(result => _.first(result.rows.map(jsUtils.objectPropertiesToCamel)))
  )
}

export function getScreenshot(screenshotUuid) {
  // language=PostgreSQL
  return using(pgrm.getTransaction(), tx =>
    tx
      .queryAsync(
        `
    SELECT content
    FROM screenshots
    WHERE screenshot_uuid=$1`,
        [screenshotUuid]
      )
      .then(result => _.first(result.rows).content)
  )
}

export function getAudio(audioId) {
  // language=PostgreSQL
  return using(pgrm.getTransaction(), tx =>
    tx
      .queryAsync(
        `
    SELECT content
    FROM audio
    WHERE audio_id=$1`,
        [audioId]
      )
      .then(result => _.first(result.rows).content)
  )
}

export function addStudentWithTx(tx, student) {
  // language=PostgreSQL
  return tx
    .queryAsync(
      `insert into student (student_uuid, first_names, last_name, email)
        select
          $1,
          $2,
          $3,
          $4
      on conflict (student_uuid)
        do update set
          first_names = excluded.first_names,
          last_name = excluded.last_name,
          email = excluded.email
      returning student_uuid`,
      [student.uuid, student.firstNames, student.lastName, student.email]
    )
    .then(result => _.first(result.rows.map(jsUtils.objectPropertiesToCamel)).studentUuid)
}
