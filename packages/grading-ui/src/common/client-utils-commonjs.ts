import { format } from 'date-fns'
import { fi } from 'date-fns/locale/fi'
import { sv } from 'date-fns/locale/sv'
import { Language } from './types'

export function finnishDateString(date: Date) {
  date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000)
  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
}

export function localDateStringWithWeekdayAndYear(props: {
  date: string | null
  showYear?: boolean
  showWeekday?: boolean
  lang: Language
}) {
  const { date, showYear, showWeekday, lang } = props
  if (!date) {
    return ''
  }
  const weekdayString = showWeekday ? 'eeeeee' : ''
  const monthSeparator = lang === 'fi' ? '.' : ''
  const yearString = showYear ? 'y' : ''
  return format(date, `${weekdayString} d.M${monthSeparator}${yearString}`, { locale: lang === 'fi' ? fi : sv })
}

// see test/date-string-test.js for tests for this function.
// Should convert this to universal javascript so require from node would work
export function yyyyMmDdStringToFinnishDateString(YYYY_MM_DD: string) {
  if (!YYYY_MM_DD || !YYYY_MM_DD.match) {
    throw new Error(`'${YYYY_MM_DD}' is not a date string of form YYYY-MM-DD`)
  }
  const matches = YYYY_MM_DD.match(/^(\d{4})-0?(\d{1,2})-0?(\d{1,2})$/)
  if (!matches || matches.length !== 4) {
    throw new Error(`'${YYYY_MM_DD}' is not a date string of form YYYY-MM-DD`)
  }
  return `${matches[3]}.${matches[2]}.${matches[1]}`
}
