import validator from 'is-my-json-valid'
import _ from 'lodash'
import * as duplicates from './duplicate-id-check'
import * as R from 'ramda'
import * as L from 'partial.lenses'
import * as V from 'partial.lenses.validation'

export const schemaVersion = '1.2'
var compatibleWith = ['1.0', '1.1']

function createExamValidationSchema(validateFormatOnly) {
  ////  Common properties for all questions
  var commonQuestionProperties = {
    text: { required: true, type: 'string', minLength: validateFormatOnly ? 0 : 1 },
    displayNumber: { required: true, type: 'string' },
    id: { required: true, type: 'integer', minimum: 0 },
    level: { required: true, type: 'integer', minimum: 1, maximum: 1 }
  }

  var restrictedMediaSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      file: { required: true, type: 'string' },
      text: { required: true, type: 'string' },
      wide: { required: false, type: 'boolean' }
    }
  }

  var commonMaxScore = { type: 'integer', minimum: 0, maximum: 99, required: !validateFormatOnly }

  ////  Text question
  var textQuestionSchema = {
    type: 'object',
    additionalProperties: false,
    properties: _.extend({}, commonQuestionProperties, {
      maxScore: commonMaxScore,
      type: { required: true, type: 'string', enum: ['text'] },
      screenshotExpected: { required: false, type: 'boolean' },
      restrictedMedia: {
        required: false,
        type: 'array',
        items: restrictedMediaSchema,
        minItems: validateFormatOnly ? 0 : 1
      },
      correctAnswers: { required: false, type: 'array', items: { type: 'string' }, minItems: 0 }
    })
  }

  ////  Subtext question
  var subtextQuestionSchema = _.merge({}, textQuestionSchema, {
    properties: {
      maxScore: commonMaxScore,
      type: { required: true, type: 'string', enum: ['subtext'] },
      breakAfter: { required: false, type: 'boolean' }
    }
  })

  ////  Audio test
  var audioTestSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      type: { required: true, type: 'string', enum: ['audiotest'] },
      file: { required: true, type: 'string' }
    }
  }

  ////  Label
  var labelSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      text: { required: true, type: 'string', minLength: validateFormatOnly ? 0 : 1 },
      displayNumber: { required: true, type: 'string' },
      level: { required: true, type: 'integer', minimum: 1, maximum: 1 },
      type: { required: true, type: 'string', enum: ['label'] },
      breakAfter: { required: false, type: 'boolean' }
    }
  }

  var labelWithRestrictedMediaSchema = {
    type: 'object',
    additionalProperties: false,
    properties: _.extend({}, labelSchema.properties, {
      id: { required: true, type: 'integer', minimum: 0 },
      restrictedMedia: {
        required: false,
        type: 'array',
        items: restrictedMediaSchema,
        minItems: validateFormatOnly ? 0 : 1
      }
    })
  }

  ////  ChoiceGroup question
  var option = {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { required: true, type: 'integer', minimum: 0 },
      text: { required: true, type: 'string' },
      altText: { required: false, type: 'string' },
      correct: { required: true, type: 'boolean' }
    }
  }

  var optionWithScore = _.merge({}, option, {
    properties: {
      score: { required: true, type: 'integer', minimum: -99, maximum: 99 }
    }
  })

  var commonChoiceSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { required: true, type: 'integer', minimum: 0 },
      text: { required: true, type: 'string', minLength: validateFormatOnly ? 0 : 1 },
      displayNumber: { required: true, type: 'string' },
      type: { required: true, type: 'string', enum: ['choice'] },
      breakAfter: { required: false, type: 'boolean' },
      optionsRandomized: { required: false, type: 'boolean' },
      options: { required: true, type: 'array' },
      restrictedMedia: {
        required: false,
        type: 'array',
        items: restrictedMediaSchema,
        minItems: validateFormatOnly ? 0 : 1
      }
    }
  }

  var choiceSchemaWithScoresForEachOption = _.merge({}, commonChoiceSchema, {
    properties: {
      options: { items: optionWithScore }
    }
  })

  var choiceSchemaWithMaxScore = _.merge({}, commonChoiceSchema, {
    properties: {
      options: { items: option }
    }
  })

  var commonChoiceGroupQuestionSchema = {
    type: 'object',
    additionalProperties: false,
    properties: _.extend({}, commonQuestionProperties, {
      type: { required: true, type: 'string', enum: ['choicegroup'] },
      choices: { required: true, type: 'array' },
      restrictedMedia: {
        required: false,
        type: 'array',
        items: restrictedMediaSchema,
        minItems: validateFormatOnly ? 0 : 1
      }
    })
  }

  var choiceGroupQuestionSchemaWithMaxScore = _.merge({}, commonChoiceGroupQuestionSchema, {
    properties: {
      maxScore: commonMaxScore,
      choices: { items: choiceSchemaWithMaxScore }
    }
  })

  var choiceGroupQuestionSchemaWithScoresForEachChoice = _.merge({}, commonChoiceGroupQuestionSchema, {
    properties: {
      choices: { items: choiceSchemaWithScoresForEachOption }
    }
  })

  ////  MultichoiceGap question
  var multichoiceGapTextContentSchema = {
    type: 'object',
    additionalProperties: false,

    properties: {
      type: { required: true, type: 'string', enum: ['text'] },
      text: { required: true, type: 'string', minLength: validateFormatOnly ? 0 : 1 }
    }
  }

  var multichoiceGapGapSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      id: { required: true, type: 'integer', minimum: 0 },
      type: { required: true, type: 'string', enum: ['gap'] },
      optionsRandomized: { required: false, type: 'boolean' },
      options: { required: true, type: 'array', items: option }
    }
  }

  var multichoiceGapQuestionSchema = {
    type: 'object',
    additionalProperties: false,
    properties: _.extend({}, commonQuestionProperties, {
      maxScore: commonMaxScore,
      type: { required: true, type: 'string', enum: ['multichoicegap'] },
      content: {
        required: true,
        type: 'array',
        items: { oneOf: [multichoiceGapTextContentSchema, multichoiceGapGapSchema] }
      }
    })
  }

  ////  Question list schema
  var questionsSchema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      title: { required: false, type: 'string', minLength: validateFormatOnly ? 0 : 1 },
      casForbidden: { required: false, type: 'boolean' },
      questions: {
        required: true,
        type: 'array',
        items: {
          oneOf: [
            textQuestionSchema,
            subtextQuestionSchema,
            audioTestSchema,
            labelSchema,
            labelWithRestrictedMediaSchema,
            choiceGroupQuestionSchemaWithMaxScore,
            choiceGroupQuestionSchemaWithScoresForEachChoice,
            multichoiceGapQuestionSchema
          ]
        },
        minItems: validateFormatOnly ? 0 : 1
      }
    }
  }

  ////  Exam content schema
  var examContentSchema = {
    type: 'object',
    required: true,
    additionalProperties: false,

    properties: {
      schemaVersion: { required: false, type: 'string', enum: _.concat(compatibleWith, schemaVersion) },
      title: { required: true, type: 'string', minLength: validateFormatOnly ? 0 : 1 },
      instruction: { required: true, type: 'string' },
      casForbidden: { required: false, type: 'boolean', format: 'format-must-be-false' },
      sections: { required: true, type: 'array', minItems: 1, items: questionsSchema }
    }
  }

  return examContentSchema
}

