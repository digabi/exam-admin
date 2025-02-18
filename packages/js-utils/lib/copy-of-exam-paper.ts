export const examCopyFileNameToS3Path = (fileName: string) => {
  if (!fileName || !fileName.includes('.')) return fileName
  const examinationPeriod = fileName.substring(0, 5)
  const fileExtension = fileName.split('.').pop()!.toLowerCase()
  return `${examinationPeriod}/${fileExtension}/${fileName}`
}
