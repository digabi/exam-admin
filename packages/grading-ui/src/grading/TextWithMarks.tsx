import React from 'react'
import { escapeRegExp } from 'lodash'

export const TextWithMarks = ({
  text,
  answerSearchTerm,
  showMarks
}: {
  text: string
  answerSearchTerm: string
  showMarks: boolean
}) => {
  if (answerSearchTerm === '' || !showMarks) {
    return <span dangerouslySetInnerHTML={{ __html: text }} />
  }

  // Regular expression to match <img> tags
  const imgTagRegex = /<img[^>]*>/g

  const parts: string[] = []
  let lastIndex = 0

  // Split text while preserving <img> tags
  text.replace(imgTagRegex, (imgTag: string, offset: number) => {
    parts.push(text.slice(lastIndex, offset))
    parts.push(imgTag)
    lastIndex = offset + imgTag.length
    return imgTag
  })
  parts.push(text.slice(lastIndex))

  // Regular expression to match search term
  const searchTermRegex = new RegExp(`(${escapeRegExp(answerSearchTerm)})`, 'gi')

  // Process parts to add <mark> tags around search term
  const partsWithMarkTags = parts.map((part, index) => {
    if (imgTagRegex.test(part)) {
      const isFormula = part.includes('math.svg')
      return `<span class="${isFormula ? 'formula' : 'image'}">${part}</span>` // Preserve <img> tags as is
    }
    return part
      .split(searchTermRegex)
      .map((subPart, subIndex) =>
        subPart.toLowerCase() === answerSearchTerm.toLowerCase()
          ? `<mark key=${index}-${subIndex}>${subPart}</mark>`
          : subPart
      )
      .join('')
  })

  return (
    <span
      dangerouslySetInnerHTML={{
        __html: partsWithMarkTags.join('')
      }}
    />
  )
}
