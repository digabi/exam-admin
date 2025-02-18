import {
  CensoringScore,
  CensoringState,
  GradingAnswerType,
  GradingExamAndScores,
  GradingStudent,
  PostCensoringScoreResponse,
  PostPreGradingScoreResponse
} from './types'

// old scores is the scores in the state. Update the state based on reply from server
export function updateScoresFromResponse(
  oldScores: CensoringScore[],
  scoreResponse: PostPreGradingScoreResponse | PostCensoringScoreResponse
): CensoringScore[] {
  // score deleted
  if (scoreResponse.scoreValue === null) {
    return oldScores.filter(score => score.censoringRound !== scoreResponse.censoringRound)
  }
  // new score
  if (!oldScores.find(score => score.censoringRound === scoreResponse.censoringRound)) {
    return [convertResToCensoringScore(scoreResponse), ...oldScores]
  }
  // update existing score
  return oldScores.map(score => {
    if (score.censoringRound !== scoreResponse.censoringRound) {
      return score
    }
    return convertResToCensoringScore(scoreResponse)
  })
}

function convertResToCensoringScore(
  newScore: PostPreGradingScoreResponse | PostCensoringScoreResponse
): CensoringScore {
  return {
    scoreValue: newScore.scoreValue!,
    censoringRound: newScore.censoringRound,
    censorId: newScore.censorId!,
    shortCode: newScore.shortCode!
  }
}

export function postScoreUpdateState(
  setExamAndScores: React.Dispatch<React.SetStateAction<GradingExamAndScores | undefined>>,
  scoreResponse: PostPreGradingScoreResponse | PostCensoringScoreResponse,
  questionId: number,
  shouldUpdateCensoringState: boolean,
  scoreValueNumber: number | null
) {
  setExamAndScores((previousState: GradingExamAndScores | undefined) => {
    if (!previousState) {
      return previousState
    }
    const examAndScoresCopy = { ...previousState }
    const studentCopy = examAndScoresCopy.students.find(s => s.answers.some(a => a.answerId == scoreResponse.answerId))
    const scoreAverageCopy = examAndScoresCopy.scoreAverages?.find(a => a.questionId == questionId)
    const answerCopy = studentCopy?.answers.find((a): a is GradingAnswerType => a.answerId == scoreResponse.answerId)
    if (answerCopy) {
      answerCopy.scoreValue = scoreValueNumber
      answerCopy.versionNumber = scoreResponse.versionNumber
      if (answerCopy.censoring) {
        answerCopy.censoring.scores = updateScoresFromResponse(answerCopy.censoring.scores, scoreResponse)
      } else if (answerCopy.pregrading) {
        answerCopy.pregrading.scoreValue = scoreResponse.scoreValue ?? null
        answerCopy.pregrading.shortCode = scoreResponse.shortCode
        answerCopy.pregrading.authorId = scoreResponse.authorId
      }
    }
    if (studentCopy) {
      const studentTotal = studentCopy.answers.reduce((acc, a) => acc + (a.scoreValue || 0), 0)
      studentCopy.totalScore = studentTotal + studentCopy.totalAutogradingScore
      studentCopy.scoreDifferenceAcknowledgedBy = null
    }
    if (scoreAverageCopy) {
      const answers = examAndScoresCopy.students.flatMap(s => s.answers.filter(a => a.questionId == questionId))
      const columnSum = answers.reduce((acc, a) => (a.scoreValue ? acc + a.scoreValue : acc), 0)
      const count = answers.filter(a => a.scoreValue != undefined).length
      scoreAverageCopy.average = count ? (columnSum / count).toFixed(2) : '-'
    }
    if (shouldUpdateCensoringState) {
      updateCensoringState(studentCopy, answerCopy, scoreResponse.censoringState)
    }
    return examAndScoresCopy
  })
}

export function updateCensoringState(
  student?: GradingStudent,
  answer?: GradingAnswerType,
  censoringState?: CensoringState
) {
  if (answer) {
    if (censoringState && answer.censoring) {
      answer.censoring.censoringState = censoringState
    }
  }
  if (student) {
    const pregradingTotal = student.answers.reduce(
      (acc, a) => acc + (a.scoreValue == undefined ? 0 : (a.pregrading?.scoreValue ?? 0)),
      0
    )
    const studentTotal = student.answers.reduce((acc, a) => acc + (a.scoreValue ?? 0), 0)
    const diff = studentTotal - pregradingTotal
    student.score = diff === 0 ? '0' : diff > 0 ? `+ ${diff}` : `- ${Math.abs(diff)}`
  }
}
