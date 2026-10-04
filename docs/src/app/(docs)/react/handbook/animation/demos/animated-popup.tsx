import { createEffect, onCleanup, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';

// Port note: framework-independent animation replaces motion/react. The render
// callback's reactive state drives the same opacity/scale targets.
export function AnimatedPopup(props: JSX.IntrinsicElements['div'] & { open: boolean }) {
  let element: HTMLDivElement | undefined;
  let animation: Animation | undefined;
  createEffect(
    () => props.open,
    (open) => {
      if (!element) {
        return;
      }
      animation?.cancel();
      animation = element.animate(
        [
          { opacity: open ? 0 : 1, transform: `scale(${open ? 0.8 : 1})` },
          { opacity: open ? 1 : 0, transform: `scale(${open ? 1 : 0.8})` },
        ],
        { duration: 200, easing: 'ease-out', fill: 'forwards' },
      );
    },
  );
  onCleanup(() => animation?.cancel());
  return (
    <div
      {...omit(props, 'open', 'ref')}
      ref={(node) => {
        element = node;
        if (typeof props.ref === 'function') {
          props.ref(node);
        }
      }}
    />
  );
}
