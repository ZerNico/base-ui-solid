import type { JSX } from '@solidjs/web';

export function MinusIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-linecap="square"
      stroke-linejoin="round"
      class="Icon"
      {...props}
    >
      <path d="M1.5 8h13" />
    </svg>
  );
}
