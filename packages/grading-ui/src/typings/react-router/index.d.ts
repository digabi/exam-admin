export * from 'react-router'

import type { To, NavigateOptions } from 'react-router'
// React router documentation recommend specifying the type for NavigateFunction as it depends on the mode used
// We use Declarative Mode so we can specify that NavigateFunction doesn't return an async value
declare module 'react-router' {
  interface NavigateFunction {
    (to: To, options?: NavigateOptions): void
    (delta: number): void
  }
}
