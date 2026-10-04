import { expect, describe, it } from 'vitest';
import { hasRenderableChildren, isRenderableNode } from './isRenderableNode';

describe('isRenderableNode', () => {
  it('treats renderable primitives as content', () => {
    expect(isRenderableNode(0)).toBe(true);
    expect(isRenderableNode(0n as any)).toBe(true);
    expect(isRenderableNode(Number.NaN)).toBe(true);
    expect(isRenderableNode('text')).toBe(true);
  });

  it('treats non-rendering values as empty', () => {
    expect(isRenderableNode(null)).toBe(false);
    expect(isRenderableNode(undefined)).toBe(false);
    expect(isRenderableNode(true)).toBe(false);
    expect(isRenderableNode(false)).toBe(false);
    expect(isRenderableNode('')).toBe(false);
  });

  it('recurses into arrays', () => {
    expect(isRenderableNode([])).toBe(false);
    expect(isRenderableNode([null, undefined, false])).toBe(false);
    expect(isRenderableNode([null, 0])).toBe(true);
    expect(isRenderableNode([[null]])).toBe(false);
    expect(isRenderableNode([[0]])).toBe(true);
  });
});

describe('hasRenderableChildren', () => {
  // Port note: Solid renders DOM elements directly, so the helper inspects the rendered element's
  // child nodes. `React.createElement('div', null, children)` becomes a `<div>` with those children.
  function createElement(...children: (string | number)[]) {
    const element = document.createElement('div');
    element.append(...children.map(String));
    return element;
  }

  it('requires an element whose children are renderable', () => {
    expect(hasRenderableChildren(createElement('text'))).toBe(true);
    expect(hasRenderableChildren(createElement(0))).toBe(true);
    expect(hasRenderableChildren(createElement())).toBe(false);
    expect(hasRenderableChildren(createElement(...[]))).toBe(false);
    expect(hasRenderableChildren(null)).toBe(false);
    expect(hasRenderableChildren('text')).toBe(false);
  });
});
