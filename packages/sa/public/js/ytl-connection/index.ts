import React from 'react'
import { createRoot } from 'react-dom/client'
import { YtlConnection } from './ytl-connection'

let rootInitialized = false

export function init($container: JQuery) {
  if (!rootInitialized) {
    createRoot($container[0]).render(React.createElement(YtlConnection))
    rootInitialized = true
  }
}

export function update() {
  // React component manages its own state
}
