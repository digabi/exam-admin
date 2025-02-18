import * as R from 'ramda'
import * as V from 'partial.lenses.validation'

const isPositiveInteger = v => Number.isInteger(v) && v >= 0
const isValidUuid = R.test(/^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/)
const isTrimmedText = R.complement(R.test(/(^[\s]|[\s]$)/))

const choiceRules = V.arrayIx(
  V.cases(
    [
      R.has('maxScore'),
      V.propsOr(V.accept, {
        maxScore: [isPositiveInteger, 'Max score must be a positive integer'],
        id: [isPositiveInteger, 'Question ID must be a positive integer'],
        choices: V.arrayIx(
          V.propsOr(V.accept, {
            options: V.arrayIx(
              V.propsOr(V.accept, {
                id: [isPositiveInteger, 'Option ID must be a positive integer'],
                correct: [R.is(Boolean), 'Correct attribute must be a boolean value']
              })
            )
          })
        )
      })
    ],
    [
      V.propsOr(V.accept, {
        id: [isPositiveInteger, 'Question ID must be a positive integer'],
        choices: V.arrayIx(
          V.propsOr(V.accept, {
            options: V.arrayIx(
              V.propsOr(V.accept, {
                id: [isPositiveInteger, 'Option ID must be a positive integer'],
                correct: [R.is(Boolean), 'Correct attribute must be a boolean value'],
                score: [R.is(Number), 'Score must be a positive integer']
              })
            )
          })
        )
      })
    ]
  )
)

const productiveRules = V.arrayIx(
  V.propsOr(V.accept, {
    examUuid: [isValidUuid, 'Uuid does not match syntax'],
    questions: V.arrayIx(
      V.propsOr(V.accept, {
        id: [isPositiveInteger, 'Question ID must be a positive integer'],
        correctAnswers: V.arrayIx(
          V.propsOr(V.accept, {
            score: [V.or(R.equals(null), isPositiveInteger), 'Score must be a positive integer or null'],
            text: [isTrimmedText, 'Correct answers must be trimmed']
          })
        )
      })
    )
  })
)

export const validateAutograding = V.errors(choiceRules)

export const validateProductiveAutograding = V.errors(productiveRules)
