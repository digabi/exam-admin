import './init-side-effects'
import $ from 'jquery'
import _ from 'lodash'
import * as Bacon from 'baconjs'
import '@digabi/js-utils/dist/hbs-helpers'

import * as sautils from './sa-utils'
import utils from './utils'
import * as arpautils from './arpa-utils'

import * as annotationsEditing from '@digabi/answer-annotation/dist/annotations-editing'
import { PageBanner } from './page-banner/page-banner'
import { reactComponentAsContainer } from './react-container'
import * as i18n from './i18n'

import examAnswersT from '../templates/exam-answers.hbs'
import examScoreTableT from '../templates/exam-score-table.hbs'
import gradingActionBarT from '../templates/grading-action-bar.hbs'

import '../../less/arpa.less'
import { Footer } from './footer/footer'

const TAB = 9
const ENTER = 13
const LEFT = 37
const RIGHT = 39
const UP = 38
const DOWN = 40
const NAVIGATION_KEYS = [TAB, ENTER, LEFT, RIGHT, UP, DOWN]
const ANSWER_LIST_SCROLLER = window

const ajaxReq = utils.net.ajaxRequests(ajaxErrorHandler)
const uri = sautils.parseIdsFromLocation()
const eventViewUri = '/school/grading'
const gradingSummaryUri = `/school/review/${uri.eventId}`

if (!sautils.ui.showErrorIfBrowserUnsupported()) {
  sautils.setupAjax()
  arpautils.init(ajaxReq)

  arpautils.setupAfterPrintHandling()

  i18n.init(() => {
    ajaxReq.getJson('/kurko-api/user').onValue(userData => {
      $('#pagebanner').replaceWith(reactComponentAsContainer(PageBanner, { userName: userData.userName }))
      sautils.setDefaultUserRole(userData.roles, uri.schoolId)
      loadAndRenderGradingUI(uri.eventId)
      $('#footer').append(reactComponentAsContainer(Footer))
    })
  })
}

function ajaxErrorHandler(error) {
  return error.status === 401 ? location.reload(true) : new Bacon.Error(error)
}

function showExamName(examName) {
  $('.exam-name').text(examName)
}

// Grading view rendering

