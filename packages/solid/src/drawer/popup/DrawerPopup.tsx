import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { error } from '@base-ui-solid/utils/error';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { JSX } from '@solidjs/web';
import { createMemo, createSignal, omit, untrack } from 'solid-js';
import { useDialogPortalContext } from '../../dialog/portal/DialogPortalContext';
import { useDialogRootContext } from '../../dialog/root/DialogRootContext';
import { FloatingFocusManager } from '../../floating-ui-solid';
import { COMPOSITE_KEYS } from '../../internals/composite/composite';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import type { BaseUIComponentProps } from '../../internals/types';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useRenderElement } from '../../internals/useRenderElement';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { FOCUSABLE_POPUP_PROPS } from '../../utils/popups';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';
import * as DrawerBackdropCssVars from '../backdrop/DrawerBackdropCssVars';
import type { DrawerSwipeDirection } from '../root/DrawerRootContext';
import { useDrawerRootContext } from '../root/DrawerRootContext';
import { getSnapPointSwipeMovement, useDrawerSnapPoints } from '../root/useDrawerSnapPoints';
import { useDrawerViewportContext } from '../viewport/DrawerViewportContext';
import * as DrawerPopupCssVars from './DrawerPopupCssVars';
import * as DrawerPopupDataAttributes from './DrawerPopupDataAttributes';
// Module-level flag to ensure we only register the CSS properties once,
// regardless of how many Drawer components are mounted.
let drawerSwipeVarsRegistered = false;
/**
 * Removes inheritance of high-frequency drawer swipe CSS variables, which
 * reduces style recalculation cost in complex drawers with deep subtrees.
 * See https://motion.dev/blog/web-animation-performance-tier-list
 * under the "Improving CSS variable performance" section.
 */
function removeCSSVariableInheritance() {
  if (drawerSwipeVarsRegistered) {
    return;
  }
  // Intentionally keep inheritance disabled on WebKit as well. Safari doesn't support
  // opting descendants back in via `--var: inherit` for custom properties registered
  // with `inherits: false`, but Drawer does not rely on descendant access to these vars
  // (unlike ScrollArea), so we keep the performance optimization enabled.
  if (typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
    [
      DrawerPopupCssVars.swipeMovementX,
      DrawerPopupCssVars.swipeMovementY,
      DrawerPopupCssVars.snapPointOffset,
    ].forEach((name) => {
      try {
        CSS.registerProperty({
          name,
          syntax: '<length>',
          inherits: false,
          initialValue: '0px',
        });
      } catch {
        /* ignore already-registered */
      }
    });
    [
      {
        name: DrawerBackdropCssVars.swipeProgress,
        initialValue: '0',
      },
      {
        name: DrawerPopupCssVars.swipeStrength,
        initialValue: '1',
      },
    ].forEach(({ name, initialValue }) => {
      try {
        CSS.registerProperty({
          name,
          syntax: '<number>',
          inherits: false,
          initialValue,
        });
      } catch {
        /* ignore already-registered */
      }
    });
  }
  drawerSwipeVarsRegistered = true;
}
const stateAttributesMapping: StateAttributesMapping<DrawerPopupState> = {
  ...popupTransitionStateMapping,
  expanded(value) {
    return value ? { [DrawerPopupDataAttributes.expanded]: '' } : null;
  },
  nestedDrawerOpen(value) {
    return value ? { [DrawerPopupDataAttributes.nestedDrawerOpen]: '' } : null;
  },
  nestedDrawerSwiping(value) {
    return value ? { [DrawerPopupDataAttributes.nestedDrawerSwiping]: '' } : null;
  },
  swipeDirection(value) {
    return { [DrawerPopupDataAttributes.swipeDirection]: value };
  },
  swiping(value) {
    return value ? { [DrawerPopupDataAttributes.swiping]: '' } : null;
  },
};
/**
 * A container for the drawer contents.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Drawer](https://base-ui-solid.pages.dev/solid/components/drawer)
 */
