import * as R from 'ramda'
import * as L from 'partial.lenses'
import { validateAutograding, validateProductiveAutograding } from './autograding-validator'

export const removeCorrectAnswersAndScores = L.remove(
  L.query(L.cond([(_, k) => k === 'correct' || k === 'score', []], [(_, k) => k === 'correctAnswers', L.elems]))
)

const validate = (toBeValidated, validationFunction, errorMsg) => {
  const validationResult = validationFunction(toBeValidated)
  if (validationResult !== undefined) {
    throw new Error(`${errorMsg}. Errors: ${JSON.stringify(validationResult, null, 2)}`)
  }
}

const mapQuestions = (examContent, mapperFunction) =>
  L.collectAs(mapperFunction, L.flat('sections', 'questions'), examContent)

const getTextCorrectAnswers = question => ({
  id: question.id,
  correctAnswers: question.correctAnswers.map(answer => ({ text: answer, score: question.maxScore }))
})

const getMaxScoreChoiceGroupCorrectAnswers = question => ({
  maxScore: question.maxScore,
  id: question.id,
  choices: question.choices.map(choice => ({ options: choice.options.map(R.pick(['id', 'correct'])) }))
})

const getCustomScoreChoiceGroupCorrectAnswers = question => ({
  id: question.id,
  choices: question.choices.map(choice => ({ options: choice.options.map(R.pick(['id', 'correct', 'score'])) }))
})

const getMultiChoiceGapCorrectAnswers = question => ({
  id: question.id,
  maxScore: question.maxScore,
  choices: question.content.filter(R.propEq('type', 'gap')).map(partOfContent => ({
    options: partOfContent.options.map(R.pick(['correct', 'id']))
  }))
})

const getMultiChoiceCorrectAnswers = R.cond([
  [question => question.type === 'choicegroup' && question.maxScore, getMaxScoreChoiceGroupCorrectAnswers],
  [question => question.type === 'choicegroup', getCustomScoreChoiceGroupCorrectAnswers],
  [question => question.type === 'multichoicegap', getMultiChoiceGapCorrectAnswers]
])

const getProductiveCorrectAnswers = R.cond([
  [question => question.type === 'text' && question.correctAnswers, getTextCorrectAnswers],
  [question => question.type === 'subtext' && question.correctAnswers, getTextCorrectAnswers]
])

export const generateProductiveAutogradingJson = (examContent, examUuid) => {
  const result = { examUuid, questions: mapQuestions(examContent, getProductiveCorrectAnswers) }
  validate([result], validateProductiveAutograding, 'Productive autograding.json was not generated correctly')
  return result
}

export const generateAutogradingJson = examContent => {
  const result = mapQuestions(examContent, getMultiChoiceCorrectAnswers)
  validate(result, validateAutograding, 'Autograding.json was not generated correctly')
  return result
}
