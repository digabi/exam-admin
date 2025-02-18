import Dropzone from 'react-dropzone'
import React, { useState } from 'react'
import { Attachment, doReq, ErrorObject, ErrorResponse, humanFileSize, sum, Translations, UsedAttachment } from './util'
import './Attachments.less'
import classNames from 'classnames'

type AttachmentProps = {
  examLocked: boolean
  attachmentsUrl: string
  className: string
  attachments: Attachment[]
  setAttachments: (fn: (atts: Attachment[]) => Attachment[]) => void
  setError: (errorObject: ErrorObject) => void
  t: Translations
  usedAttachments: UsedAttachment[]
}

export const Attachments = (props: AttachmentProps) => {
  const { examLocked, attachmentsUrl, className, attachments, setAttachments, setError, t, usedAttachments } = props
  const [spinnerActivated, setSpinnerActivated] = useState(false)

  function upload(files: File[]) {
    const addedAttachments = [] as Attachment[]
    spin()
    setError(null)
    Promise.all(
      files.map(file => {
        const body = new FormData()
        body.append('attachmentUpload', file)
        return doReq<Attachment[]>('POST', `${attachmentsUrl}/add`, body, null)
          .then(response => {
            const attachment = Object.assign(response[0], { size: file.size })
            return addedAttachments.push(attachment)
          })
          .catch((err: ErrorResponse) => {
            const message =
              err.status == 413 ? t.attachment_limit_exceeded(file.name) : t.attachment_retryable(file.name)
            setError({ title: t.error.general_error, message })
          })
      })
    )
      .catch((err: ErrorResponse) =>
        setError({ title: t.error.connection_error, message: t.attachment_retryable(err.message) })
      )
      .finally(() => {
        spin(false)
        const addedNames = addedAttachments.map(a => a.displayName)
        setAttachments(atts => atts.filter(a => !addedNames.includes(a.displayName)).concat(addedAttachments))
      })
  }

  function remove(fileName: string) {
    setError(null)
    doReq<null>('DELETE', `${attachmentsUrl}/${encodeURIComponent(fileName)}`)
      .then(() => setAttachments(atts => atts.filter(a => a.displayName !== fileName)))
      .catch(({ message }: ErrorResponse) => setError({ title: t.error.connection_error, message }))
  }

  function spin(enable?: boolean) {
    setSpinnerActivated(enable == undefined ? true : enable)
  }

  return (
    <div className={className}>
      <Dropzone onDrop={upload} disabled={spinnerActivated || examLocked}>
        {({ getRootProps, getInputProps }) => (
          <div
            {...getRootProps({
              className: ['attachments-upload', spinnerActivated ? 'attachments-upload-wait' : ''].join(' ')
            })}
          >
            <input {...getInputProps()} className="mex-field" />
            <div className="attachment-instructions">{t.add_attachments}</div>
          </div>
        )}
      </Dropzone>
      <div className="js-attachments-list attachments-list">
        {attachments.length > 0 && (
          <table>
            <tbody>
              {attachments
                .map(attachment => ({
                  ...attachment,
                  notUsed: !usedAttachments.find(({ filename }) => filename === attachment.displayName)
                }))
                .map((attachment, i) => (
                  <tr key={`att_${i}`} className={classNames({ 'not-used': attachment.notUsed })}>
                    <td className="file-name">
                      <a
                        href={`${attachmentsUrl}/${encodeURIComponent(attachment.displayName)}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {attachment.displayName}
                      </a>
                    </td>
                    <td className="file-size">{humanFileSize(attachment.size)}</td>
                    <td>
                      {attachment.notUsed && (
                        <a className="removeAttachment" onClick={() => remove(attachment.displayName)}>
                          <i className="fa fa-times-circle" />
                          {t.remove}
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
            <tfoot>
              <tr>
                <td />
                <td className="js-total-size">{humanFileSize(sum(attachments.map(({ size }) => size)))}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  )
}
