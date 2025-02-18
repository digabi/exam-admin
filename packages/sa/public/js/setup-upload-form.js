import * as sautils from './sa-utils'
import utils from './utils'

export default function setupUploadForm(ajaxReq, $uploadForm, url) {
  $uploadForm.find('.upload-button').on('click', event => {
    event.preventDefault()
    $uploadForm.find('.upload-error').empty().removeAttr('data-i18n').hide()
    $uploadForm.find('.upload-input').click()
  })

  const uploadInputE = $uploadForm.find('.upload-input').asEventStream('change').filter(fileNameIsNotEmpty)

  uploadInputE.onValue(() => {
    hideUploadButton(true)
  })

  const uploadE = uploadInputE.flatMap(() => {
    // NOTE: FormData requires IE10+
    const formData = new FormData($uploadForm[0])
    return ajaxReq.postZip(url, formData, { timeout: 0 })
  })

  uploadInputE
    .delay(1500)
    .filter(uploadInputE.awaiting(uploadE.mapError()))
    .onValue(showUploadTakesLongNotification($uploadForm))

  return uploadE.doAction(enableUploadAndStopSpinner).doError(enableUploadAndStopSpinner)

  function fileNameIsNotEmpty() {
    return $uploadForm.find('.upload-input').val() !== ''
  }

  function hideUploadButton(hidden) {
    $uploadForm.find('.upload-button').toggle(!hidden)
  }

  function enableUploadAndStopSpinner() {
    hideUploadButton(false)
    $uploadForm.find('.upload-input').val(null)
    sautils.ui.stopSpinner($uploadForm.find('.upload-spinner'))
    $uploadForm.find('.upload-takes-long-container').hide()
  }

  function showUploadTakesLongNotification($uploadForm) {
    return () => {
      sautils.ui.startSpinner($uploadForm.find('.upload-spinner'), utils.ui.spinnerYtlVerySmall)
      $uploadForm.find('.upload-takes-long-container').css('display', 'inline-block')
    }
  }
}