function loadAndRenderGradingUI(heldExamUuid) {
  arpautils.showPageStatus('arpa.loading_answers')

  arpautils.loadAnswersE(heldExamUuid).doAction(addActionBar).onValue(renderGradingUI)

  function addActionBar({ exam }) {
    $('#actionBar').append(gradingActionBarT({ isXml: exam.content === null }))
    $('.returnToEvents').attr('href', eventViewUri)
    $('.goToReturnExams a').attr('href', gradingSummaryUri)
    sautils.ui.makePrintButton('.printAnswerPapers')
    sautils.ui.makePreviewButton('.previewLink', exam.examUuid)
  }

  function renderGradingUI(examAndScores) {
    showExamName(examAndScores.exam.title)
    renderScoreTableAndAnswerList(examAndScores)
    calculateStudentScoresAndQuestionAverages(examAndScores.questionCount)
    setupCommentClickAndFocusHandlers()
    addScoreTableClickFocusAndKeyHandlers(examAndScores.students)

    renderAnnotationsAndSetupPopups($('#answers'), _.flatten(_.map(examAndScores.students, 'answers')))
    sautils.ui.renderMathInMultiChoiceAnswers()

    function renderScoreTableAndAnswerList(examAndScores) {
      $('#answers').append(examAnswersT(examAndScores))

      addEmptyAnswersForScoreTableRendering(examAndScores.students, examAndScores.maxScores)
      arpautils.showPageStatus('arpa.grading_instruction')
      $('#scoreTable').append(examScoreTableT(examAndScores))

      function addEmptyAnswersForScoreTableRendering(studentAnswers, questionScores) {
        studentAnswers.forEach(student => {
          student.answers = _.map(questionScores, q => {
            const answer = _.find(student.answers, a => a.questionId === q.id)
            // undefined was ok for chrome but not for firefox
            return answer ? answer : {}
          })
        })
      }
    }

    function calculateStudentScoresAndQuestionAverages(questionCount) {
      $('#scoreTable .student').each((index, domStudentElem) => {
        calculateAndUpdateStudentTotalScores($(domStudentElem))
      })
      const rangeExclusive = 1
      _.range(1, questionCount + rangeExclusive).forEach(calculateAndUpdateQuestionAverage)
    }

    function setupCommentClickAndFocusHandlers() {
      const $answers = $('#answers')
      $answers.on('click', '.answer', updateAnswerAndStudentHighlight)
      $answers.on('focus', '.scoreComment', updateAnswerAndStudentHighlight)
      $answers.on('click', '.addCommentToAnswer', showAndFocusCommentField)
      $answers.on('click', '.removeComment', removeComment)
      const changesE = $answers.asEventStream('keyup input cut paste', '.scoreComment')
      changesE.debounce(1000).onValue(event => {
        const $textarea = $(event.target)
        saveComment($textarea, $textarea.val())
      })
      changesE.onValue(event => {
        $(event.target).closest('.comment').removeClass('saved')
      })
    }
    function addScoreTableClickFocusAndKeyHandlers(students) {
      const $scoreTable = $('#scoreTable')
      $scoreTable.on('blur', '.scorePoints', updateAnswerAndStudentHighlight)
      $scoreTable.on('mousedown', '.scorePoints:enabled', e => {
        showGradingView(e)
        scrollToAnswer(e)
      })
      $scoreTable.on('focus', '.scorePoints:enabled', showGradingViewAndHighlightAnswer)
      $('.returnToGrid').on('click', transitionToScoreView)

      const newScoreE = $scoreTable
        .asEventStream('keyup input cut paste', '.scorePoints:not([readonly])')
        .filter(event => !_.includes(NAVIGATION_KEYS, event.which))
        .map(scoreFromEvent)

      newScoreE
        .filter(isValidScore)
        .skipDuplicates(_.isEqual)
        .groupBy(score => score.answerId)
        .flatMap(perCellScoreStream => perCellScoreStream.debounce(500))
        .onValue(saveScore)

      newScoreE
        .filter(score => !isValidScore(score))
        .onValue(score => {
          revertToPreviousValidValue(score.answerId)
        })

      $scoreTable
        .asEventStream('keydown', '.scorePoints')
        .filter(event => _.includes(NAVIGATION_KEYS, event.which))
        .filter(isMoveToNextOrPrevious)
        .doAction(event => event.preventDefault())
        .map(event => ({ key: event.which, id: getDataAnswerId(event.currentTarget) }))
        .map(buildArrowKeyNavigator())
        .filter(utils.notUndef)
        .onValue(id => {
          focusScoreCell(id)
          scrollAnswerById(id)
        })

      function scoreFromEvent(event) {
        const $score = $(event.target)
        return { answerId: $score.attr('data-answer-id'), value: $score.val() }
      }

      function isMoveToNextOrPrevious(event) {
        return (
          !(
            (event.which === RIGHT && event.target.value.length > event.target.selectionStart) ||
            (event.which === LEFT && event.target.selectionStart > 0)
          ) || $(event.target).is('[readonly]')
        )
      }

      function buildArrowKeyNavigator() {
        const answerIds = _.map(students, student => {
          const visibleAnswers = student.answers.filter(answer => !answer.shouldBeHiddenInGradingView)
          return _.map(visibleAnswers, 'id')
        })
        const answerIdsByRow = _.flatten(answerIds).filter(utils.notUndef)
        const answerIdsByColumn = _.flatten(answerIds[0].map((val, idx) => answerIds.map(row => row[idx]))).filter(
          utils.notUndef
        )

        return function findNewDatacellId(event) {
          const currentAnswerId = parseInt(event.id, 10)
          switch (event.key) {
            /* eslint-disable no-multi-spaces */
            case LEFT:
              return answerIdsByRow[answerIdsByRow.indexOf(currentAnswerId) - 1]
            case TAB:
            case ENTER:
            case RIGHT:
              return answerIdsByRow[answerIdsByRow.indexOf(currentAnswerId) + 1]
            case UP:
              return answerIdsByColumn[answerIdsByColumn.indexOf(currentAnswerId) - 1]
            case DOWN:
              return answerIdsByColumn[answerIdsByColumn.indexOf(currentAnswerId) + 1]
            /* eslint-enable no-multi-spaces */
          }
          return undefined
        }
      }
      function showGradingViewAndHighlightAnswer(event) {
        delayTransitionSoThatClickHandlerDoesItInCaseScoreClicked()
        highlightAnswerAndStudent(getDataAnswerId(event.currentTarget))

        function delayTransitionSoThatClickHandlerDoesItInCaseScoreClicked() {
          _.delay(transitionToGradingView, 200, event)
        }
      }
      function showGradingView(event) {
        transitionToGradingView(event)
        scrollAnswerById(getDataAnswerId(event.currentTarget))
      }
      function scrollToAnswer(event) {
        scrollAnswerById(getDataAnswerId(event.currentTarget))
      }
      function transitionToGradingView() {
        if (!$('.arpa').hasClass('grading')) {
          $('.arpa').addClass('grading')
          arpautils.clearPageStatus()
          createAnswerScrollHandler()
        }
      }
      function transitionToScoreView() {
        removeAnswerAndStudentHighlights()
        removeAnswerScrollHandler()
        $(document.activeElement).blur()
        arpautils.showPageStatus('arpa.grading_instruction')
        $('body').scrollTop(0)
        $('.arpa').removeClass('grading')
      }
    }
    function scrollAnswerById(answerId) {
      removeAnswerScrollHandler()
      const scrollTo = getAnswerElem(answerId).position().top
      $('html, body').stop().animate({ scrollTop: scrollTo }, { duration: 200, complete: createAnswerScrollHandler })
    }
    function createAnswerScrollHandler() {
      removeAnswerScrollHandler()
      $(ANSWER_LIST_SCROLLER).on('scroll', updateAnswerAndStudentHighlight)
    }
    function removeAnswerScrollHandler() {
      $(ANSWER_LIST_SCROLLER).off('scroll')
    }
    function updateAnswerAndStudentHighlight() {
      removeAnswerAndStudentHighlights()
      if (classIsFocused('scoreComment')) {
        const focusedComment = document.activeElement
        highlightAnswerAndStudent(getDataAnswerId(focusedComment))
      } else if (classIsFocused('scorePoints')) {
        focusScoreCell(getDataAnswerId(_.last(answersAboveScrollTreshold())))
      } else {
        const bottommostAnswerIdAboveScrollTreshold = getDataAnswerId(_.last(answersAboveScrollTreshold()))
        highlightAnswerAndStudent(bottommostAnswerIdAboveScrollTreshold)
        $(`#cell-${bottommostAnswerIdAboveScrollTreshold} .scorePoints`).addClass('highlight')
      }
    }
    function classIsFocused(className) {
      return document.activeElement.className === className
    }
    function answersAboveScrollTreshold() {
      const visibleAreaBelowScoreContainer = 90

      const $answers = $('.answer')
      const scrolledAmount = $(ANSWER_LIST_SCROLLER).scrollTop()
      const divisionPoint = scrolledAmount + visibleAreaBelowScoreContainer
      const topIsAbove = (answer, divider) => $(answer).position().top <= divider

      return $.grep($answers, answer => topIsAbove(answer, divisionPoint))
    }
    function showAndFocusCommentField(event) {
      removeAnswerScrollHandler()
      const $answer = $(event.target).closest('.answer')
      $answer.addClass('hasComment')
      removeAnswerAndStudentHighlights()
      scrollCommentUpIfNeeded($answer, () => {
        highlightAnswerAndStudent(getDataAnswerId($answer))
        $answer.find('.scoreComment').focus()
        createAnswerScrollHandler()
      })
    }
    function scrollCommentUpIfNeeded($answer, callback) {
      // eslint-disable-line consistent-return
      const answerBottom = $answer.offset().top + $answer.outerHeight()
      const screenBottom = $(window).height() + $(window).scrollTop()

      if (answerBottom > screenBottom) {
        const answerBottomVisibleScrollPosition = $(window).scrollTop() + (answerBottom - screenBottom)
        $('html, body')
          .stop()
          .animate({ scrollTop: answerBottomVisibleScrollPosition }, { duration: 200, complete: callback })
      } else {
        return callback()
      }
    }
    function removeComment(event) {
      const $answer = $(event.target).closest('.answer')
      $answer.removeClass('hasComment')
      const $textarea = $answer.find('.scoreComment')
      $textarea.val('')
      saveComment($textarea, null)
      focusScoreCell(getDataAnswerId($answer))
    }
    function focusScoreCell(answerId) {
      const $elem = $(`#cell-${answerId}`).find('input').focus()
      if (!$elem.is('[readonly]')) $elem.select()
    }
    function removeAnswerAndStudentHighlights() {
      $('.student').removeClass('selected')
      $('.answer').removeClass('selected')
      $('.scorePoints').removeClass('highlight')
    }
    function highlightAnswerAndStudent(answerId) {
      $('.scorePoints').removeClass('highlight')
      const $scoreCell = $(`#cell-${answerId}`)
      $scoreCell.closest('.student').addClass('selected')
      $scoreCell.children('.scorePoints').addClass('highlight')
      $('.answer').removeClass('selected')
      getAnswerElem(answerId).addClass('selected')
      scrollScoreCellToCenter($scoreCell)

      function scrollScoreCellToCenter($scoreCell) {
        const $scoreTable = $('#scoreScroller')
        const scrollTop = $scoreCell.position().top + $scoreCell.height() / 2 - $scoreTable.height() / 2
        $scoreTable.finish().animate({ scrollTop }, { duration: 200 })
      }
    }

    function renderAnnotationsAndSetupPopups($containerElement, allAnswers) {
      const annotationDb = arpautils.makeAnnotationDb(allAnswers)
      arpautils.renderAbittiAnnotations('.answerText', annotationDb.get, false)
      annotationsEditing.setupAnnotationDisplaying($containerElement, false)
      const localize = markup => $(markup.get(0).outerHTML).localize()
      annotationsEditing.setupAnnotationEditing($containerElement, annotationDb.save, localize)
    }
  }
}
function getDataAnswerId(elem) {
  return $(elem).attr('data-answer-id') || $(elem).closest('.answer').attr('data-answer-id')
}
function getAnswerElem(answerId) {
  return $(`.answer[data-answer-id="${answerId}"]`)
}

