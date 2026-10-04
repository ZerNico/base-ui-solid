import type { JSX } from '@solidjs/web';
import '../../components/Link.css';
import { omit, Show } from 'solid-js';
import { RouterLink } from '../../components/RouterLink';

export function Link(props: JSX.IntrinsicElements['a'] & { withArrow?: boolean }) {
  return (
    <RouterLink {...omit(props, 'withArrow', 'children', 'class')} class={['Link', props.class]}>
      {props.children}
      <Show when={props.withArrow}>
        <svg
          width="20"
          height="20"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          stroke-width="1"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="Icon"
        >
          <path class="LinkArrowCaret" d="M6 12L10 8L6 4" />
          <path class="LinkArrowLine" d="M2 8L13 8" />
        </svg>
      </Show>
    </RouterLink>
  );
}