const countGaps = L.count(L.query(['type', L.when(R.equals('gap'))]))

const newLenseValidations = V.propsOr(V.accept, {
  sections: V.choose(sections =>
    V.arrayId(
      V.choose((section, sectionIdx) =>
        V.propsOr(V.accept, {
          casForbidden: V.and(V.optional(R.is(Boolean)), [
            casForbidden => sectionIdx === 0 || !casForbidden || L.get([sectionIdx - 1, 'casForbidden'], sections),
            'A section may not be casForbidden if the previous section is not'
          ]),
          questions: V.arrayId(
            V.choose(question => {
              const { screenshotExpected, type, id } = question
              const sharedPropValidators = {
                displayNumber:
                  type !== 'label'
                    ? [R.test(/\S/), `Question ${id}: Empty display number not accepted for non-label fields`]
                    : V.accept
              }
              const sharedNonTextPropValidators = {
                ...sharedPropValidators,
                correctAnswers:
                  screenshotExpected === true
                    ? [R.isNil, `Question ${id}: screenshotExpected field cannot appear with correctAnswers`]
                    : V.accept
              }
              switch (question.type) {
                case 'text':
                case 'subtext':
                  return V.propsOr(V.accept, sharedPropValidators)
                case 'choicegroup':
                  return V.propsOr(
                    V.accept,
                    R.merge(sharedNonTextPropValidators, {
                      maxScore: [
                        V.optional(maxScore => Number.isInteger(maxScore / question.choices.length)),
                        `maxScore (${question.maxScore}) in choicegroup id ${question.id} must be divisible by number of questions (${question.choices.length})`
                      ]
                    })
                  )
                case 'multichoicegap':
                  return V.propsOr(
                    V.accept,
                    R.merge(sharedNonTextPropValidators, {
                      maxScore: [
                        V.optional(maxScore => Number.isInteger(maxScore / countGaps(question))),
                        `maxScore (${question.maxScore}) in multichoicegap id ${
                          question.id
                        } must be divisible by number of questions (${countGaps(question)})`
                      ]
                    })
                  )
                default:
                  return V.propsOr(V.accept, sharedNonTextPropValidators)
              }
            })
          )
        })
      )
    )
  )
})

// From now on, let's put the new validations here. Also, is-my-schema-valid validations could/should
// be converted.
const runNewLenseValidations = content => {
  const validationResult = V.errors(newLenseValidations, content)
  const errors = L.collectAs((message, field) => ({ field, message }), L.satisfying(R.is(String)), validationResult)
  return {
    valid: undefined === validationResult,
    errors
  }
}

export const validateExamContentFields = content => {
  const validate = validator(createExamValidationSchema(false), { formats: { 'format-must-be-false': /false/ } })
  const duplicateIds = duplicates.validateForDuplicateIds(content)
  const lenseValidationResult = runNewLenseValidations(content)
  const validationResult = validate(content)
  const validationErrors = validate.errors || []
  return {
    valid: validationResult && duplicateIds.valid && lenseValidationResult.valid,
    errors: [...duplicateIds.errors, ...validationErrors, ...lenseValidationResult.errors]
  }
}