function saveComment($textarea, text) {
  const answerId = parseInt(getDataAnswerId($textarea), 10)
  updatePrintDiv(answerId, text)
  const ajax = ajaxReq.postJson(`/exam-api/grading/comments/${answerId}`, {
    comment: text ? text.trim() : null
  })
  ajax.onError(() => {
    sautils.ui.showLocalizedError('arpa.errors.saving_comment_failed')
  })
  ajax.onValue(() => {
    sautils.ui.hideError()
    $textarea.parent().addClass('saved')
  })

  function updatePrintDiv(answerId, text) {
    getAnswerElem(answerId).find('.printComment').html(text)
  }
}
function calculateAndUpdateStudentTotalScores($studentRow) {
  const totalScore = calculateTotalScoreForRow($studentRow)
  $studentRow.find('.totalScore').html(totalScore)
  $(`.student[data-student-uuid="${$studentRow.attr('id')}"]`)
    .find('.totalScore')
    .html(totalScore)
}
function calculateAndUpdateQuestionAverage(questionNumber) {
  const answerScoreIndex = questionNumber - 1
  const scoreElems = $('tr.student').map((index, studentRow) =>
    $(studentRow).find(`.answerScore:eq(${answerScoreIndex})`).find('.scorePoints:enabled').get(0)
  )
  const gradedScoreElems = removeEmptyElements(scoreElems)
  const mean = scoreElems.length
    ? gradedScoreElems.length
      ? (calculateSumOfElementValues(gradedScoreElems) / gradedScoreElems.length).toFixed(2)
      : '-'
    : ''
  $(`.meanScore:eq(${answerScoreIndex})`).html(mean)
}

