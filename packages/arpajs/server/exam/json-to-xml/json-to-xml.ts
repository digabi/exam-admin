import {
  Attachment,
  ExamChoiceGroupQuestion,
  ExamContent,
  ExamMultiChoiceGapQuestion,
  ExamQuestion,
  ExamSection,
  ExamTextQuestion
} from '@digabi/exam-types'
import * as libxml from 'libxmljs2'
import { exc } from '@digabi/js-utils'
import { addStringAsHtml, getSHA1Hash, SanitizeLevel } from './add-string-as-html'
import { isConvertibleToMex } from './mex-checker'
import { attachmentFiles, tryMexConversion } from './mex-xml-conversions'
import { JSONExam, migrateXmlToLatestSchemaVersion, tryXmlMasteringWithShuffle, XmlExam } from '../xml-mastering'
import { logger } from '../../logger'

export async function getExamAsXml(exam: XmlExam | JSONExam) {
  if (exam.contentXml !== null) {
    exam.contentXml = migrateXmlToLatestSchemaVersion(exam.contentXml)
    const { xml, usedAttachments } = await getMasteredXml(exam, false)
    return { ...exam, usedAttachments, masteredXml: xml }
  } else {
    let convertedExam = await jsonToXml(exam, SanitizeLevel.NORMAL)
    if (!convertedExam.contentXml) convertedExam = await jsonToXml(exam, SanitizeLevel.ALL)
    if (!convertedExam.contentXml) convertedExam = await jsonToXml(exam, SanitizeLevel.NO_TAGS)
    if (!convertedExam.contentXml) throw new exc.DataError(`Cannot convert exam ${exam.examUuid}`, 400)
    return convertedExam
  }
}

export async function getMasteredXml(exam: JSONExam | XmlExam, shouldTryMexConversion: boolean) {
  if (exam.contentXml !== null) {
    try {
      const { xml, attachments: usedAttachments } = await tryXmlMasteringWithShuffle(
        { contentXml: exam.contentXml, examLanguage: exam.examLanguage },
        exam.attachmentsMetadata
      )
      return { xml, usedAttachments }
    } catch (e) {
      return { xml: null, usedAttachments: [] }
    }
  }
  if (shouldTryMexConversion && (await isConvertibleToMex(exam.examUuid))) {
    try {
      const { xml, attachments: usedAttachments } = await tryMexConversion(exam)
      return { xml, usedAttachments }
    } catch (e) {
      return { xml: null, usedAttachments: [] }
    }
  }
  return { xml: null, usedAttachments: [] }
}

async function jsonToXml(exam: JSONExam, sanitizeLevel: SanitizeLevel) {
  const attachments = attachmentFiles(exam, true)
  try {
    const contentXml = generateXmlfromJson(exam.examLanguage, exam.content, attachments, sanitizeLevel)
    const { xml, attachments: usedAttachments } = await tryXmlMasteringWithShuffle(
      { contentXml: contentXml, examLanguage: exam.examLanguage },
      exam.attachmentsMetadata
    )
    return xml ? { ...exam, masteredXml: xml, contentXml, usedAttachments } : { ...exam, contentXml: null }
  } catch (err) {
    logger.warn(`Failed to convert exam, sanitizeLevel ${sanitizeLevel}:`, (err as Error).message)
    return { ...exam, contentXml: null }
  }
}

