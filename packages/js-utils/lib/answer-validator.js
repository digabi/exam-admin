import sanitizeHtml from 'sanitize-html'
import _ from 'lodash'

const sanitizeOpts = {
  allowedTags: ['div', 'img', 'br'],
  allowedAttributes: {
    img: ['src', 'alt']
  },
  allowedSchemes: [],
  exclusiveFilter: function (frame) {
    return frame.attribs['data-js'] === 'mathEditor'
  }
}

const screenshotImageSrcReString = '/screenshot/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'
const screenshotImageSrcRexexp = new RegExp(screenshotImageSrcReString, 'gi')
export const screenshotImageRegexp = new RegExp(`img src="${screenshotImageSrcReString}`, 'gi')

export function sanitizeAnswerContent(answerContent, additionalOptions = {}) {
  return sanitizeHtml(answerContent, { ...sanitizeOpts, ...additionalOptions })
}

export function containsInvalidImgTags(answerContent, logger) {
  const re = /img\s+src[^=]*=([^><]*)/gi
  const imageSources = []

  String(answerContent).replace(re, (match, src) => imageSources.push(src))
  const invalidImages = _.filter(imageSources, src => !isScreenshotImage(src) && !isMathImage(src))
  if (invalidImages.length > 0) {
    logger.warn('Following image tags are invalid:', _.uniq(invalidImages))
  }
  return invalidImages.length !== 0

  function isScreenshotImage(src) {
    return src.match(screenshotImageSrcRexexp) !== null
  }

  function isMathImage(src) {
    return src.match(/"\/math.svg\?latex/) !== null
  }
}
