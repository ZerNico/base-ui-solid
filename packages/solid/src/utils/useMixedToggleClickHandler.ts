import { ownerDocument } from '@base-ui-solid/utils/owner';
import type { BaseUIEvent } from '../internals/types';

/**
 * Returns `click` and `mousedown` handlers that fix the behavior of triggers of popups that are toggled by different events.
 * For example, a button that opens a popup on mousedown and closes it on click.
 * This hook prevents the popup from closing immediately after the mouse button is released.
 *
 * Port note: `params` is read lazily (pass getters for reactive values). The returned props object
 * exposes the handlers through getters that return `undefined` while disabled (upstream returns an
 * empty object), so merge it in a reactive scope.
 */
export function useMixedToggleClickHandler(params: UseMixedToggleClickHandlerParameters) {
  const enabled = () => params.enabled ?? true;
  let ignoreClick = false;

  const onMouseDown = (event: MouseEvent) => {
    const { mouseDownAction, open } = params;
    if ((mouseDownAction === 'open' && !open) || (mouseDownAction === 'close' && open)) {
      ignoreClick = true;

      ownerDocument(event.currentTarget as Element).addEventListener(
        'click',
        () => {
          ignoreClick = false;
        },
        { once: true },
      );
    }
  };

  const onClick = (event: BaseUIEvent<MouseEvent>) => {
    if (ignoreClick) {
      ignoreClick = false;
      event.preventBaseUIHandler();
    }
  };

  return {
    get onMouseDown() {
      return enabled() ? onMouseDown : undefined;
    },
    get onClick() {
      return enabled() ? onClick : undefined;
    },
  };
}

export interface UseMixedToggleClickHandlerParameters {
  /**
   * Whether the mixed toggle click handler is enabled.
   * @default true
   */
  enabled?: boolean | undefined;
  /**
   * Determines what action is performed on mousedown.
   */
  mouseDownAction: 'open' | 'close';
  /**
   * The current open state of the popup.
   */
  open: boolean;
}

export interface UseMixedToggleClickHandlerState {}
