/**
 * Return a regular expression that only matches
 * empty string and integers from minScore to maxScore
 */
export function getScoreRegExp(maxScore: number, minScore: number = 0) {
  if (minScore < 0) {
    throw new Error('minScore is too small')
  }
  if (maxScore < 1) {
    throw new Error('maxScore is too small')
  }
  if (minScore > maxScore) {
    throw new Error('minScore is larger than maxScore')
  }

  const scores = []
  for (let score = minScore; score <= maxScore; score++) {
    scores.push(score)
  }
  return `^ ?$|^(?:${scores.join('|')})$`
}

/**
 * Number of characters needed to type any score in the allowed range,
 * for use as the maxLength of a score input.
 */
export function getScoreMaxLength(maxScore: number) {
  return String(maxScore).length
}
