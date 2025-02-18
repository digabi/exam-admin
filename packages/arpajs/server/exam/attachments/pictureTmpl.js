'use strict'

export default attachment => `
<div class="attachment">
  <a name="${attachment.displayName}" class="attachment-header">${attachment.displayName}</a><br>
  <div class="captioned-content landscape-large">
    <span class="image-header"><div class="enlarge"><a href="${attachment.url}" target="original-picture">Suurenna - Förstora</a></div></span>
    <img src="${attachment.url}" class="landscape-large"><br>
  </div>
</div>
`
