/**
 * Return a regular expression that only matches
 * empty string and integers from minScore to maxScore
 */
export function getScoreRegExp(maxScore: number, minScore: number = 0) {
  if (minScore < 0) {
    throw new Error('minScore is too small')
  }
  if (maxScore > 99) {
    throw new Error('maxScore is too large')
  }
  if (maxScore < 1) {
    throw new Error('maxScore is too small')
  }
  if (minScore > maxScore) {
    throw new Error('minScore is larger than maxScore')
  }

  const minTens = Math.floor(minScore / 10)
  const minOnes = minScore % 10
  const maxTens = Math.floor(maxScore / 10)
  const maxOnes = maxScore % 10

  if (minTens === maxTens) {
    const tensRegExp = maxTens > 0 ? `${maxTens}` : ''
    return `^ ?$|^${tensRegExp}[${minOnes}-${maxOnes}]$`
  }
  if (minTens > 0 && maxTens > 1) {
    const middlePart = maxTens > minTens + 1 ? `^[${minTens + 1}-${maxTens - 1}][0-9]$|` : ''
    return `^ ?$|^${minTens}[${minOnes}-9]$|${middlePart}^${maxTens}[0-${maxOnes}]$`
  } else {
    const middleRegExp = maxTens > 1 ? `^[1-${maxTens - 1}][0-9]$|` : ''
    return `^ ?$|^[${minOnes}-9]$|${middleRegExp}^${maxTens}[0-${maxOnes}]$`
  }
}