function calculateTotalScoreForRow($studentRow) {
  return calculateSumOfElementValues(removeEmptyElements($studentRow.find('.scorePoints')))
}

function calculateSumOfElementValues(elems) {
  return _.reduce(elems, (sum, element) => sum + parseInt(element.value, 10), 0)
}

function removeEmptyElements(elems) {
  return _.filter(elems, isElementNotEmpty)
}

function isElementNotEmpty(element) {
  return typeof element.value !== 'undefined' && element.value !== ''
}

function isValidScore(score) {
  const $answer = getAnswerElem(score.answerId)
  const maxScore = parseInt($answer.find('.maxScore').text(), 10)
  return !((!$.isNumeric(score.value) && score.value !== '') || score.value > maxScore || score.value < 0) // eslint-disable-line no-extra-parens
}

function revertToPreviousValidValue(answerId) {
  getScoreCell(answerId).val(getPreviousValidScoreValue(answerId))

  function getScoreCell(answerId) {
    return $(`#cell-${answerId} .scorePoints`)
  }

  function getPreviousValidScoreValue(answerId) {
    return getScoreCell(answerId).attr('data-previous-valid-value')
  }
}

function saveScore(score) {
  const ajax = ajaxReq.postJson(`/exam-api/grading/scores/${parseInt(score.answerId, 10)}`, {
    scoreValue: parseInt(score.value, 10)
  })
  ajax.onError(() => {
    sautils.ui.showLocalizedError('arpa.errors.saving_score_failed')
  })
  ajax.onValue(() => {
    const $answer = getAnswerElem(score.answerId)
    $answer.find('.score .value').text(score.value)
    const $scoreCell = $(`#cell-${score.answerId}`)
    $scoreCell.find('.scorePoints').attr('data-previous-valid-value', score.value)
    calculateAndUpdateStudentTotalScores($scoreCell.closest('.student'))
    const nthQuestion = $scoreCell.parent().find('.answerScore').index($scoreCell) + 1
    calculateAndUpdateQuestionAverage(nthQuestion)
    sautils.ui.hideError()
  })
}
