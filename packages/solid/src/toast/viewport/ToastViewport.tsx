import { createMemo, createSignal, flatten, For, omit, Show, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { mergeCleanups } from '@base-ui-solid/utils/mergeCleanups';
import { ownerDocument, ownerWindow } from '@base-ui-solid/utils/owner';
import { visuallyHidden } from '@base-ui-solid/utils/visuallyHidden';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { areArraysEqual } from '@base-ui-solid/utils/areArraysEqual';
import { activeElement, contains, getTarget } from '../../floating-ui-solid/utils';
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
 * Documentation: [Base UI Toast](https://base-ui-solid.pages.dev/solid/components/toast)
 */
export function ToastViewport(componentProps: ToastViewport.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'children');

  const store = useToastProviderContext();
  const windowFocusTimeout = useTimeout();

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
  const highPriorityToasts = createMemo(
    () => toasts().filter((toast) => toast.priority === 'high'),
    { equals: areArraysEqual },
  );

  useEffect(
    ([isEmptyValue]) => {
      // Window focus is tracked even while empty, so toasts added in the background start paused.
      // `isEmpty` only toggles the F6 and touch listeners.
      const viewport = store.state.viewport;
      if (!viewport) {
        return undefined;
      }

      const win = ownerWindow(viewport);
      const doc = ownerDocument(viewport);

      // Listen globally for F6 so we can force-focus the viewport.
      function handleGlobalKeyDown(event: KeyboardEvent) {
        // Skip presses another viewport already handled.
        if (event.key !== 'F6' || event.defaultPrevented) {
          return;
        }

        event.preventDefault();
        // Set the restore target before focusing: consumer focus handlers may close the toasts.
        store.set('prevFocusElement', activeElement(doc) as HTMLElement | null);
        // `handleFocus` pauses only on visible focus, which script focus doesn't get everywhere.
        viewport?.focus({ preventScroll: true, focusVisible: true });
      }

      function handleWindowBlur(event: FocusEvent) {
        if (getTarget(event) !== win) {
          return;
        }

        windowFocusTimeout.clear();
        store.set('isWindowFocused', false);
        store.pauseTimers();
      }

      function handleWindowFocus(event: FocusEvent) {
        if (event.relatedTarget) {
          return;
        }

        // This capture listener also sees element focus, e.g. a click on a toast while nothing
        // had focus. Wait for `handleFocus` so keyboard focus inside the viewport keeps the pause,
        // and resume after the flag flips so toasts added in between start running too.
        windowFocusTimeout.start(0, () => {
          store.set('isWindowFocused', true);
          if (!store.select('expanded')) {
            store.resumeTimers();
          }
        });
      }

      return mergeCleanups(
        addEventListener(win, 'blur', handleWindowBlur, true),
        addEventListener(win, 'focus', handleWindowFocus, true),
        !isEmptyValue && addEventListener(win, 'keydown', handleGlobalKeyDown),
        !isEmptyValue &&
          addEventListener(doc, 'pointerdown', store.handleDocumentPointerDown, true),
      );
    },
    () => [isEmpty()],
  );

  function handleFocusGuard(event: FocusEvent) {
    // If we're coming off the container, move to the first toast that can hold
    // focus, skipping toasts that are animating out or inert because they're limited.
    const firstFocusableToast =
      event.relatedTarget === store.state.viewport
        ? store.state.toasts.find((toast) => toast.transitionStatus !== 'ending' && !toast.limited)
        : undefined;

    if (firstFocusableToast) {
      firstFocusableToast.ref?.()?.focus();
    } else {
      store.restoreFocusToPrevElement();
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.defaultPrevented) {
      return;
    }

    const isF6 = event.key === 'F6';
    if (isF6) {
      // Keep F6 pressed inside the viewport away from the global F6 listeners (including this
      // one's), which would pull focus back to the viewport. Without a return target, leave the
      // default action to the browser.
      event.stopPropagation();
    }

    if (
      (isF6 ||
        (event.key === 'Tab' && event.shiftKey && getTarget(event) === store.state.viewport)) &&
      store.state.prevFocusElement &&
      store.restoreFocusToPrevElement()
    ) {
      // Cancel only if focus moved: a hidden or disabled return target leaves the
      // browser free to move focus. `handleBlur` resumes the timers.
      event.preventDefault();
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
    if (store.state.focused) {
      return;
    }

    // Only set focused when the active element is focus-visible.
    // This prevents the viewport from staying expanded when clicking inside without
    // keyboard navigation.
    const activeEl = activeElement(ownerDocument(store.state.viewport));
    if (contains(store.state.viewport, activeEl) && isFocusVisible(activeEl)) {
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

  const state = createMemo<ToastViewportState>(
    () => ({
      expanded: expanded(),
    }),
    { equals: fastObjectShallowCompare },
  );

  const showFocusGuard = () => !isEmpty() && prevFocusElement() != null;

  // Port note: a DOM node can only be inserted once, so each position renders its own guard.
  function renderFocusGuard() {
    return (
      <Show when={showFocusGuard()}>
        <FocusGuard onFocus={handleFocusGuard} />
      </Show>
    );
  }

  const [viewportElement, setViewportElement] = createSignal<HTMLDivElement | null>(null, {
    ownedWrite: true,
  });

  // Port note: upstream renders the inner guards around the children. A Solid fragment moves the
  // toasts when guards are added on both sides (array reconciliation replaces the toast with the
  // leading guard and re-inserts it), and moving a focused toast drops its focus without a
  // `focusout`. So the guards are built in a memo (owned, and disposed when they're no longer
  // rendered) and inserted at the viewport's edges in a layout effect, which only moves DOM nodes,
  // like the triggers' focus guards (`useInsertedTriggerFocusGuards`).
  const innerGuards = createMemo(() => {
    if (!showFocusGuard()) {
      return null;
    }
    return untrack(() => ({
      before: flatten(<FocusGuard onFocus={handleFocusGuard} />) as HTMLElement,
      after: flatten(<FocusGuard onFocus={handleFocusGuard} />) as HTMLElement,
    }));
  });

  useIsoLayoutEffect(
    ([guards, viewport]) => {
      if (!guards || !viewport) {
        return undefined;
      }
      viewport.insertBefore(guards.before, viewport.firstChild);
      viewport.appendChild(guards.after);
      return () => {
        guards.before.remove();
        guards.after.remove();
      };
    },
    () => [innerGuards(), viewportElement()] as const,
  );

  const childrenProps = {
    get children() {
      return componentProps.children;
    },
  };

  const setViewport = (element: HTMLDivElement | null) => {
    setViewportElement(element);
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
        <div style={visuallyHidden}>
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
