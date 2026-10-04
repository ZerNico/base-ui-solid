// Port note: immutable precomputed HAST nodes never change type; keyed source selection remounts them.
/* eslint-disable solid/components-return-once */
import { For, untrack } from 'solid-js';
import { Dynamic } from '@solidjs/web';
import type { JSX } from '@solidjs/web';

export interface CodeNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: CodeNode[];
  /**
   * Repository-relative path of the source file (set on `?highlight` imports).
   */
  path?: string;
}
export function Hast(props: { node: CodeNode }): JSX.Element {
  // Port note: precomputed HAST is immutable; snapshot this node once per component.
  const node = untrack(() => props.node);
  if (node.type === 'html') {
    // Port note: build-time escaped syntax HTML is immutable; skip thousands of token owners during hydration.
    // eslint-disable-next-line solid/no-innerhtml
    return <span style={{ display: 'contents' }} innerHTML={node.value} />;
  }
  if (node.type === 'text') {
    return node.value;
  }
  const children = () => <For each={node.children}>{(child) => <Hast node={child} />}</For>;
  if (node.type === 'root') {
    return children();
  }
  const properties = Object.fromEntries(
    Object.entries(node.properties ?? {}).map(([key, value]) => [
      key === 'className'
        ? 'class'
        : key.replace(/[A-Z]/g, (letter: string) => `-${letter.toLowerCase()}`),
      value,
    ]),
  );
  return (
    <Dynamic component={node.tagName as keyof JSX.IntrinsicElements} {...properties}>
      {children()}
    </Dynamic>
  );
}
