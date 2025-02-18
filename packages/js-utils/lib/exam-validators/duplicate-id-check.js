import _ from 'lodash'
import traverse from 'traverse'

export const findDuplicateIds = examJson => {
  const ids = traverse(examJson).reduce((acc, x) => {
    if (x && !_.isUndefined(x.id)) {
      acc.push(x.id)
    }
    return acc
  }, [])
  return _.compact(_.map(_.groupBy(ids), (idlist, key) => (idlist.length > 1 ? key : undefined)))
}

export const validateForDuplicateIds = examJson => {
  const issues = findDuplicateIds(examJson)
  return {
    valid: issues.length === 0,
    errors: issues.map(id => ({ field: id, message: `Duplicate ID ${id}` }))
  }
}
