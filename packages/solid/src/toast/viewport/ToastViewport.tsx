import { createMemo, For, omit, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { ownerDocument, ownerWindow } from '@base-ui-solid/utils/owner';
import { visuallyHidden } from '@base-ui-solid/utils/visuallyHidden';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { activeElement, contains, getTarget } from '../../floating-ui-react/utils';
import { FocusGuard } from '../../utils/FocusGuard';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { isFocusVisible } from '../utils/focusVisible';
import * as ToastViewportCssVars from './ToastViewportCssVars';

/**
 * A container viewport for toasts.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastViewport(componentProps: ToastViewport.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'children');

  const store = useToastProviderContext();
  const windowFocusTimeout = useTimeout();

  let handlingFocusGuard = false;
  let markedReadyForMouseLeave = false;
  let touchActive = false;

  const isEmpty = store.useState('isEmpty');
  const toasts = store.useState('toasts');
  const focused = store.useState('focused');
  const expanded = store.useState('expanded');
  const prevFocusElement = store.useState('prevFocusElement');
  const frontmostHeight = () => toasts()[0]?.height;

  const hasTransitioningToasts = createMemo(() =>
    toasts().some((toast) => toast.transitionStatus === 'ending'),
  );
  const highPriorityToasts = createMemo(() =>
    toasts().filter((toast) => toast.priority === 'high'),
  );

  useEffect(
    ([isEmptyValue]) => {
      // `store.state.viewport` isn't available on the first render, since the portal node hasn't yet
      // been created. Depending on `isEmpty` ensures the listeners are attached once toasts exist and
      // the viewport ref is available.
      const viewport = store.state.viewport;
      if (!viewport || isEmptyValue) {
        return undefined;
      }

      const win = ownerWindow(viewport);
      const doc = ownerDocument(viewport);

      // Listen globally for F6 so we can force-focus the viewport.
      function handleGlobalKeyDown(event: KeyboardEvent) {
        if (event.key === 'F6' && getTarget(event) !== viewport) {
          event.preventDefault();
          store.set('prevFocusElement', activeElement(doc) as HTMLElement | null);
          viewport?.focus({ preventScroll: true });
          store.pauseTimers();
          store.set('focused', true);
        }
      }

      function handleWindowBlur(event: FocusEvent) {
        if (getTarget(event) !== win) {
          return;
        }

        store.set('isWindowFocused', false);
        store.pauseTimers();
      }

      function handleWindowFocus(event: FocusEvent) {
        if (event.relatedTarget) {
          return;
        }

        const target = getTarget(event);
        const activeEl = activeElement(ownerDocument(viewport));
        if (
          target === win ||
          !contains(viewport, target as HTMLElement | null) ||
          !isFocusVisible(activeEl)
        ) {
          store.resumeTimers();
        }

        // Wait for the `handleFocus` event to fire.
        windowFocusTimeout.start(0, () => store.set('isWindowFocused', true));
      }

      return mergeCleanups(
        addEventListener(win, 'keydown', handleGlobalKeyDown),
        addEventListener(win, 'blur', handleWindowBlur, true),
        addEventListener(win, 'focus', handleWindowFocus, true),
        addEventListener(doc, 'pointerdown', store.handleDocumentPointerDown, true),
      );
    },
    () => [isEmpty()],
  );

  function handleFocusGuard(event: FocusEvent) {
    handlingFocusGuard = true;

    // If we're coming off the container, move to the first toast that can hold
    // focus, skipping toasts that are animating out or inert because they're limited.
    const firstFocusableToast =
      event.relatedTarget === store.state.viewport
        ? store.state.toasts.find((toast) => toast.transitionStatus !== 'ending' && !toast.limited)
        : undefined;

    if (firstFocusableToast) {
      firstFocusableToast.ref?.current?.focus();
    } else {
      store.restoreFocusToPrevElement();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Tab' && event.shiftKey && getTarget(event) === store.state.viewport) {
      event.preventDefault();
      // Restoring focus blurs the viewport, and `handleBlur` resumes the timers
      // from there. Resuming here as well would also fire when the previously
      // focused element lives inside the viewport, letting toasts dismiss out
      // from under the keyboard.
      store.restoreFocusToPrevElement();
    }
  }

  function flushMouseLeave() {
    const hasEndingToasts = store.state.toasts.some((toast) => toast.transitionStatus === 'ending');

    if (hasEndingToasts || touchActive || !markedReadyForMouseLeave) {
      return;
    }

    // Apply any mouseleave that was deferred until transitions finished.
    store.set('hovering', false);
    if (!store.select('expandedOrOutOfFocus')) {
      store.resumeTimers();
    }
    markedReadyForMouseLeave = false;
  }

  useEffect(
    () => {
      flushMouseLeave();
    },
    () => [hasTransitioningToasts()],
  );

  function handleMouseEnter() {
    store.pauseTimers();
    store.set('hovering', true);
    markedReadyForMouseLeave = false;
  }

  function handleMouseLeave() {
    // Defer to `flushMouseLeave`: while toasts are transitioning out or a touch gesture is active it
    // records the intent and collapses later; otherwise it collapses immediately.
    markedReadyForMouseLeave = true;
    flushMouseLeave();
  }

  function handlePointerDown(event: PointerEvent) {
    if (event.pointerType === 'touch') {
      touchActive = true;
    }
  }

  function handlePointerEnd(event: PointerEvent) {
    if (event.pointerType !== 'touch') {
      return;
    }

    touchActive = false;
    flushMouseLeave();
  }

  // Port note: reads the latest `focused` from the store, since the handler can run again before
  // Solid flushes the previous update (React re-renders in between).
  function handleFocus() {
    if (handlingFocusGuard) {
      handlingFocusGuard = false;
      return;
    }

    if (store.state.focused) {
      return;
    }

    // Only set focused when the active element is focus-visible.
    // This prevents the viewport from staying expanded when clicking inside without
    // keyboard navigation.
    if (isFocusVisible(activeElement(ownerDocument(store.state.viewport)))) {
      store.set('focused', true);
      store.pauseTimers();
    }
  }

  function handleBlur(event: FocusEvent) {
    if (
      !store.state.focused ||
      contains(store.state.viewport, event.relatedTarget as HTMLElement | null)
    ) {
      return;
    }

    store.set('focused', false);
    if (!store.select('expandedOrOutOfFocus')) {
      store.resumeTimers();
    }
  }

  const defaultProps = (): HTMLProps => {
    const height = frontmostHeight();
    return {
      tabindex: -1,
      role: 'region',
      'aria-live': 'polite',
      'aria-atomic': false,
      'aria-relevant': 'additions text',
      'aria-label': 'Notifications',
      onMouseEnter: handleMouseEnter,
      onMouseMove: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      // Port note: React's `onFocus`/`onBlur` bubble, so they map to `onFocusIn`/`onFocusOut`.
      onFocusIn: handleFocus,
      onFocusOut: handleBlur,
      onKeyDown: handleKeyDown,
      onClick: handleFocus,
      onPointerDown: handlePointerDown,
      onPointerUp: handlePointerEnd,
      onPointerCancel: handlePointerEnd,
      style: {
        [ToastViewportCssVars.frontmostHeight as string]: height ? `${height}px` : undefined,
      },
    };
  };

  const state = createMemo<ToastViewportState>(() => ({
    expanded: expanded(),
  }));

  const showFocusGuard = () => !isEmpty() && prevFocusElement() != null;

  // Port note: a DOM node can only be inserted once, so each position renders its own guard.
  function renderFocusGuard() {
    return (
      <Show when={showFocusGuard()}>
        <FocusGuard onFocus={handleFocusGuard} />
      </Show>
    );
  }

  const childrenProps = {
    get children() {
      return (
        <>
          {renderFocusGuard()}
          {componentProps.children}
          {renderFocusGuard()}
        </>
      );
    },
  };

  const setViewport = (element: HTMLDivElement | null) => {
    store.setViewport(element);
  };

  return (
    <>
      {renderFocusGuard()}
      {useRenderElement('div', componentProps, {
        ref: setViewport,
        state,
        props: () => [defaultProps(), elementProps, childrenProps],
      })}
      <Show when={!focused() && highPriorityToasts().length > 0}>
        <div style={visuallyHidden as JSX.CSSProperties}>
          <For each={highPriorityToasts()} keyed={(toast) => toast.id}>
            {(toast) => (
              <div role="alert" aria-atomic="true">
                <div>{toast().title}</div>
                <div>{toast().description}</div>
              </div>
            )}
          </For>
        </div>
      </Show>
    </>
  );
}

export interface ToastViewportState {
  /**
   * Whether toasts are expanded in the viewport.
   */
  expanded: boolean;
}

export interface ToastViewportProps extends BaseUIComponentProps<'div', ToastViewportState> {}

export namespace ToastViewport {
  export type State = ToastViewportState;
  export type Props = ToastViewportProps;
}
