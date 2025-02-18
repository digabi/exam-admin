const date = new Date()
const year = date.getFullYear()
const month = date.getMonth() + 1

export const currentExaminationPeriod = String(year) + (month < 8 ? 'K' : 'S')
