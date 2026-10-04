import type { JSX } from '@solidjs/web';

export function CheckIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" {...props}>
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}
