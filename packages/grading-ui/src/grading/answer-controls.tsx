import React, { useContext } from 'react'
import { useParams } from 'react-router-dom'
import {
  Censoring,
  CensoringState,
  GradingAnswerType,
  GradingExamAndScores,
  GradingRole,
  SetExamAndScores,
  SetLocalizedError
} from './types'
import { GradingContext, GradingUrlsContext, hasCensorWaitingPeriodPassedForAnswer } from './grading-view'
import { postJson } from '../common/utils'
import { UserData } from '../common/types'
import { useTranslation } from 'react-i18next'

export default AnswerControls

function AnswerControls(props: {
  gradingRole: GradingRole
  examAndScores: GradingExamAndScores
  setExamAndScores: SetExamAndScores
  setLocalizedError: SetLocalizedError
}) {
  const { examAndScores, gradingRole, setExamAndScores, setLocalizedError } = props
  const { user, waitingForCensorHours } = useContext(GradingContext)
  const { t } = useTranslation()
  const gradingUrls = useContext(GradingUrlsContext)

  const { studentCode, displayNumber } = useParams()
  const student = examAndScores.students.find(student => student.studentAnonIdentifier.toString() == studentCode)
  const answer = student?.answers.find((answer): answer is GradingAnswerType => answer.displayNumber == displayNumber)

  const censorWaitingPeriodHasPassed = hasCensorWaitingPeriodPassedForAnswer(answer, waitingForCensorHours)

  const showPregradingNotFinished =
    gradingRole === 'censoring' &&
    examAndScores.exam.censorDistributionDone &&
    !censorWaitingPeriodHasPassed &&
    !student?.skipPregrading

  if (showPregradingNotFinished) {
    return <p className="pregrading-not-finished">{t('arpa.censor.pregrading_not_ready')}</p>
  }

  if (
    !answer ||
    !answer.censoring ||
    !answer.censoring.scores.length ||
    !user ||
    !examAndScores.exam.isCensoringEnabled
  ) {
    return null
  }
  return (
    <div id="answer-controls">
      {canRequestNext(answer.censoring, answer.userCanScore) && (
        <button className="button" onClick={() => requestNextCensor(answer.answerId)}>
          {t(requestNextText(answer.censoring))}
        </button>
      )}
      {isWaitingForNext(answer.censoring) && (
        <div>
          <span className="answerControlNote">{t(waitingForNextText(answer.censoring))}</span>
          {canCancelNextCensorRequest(answer.censoring, user) && (
            <button className="button block" onClick={() => cancelNextCensor(answer.answerId)}>
              {t('arpa.censor.cancel_button')}
            </button>
          )}
        </div>
      )}
      {canBeMarkedHandled(answer.censoring, answer.userCanScore) && (
        <button className="button" onClick={() => updateCensoringActionToBackend('mark-handled')}>
          {t('arpa.censor.handled')}
        </button>
      )}
      {canBeAskedForApproval(answer.censoring, user) && (
        <button className="button" onClick={() => updateCensoringActionToBackend('ask-for-approval')}>
          {t('arpa.censor.ask_for_approval')}
        </button>
      )}
      {canApproveOrReject(answer.censoring, user) && (
        <div>
          <button className="button" onClick={() => updateCensoringActionToBackend('approve-censoring')}>
            {t('arpa.censor.approve')}
          </button>
          <button className="button" onClick={() => updateCensoringActionToBackend('reject-censoring')}>
            {t('arpa.censor.reject')}
          </button>
        </div>
      )}
      {canCancelAskForApproval(answer.censoring, user) && (
        <>
          <span className="answerControlNote">{t(needsApprovalsText(answer.censoring))}</span>
          <button className="button block" onClick={() => updateCensoringActionToBackend('cancel-ask-for-approval')}>
            {t('arpa.censor.cancel_handled')}
          </button>
        </>
      )}

      {canCancelApproveCensoring(answer.censoring, user) && (
        <>
          <span className="answerControlNote">{t('arpa.censor.approved')}</span>
          <button className="button block" onClick={() => updateCensoringActionToBackend('cancel-approve-censoring')}>
            {t('arpa.censor.cancel_approve')}
          </button>
        </>
      )}
      {canCancelHandled(answer.censoring) && (
        <>
          <span className="answerControlNote">{t('arpa.censor.handled')}</span>
          <button className="button block" onClick={() => updateCensoringActionToBackend('cancel-handled')}>
            {t('arpa.censor.cancel_handled')}
          </button>
        </>
      )}
    </div>
  )

  function requestNextCensor(answerId: number) {
    void (async () => {
      const currentState = answer!.censoring!.censoringState
      const nextState = currentState === 'initial_ok' ? 'waiting_for_second' : 'waiting_for_third'
      const response = await postJson(gradingUrls.requestNextCensor!(answerId))
      if (response.status >= 400) {
        setLocalizedError({ localizeKey: 'arpa.errors.problem' })
      } else {
        updateAnswerStateTo(nextState, false)
      }
    })()
  }

  function cancelNextCensor(answerId: number) {
    void (async () => {
      const currentState = answer!.censoring!.censoringState
      const nextState = currentState === 'waiting_for_second' ? 'initial_ok' : 'second_in_progress'
      const response = await postJson<{ canScore: boolean }>(gradingUrls.cancelNextCensor!(answerId))
      if (response.json) {
        updateAnswerStateTo(nextState, response.json.canScore)
      }
      if (response.status >= 400) {
        setLocalizedError({ localizeKey: 'arpa.errors.problem' })
      }
    })()
  }

  function updateCensoringActionToBackend(endpoint: string) {
    if (!answer) {
      return
    }
    void (async () => {
      const response = await postJson<{
        censoringState: CensoringState
        canScore: boolean | undefined
        shortCode: string | undefined
      }>(gradingUrls.postCensorAction!(endpoint, answer.answerId))
      if (response.json) {
        const { censoringState, canScore } = response.json
        updateAnswerStateTo(censoringState, canScore)
      }
      if (response.status >= 400) {
        setLocalizedError({ localizeKey: 'arpa.errors.problem' })
      }
    })()
  }

  function updateAnswerStateTo(newState: CensoringState, canScore: boolean | undefined) {
    setExamAndScores((previousState: GradingExamAndScores | undefined) => {
      const studentCopy = previousState?.students.find(s => s.studentAnonIdentifier.toString() == studentCode)
      const answerCopy = studentCopy?.answers.find(a => a.answerId == answer?.answerId)
      if (answerCopy) {
        answerCopy.censoring!.censoringState = newState
        // some endpoints deliver this explicit canScore-flag
        answerCopy.userCanScore =
          canScore !== undefined
            ? canScore
            : ['initial_ok', 'second_in_progress', 'third_in_progress'].includes(newState)
      }
      return previousState ? { ...previousState } : undefined
    })
  }
}

