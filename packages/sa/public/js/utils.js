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
const ajaxTimeout = 45000
const utils = {
  bacon: {
    getJson: getJson,
    postJson: function (url, data, opts) {
      return makeAjaxStream(postJsonReq(url, data, opts), undefined, opts)
    },
    get: function (url, opts) {
      return makeAjaxStream(getReq(url, opts), undefined, opts)
    }
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
    }
  },
  ui: {
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
      let version = -1
      let ua
      let re
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
  }
}

function getJson(url, opts) {
  return makeAjaxStream(getJsonReq(url, opts), undefined, opts)
}

function makeAjaxStream(req, errorHandler, opts) {
  const reqF = function () {
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
  const ajaxE = fromPromiseRetry(reqF, opts ? opts : {})
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

function fromPromiseRetry(promiseF, opts) {
  const isRetryable =
    opts.isRetryable ||
    function () {
      return true
    }
  const delay =
    opts.delay ||
    function () {
      return 0
    }
  let retries = opts.retries || 0
  const errorAction = opts.errorAction || function () {}
  const isError =
    opts.isError ||
    function () {
      return true
    }

  return Bacon.fromBinder(sink => {
    let id
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

export default utils
