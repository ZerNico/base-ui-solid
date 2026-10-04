import type { JSX } from '@solidjs/web';
import { omit } from 'solid-js';
// Port note: native links preserve upstream hrefs without Next.js routing.
export function Link(props: JSX.IntrinsicElements['a'] & { withArrow?: boolean }) {
  return (
    <a {...omit(props, 'withArrow', 'children')}>
      {props.children}
      {props.withArrow ? ' ↗' : null}
    </a>
  );
}
