import * as Bacon from 'baconjs'
import _ from 'lodash'
import $ from 'jquery'

const commonSpinnerOpts = {
  rotate: 0, // The rotation offset
  direction: 1, // 1: clockwise, -1: counterclockwise
  color: '#000', // #rgb or #rrggbb or array of colors
  speed: 0.8, // Rounds per second
  trail: 60, // Afterglow percentage
  shadow: true, // Whether to render a shadow
  hwaccel: true, // Whether to use hardware acceleration
  className: 'spinner', // The CSS class to assign to the spinner
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  top: '50%', // Top position relative to parent
  left: '50%' // Left position relative to parent
}

export default function (config = {}) {
  var ajaxTimeout = (config && config.ajaxTimeout) || 45000
  return {
    // T -> Bool
    notUndef: function (val) {
      return val !== undefined
    },
    finnishDateString: function (date) {
      date.setTime(date.getTime() + date.getTimezoneOffset() * 60 * 1000)
      return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`
    },
    // see test/date-string-test.js for tests for this function.
    // Should convert this to universal javascript so require from node would work
    yyyyMmDdStringToFinnishDateString: function yyyyMmDdStringToFinnishDateString(YYYY_MM_DD) {
      if (!YYYY_MM_DD || !YYYY_MM_DD.match) {
        throw new Error(`'${YYYY_MM_DD}' is not a date string of form YYYY-MM-DD`)
      }
      var matches = YYYY_MM_DD.match(/^(\d{4})-0?(\d{1,2})-0?(\d{1,2})$/)
      if (!matches || matches.length !== 4) {
        throw new Error(`'${YYYY_MM_DD}' is not a date string of form YYYY-MM-DD`)
      }
      return `${matches[3]}.${matches[2]}.${matches[1]}`
    },
    bacon: {
      getJson: getJson,
      postJsonFixed: function (url, data, opts) {
        return makeAjaxStream(postJsonReq(url, data, opts), undefined, optsWithErrorFilter(opts))
      },
      postJson: function (url, data, opts) {
        return makeAjaxStream(postJsonReq(url, data, opts), undefined, opts)
      },
      postZip: function (url, data, opts) {
        return makeAjaxStream(postZipReq(url, data, opts), undefined, opts)
      },
      deleteJson: function (url, opts) {
        return makeAjaxStream(deleteJsonReq(url, opts), undefined, opts)
      },
      get: function (url, opts) {
        return makeAjaxStream(getReq(url, opts), undefined, opts)
      },
      pollingGetJson: pollingGetJson
    },
    net: {
      ajaxRequests: function (errorHandler) {
        return {
          getJson: function (url, opts) {
            return makeAjaxStream(getJsonReq(url, opts), errorHandler, opts)
          },
          postJson: function (url, data, opts) {
            return makeAjaxStream(postJsonReq(url, data, opts), errorHandler, opts)
          },
          postZip: function (url, data, opts) {
            return makeAjaxStream(postZipReq(url, data, opts), errorHandler, opts)
          },
          deleteJson: function (url, opts) {
            return makeAjaxStream(deleteJsonReq(url, opts), errorHandler, opts)
          }
        }
      },
      getQueryParametersFromLocation: getQueryParametersFromLocation
    },
    ui: {
      redirectBrowserTo: function (url) {
        window.location.pathname = url
      },
      setupTestInterOp: function () {
        document.domain = location.hostname
        var parentOrigin = `${window.parent.location.protocol}//${window.parent.location.hostname}${
          window.parent.location.port ? `:${window.parent.location.port}` : ''
        }` // IE compatible
        window.parent.postMessage('PAGE_LOADED', parentOrigin)
      },
      spinnerYtlVerySmall: {
        ...commonSpinnerOpts,
        lines: 9, // The number of lines to draw
        length: 4, // The length of each line
        width: 1.5, // The line thickness
        radius: 3, // The radius of the inner circle
        corners: 1.2 // Corner roundness (0..1)
      },
      spinnerYtlSmall: {
        ...commonSpinnerOpts,
        lines: 10, // The number of lines to draw
        length: 6, // The length of each line
        width: 2.5, // The line thickness
        radius: 5, // The radius of the inner circle
        corners: 1.0 // Corner roundness (0..1)
      },
      spinnerYtlLarge: {
        ...commonSpinnerOpts,
        lines: 13, // The number of lines to draw
        length: 20, // The length of each line
        width: 8, // The line thickness
        radius: 37, // The radius of the inner circle
        corners: 0.8 // Corner roundness (0..1)
      }
    },
    browser: {
      getInternetExplorerVersion: function () {
        var version = -1
        var ua
        var re
        if (navigator.appName === 'Microsoft Internet Explorer') {
          ua = navigator.userAgent
          re = new RegExp('MSIE ([0-9]{1,}[.0-9]{0,})')
          if (re.exec(ua) !== null) {
            version = parseFloat(RegExp.$1)
          }
        } else if (navigator.appName === 'Netscape') {
          ua = navigator.userAgent
          re = new RegExp('Trident/.*rv:([0-9]{1,}[.0-9]{0,})')
          if (re.exec(ua) !== null) {
            version = parseFloat(RegExp.$1)
          }
        }
        return version
      }
    },
    countWords: function (text) {
      return text.length === 0 ? 0 : text.split(/\s+/gi).filter(s => s.length > 0).length
    },

    countCharacters: function (text) {
      return text.replace(/\s/g, '').length
    }
  }

  function getJson(url, opts) {
    return makeAjaxStream(getJsonReq(url, opts), undefined, opts)
  }

  function pollingGetJson(url, endOnError) {
    return Bacon.fromBinder(sink => {
      var id
      refresh()
      return function () {
        return window.clearTimeout(id)
      }

      function refresh() {
        var internalE = Bacon.once().flatMap(() => getJson(url))
        internalE.onValue(res => {
          if (sink(res) !== Bacon.noMore) {
            // Retry only if we still have consumers
            retry()
          }
        })
        internalE.onError(err => {
          var res = sink(new Bacon.Error(err))
          if (res !== Bacon.noMore && !endOnError) {
            // Retry only if we still have consumers and we want to continue on error
            retry()
          }
        })
      }
      function retry() {
        id = window.setTimeout(refresh, 2000)
      }
    })
  }

  function makeAjaxStream(req, errorHandler, opts) {
    var reqF = function () {
      return $.ajax(_.isFunction(req) ? req() : req).then((data, textStatus, request) => {
        if (opts && opts.includeResponseHeaders) {
          return {
            data: data,
            headers: _.fromPairs(
              request
                .getAllResponseHeaders()
                .split(/\s*\n\s*/)
                .map(row => row.split(/\s*:\s*/))
            )
          }
        } else {
          return data
        }
      })
    }
    var ajaxE = fromPromiseRetry(reqF, opts ? opts : {})
    return errorHandler ? ajaxE.flatMapError(errorHandler) : ajaxE
  }

  function getJsonReq(url, opts) {
    return _.extend({ type: 'GET', url: url, dataType: 'json', timeout: ajaxTimeout }, opts)
  }
  function getReq(url, opts) {
    return _.extend({ type: 'GET', url: url, timeout: ajaxTimeout }, opts)
  }

  function postJsonReq(url, data, opts) {
    return typeof data === 'function'
      ? function () {
          return _.extend(
            {
              type: 'POST',
              dataType: 'json',
              url: url,
              data: data(),
              contentType: 'application/json; charset=UTF-8',
              timeout: ajaxTimeout
            },
            opts
          )
        }
      : _.extend(
          {
            type: 'POST',
            dataType: 'json',
            url: url,
            data: data,
            contentType: 'application/json; charset=UTF-8',
            timeout: ajaxTimeout
          },
          opts
        )
  }

  function postZipReq(url, data, opts) {
    return _.extend(
      {
        type: 'POST',
        url: url,
        data: data,
        enctype: 'multipart/form-data',
        contentType: false,
        processData: false,
        timeout: ajaxTimeout
      },
      opts
    )
  }

  function deleteJsonReq(url, opts) {
    return _.extend({ type: 'DELETE', url: url, dataType: 'json', timeout: ajaxTimeout }, opts)
  }

  function optsWithErrorFilter(opts) {
    return opts ? updateObject(opts, 'isError', errorExcept200) : { isError: errorExcept200 }

    function errorExcept200(err) {
      return !(err.status && err.status === 200)
    }
  }

  function fromPromiseRetry(promiseF, opts) {
    var isRetryable =
      opts.isRetryable ||
      function () {
        return true
      }
    var delay =
      opts.delay ||
      function () {
        return 0
      }
    var retries = opts.retries || 0
    var errorAction = opts.errorAction || function () {}
    var isError =
      opts.isError ||
      function () {
        return true
      }

    return Bacon.fromBinder(sink => {
      var id
      function valueAndEnd(value) {
        sink(value)
        sink(new Bacon.End())
      }
      function resolve() {
        return promiseF().then(valueAndEnd, e => (isError(e) ? retry(new Bacon.Error(e)) : valueAndEnd(e)))
      }

      function retry(event) {
        if (isRetryable(event.error) && retries > 0) {
          retries--
          errorAction(event.error)
          id = window.setTimeout(resolve, delay({ error: event.error }))
        } else {
          valueAndEnd(event)
        }
      }
      resolve()
      return function () {
        return window.clearTimeout(id)
      }
    })
  }

  function getQueryParametersFromLocation() {
    var queryString = window.location.href.split('?')[1]
    return queryString ? _.fromPairs(_.map(queryString.split('&'), kv => kv.split('='))) : {}
  }

  function updateObject(target, key, val) {
    var newObj = _.clone(target)
    newObj[key] = val
    return newObj
  }
}
