import { GradingStudent, SetStudentEdited } from './types'
import React from 'react'
import classNames from 'classnames'

export function StudentAnonIdentifier({
  student,
  studentEdited,
  setStudentEdited,
  actionsDisabled,
  showActions = true
}: {
  student: GradingStudent
  studentEdited?: string
  setStudentEdited?: SetStudentEdited
  actionsDisabled?: boolean
  showActions?: boolean
}) {
  const className = 'studentCode js-student-anon-identifier'
  const { lastName, studentAnonIdentifier, studentUuid } = student
  const isSchoolGrading = !!lastName
  return (
    <td colSpan={isSchoolGrading ? 1 : 2} className={className}>
      {showActions && (
        <button
          className="studentRowActionsButton"
          disabled={actionsDisabled}
          onClick={e => {
            if (setStudentEdited) {
              setStudentEdited(studentEdited === studentUuid ? undefined : studentUuid)
              const cell = document.elementFromPoint(e.clientX, e.clientY)?.closest('td')
              const rect = cell?.getBoundingClientRect()
              const left = (rect?.left ?? 0) + (rect?.width ?? 0) + 3
              const top = (rect?.top ?? 0) - 3
              setTimeout(() => {
                const actions = document.querySelector('.studentRowActions')
                if (actions) {
                  actions?.setAttribute('style', `top: ${top}px; left: ${left}px;`)
                }
              }, 0)
            }
          }}>
          <i
            className={classNames('fa', {
              'fa-forward': isSchoolGrading && !student.skipPregrading,
              'fa-rotate-left': isSchoolGrading && student.skipPregrading,
              'fa-ellipsis-vertical': !isSchoolGrading
            })}
          />
        </button>
      )}
      {studentAnonIdentifier}
    </td>
  )
}
