import { exec } from 'child-process-promise'
import { path as ffprobePath } from '@ffprobe-installer/ffprobe'
import * as mm from 'music-metadata'
import path from 'path'
import sharp from 'sharp'
import { pipeline } from 'stream/promises'
import { Readable } from 'stream'
import { logger } from '../../logger'
import { exc } from '@digabi/js-utils'

async function readImageMetadataFromStream(readable: Readable): Promise<{ width: number; height: number }> {
  const sharpInstance = sharp()
  const [metadata] = await Promise.all([sharpInstance.metadata(), pipeline(readable, sharpInstance)])
  const { width, height } = metadata

  if (width && height) {
    return { width, height }
  } else {
    throw new Error('Sharp was unable to determine image metadata')
  }
}

async function readAudioMetadataFromStream(readable: Readable) {
  const metadata = await mm.parseStream(readable, undefined, { duration: true })
  const duration = Math.round(metadata.format.duration!)

  if (Number.isNaN(duration)) {
    throw new Error('music-metadata was unable to determine audio metadata')
  }

  return { duration }
}

async function readVideoMetadataFromStream(readable: Readable): Promise<{ width: number; height: number }> {
  const ffprobe = exec(`${ffprobePath} -show_streams -print_format json -`)
  const [result] = await Promise.all([ffprobe, pipeline(readable, ffprobe.childProcess.stdin!).catch(ignoreEPIPE)])
  const output = JSON.parse(result.stdout) as { streams: { width: number; height: number }[] }
  const { width, height } = output.streams[0]

  if (width && height) {
    return { width, height }
  } else {
    throw new Error('ffprobe was unable to determine video metadata')
  }
}

function ignoreEPIPE(err?: NodeJS.ErrnoException) {
  if (err?.code === 'EPIPE') {
    // ffprobe may close stdin if it has read enough data to determine
    // everything it needs. Ignore these errors.
  } else {
    logger.warn('ffprobe failed', { error: err })
    throw new Error('ffprobe failed')
  }
}

export async function readAttachmentMetadata(
  filename: string,
  readable: Readable
): Promise<{ width: number; height: number } | { duration: number } | null> {
  const extname = path.extname(filename).toLowerCase()

  try {
    switch (extname) {
      case '.avi':
      case '.webm':
      case '.wmv':
      case '.mp4':
        return await readVideoMetadataFromStream(readable).catch(err => {
          // FIXME: Remove this on some day.
          logger.info(`Adding default metadata to video file ${filename}`, err)
          return { width: 640, height: 480 }
        })
      case '.png':
      case '.jpg':
      case '.jpeg':
      case '.tiff':
        return await readImageMetadataFromStream(readable)
      case '.mp3':
      case '.m4a':
      case '.ogg':
      case '.flac':
      case '.wma':
      case '.wav':
        return await readAudioMetadataFromStream(readable)
      default:
        return null
    }
  } catch (err) {
    logger.warn(`Error while parsing attachment metadata from ${filename}`, (err as Error).message)
    throw new exc.DataError(`Error while parsing attachment metadata from ${filename}`, 415)
  }
}
