import { ns, parseExam } from '@digabi/exam-engine-mastering'
import { ExamContent, ExamMultichoiceGapGap } from '@digabi/json-exam-utils'
import { Element } from 'libxmljs2'
import { callExamMastering, Exam, JSONExam } from '../xml-mastering'
import { generateXmlfromJson } from './json-to-xml'
import { logger } from '../../logger'

const allocateAnswerIds = (xmlContent: string, jsonContent: ExamContent) => {
  const xmlDoc = parseExam(xmlContent)
  const sectionElements = xmlDoc.find<Element>(`.//e:section`, ns)

  jsonContent.sections.forEach((section, sectionIndex) => {
    const sectionElement = sectionElements[sectionIndex]
    const questionElements = sectionElement.find<Element>(`./e:question`, ns)

    section.questions.forEach((question, questionIndex) => {
      const questionElement = questionElements[questionIndex]

      switch (question.type) {
        case 'text': {
          const answerElement = questionElement.get<Element>('./e:text-answer', ns)!
          answerElement.attr('question-id', String(question.id))
          return
        }

        case 'choicegroup': {
          const choiceElements = questionElement.find<Element>('./e:question', ns)
          question.choices.forEach((choice, choiceIndex) => {
            const choiceElement = choiceElements[choiceIndex]
            const answerElement = choiceElement.get<Element>('e:choice-answer', ns)!
            answerElement.attr('question-id', String(choice.id))
            const optionElements = answerElement.find<Element>('e:choice-answer-option', ns)
            choice.options.forEach((option, optionIndex) => {
              const optionElement = optionElements[optionIndex]
              optionElement.attr('option-id', String(option.id))
            })
          })
          return
        }

        case 'multichoicegap': {
          const answerElements = questionElement.find<Element>('./e:dropdown-answer', ns)
          question.content
            .filter((content): content is ExamMultichoiceGapGap => content.type === 'gap')
            .forEach((gap, gapIndex) => {
              const answerElement = answerElements[gapIndex]
              answerElement.attr('question-id', String(gap.id))
              const optionElements = answerElement.find<Element>('./e:dropdown-answer-option', ns)
              gap.options.forEach((option, optionIndex) => {
                const optionElement = optionElements[optionIndex]
                optionElement.attr('option-id', String(option.id))
              })
            })
          return
        }
      }
    })
  })

  return xmlDoc.toString(false)
}

export const attachmentFiles = (exam: Exam, ignoreMetadata: boolean) =>
  Array.from({ length: exam.attachments?.length || 0 }).map((_, file) => {
    const filename = Object.keys(exam.attachmentsMimetype)[file]
    const attachmentType = exam.attachmentsMimetype[filename]?.split('/')[0] // i.e. image/jpeg, video/webm..
    if (['audio', 'image', 'video'].includes(attachmentType)) {
      if ((exam.attachmentsMetadata && exam.attachmentsMetadata[filename]) || ignoreMetadata) {
        return {
          filename: filename,
          type: attachmentType
        }
      } else {
        throw new Error(`Missing metadata for attachment: ${filename}. Cannot convert`)
      }
    } else {
      return {
        filename: filename,
        type: 'file'
      }
    }
  })

export const tryMexConversion = async (exam: JSONExam) => {
  try {
    const examXml = generateXmlfromJson(exam.examLanguage, exam.content, attachmentFiles(exam, false))

    const masteringOptions = { throwOnLatexError: false, multiChoiceShuffleSecret: undefined, groupChoiceAnswers: true }
    const { masteringResult } = await callExamMastering(exam, examXml, masteringOptions, exam.attachmentsMetadata)

    const xmlWithAnswerIds = allocateAnswerIds(masteringResult[0].xml, exam.content)

    return { xml: xmlWithAnswerIds, attachments: masteringResult[0].attachments }
  } catch (e) {
    logger.warn('Mex conversion failed', {
      examUuid: exam.examUuid,
      message: (e as Error).message
    })

    throw e
  }
}
