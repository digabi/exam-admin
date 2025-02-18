import { logger } from '../logger'
import { masterExam, MasteringOptions, MasteringResult, migrateExam, parseExam } from '@digabi/exam-engine-mastering'
import { exc } from '@digabi/js-utils'
import { ExamContent } from '@digabi/exam-types'
import config from '../config/configParser'

export type AttachmentsMetadata = { [key: string]: { duration?: number; width?: number; height?: number } | null }

export type Exam = {
  examUuid: string
  examLanguage: string
  attachments: string[]
  attachmentsMimetype: { [key: string]: string }
  attachmentsMetadata: AttachmentsMetadata
  locked: boolean
  password: string
  title: string
}

export type XmlExam = Exam & {
  contentXml: string
  content: null
}

export type JSONExam = Exam & {
  contentXml: null
  content: ExamContent
}

type MasteringExam = { examUuid?: string; examLanguage?: string; contentXml: string }

export function migrateXmlToLatestSchemaVersion(xml: string) {
  try {
    // Parse with validations turned off, since old exams will fail schema version checks.
    // Mastering will parse the XML again with validations turned on, so this is safe to do.
    const doc = parseExam(xml, false)
    // TODO: Perhaps a pure String -> String migration API in exam-engine would've been a better idea?
    migrateExam(doc)
    return doc.toString(false).replace(/([\s\S]*?)(<e:exam [\s\S]*)/, '$2')
  } catch (err) {
    logger.warn((err as Error).message)
    throw new exc.DataError('Error while migrating XML exam', 400)
  }
}

export async function callExamMastering(
  exam: { examUuid?: string; examLanguage?: string },
  examXml: string,
  masteringOptions: MasteringOptions,
  attachmentMetadata?: AttachmentsMetadata
): Promise<{ masteringResult: MasteringResult[]; migratedXml: string }> {
  const getMediaMetadata = async (displayName: string, type: 'video' | 'audio' | 'image') => {
    if (attachmentMetadata && attachmentMetadata[displayName]) {
      if (type === 'audio') {
        return Promise.resolve({
          duration: attachmentMetadata[displayName]?.duration || 999
        })
      } else {
        return Promise.resolve({
          width: attachmentMetadata[displayName]?.width || 999,
          height: attachmentMetadata[displayName]?.height || 999
        })
      }
    } else {
      // Return default values in order to support XML mastering and content validation without
      // having yet stored the attachments and their metadata.
      return Promise.resolve({ duration: 999, width: 640, height: 480 })
    }
  }
  const migratedXml = migrateXmlToLatestSchemaVersion(examXml)
  const masteringResultWithAllTypes = await masterExam(
    migratedXml,
    () => exam.examUuid || '',
    getMediaMetadata,
    masteringOptions
  )
  const masteringResult =
    masteringResultWithAllTypes.length > 1
      ? masteringResultWithAllTypes.filter(mastered => mastered.type === 'normal')
      : masteringResultWithAllTypes
  if (masteringResult.length > 1) {
    const filteredByLang = masteringResult.filter(masteredExam => masteredExam.language === exam.examLanguage)
    return { masteringResult: filteredByLang.length === 0 ? [masteringResult[0]] : filteredByLang, migratedXml }
  }
  return { masteringResult, migratedXml }
}

export const tryXmlMasteringWithShuffle = async (exam: MasteringExam, attachmentMetadata?: AttachmentsMetadata) =>
  tryXmlMastering(exam, false, attachmentMetadata)

export const tryXmlMastering = async (
  exam: MasteringExam,
  noShuffle: boolean,
  attachmentMetadata?: AttachmentsMetadata
) => {
  const shuffleSecret = noShuffle ? undefined : config.secrets.multiChoiceShuffleSecret
  try {
    const masteringOptions = { multiChoiceShuffleSecret: shuffleSecret, groupChoiceAnswers: true }
    const { masteringResult, migratedXml } = await callExamMastering(
      exam,
      exam.contentXml,
      masteringOptions,
      attachmentMetadata
    )

    return {
      migratedXml,
      ...masteringResult[0]
    }
  } catch (err) {
    logger.warn('XML mastering failed', (err as Error).message)
    throw new exc.DataError(`XML mastering failed, ${(err as Error).message}`, 400)
  }
}
