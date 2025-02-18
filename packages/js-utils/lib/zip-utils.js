import * as yazl from 'yazl'
import * as yauzl from 'yauzl'
import BPromise from 'bluebird'
import { DataError } from './app-error'
import streamToPromise from 'stream-to-promise'
import * as fs from 'fs'
import * as path from 'path'
import { mkdirp } from 'mkdirp'
import fs_extra from 'fs-extra'
import _ from 'lodash'

const writeFileAsync = BPromise.promisify(fs.writeFile)
const fsExtra = BPromise.promisifyAll(fs_extra)
const MAX_ZIP_NAME_LENGTH = 72

export function createZip(filenamesAndContents) {
  filenamesAndContents.forEach(nameAndContent => {
    if (nameAndContent.content && !Buffer.isBuffer(nameAndContent.content)) {
      throw new Error(`Content of ${nameAndContent.name} is not a buffer`)
    }
  })
  const zip = new yazl.ZipFile()
  filenamesAndContents.forEach(nameAndContent => {
    if (nameAndContent.content) {
      zip.addBuffer(nameAndContent.content, nameAndContent.name, nameAndContent.options)
    } else if (nameAndContent.contentStream) {
      zip.addReadStream(nameAndContent.contentStream, nameAndContent.name, nameAndContent.options)
    } else {
      throw new Error(`No content buffer or stream for: ${nameAndContent.name}`)
    }
  })
  zip.end()
  return BPromise.resolve(streamToPromise(zip.outputStream))
}

export function createZipName(prefix, name, suffix) {
  const suff = suffix || 'meb'
  return `${`${prefix}_${name}`.replace(/[^a-zA-Z0-9.-]+/g, '_').substring(0, MAX_ZIP_NAME_LENGTH)}.${suff}`
}

export const extractZip = (data, maxEntrySize) =>
  BPromise.promisify(callbackExtractVersion)({ data, maxEntrySize, includeMetaData: false, extractData: true })

export const extractZipWithMetadata = (data, maxEntrySize) =>
  BPromise.promisify(callbackExtractVersion)({ data, maxEntrySize, includeMetaData: true, extractData: true })

export const extractZipMetadataOnly = (data, maxEntrySize) =>
  BPromise.promisify(callbackExtractVersion)({ data, maxEntrySize, includeMetaData: true, extractData: false })

export const extractFilesMatching = (data, filePattern, maxEntrySize) =>
  BPromise.promisify(callbackExtractVersion)({
    data,
    maxEntrySize,
    includeMetaData: true,
    extractData: true,
    filePattern
  })

function callbackExtractVersion({ data, maxEntrySize, includeMetaData, extractData, filePattern }, callback) {
  // eslint-disable-line no-shadow
  const entries = {}
  let entriesDone = 0
  // eslint-disable-next-line consistent-return
  yauzl.fromBuffer(data, { lazyEntries: true }, (err, zipFile) => {
    if (err) {
      return callback(new DataError(err))
    }
    if (0 === zipFile.entryCount) {
      return callback(null, entries)
    }
    zipFile.readEntry()
    zipFile.on('entry', handleEntry)
    zipFile.on('error', e => {
      zipFile.close()
      return callback(new DataError(e))
    })

    // eslint-disable-next-line consistent-return
    function handleEntry(entry) {
      if (entry.uncompressedSize > maxEntrySize) {
        return callback(new DataError(`Zip entry too large: ${entry.uncompressedSize} max allowed: ${maxEntrySize}`))
      }

      // eslint-disable-next-line consistent-return
      function entryDone(chunks) {
        entriesDone++
        entries[entry.fileName] = includeMetaData
          ? {
              uncompressedSize: entry.uncompressedSize,
              crc32: entry.crc32,
              mtime: entry.getLastModDate(),
              contents: Buffer.concat(chunks)
            }
          : Buffer.concat(chunks)
        if (entriesDone === zipFile.entryCount) {
          return callback(null, entries)
        }
        zipFile.readEntry()
      }

      if (!extractData) {
        return entryDone([])
      }

      if (filePattern && !entry.fileName.match(filePattern)) {
        return entryDone([])
      }

      // eslint-disable-next-line no-shadow, consistent-return
      zipFile.openReadStream(entry, (err, readStream) => {
        const chunks = []
        if (err) {
          return callback(new DataError(err))
        }
        readStream.on('error', e => callback(new DataError(e)))
        readStream.on('data', chunk => chunks.push(chunk))
        readStream.on('end', () => entryDone(chunks))
      })
    }
  })
}

export function extractZipFromDisk(zipFilePath, targetPath, filterFunc) {
  const filter = filterFunc ? filterFunc : () => true

  function callbackVersion(filePath, callback) {
    const fileNames = []
    // eslint-disable-next-line consistent-return
    yauzl.open(filePath, { lazyEntries: true }, (err, zipFile) => {
      if (err) return callback(new DataError(err))
      zipFile.readEntry()
      zipFile.on('entry', handleEntry)
      zipFile.on('error', e => {
        zipFile.close()
        return callback(new DataError(e))
      })
      zipFile.on('end', () => callback(null, fileNames))

      function handleEntry(entry) {
        if (filter(entry)) {
          if (/\/$/.test(entry.fileName)) {
            // eslint-disable-next-line promise/no-promise-in-callback
            mkdirp(path.join(targetPath, entry.fileName))
              .then(() => zipFile.readEntry())
              .catch(err => callback(new DataError(err)))
          } else {
            fileNames.push(entry.fileName)
            // eslint-disable-next-line no-shadow, consistent-return
            zipFile.openReadStream(entry, (err, readStream) => {
              if (err) return callback(new DataError(err))
              // eslint-disable-next-line promise/no-promise-in-callback
              mkdirp(path.join(targetPath, path.dirname(entry.fileName)))
                .then(() => {
                  const entryFilePath = path.join(targetPath, entry.fileName)
                  const out = fs.createWriteStream(entryFilePath)
                  out.on('finish', () => {
                    const mtime = entry.getLastModDate()
                    fs.utimesSync(entryFilePath, mtime, mtime)
                    return zipFile.readEntry()
                  })
                  readStream.pipe(out)
                  return
                })
                .catch(err => callback(new DataError(err)))
            })
          }
        } else {
          zipFile.readEntry()
        }
      }
    })
  }

  return BPromise.promisify(callbackVersion)(zipFilePath)
}

export function extractZipToDisk(zipBuffer, targetPath, maxEntrySize) {
  // eslint-disable-next-line no-shadow
  const writeZipEntry = targetPath => entry => {
    const isDir = _.endsWith(entry.name, '/')
    const entryPath = isDir ? entry.name : path.dirname(entry.name)

    function writeFile() {
      const fullPath = path.join(targetPath, entry.name)
      return !isDir ? writeFileAsync(fullPath, entry.contents) : BPromise.resolve()
    }

    return fsExtra.ensureDirAsync(path.join(targetPath, entryPath)).then(writeFile)
  }

  // eslint-disable-next-line no-shadow
  const writeFilesToDisk = targetPath => fileEntries => {
    if (!_.isEmpty(fileEntries)) {
      return fsExtra
        .ensureDirAsync(targetPath)
        .then(() => BPromise.map(fileEntries, writeZipEntry(targetPath), { concurrency: 20 }))
    } else {
      return BPromise.resolve()
    }
  }

  return extractZip(zipBuffer, maxEntrySize)
    .then(zipObject => _.map(zipObject, (v, k) => ({ contents: v, name: k })))
    .then(writeFilesToDisk(targetPath))
}