export function generateXmlfromJson(
  examLanguage: string,
  examContent: ExamContent,
  attachments: Attachment[],
  sanitizeLevel: SanitizeLevel = SanitizeLevel.NONE
) {
  const mandatoryExternalAttachments: string[] = []
  const redundantExternalAttachments: string[] = []
  const doc = new libxml.Document()
  const root = doc.node('e:exam')
  root.attr({
    'exam-schema-version': '0.2'
  })
  root.defineNamespace('http://www.w3.org/1999/xhtml')
  root.defineNamespace('e', 'http://ylioppilastutkinto.fi/exam.xsd')
  root.node('e:exam-versions').node('e:exam-version').attr('lang', examLanguage)

  addStringAsHtml(root.node('e:exam-title'), examContent.title, sanitizeLevel, attachments)
  addStringAsHtml(root.node('e:exam-instruction'), examContent.instruction, sanitizeLevel, attachments)
  const toc = new libxml.Element(doc, 'e:table-of-contents')
  root.addChild(toc)

  examContent.sections.forEach(section => root.addChild(buildSection(section)))

  const globalAttachments = attachments.filter(
    ({ filename }) =>
      !redundantExternalAttachments.includes(filename) || mandatoryExternalAttachments.includes(filename)
  )
  if (hasAttachments(globalAttachments)) {
    toc.addNextSibling(buildExternalMaterial(globalAttachments))
  }
  return doc.toString(false)

  function buildMultiChoiceGapQuestion(question: ExamMultiChoiceGapQuestion) {
    const el = new libxml.Element(doc, 'e:question')
    addStringAsHtml(
      el.node('e:question-title'),
      examLanguage === 'fi-FI' ? 'Aukkomonivalintatehtävä' : 'Uppgift med flervalsluckor',
      sanitizeLevel,
      attachments
    )
    updateGlobalAttachments(
      addStringAsHtml(el.node('e:question-instruction'), question.text, sanitizeLevel, attachments)
    )
    const gapCount = question.content.filter(x => x.type === 'gap').length
    const singleScore = isNaN(question.maxScore) ? 1 : Math.floor(question.maxScore / gapCount)
    question.content.forEach(x => {
      switch (x.type) {
        case 'text':
          updateGlobalAttachments(addStringAsHtml(el, x.text, sanitizeLevel, attachments))
          break
        case 'gap': {
          const dropdownEl = new libxml.Element(doc, 'e:dropdown-answer')
          x.options.forEach(option => {
            updateGlobalAttachments(
              addStringAsHtml(
                dropdownEl.node('e:dropdown-answer-option').attr({ score: String(option.correct ? singleScore : 0) }),
                option.text,
                sanitizeLevel,
                attachments
              )
            )
          })
          // without an added space dropdown elements would be drawn
          // too tightly next to each other
          el.addChild(new libxml.Text(doc, ' '))
          el.addChild(dropdownEl)
          el.addChild(new libxml.Text(doc, ' '))
          break
        }
        default: {
          const _: never = x
          return _
        }
      }
    })
    return el
  }

  function buildChoiceGroupQuestion(question: ExamChoiceGroupQuestion) {
    const el = new libxml.Element(doc, 'e:question')
    addStringAsHtml(
      el.node('e:question-title'),
      examLanguage === 'fi-FI' ? 'Monivalintatehtävä' : 'Flervalsuppgift',
      sanitizeLevel,
      []
    )
    updateGlobalAttachments(
      addStringAsHtml(el.node('e:question-instruction'), question.text, sanitizeLevel, attachments)
    )
    question.choices.forEach(choice => {
      const choiceEl = new libxml.Element(doc, 'e:question')
      addStringAsHtml(choiceEl.node('e:question-title'), '', sanitizeLevel, attachments)
      updateGlobalAttachments(
        addStringAsHtml(choiceEl.node('e:question-instruction'), choice.text, sanitizeLevel, attachments)
      )
      const answerEl = new libxml.Element(doc, 'e:choice-answer')
      choice.options.forEach(option => {
        const singleScore = isNaN(question.maxScore!) ? 1 : Math.floor(question.maxScore! / question.choices.length)
        updateGlobalAttachments(
          addStringAsHtml(
            answerEl.node('e:choice-answer-option').attr({ score: String(option.correct ? singleScore : 0) }),
            option.text,
            sanitizeLevel,
            attachments
          )
        )
      })
      choiceEl.addChild(answerEl)
      el.addChild(choiceEl)
      if (choice.breakAfter) {
        el.node('div', '***').attr({ class: 'e-font-size-xl e-mrg-y-4 e-color-link' })
      }
    })
    return el
  }

  function updateGlobalAttachments({
    usedInlineFilenames,
    usedAttachmentFileNames
  }: ReturnType<typeof addStringAsHtml>) {
    mandatoryExternalAttachments.push(...usedAttachmentFileNames)
    redundantExternalAttachments.push(...usedInlineFilenames)
  }

  function buildTextQuestion(question: ExamTextQuestion) {
    const el = new libxml.Element(doc, 'e:question')
    addStringAsHtml(
      el.node('e:question-title'),
      examLanguage === 'fi-FI' ? 'Tekstitehtävä' : 'Textuppgift',
      sanitizeLevel,
      []
    )
    const questionInstruction = el.node('e:question-instruction')
    updateGlobalAttachments(addStringAsHtml(questionInstruction, question.text, sanitizeLevel, attachments))
    el.node('e:text-answer').attr({
      type: question.screenshotExpected || sanitizeLevel !== SanitizeLevel.NONE ? 'rich-text' : 'multi-line',
      'max-score': String(Math.max(question.maxScore, 1))
    })
    return el
  }

  function buildQuestion(question: ExamQuestion) {
    switch (question.type) {
      case 'text':
        return buildTextQuestion({ ...question, type: 'text', maxScore: question.maxScore || 1, id: 1 })
      case 'subtext':
        return buildTextQuestion({ ...question, type: 'text', maxScore: question.maxScore || 1, id: 1 })
      case 'label':
        return buildTextQuestion({ ...question, type: 'text', maxScore: 1, id: 1 })
      case 'choicegroup':
        return buildChoiceGroupQuestion(question)
      case 'multichoicegap':
        return buildMultiChoiceGapQuestion(question)
      default:
        throw new Error(`Unsupported question type for question '${JSON.stringify(question)}'`)
    }
  }

  function buildSection(section: ExamSection) {
    const el = new libxml.Element(doc, 'e:section')
    if (section.casForbidden) {
      el.attr('cas-forbidden', section.casForbidden.toString())
    }
    if (section.title) {
      addStringAsHtml(el.node('e:section-title'), section.title, sanitizeLevel, attachments)
    } else {
      el.node('e:section-title')
    }
    section.questions.forEach(question => question.type !== 'audiotest' && el.addChild(buildQuestion(question)))
    return el
  }

  function buildAttachment(attachment: Attachment) {
    const el = new libxml.Element(doc, 'e:attachment')
    // name is required to add a reference to attachments page
    el.attr('name', getSHA1Hash(attachment.filename))
    el.node('e:attachment-title', attachment.filename)
    el.node(`e:${attachment.type}`).attr('src', attachment.filename)
    return el
  }

  function buildExternalMaterial(attachments: Attachment[]) {
    const el = new libxml.Element(doc, 'e:external-material')
    Object.keys(attachments).forEach((_, idx) => {
      el.addChild(buildAttachment(attachments[idx]))
    })
    return el
  }
}

function hasAttachments(attachments: Attachment[]) {
  return attachments && Object.keys(attachments).length > 0
}
