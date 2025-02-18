declare global {
  interface Element {
    scrollIntoViewIfNeeded(centerIfNeeded?: boolean): void
  }
}
export function initScrollIntoViewIfNeededPolyfill() {
  if (!Element.prototype.scrollIntoViewIfNeeded) {
    Element.prototype.scrollIntoViewIfNeeded = function (this: HTMLElement, centerIfNeeded) {
      type Point = ReturnType<typeof makePoint>
      type Range = ReturnType<typeof makeRange>

      function makeRange(start: number, length: number) {
        return { start: start, length: length, end: start + length }
      }

      function coverRange(inner: Range, outer: Range) {
        if (false === centerIfNeeded || (outer.start < inner.end && inner.start < outer.end)) {
          return Math.min(inner.start, Math.max(outer.start, inner.end - outer.length))
        }
        return (inner.start + inner.end - outer.length) / 2
      }

      function makePoint(x: number, y: number) {
        return {
          x: x,
          y: y,
          translate: function translate(dX: number, dY: number) {
            return makePoint(x + dX, y + dY)
          }
        }
      }

      function absolute(elem: HTMLElement | null, pt: Point) {
        while (elem) {
          pt = pt.translate(elem.offsetLeft, elem.offsetTop)
          elem = elem.offsetParent as HTMLElement
        }
        return pt
      }

      let target = absolute(this, makePoint(0, 0))
      const extent = makePoint(this.offsetWidth, this.offsetHeight)
      let elem = this.parentNode
      let origin

      while (elem instanceof HTMLElement) {
        // Apply desired scroll amount.
        origin = absolute(elem, makePoint(elem.clientLeft, elem.clientTop))
        elem.scrollLeft = coverRange(
          makeRange(target.x - origin.x, extent.x),
          makeRange(elem.scrollLeft, elem.clientWidth)
        )
        elem.scrollTop = coverRange(
          makeRange(target.y - origin.y, extent.y),
          makeRange(elem.scrollTop, elem.clientHeight)
        )

        // Determine actual scroll amount by reading back scroll properties.
        target = target.translate(-elem.scrollLeft, -elem.scrollTop)
        elem = elem.parentNode
      }
    }
  }
}
