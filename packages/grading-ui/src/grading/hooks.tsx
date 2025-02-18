import React, { useCallback, useContext, useEffect } from 'react'
import { GradingContext } from './grading-view'
import { debounce } from 'lodash'
import { GradingAnswerType } from './types'
import { getScoreRegExp } from '../common/score-regexp'
import { Direction } from './grid-navigation'

export const useScrollIntoViewOnFocus = (
  isFocused: boolean,
  elementRef: React.RefObject<HTMLInputElement>,
  isReadOnly: boolean
) => {
  useEffect(() => {
    if (isFocused && elementRef.current) {
      elementRef.current.focus()
      if (!isReadOnly) {
        elementRef.current.select()
      }
      setTimeout(() => elementRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 0)
    }
  }, [isFocused])
}

export const useAnimateMarkingReady = (isReadOnly: boolean) => {
  const [_, setReadOnlyValue] = React.useState<boolean>(isReadOnly)
  const [justFinished, setJustFinished] = React.useState<boolean>(false)
  useEffect(() => {
    setReadOnlyValue(prevState => {
      if (prevState !== isReadOnly) {
        setJustFinished(true)
        setTimeout(() => setJustFinished(false), 5000)
      }
      return isReadOnly
    })
  }, [isReadOnly])
  return justFinished
}

export function useLocalScoreState(scoreValue: number | null, isWaitingForSecondOrThird: boolean) {
  const serverScoreString = scoreValue?.toString() ?? ''

  const [localScore, setLocalScore] = React.useState<string>(serverScoreString)

  useEffect(() => {
    setLocalScore(isWaitingForSecondOrThird ? '' : serverScoreString)
  }, [serverScoreString])

  return [localScore, setLocalScore] as const
}

export function useDebouncedScoreChange(
  answer: GradingAnswerType | Record<string, never>,
  localScore: string,
  setLocalScore: React.Dispatch<React.SetStateAction<string>>,
  isWaitingForSecondOrThird: boolean
) {
  const { postScoreAndUpdateState } = useContext(GradingContext)
  const [isSavingScore, setIsSavingScore] = React.useState<boolean>(false)

  const { scoreValue, maxScore } = answer

  const serverScoreString = scoreValue?.toString() ?? ''

  const answerScorePattern = getScoreRegExp(maxScore)
  const answerScoreRegex = new RegExp(answerScorePattern)

  const onScoreChange = (scoreValue: string) => {
    setLocalScore(scoreValue === ' ' ? '0' : scoreValue.trim())
    debounceAnswerChange(scoreValue)
  }

  const debounceAnswerChange = useCallback(
    debounce(
      (newScore: string) => updateIfValidScore(newScore, isWaitingForSecondOrThird ? undefined : scoreValue),
      750
    ),
    [isWaitingForSecondOrThird, scoreValue]
  )

  function updateIfValidScore(newScoreValue: string, previousScore: number | null | undefined) {
    const newScoreNumber = newScoreValue === '' ? undefined : Number(newScoreValue)
    const isValidScore = answerScoreRegex.test(newScoreValue)

    if (isValidScore && previousScore !== newScoreNumber) {
      void postScoreAndUpdateState(answer, newScoreValue, setIsSavingScore)
    }
  }

  const isNotSaved = localScore !== serverScoreString || !!isWaitingForSecondOrThird

  return { isSavingScore, isNotSaved, onScoreChange }
}

export const useGridNavigation = () => {
  const { navigationMap } = useContext(GradingContext)
  async function moveFocusWithModifier(direction: Direction, answerId: number) {
    await navigationMap[answerId][`${direction}Alt`]()
  }

  async function moveFocus(direction: Direction, answerId: number) {
    await navigationMap[answerId][direction]()
  }

  function keyDown(e: React.KeyboardEvent<HTMLInputElement>, answerId: number) {
    const callEventHandler = (direction: Direction) => {
      const eventHandler = e.altKey ? moveFocusWithModifier : moveFocus
      e.preventDefault()
      // avoid moving focus multiple times when holding down arrow keys
      if (e.repeat) {
        return Promise.resolve()
      }
      return eventHandler(direction, answerId)
    }

    switch (e.key) {
      case 'ArrowLeft':
        return callEventHandler('left')
      case 'ArrowRight':
        return callEventHandler('right')
      case 'ArrowUp':
        return callEventHandler('up')
      case 'ArrowDown':
        return callEventHandler('down')
      case 'Tab':
        return callEventHandler(e.shiftKey ? 'left' : 'right')
    }

    return Promise.resolve()
  }

  return keyDown
}