function canRequestNext(censoring: Censoring, userCanScore: boolean) {
  return userCanScore && ['initial_ok', 'second_in_progress'].includes(censoring.censoringState)
}

function requestNextText(censoring: Censoring) {
  return censoring.censoringState === 'initial_ok' ? 'arpa.censor.needs_second' : 'arpa.censor.needs_third'
}

function needsApprovalsText(censoring: CensoringWithNarrowedState) {
  return `arpa.censor.${censoring.censoringState}` as const
}

function waitingForNextText(censoring: Censoring) {
  return censoring.censoringState === 'waiting_for_second'
    ? 'arpa.censor.waiting_for_second'
    : 'arpa.censor.waiting_for_third'
}

function isWaitingForNext(censoring: Censoring) {
  return ['waiting_for_second', 'waiting_for_third'].includes(censoring.censoringState)
}

function canBeMarkedHandled(censoring: Censoring, userCanScore: boolean) {
  if (!userCanScore) {
    return false
  }
  const state = censoring.censoringState
  const stateIsCorrect = state === 'second_in_progress' || state === 'third_in_progress'
  const scoresAreTheSame = censoring.scores.every(score => score.scoreValue === censoring.scores[0].scoreValue)
  return stateIsCorrect && scoresAreTheSame
}

function canBeAskedForApproval(censoring: Censoring, user: UserData) {
  const state = censoring.censoringState
  const stateIsCorrect = state === 'second_in_progress' || state === 'third_in_progress'
  const scoresAreNotTheSame = censoring.scores.some(score => score.scoreValue !== censoring.scores[0].scoreValue)
  const lastScoreIsMine = censoring.scores[0].censorId === user?.user.censorId
  return stateIsCorrect && scoresAreNotTheSame && lastScoreIsMine
}

function canCancelApproveCensoring({ censoringState: state, scores }: Censoring, user: UserData) {
  const firstRoundScore = scores.find(score => score.censoringRound === 1)
  const secondRoundScore = scores.find(score => score.censoringRound === 2)
  const thirdRoundScore = scores.find(score => score.censoringRound === 3)
  return (
    thirdRoundScore &&
    ((state === 'needs_second_approval' && firstRoundScore?.censorId === user?.user.censorId) ||
      (state === 'needs_first_approval' && secondRoundScore?.censorId === user?.user.censorId))
  )
}

export function canApproveOrReject({ censoringState: state, scores }: Censoring, user: UserData) {
  const firstRoundScore = scores.find(score => score.censoringRound === 1)
  const secondRoundScore = scores.find(score => score.censoringRound === 2)

  switch (state) {
    case 'needs_both_approvals':
      return firstRoundScore?.censorId === user?.user.censorId || secondRoundScore?.censorId === user?.user.censorId
    case 'needs_first_approval':
      return firstRoundScore?.censorId === user?.user.censorId
    case 'needs_second_approval':
      return secondRoundScore?.censorId === user?.user.censorId
  }
}

function canCancelNextCensorRequest(censoring: Censoring, user: UserData) {
  const correctState = ['waiting_for_second', 'waiting_for_third'].includes(censoring.censoringState)
  return correctState && censoring.scores[0].censorId === user?.user.censorId
}

type CensoringWithNarrowedState = Censoring & {
  censoringState: 'needs_second_approval' | 'needs_first_approval' | 'needs_both_approvals'
}

function canCancelAskForApproval(censoring: Censoring, user: UserData): censoring is CensoringWithNarrowedState {
  const correctState = ['needs_second_approval', 'needs_first_approval', 'needs_both_approvals'].includes(
    censoring.censoringState
  )
  return correctState && censoring.scores[0].censorId === user?.user.censorId
}

function canCancelHandled(censoring: Censoring) {
  return censoring.censoringState === 'handled'
}
