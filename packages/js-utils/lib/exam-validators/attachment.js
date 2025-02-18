import * as R from 'ramda'
import * as path from 'path'
import BPromise from 'bluebird'
import fs_extra from 'fs-extra'

const fs = BPromise.promisifyAll(fs_extra)

const attachmentRegExp = /attachments\/([^#].+?)["\s\\]/g
const srcRegExp = /(?:src|href)\s*=\s*"([^#].+?)"/g
const audioRegEx = /"file":\s*"(.*(ogg|wav|mp3|opus|flac))"/g
const audioTestFileRegEx = /"type":\s*"audiotest",\s*"file":\s*"(.*)"/g

const AUDIO_FILE_USAGE_LIMIT = 2

export function validateAttachments(jsonFilePath) {
  return BPromise.join(checkAttachments(jsonFilePath), checkForUnknownDirs(jsonFilePath)).then(
    R.pipe(
      R.flatten,
      R.filter(error => !R.test(/(\/css\/attachments.css|\/math.svg)/, error)) //ignore /css/attachments.css and math.svg urls
    )
  )
}

function checkAttachments(filepath) {
  return BPromise.join(hasRestrictedAudioFiles(filepath), getRefsFromJson(filepath, audioTestFileRegEx)).spread(
    (hasAudioFiles, [testAudioFileName]) => {
      if (hasAudioFiles && testAudioFileName) {
        return BPromise.join(
          checkAudioAttachments(filepath, testAudioFileName),
          checkAttachmentsUsage(filepath, testAudioFileName)
        )
      } else if (!hasAudioFiles) {
        return BPromise.join(checkAudioReferences(filepath), checkAttachmentsUsage(filepath, testAudioFileName))
      } else {
        return BPromise.join(
          BPromise.resolve([`Audio test not found in exam`]),
          checkAttachmentsUsage(filepath, testAudioFileName)
        )
      }
    }
  )
}

function checkAttachmentsUsage(filepath, testAudioFileName) {
  return BPromise.join(fetchAttachments(filepath), fetchCustomFolderAttachments(filepath))
    .then(
      R.pipe(
        R.flatten,
        R.uniq,
        R.filter(name => name !== testAudioFileName) // dont include audiotestfile
      )
    )
    .then(attachments =>
      BPromise.join(getRefsFromJson(filepath, attachmentRegExp), getAttachmentsRefsFromHtml(filepath))
        .then(R.flatten)
        .then(attachmentRefs =>
          BPromise.join(
            findDifference(attachments, attachmentRefs, attachment => `Unused attachment ${attachment}`),
            findDifference(attachmentRefs, attachments, usage => `No attachment for ${usage}`)
          )
        )
    )
}

function checkAudioAttachments(jsonFilePath, audioTestFile) {
  const getOverUsedAudioFiles = R.pipe(
    R.countBy(R.toLower),
    R.mapObjIndexed((value, key) =>
      value > AUDIO_FILE_USAGE_LIMIT ? [`${key} was used ${value} times (limit ${AUDIO_FILE_USAGE_LIMIT})`] : []
    ),
    R.values,
    R.flatten
  )

  const checkTestAudiofileAttachment = dirPath =>
    fetchAttachments(dirPath).then(files =>
      !R.contains(audioTestFile, files) ? [`Audio test file ${audioTestFile} not found`] : []
    )

  const getUnusedAudioFiles = refs =>
    fetchRestrictedAttachments(jsonFilePath).then(files =>
      findDifference(files, refs, name => `Found unused audiofile in restricted/${name}`)
    )

  return getRefsFromJson(jsonFilePath, audioRegEx).then(refs =>
    BPromise.join(getOverUsedAudioFiles(refs), checkTestAudiofileAttachment(jsonFilePath), getUnusedAudioFiles(refs))
  )
}

function checkAudioReferences(filepath) {
  return getRefsFromJson(filepath, audioRegEx).then(
    R.pipe(
      R.filter(reference => R.match(audioRegEx)(reference)),
      R.map(file => `Found reference to ${file} while having no restricted audio folder. Is this intended?`),
      R.uniq
    )
  )
}

const restrictedFolderPath = dir => `${path.dirname(dir)}/attachments/restricted`

function hasRestrictedAudioFiles(dir) {
  return fs.pathExists(restrictedFolderPath(dir))
}

function fetchRestrictedAttachments(dir) {
  return fs.readdir(restrictedFolderPath(dir))
}

function getRefsFromJson(filepath, regex) {
  return fs.readFile(filepath, 'utf8').then(
    R.pipe(
      R.match(regex),
      R.map(match => R.split(regex, match)[1]),
      R.filter(match => match.length > 2) //sometimes gets single / as src
    )
  )
}

function getAttachmentsRefsFromHtml(dir) {
  return getRefsFromJson(`${path.dirname(dir)}/attachments/index.html`, srcRegExp)
}

function fetchAttachments(dir) {
  const isAttachment = file =>
    fs.lstat(`${path.dirname(dir)}/attachments/${file}`).then(stats => stats.isFile() && file !== 'index.html')

  return fs.readdir(`${path.dirname(dir)}/attachments`).then(files => BPromise.filter(files, isAttachment))
}

function fetchCustomFolderAttachments(dir) {
  const customFolderPath = `${path.dirname(dir)}/attachments/custom`
  return fs
    .pathExists(customFolderPath)
    .then(pathExists => (pathExists ? fs.readdir(customFolderPath).then(R.map(file => `custom/${file}`)) : []))
}

function checkForUnknownDirs(dir) {
  const isUnknownDir = file =>
    fs
      .lstat(`${path.dirname(dir)}/attachments/${file}`)
      .then(stats => stats.isDirectory() && file !== 'custom' && file !== 'restricted')

  return fs
    .readdir(`${path.dirname(dir)}/attachments`)
    .then(files => BPromise.filter(files, isUnknownDir).map(unknownDir => `Found unknown dir ${unknownDir}`))
}

function findDifference(compare, against, fn) {
  return R.map(fn, R.difference(compare, against))
}
