import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { popupStateMapping } from './popupStateMapping';
import { useRenderElement } from '../internals/useRenderElement';
import type { UseRenderElementComponentProps } from '../internals/useRenderElement';
import { getDisabledMountTransitionStyles } from '../internals/getDisabledMountTransitionStyles';
import type { TransitionStatus } from '../internals/useTransitionStatus';
import type { HTMLProps } from '../internals/types';

interface UsePositionerOptions {
  styles: JSX.CSSProperties;
  transitionStatus: TransitionStatus;
  props?: HTMLProps<HTMLDivElement> | undefined;
  refs?:
    | ((element: HTMLDivElement | null) => void)
    | Array<((element: HTMLDivElement | null) => void) | undefined>
    | undefined;
  hidden?: boolean | undefined;
  inert?: boolean | undefined;
}

/**
 * Renders the shared outer Positioner element used by popup components.
 * Applies the common role, hidden state, transition styles, state attributes, and optional inert styling.
 *
 * Port note: `state` is an accessor, and `options` is read lazily (pass getters for reactive
 * values); `refs` is read once.
 */
export function usePositioner<State extends Record<string, any>>(
  componentProps: UseRenderElementComponentProps<State>,
  state: Accessor<State>,
  options: UsePositionerOptions,
) {
  const style = (): JSX.CSSProperties => {
    const result: JSX.CSSProperties = { ...options.styles };

    if (options.inert ?? false) {
      result['pointer-events'] = 'none';
    }

    return result;
  };

  return useRenderElement('div', componentProps, {
    state,
    ref: options.refs,
    props: () => [
      { role: 'presentation', hidden: options.hidden, style: style() },
      getDisabledMountTransitionStyles(options.transitionStatus),
      options.props,
    ],
    stateAttributesMapping: popupStateMapping,
  });
}
