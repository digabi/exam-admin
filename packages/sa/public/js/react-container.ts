import React from 'react'
import $ from 'jquery'
import { createContainer } from './page-banner/page-banner'

export function reactComponentAsContainer(component: () => React.JSX.Element, props: Record<string, unknown>) {
  const container = createContainer(component, props)
  return $(container)
}
