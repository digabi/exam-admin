'use strict'

export default attachment => `
    <a class="attachment-header" name="${attachment.displayName}">${attachment.displayName}</a>
    <br>
    <audio controls>
      <source src="${attachment.url}" type="${attachment.mimeType}">
    </audio>
`
