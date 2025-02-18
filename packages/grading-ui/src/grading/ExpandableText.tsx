import React from 'react'
import { TextWithMarks } from './TextWithMarks'
import { useTranslation } from 'react-i18next'

export const ExpandableText = ({
  text,
  answerSearchTerm,
  expanded,
  isExpandable,
  previewTextLength,
  oneLine,
  openAnswer
}: {
  text: string
  answerSearchTerm: string
  expanded: boolean
  isExpandable: boolean
  previewTextLength: number
  oneLine: boolean
  openAnswer: (ref: React.RefObject<HTMLSpanElement>) => void
}) => {
  const { t } = useTranslation()
  const textWithoutDoubleLineBreaks = text.replace(/<br \/><br \/>/g, '<br />')

  const searchTermIndex = textWithoutDoubleLineBreaks.toLowerCase().indexOf(answerSearchTerm.toLowerCase())
  const start = Math.max(0, searchTermIndex + Math.round(answerSearchTerm.length / 2) - previewTextLength / 2)

  const isNotInTheEnd = start + previewTextLength < textWithoutDoubleLineBreaks.length
  const showExpandButton = !expanded && isExpandable && !oneLine
  const showLeadingEllipsis = showExpandButton && start > 0

  const textPreviewWithImagesAndLineBreaks = getTextPreviewWithImagesAndBrs(
    answerSearchTerm,
    previewTextLength,
    textWithoutDoubleLineBreaks
  )

  const textPartAroundSearchTerm = oneLine ? text : textPreviewWithImagesAndLineBreaks

  const wholeTextRef = React.useRef<HTMLSpanElement>(null)

  return (
    <span className={oneLine ? 'one-line' : ''}>
      {showLeadingEllipsis && <span className="ellipsis">...</span>}

      <span className="preview">
        <TextWithMarks text={textPartAroundSearchTerm} answerSearchTerm={answerSearchTerm} showMarks={true} />
      </span>

      {showExpandButton && (
        <span className="ellipsis" onClick={() => openAnswer(wholeTextRef)}>
          {isNotInTheEnd && '...'}
          <span className="show-all">{t('sa.answer_search.expand_whole_answer')}</span>
        </span>
      )}

      <span className="expander whole-text" ref={wholeTextRef}>
        <span className="expander-content">
          <TextWithMarks text={text} answerSearchTerm={answerSearchTerm} showMarks={expanded} />
        </span>
      </span>
    </span>
  )
}

const placeholderStart = '�'
const placeholderEnd = '␧'

const replaceImgAndBrTagsWithPlaceholder = (text: string) => {
  const replaceableTags: string[] = []
  // answers can contain <img> and <br> tags
  const textWithPlaceholders = text.replace(/<(img[^>]*|br\s*\/?)>/g, match => {
    replaceableTags.push(match)
    return `${placeholderStart}${replaceableTags.length - 1}${placeholderEnd}` // �0␧, �1␧, �2␧, ...
  })

  return { textWithPlaceholders, replaceableTags }
}

const getTextPreviewWithImagesAndBrs = (
  answerSearchTerm: string,
  previewTextLength: number,
  textWithoutDoubleLineBreaks: string
) => {
  const { textWithPlaceholders, replaceableTags } = replaceImgAndBrTagsWithPlaceholder(textWithoutDoubleLineBreaks)
  const searchTermIndex = textWithPlaceholders.toLowerCase().indexOf(answerSearchTerm.toLowerCase())
  let start = Math.max(0, searchTermIndex + Math.round(answerSearchTerm.length / 2) - previewTextLength / 2)
  let end = start + previewTextLength

  // Adjust start and end to ensure not partial placeholders are included
  const adjustBoundary = (index: number) => {
    if (textWithPlaceholders[index] === placeholderEnd) {
      index += 1
    } else if (textWithPlaceholders[index + 1] === placeholderEnd) {
      index += 2
    }
    if (textWithPlaceholders[index - 1] === placeholderStart) {
      index -= 1
    } else if (textWithPlaceholders[index - 2] === placeholderStart) {
      index -= 2
    }
    return index
  }

  start = adjustBoundary(start)
  end = adjustBoundary(end)

  const substringWithPlaceholders = textWithPlaceholders.substring(start, end)

  const textWithImagesAndLineBreaks = substringWithPlaceholders.replace(
    new RegExp(`${placeholderStart}\\d+${placeholderEnd}`, 'g'),
    match => {
      const tagIndex = match.slice(1, -1)
      return replaceableTags[Number(tagIndex)]
    }
  )
  return textWithImagesAndLineBreaks
}
