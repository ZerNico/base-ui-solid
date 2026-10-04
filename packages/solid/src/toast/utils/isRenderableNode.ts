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
 * Port note: Solid resolves custom renders to DOM nodes, fragment arrays, or server markup.
 * Inspect the children of each root, preserving childless styling renders on both platforms.
 */
export function hasRenderableChildren(element: JSX.Element): boolean {
  if (Array.isArray(element)) {
    return element.some(hasRenderableChildren);
  }
  if (typeof Element !== 'undefined' && element instanceof Element) {
    return Array.from(element.childNodes).some(
      (child) => child.nodeType === 1 || (child.nodeType === 3 && child.textContent !== ''),
    );
  }
  // Port note: server JSX is Solid's serialized `{ t }` representation. Remove hydration
  // comments before inspecting root contents; no DOM globals are available during SSR.
  if (element && typeof element === 'object' && 't' in element) {
    const template = (element as { t: string | string[] }).t;
    const html = (Array.isArray(template) ? template.join('') : template).replace(
      /<!--[\s\S]*?-->/g,
      '',
    );
    const roots = html.matchAll(/<([\w:-]+)\b[^>]*>([\s\S]*?)<\/\1\s*>/g);
    return Array.from(roots).some((root) => root[2] !== '');
  }
  return false;
}
