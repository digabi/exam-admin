'use strict'

export default attachment => `
    <a class="attachment-header" name="${attachment.displayName}">${attachment.displayName}</a>
    <br>
    <video controls>
      <source src="${attachment.url}" type="${attachment.mimeType}">
    </video>
`
