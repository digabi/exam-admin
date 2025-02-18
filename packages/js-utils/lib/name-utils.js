// Removes the nobiliary particles ('von', 'auf', 'van', 'of', 'al', 'de', 'den', 'du', 'af', 'el', 'la', 'le',
// 'di', 'del', 'da') from the names for better sorting (von Great uses G, de Viss uses V etc.)
// Full names are separated by ',' so this works for them too
export function getSortingNameFromName(name) {
  return name.match(/^([a-z]{1,3} )?(.*)/)[2]
}

export function capitalizeName(name) {
  return name
    .toLowerCase()
    .replace(/(^| |-)(.)/g, x => x.toUpperCase())
    .replace(/(^| )(Von|Auf|Van|Of|Al|De|Den|Du|Af|El|La|Le|Di|Del|Da)( )/g, x => x.toLowerCase())
}
