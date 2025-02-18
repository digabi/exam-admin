import React from 'react'

export function blurHandler(e: React.FocusEvent<HTMLDivElement>, container: HTMLElement): void {
  if (e.target !== container) {
    container.dispatchEvent(new Event('blur', { bubbles: false, cancelable: true }))
  }
}
