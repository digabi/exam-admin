export type ExtractedZip = { [key: string]: Buffer }
export type ExtratedZipWithMetadata = {
  [key: string]: {
    uncompressedSize: number
    crc32: string
    mtime: Date
    contents: Buffer
  }
}

export function createZip(
  filenamesAndContents: {
    content?: Buffer
    contentStream?: NodeJS.ReadableStream
    name: string
    options?: {
      mtime?: Date
      mode?: number
      compress?: boolean
      forceZip64Format?: boolean
      fileComment?: string
    }
  }[]
): Promise<Buffer>
export function createZipName(prefix: string, name: string, suffix: string): string
export function extractZip(data: Buffer, maxEntrySize?: number): Promise<ExtractedZip>
export function extractFilesMatching(
  data: Buffer,
  filename: string,
  sizeLimit?: number
): Promise<ExtratedZipWithMetadata>
