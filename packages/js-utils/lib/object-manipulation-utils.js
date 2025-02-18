import _ from 'lodash'
import * as R from 'ramda'

export function groupByFields(flatObjects, groupByField, secondaryGroupingFields, nameForNestedCollection) {
  return _(flatObjects).groupBy(groupByField).map(pullUpGroupingFields).value()

  function pullUpGroupingFields(groupedObjects) {
    var groupedObj = {}
    groupedObj[groupByField] = groupedObjects[0][groupByField]
    _.forEach(secondaryGroupingFields, secondaryGroupingField => {
      groupedObj[secondaryGroupingField] = singleUnambiguousValue(secondaryGroupingField, groupedObjects)
    })
    var fieldsToOmit = _.union([groupByField], secondaryGroupingFields)
    groupedObj[nameForNestedCollection] = groupedObjects.map(originalObj => _.omit(originalObj, fieldsToOmit))
    return groupedObj
  }
}

export function singleUnambiguousValue(key, rows) {
  var allValues = _.reduce(
    rows,
    (memo, row) => _.filter(_.union(memo, _.flatten([row[key]])), v => !_.isUndefined(v)),
    []
  )
  if (allValues.length > 1) {
    throw new Error(`Multiple values for field '${key}':${JSON.stringify(allValues)}`)
  } else if (allValues.length === 0) {
    throw new Error(`No values for mandatory field '${key}':${JSON.stringify(allValues)}`)
  } else {
    return allValues[0]
  }
}

export function unambiguousValue(r) {
  return function (key) {
    var arr = r[key]
    if (arr && arr.length > 1) {
      throw new Error(`Multiple values for field '${key}':${JSON.stringify(arr)}`)
    }
    return arr && arr.length === 1 ? r[key][0] : undefined
  }
}

export function genericUnambiguousCode(r, key, allowedValues, unknownMessage) {
  var code = unambiguousValue(r)(key)
  if (code && !_.includes(allowedValues, code)) {
    throw new Error(`${unknownMessage} '${code}'` + ` for key '${key}'`)
  }
  return code
}

export function mapFields(obj, mapper, key) {
  if (_.isPlainObject(obj)) {
    return _.transform(obj, (res, v, k) => {
      var val = mapFields(v, mapper, k)
      if (val !== undefined) {
        res[k] = val
      }
    })
  } else if (_.isArray(obj)) {
    return _.map(obj, v => mapFields(v, mapper, key))
  } else {
    return mapper(obj, key)
  }
}

export function objectPropertiesToCamel(obj) {
  for (var prop in obj) {
    // eslint-disable-next-line no-prototype-builtins
    if (!obj.hasOwnProperty(prop)) {
      continue
    }
    renameProperty(obj, prop, _ToCamel(prop))
  }
  return obj

  function _ToCamel(str) {
    var words = str.split('_')
    return words.map((word, i) => (i > 0 ? capitalizeFirstLetter(word) : word)).join('')

    function capitalizeFirstLetter(word) {
      return word.charAt(0).toUpperCase() + word.slice(1)
    }
  }
}

export function renameProperty(obj, prop, newName) {
  if (prop !== newName) {
    obj[newName] = obj[prop]
    delete obj[prop]
  }
}

export const assocWith = R.curry((predicateObj, obj) =>
  R.pipe(
    R.toPairs,
    R.reduce((result, pair) => R.assoc(pair[0], pair[1](obj))(result), obj)
  )(predicateObj)
)
