import type { JSX } from '@solidjs/web';

// Base UI Solid mark: an abstract S, a block with two thin slits entering from opposite sides.
export function Logo(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg width="22" height="24" viewBox="0 0 22 24" fill="currentColor" {...props}>
      <path d="M22 0H10C4.477 0 0 4.477 0 10V14.75H14V15.75H0V24H12C17.523 24 22 19.523 22 14V9.25H8V8.25H22Z" />
    </svg>
  );
}
