'use strict'

import stylesTmpl from './stylesTmpl'
import pictureTmpl from './pictureTmpl'
import videoTmpl from './videoTmpl'
import audioTmpl from './audioTmpl'

const typeIs = (attachment, type) => (attachment.mimeType || '').indexOf(type) === 0

function chooseTemplate(attachment) {
  if (typeIs(attachment, 'image')) {
    return pictureTmpl(attachment)
  } else if (typeIs(attachment, 'video')) {
    return videoTmpl(attachment)
  } else if (typeIs(attachment, 'audio')) {
    return audioTmpl(attachment)
  } else {
    return ''
  }
}

const anchorOrLink = attachment =>
  typeIs(attachment, 'image') || typeIs(attachment, 'video')
    ? `<a href="#${attachment.displayName}">${attachment.displayName}</a><br>`
    : `<a href="${attachment.url}" target="document">${attachment.displayName}</a><br>`

export default (exam, attachments) =>
  `<!DOCTYPE html>
<html>
<head>
  <meta charset='UTF-8'>
  <title>Aineisto - Material</title>
  ${stylesTmpl}
  <meta itemprop="name" content="attachments"> <!-- Used as a link target in exam -->
</head>
<body class="attachments">

<div id="attachments-view">
  <section class="question">
    <header class="question-header">${exam.title}</header>
    <div class="attachment-index">
      Aineisto - Material:<br>
      ${attachments.map(anchorOrLink).join('')}
    </div>
${attachments.map(chooseTemplate).join('')}
</section>
</div>
</body>
</html>`
