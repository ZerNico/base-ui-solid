/**
 * Port of `@floating-ui/react-dom`'s internal `deepEqual`.
 * Functions are compared by their source, so middleware options should pass `deps`
 * when their closures capture changing values.
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) {
    return true;
  }
  if (typeof a !== typeof b) {
    return false;
  }
  if (typeof a === 'function' && a.toString() === b.toString()) {
    return true;
  }

  let length: number;
  let i: number;
  let keys: string[];

  if (a && b && typeof a === 'object') {
    if (Array.isArray(a)) {
      length = a.length;
      if (length !== b.length) {
        return false;
      }
      for (i = length - 1; i >= 0; i -= 1) {
        if (!deepEqual(a[i], b[i])) {
          return false;
        }
      }
      return true;
    }

    keys = Object.keys(a);
    length = keys.length;
    if (length !== Object.keys(b).length) {
      return false;
    }

    for (i = length - 1; i >= 0; i -= 1) {
      if (!{}.hasOwnProperty.call(b, keys[i])) {
        return false;
      }
    }

    for (i = length - 1; i >= 0; i -= 1) {
      const key = keys[i];
      if (!deepEqual(a[key], b[key])) {
        return false;
      }
    }

    return true;
  }

  // eslint-disable-next-line no-self-compare
  return a !== a && b !== b;
}

export function getDPR(element: Element): number {
  if (typeof window === 'undefined') {
    return 1;
  }
  const win = element.ownerDocument.defaultView || window;
  return win.devicePixelRatio || 1;
}

export function roundByDPR(element: Element, value: number) {
  const dpr = getDPR(element);
  return Math.round(value * dpr) / dpr;
}
