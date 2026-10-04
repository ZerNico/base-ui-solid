import type { JSX } from '@solidjs/web';

export function isRenderableNode(node: JSX.Element): boolean {
  if (node == null || typeof node === 'boolean' || node === '') {
    return false;
  }
  if (Array.isArray(node)) {
    return node.some(isRenderableNode);
  }
  // Port note: a DOM text node is Solid's rendered form of a string.
  if (typeof Text !== 'undefined' && node instanceof Text) {
    return node.data !== '';
  }
  return true;
}

/**
 * Port note: upstream inspects the `children` prop of the evaluated React element. Solid renders
 * the element directly, so this inspects the rendered DOM element's child nodes instead (elements
 * and non-empty text count as content).
 */
export function hasRenderableChildren(element: JSX.Element): boolean {
  return (
    typeof Element !== 'undefined' &&
    element instanceof Element &&
    Array.from(element.childNodes).some(
      (child) => child instanceof Element || (child instanceof Text && child.data !== ''),
    )
  );
}
