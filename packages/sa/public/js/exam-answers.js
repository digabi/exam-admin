import * as sautils from './sa-utils'
import _ from 'lodash'
import utils from './utils'
import { getMaxScore } from './arpa-utils'
import $ from 'jquery'
import * as L from 'partial.lenses'

export function questionMaxScores(examOrGradingStructureContent) {
  const questions = L.collect(L.query('questions'), examOrGradingStructureContent)

  const elements = _.flatten(questions)
  expandDisplayNumbers(elements)

  return _.filter(elements, el => el.type !== 'label' && el.type !== 'audiotest')

  // eslint-disable-next-line no-warning-comments
  // TODO this could be pre-calculated into the exam data
  function expandDisplayNumbers(els) {
    let parentNumber
    let level = 1
    els.forEach(el => {
      if (el.type === 'label') {
        parentNumber = el.displayNumber
        level = el.level
      } else if (parentNumber && el.level > level) {
        el.displayNumber = parentNumber + el.displayNumber
      } else if (el.level <= level) {
        level = el.level
        parentNumber = undefined
      }
    })
  }
}

function sortStudentsByName(students) {
  return _.sortBy(students, student => `${student.lastName.toLowerCase()} ${student.firstNames.toLowerCase()}`)
}

function answersWithMaxScores(student, questions, isPureXmlExam) {
  return _.map(student.answers, answer => {
    const question = questionByAnswer(questions, answer)
    const questionType = question.type
    const isRichText = answer.content && answer.content.type === 'richText'
    const isText = answer.content && answer.content.type === 'text'
    const answerText = isRichText
      ? $(`<div>${answer.content.value}</div>`).get(0).innerText
      : answer.content && answer.content.value
    const answer_ = isRichText ? L.modify(['content', 'value'], stripDivsFromRichTextAnswer, answer) : answer

    const shouldBeHiddenInGradingView =
      isPureXmlExam && (questionType === 'multichoicegap' || questionType === 'choicegroup')

    return {
      ...answer_,
      maxScore: getMaxScore(question),
      displayNumber: question.displayNumber,
      richText: isRichText,
      ...(questionType === 'choicegroup' && { choicegroup: choiceGroupAnswerDecoration(question, student.answers) }),
      ...(questionType === 'multichoicegap' && {
        multichoicegap: choiceGapAnswerDecoration(question, student.answers)
      }),
      ...((isRichText || isText) && {
        isManuallyGradable: true,
        wordCountOptions: { count: utils.countWords(answerText) },
        charCountOptions: { count: utils.countCharacters(answerText) }
      }),
      shouldBeHiddenInGradingView
    }
  })

  function choiceGapAnswerDecoration(question, studentAnswers) {
    return {
      content: _.map(question.content, c => {
        if (c.type === 'text') {
          return { text: sautils.sanitizeHtml(c.text) }
        } else {
          const correctOption = _.find(c.options, o => o.correct === true)
          const correctText = correctOption ? correctOption.text : ''
          const answeredOption = optionByQuestionAndChoiceOrGap(studentAnswers, question.id, c.id)
          const answeredText = answeredOption ? _.find(c.options, o => o.id === answeredOption).text : undefined
          return {
            correctText: correctText,
            answeredText: answeredText,
            isCorrect: correctOption.id === answeredOption
          }
        }
      })
    }
  }

  function choiceGroupAnswerDecoration(question, studentAnswers) {
    const hasHtmlRegex = new RegExp(`(\<\w*)(.*\<*\>)`) //eslint-disable-line no-useless-escape
    return {
      choices: _(question.choices)
        .filter(c => c.type === 'choice')
        .map(choice => ({
          text: sautils.sanitizeHtml(choice.text),
          displayNumber: choice.displayNumber,
          options: _.map(choice.options, option => ({
            text: option.text
              ? option.text.match(hasHtmlRegex)
                ? sautils.sanitizeHtml(option.text)
                : option.text
              : '',
            correct: option.correct,
            answered: optionByQuestionAndChoiceOrGap(studentAnswers, question.id, choice.id) === parseInt(option.id, 10)
          }))
        }))
        .value()
    }
  }

  function optionByQuestionAndChoiceOrGap(answers, questionId, choiceId) {
    const answer = _.find(answers, answer => answer.questionId === questionId)
    if (answer) {
      const choice = _.find(answer.content, choice => choice.questionId === choiceId)
      if (choice) {
        return parseInt(choice.content.value, 10)
      }
    }
    return undefined
  }

  function questionByAnswer(questions, answer) {
    return _.find(questions, q => answer.questionId === q.id)
  }
}

/**
 * Firefox >= 60 inserts divs to contenteditable HTML by default. We didn't
 * catch this before release, so we need to clean divs from old answers in
 * order for answer annotations to work.
 */
function stripDivsFromRichTextAnswer(answerContentValue) {
  const parent = document.createElement('div')
  parent.innerHTML = answerContentValue

  do {
    let lastNodeType
    for (let i = 0; i < parent.childNodes.length; i++) {
      const node = parent.childNodes[i]
      if (node.nodeName === 'DIV') {
        if (lastNodeType === Node.TEXT_NODE) parent.insertBefore(document.createElement('br'), node)
        if (node.lastChild && node.lastChild.nodeName !== 'BR') node.insertBefore(document.createElement('br'), null)
        while (node.childNodes.length) parent.insertBefore(node.firstChild, node)
        parent.removeChild(node)
      }
      lastNodeType = node.nodeType
    }
  } while (Array.prototype.some.call(parent.childNodes, node => node.nodeName === 'DIV'))

  return parent.innerHTML
}

export function addScoreTotals(students) {
  return students.map(student => {
    student.totalScore = _.sum(_.filter(_.map(student.answers, 'scoreValue')))
    return student
  })
}

export function prepareStudentsAnswers(students, questions, isPureXmlExam = false) {
  students.forEach(student => {
    student.answers = _.sortBy(answersWithMaxScores(student, questions, isPureXmlExam), 'questionId')
  })
  return sortStudentsByName(students)
}
