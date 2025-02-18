import $ from 'jquery'
window.$ = $
window.jQuery = $
import * as Bacon from 'baconjs'
$.fn.asEventStream = Bacon.$.asEventStream
import 'jquery-ui/ui/effect'
import 'jquery-ui/ui/effects/effect-highlight'

if (window.MathJax) {
  window.MathJax.Hub.Config({
    extensions: ['tex2jax.js', 'asciimath2jax.js'],
    jax: ['input/TeX', 'input/AsciiMath', 'output/SVG'],
    tex2jax: {
      preview: ['ladataan/laddas'],
      inlineMath: [['\\(', '\\)']],
      displayMath: [['\\[', '\\]']],
      processEscapes: true
    },
    asciimath2jax: {
      preview: ['ladataan/laddas'],
      delimiters: [['`', '`']]
    },
    SVG: {
      font: 'STIX-Web'
    },
    TeX: {
      extensions: ['AMSmath.js', 'AMSsymbols.js', 'noErrors.js', 'noUndefined.js']
    },
    showMathMenu: false,
    showMathMenuMSIE: false,
    skipStartupTypeset: true,
    messageStyle: 'none'
  })

  window.MathJax.Hub.Configured()
}
