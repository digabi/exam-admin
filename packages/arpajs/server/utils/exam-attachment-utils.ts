import { Attachment } from '../db/attachment-data'

function escapeRegExp(text: string) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')
}

export const renameAttachmentIfAlreadyExists = (
  attachmentToRename: string,
  size: number,
  attachments: Attachment[]
): string | undefined => {
  const extensionIndex = attachmentToRename.lastIndexOf('.')
  const parts = attachmentToRename.substring(0, extensionIndex).match(/^([^_]*)_?(\d*)$/)

  if (!parts || parts.length < 2) {
    return undefined
  }

  const attachmentAlreadyUploaded = attachments.find(
    a => a.size === size && a.displayName.match(new RegExp(`${escapeRegExp(parts[1])}(_\\d+\\.)?`))
  )

  if (attachmentAlreadyUploaded) {
    return attachmentAlreadyUploaded.displayName
  }

  const attachmentBySameButDifferentSize = attachments.find(
    a => a.size !== size && a.displayName === attachmentToRename
  )

  if (attachmentBySameButDifferentSize) {
    const n = Number(parts[2] || '0') + 1
    const newName = `${parts[1]}_${n}${attachmentToRename.substring(extensionIndex)}`
    return renameAttachmentIfAlreadyExists(newName, size, attachments)
  }

  return attachmentToRename
}