export const DrawerPopup = function DrawerPopup(componentProps: DrawerPopup.Props) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'finalFocus',
    'initialFocus',
  );
  const store = useDialogRootContext();
  const popupRef = store.context.popupRef;
  const drawerContext = useDrawerRootContext();
  const descriptionElementId = store.useState('descriptionElementId');
  const disablePointerDismissal = store.useState('disablePointerDismissal');
  const floatingRootContext = store.select('floatingRootContext');
  const rootPopupProps = store.useState('popupProps');
  const modal = store.useState('modal');
  const mounted = store.useState('mounted');
  const nested = store.useState('nested');
  const nestedOpenDrawerCount = store.useState('nestedOpenDrawerCount');
  const transitionStatus = store.useState('transitionStatus');
  const open = store.useState('open');
  const openMethod = store.useState('openMethod');
  const titleElementId = store.useState('titleElementId');
  const role = store.useState('role');
  const floatingId = floatingRootContext.useState('floatingId');
  const popupId = createMemo(() => elementProps.id ?? floatingId());
  const swipe = useDrawerViewportContext();
  void useDialogPortalContext();
  const snapPointData = useDrawerSnapPoints();
  const nestedDrawerOpen = createMemo(() => nestedOpenDrawerCount() > 0);
  const swiping = createMemo(() => swipe?.swiping() ?? false);
  const swipeStrength = createMemo(() => swipe?.swipeStrength() ?? null);
  const [popupHeight, setPopupHeight] = createSignal(0, { ownedWrite: true });
  const popupHeightRef = { current: 0 };
  /* istanbul ignore else -- process.env.NODE_ENV is a build-time constant. */
  if (IS_DEV) {
    useEffect(
      () => {
        if (swipe) {
          return;
        }
        // Port note: Solid has no React owner-stack API.
        const ownerStackMessage = '';
        const message =
          '<Drawer.Popup> expected to be rendered within <Drawer.Viewport>. Omitting the ' +
          'viewport disables drawer swipe handling and touch scroll locking. Wrap ' +
          '<Drawer.Popup> in <Drawer.Viewport>.';
        error(`${message}${ownerStackMessage}`);
      },
      () => [swipe],
    );
  }
  const measureHeight = () => {
    const popupElement = popupRef.current;
    if (!popupElement) {
      return;
    }
    const offsetHeight = popupElement.offsetHeight;
    // Only skip while the element is still actually stretched beyond its last measured height.
    if (
      popupHeightRef.current > 0 &&
      drawerContext.frontmostHeight() > popupHeightRef.current &&
      offsetHeight > popupHeightRef.current
    ) {
      return;
    }
    const keepHeightWhileNested = popupHeightRef.current > 0 && drawerContext.hasNestedDrawer();
    if (keepHeightWhileNested) {
      const oldHeight = popupHeightRef.current;
      setPopupHeight(oldHeight);
      drawerContext.onPopupHeightChange(oldHeight);
      return;
    }
    const nextHeight = offsetHeight;
    if (nextHeight === popupHeightRef.current) {
      return;
    }
    popupHeightRef.current = nextHeight;
    setPopupHeight(nextHeight);
    drawerContext.onPopupHeightChange(nextHeight);
  };
  useIsoLayoutEffect(
    () => {
      if (!mounted()) {
        popupHeightRef.current = 0;
        setPopupHeight(0);
        drawerContext.onPopupHeightChange(0);
        return undefined;
      }
      const popupElement = popupRef.current;
      if (!popupElement) {
        return undefined;
      }
      removeCSSVariableInheritance();
      measureHeight();
      if (typeof ResizeObserver !== 'function') {
        return undefined;
      }
      const resizeObserver = new ResizeObserver(measureHeight);
      resizeObserver.observe(popupElement);
      return () =>
        untrack(() => {
          resizeObserver.disconnect();
        });
    },
    () => [
      measureHeight,
      mounted(),
      nestedDrawerOpen(),
      drawerContext.onPopupHeightChange,
      popupRef,
    ],
  );
  useIsoLayoutEffect(
    () => {
      const syncNestedSwipeProgress = () => {
        const popupElement = popupRef.current;
        if (!popupElement) {
          return;
        }
        const progress = drawerContext.nestedSwipeProgressStore.getSnapshot();
        if (progress > 0) {
          popupElement.style.setProperty(DrawerBackdropCssVars.swipeProgress, `${progress}`);
        } else {
          popupElement.style.setProperty(DrawerBackdropCssVars.swipeProgress, '0');
        }
      };
      syncNestedSwipeProgress();
      const unsubscribe = drawerContext.nestedSwipeProgressStore.subscribe(syncNestedSwipeProgress);
      const popupElement = popupRef.current;
      return () =>
        untrack(() => {
          unsubscribe();
          if (popupElement) {
            popupElement.style.setProperty(DrawerBackdropCssVars.swipeProgress, '0');
          }
        });
    },
    () => [drawerContext.nestedSwipeProgressStore, popupRef],
  );
  useIsoLayoutEffect(
    () => {
      if (!open()) {
        return undefined;
      }
      drawerContext.notifyParentFrontmostHeight?.(drawerContext.frontmostHeight());
      return () =>
        untrack(() => {
          drawerContext.notifyParentFrontmostHeight?.(0);
        });
    },
    () => [drawerContext.frontmostHeight(), open(), drawerContext.notifyParentFrontmostHeight],
  );
  useIsoLayoutEffect(
    () => {
      if (!drawerContext.notifyParentHasNestedDrawer) {
        return undefined;
      }
      const present = open() || transitionStatus() === 'ending';
      drawerContext.notifyParentHasNestedDrawer(present);
      return () =>
        untrack(() => {
          drawerContext.notifyParentHasNestedDrawer?.(false);
        });
    },
    () => [drawerContext.notifyParentHasNestedDrawer, open(), transitionStatus()],
  );
  useOpenChangeComplete({
    open,
    ref: () => popupRef.current,
    onComplete() {
      if (open()) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });
  const resolvedInitialFocus = createMemo(() =>
    componentProps.initialFocus === undefined ? popupRef : componentProps.initialFocus,
  );
  const setPopupElement = store.useStateSetter('popupElement');
  const state = createMemo<DrawerPopupState>(() => ({
    open: open(),
    nested: nested(),
    transitionStatus: transitionStatus(),
    expanded: snapPointData.activeSnapPoint() === 1,
    nestedDrawerOpen: nestedDrawerOpen(),
    nestedDrawerSwiping: drawerContext.nestedSwiping(),
    swipeDirection: drawerContext.swipeDirection(),
    swiping: swiping(),
  }));
  const popupHeightCssVarValue = () =>
    popupHeight() && (drawerContext.hasNestedDrawer() || transitionStatus() === 'ending')
      ? `${popupHeight()}px`
      : undefined;
  const shouldApplySnapPoints = () =>
    (snapPointData.snapPoints()?.length ?? 0) > 0 &&
    (drawerContext.swipeDirection() === 'down' || drawerContext.swipeDirection() === 'up');
  const snapPointOffsetValue = () => {
    const offset = snapPointData.activeSnapPointOffset();
    if (!shouldApplySnapPoints() || offset === null) {
      return null;
    }
    return drawerContext.swipeDirection() === 'up' ? -offset : offset;
  };
  const dragStyles = () => {
    let styles = swipe ? swipe.getDragStyles() : EMPTY_OBJECT;
    if (shouldApplySnapPoints() && drawerContext.swipeDirection() === 'down') {
      const baseOffset = snapPointData.activeSnapPointOffset() ?? 0;
      const movementValue = Number.parseFloat(
        String((styles as Record<string, string>)[DrawerPopupCssVars.swipeMovementY]),
      );
      styles =
        swiping() && Number.isFinite(movementValue)
          ? {
              ...styles,
              transform: undefined,
              [DrawerPopupCssVars.swipeMovementY]: `${getSnapPointSwipeMovement(baseOffset, movementValue)}px`,
            }
          : { ...styles, transform: undefined };
    }
    return styles;
  };
  const element = useRenderElement('div', componentProps, {
    state,
    props: () => [
      rootPopupProps(),
      {
        id: popupId(),
        'aria-labelledby': titleElementId(),
        'aria-describedby': descriptionElementId(),
        role: role(),
        ...FOCUSABLE_POPUP_PROPS,
        hidden: !mounted(),
        onKeyDown(event: KeyboardEvent) {
          if (COMPOSITE_KEYS.has(event.key)) {
            event.stopPropagation();
          }
        },
        style: {
          ...dragStyles(),
          [DrawerBackdropCssVars.swipeProgress]: '0',
          [DrawerPopupCssVars.nestedDrawers]: nestedOpenDrawerCount(),
          [DrawerPopupCssVars.height]: popupHeightCssVarValue(),
          [DrawerPopupCssVars.snapPointOffset]:
            typeof snapPointOffsetValue() === 'number' ? `${snapPointOffsetValue()}px` : '0px',
          [DrawerPopupCssVars.frontmostHeight]: drawerContext.frontmostHeight()
            ? `${drawerContext.frontmostHeight()}px`
            : undefined,
          [DrawerPopupCssVars.swipeStrength]:
            typeof swipeStrength() === 'number' &&
            Number.isFinite(swipeStrength()) &&
            swipeStrength()! > 0
              ? `${swipeStrength()}`
              : '1',
        } as JSX.CSSProperties,
      },
      elementProps,
    ],
    ref: [
      (element) => {
        popupRef.current = element;
      },
      setPopupElement,
    ],
    stateAttributesMapping,
  });
  return (
    <FloatingFocusManager
      context={floatingRootContext}
      openInteractionType={openMethod()}
      disabled={!mounted()}
      closeOnFocusOut={!disablePointerDismissal()}
      initialFocus={resolvedInitialFocus()}
      returnFocus={componentProps.finalFocus}
      modal={modal() !== false}
      restoreFocus="popup"
    >
      {element}
    </FloatingFocusManager>
  );
};
export interface DrawerPopupProps extends BaseUIComponentProps<'div', DrawerPopupState> {
  /**
   * Determines the element to focus when the drawer is opened.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (first tabbable element or popup).
   * - `HTMLElement`: Move focus to the element. `null` (an element that isn't set yet) falls back
   *   to the default behavior.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  initialFocus?:
    | boolean
    | HTMLElement
    | null
    | ((openType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
  /**
   * Determines the element to focus when the drawer is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (trigger or previously focused element).
   * - `HTMLElement`: Move focus to the element. `null` (an element that isn't set yet) falls back
   *   to the default behavior.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  finalFocus?:
    | boolean
    | HTMLElement
    | null
    | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
}
export interface DrawerPopupState {
  /**
   * Whether the drawer is currently open.
   */
  open: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * Whether the active snap point is the full-height expanded state.
   */
  expanded: boolean;
  /**
   * Whether the drawer is nested within a parent drawer.
   */
  nested: boolean;
  /**
   * Whether the drawer has nested drawers open.
   */
  nestedDrawerOpen: boolean;
  /**
   * Whether a nested drawer is currently being swiped.
   */
  nestedDrawerSwiping: boolean;
  /**
   * The swipe direction used to dismiss the drawer.
   */
  swipeDirection: DrawerSwipeDirection;
  /**
   * Whether the drawer is being swiped.
   */
  swiping: boolean;
}
export namespace DrawerPopup {
  export type Props = DrawerPopupProps;
  export type State = DrawerPopupState;
}
