import { createMemo, omit } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps } from '../../internals/types';
import { useToastRootContext } from '../root/ToastRootContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A container for the contents of a toast.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui-solid.pages.dev/solid/components/toast)
 */
export function ToastContent(componentProps: ToastContent.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const { visibleIndex, expanded, recalculateHeight } = useToastRootContext();

  let contentRef: HTMLDivElement | null = null;

  useIsoLayoutEffect(
    () => {
      recalculateHeight();

      const node = contentRef;
      if (!node || typeof ResizeObserver !== 'function' || typeof MutationObserver !== 'function') {
        return undefined;
      }

      const resizeObserver = new ResizeObserver(() => recalculateHeight(true));
      const mutationObserver = new MutationObserver(() => recalculateHeight(true));

      resizeObserver.observe(node);
      mutationObserver.observe(node, { childList: true, subtree: true, characterData: true });

      return () => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
      };
    },
    () => [recalculateHeight],
  );

  const behind = () => visibleIndex() > 0;

  const state = createMemo<ToastContentState>(
    () => ({
      expanded: expanded(),
      behind: behind(),
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('div', componentProps, {
    ref: (element: HTMLDivElement | null) => {
      contentRef = element;
    },
    state,
    props: elementProps,
  });
}

export interface ToastContentState {
  /**
   * Whether the toast viewport is expanded.
   */
  expanded: boolean;
  /**
   * Whether the toast is behind the frontmost toast in the stack.
   */
  behind: boolean;
}

export interface ToastContentProps extends BaseUIComponentProps<'div', ToastContentState> {}

export namespace ToastContent {
  export type State = ToastContentState;
  export type Props = ToastContentProps;
}
