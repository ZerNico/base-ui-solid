import { createMemo, omit, onCleanup, untrack } from 'solid-js';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button';
import { ACTIVE_COMPOSITE_ITEM } from '../../internals/composite/constants';
import { useCompositeItem } from '../../internals/composite/item/useCompositeItem';
import { useCompositeRootContext } from '../../internals/composite/root/CompositeRootContext';
import type { TabsRoot } from '../root/TabsRoot';
import { useTabsRootContext } from '../root/TabsRootContext';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import { useTabsListContext } from '../list/TabsListContext';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { activeElement, contains } from '../../floating-ui-solid/utils';

/**
 * An individual interactive tab button that toggles the corresponding panel.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsTab(componentProps: TabsTab.Props) {
  const elementProps = omit(
    componentProps,
    'class',
    'disabled',
    'render',
    'value',
    'id',
    'nativeButton',
    'style',
  );

  const disabled = () => componentProps.disabled ?? false;
  const nativeButton = () => componentProps.nativeButton ?? true;

  const {
    value: activeTabValue,
    getTabPanelIdByValue,
    onValueChange,
    orientation,
    tabActivationDirection,
  } = useTabsRootContext();

  const { activateOnFocus, registerTabResizeObserverElement, tabsListElement } =
    useTabsListContext();

  const { highlightedIndex, onHighlightedIndexChange } = useCompositeRootContext();

  const generatedId = useBaseUiId();
  const id = () => (componentProps.id as string | undefined) ?? generatedId;

  const tabMetadata = createMemo<TabsTab.Metadata>(() => ({
    disabled: disabled(),
    id: id(),
    value: componentProps.value,
  }));

  const {
    compositeProps,
    compositeRef,
    index,
    // hook is used instead of the CompositeItem component
    // because the index is needed for Tab internals
  } = useCompositeItem<TabsTab.Metadata>({
    metadata: tabMetadata,
  });

  const active = () => componentProps.value === activeTabValue();

  let isNavigating = false;
  let unobserveTabElement: (() => void) | null = null;

  // Registered from the ref callback rather than an effect so the observer
  // follows the rendered element when the `render` prop swaps the host element.
  const observeTabElement = (element: HTMLElement | null) => {
    unobserveTabElement?.();
    unobserveTabElement = element ? registerTabResizeObserverElement(element) : null;
  };

  // Keep the highlighted item in sync with the currently active tab
  // when the value prop changes externally (controlled mode)
  useIsoLayoutEffect(
    ([isActive, currentIndex, currentHighlightedIndex, isDisabled, listElement]) => {
      if (isNavigating) {
        isNavigating = false;
        return;
      }

      if (!(isActive && currentIndex > -1 && currentHighlightedIndex !== currentIndex)) {
        return;
      }

      // If focus is currently within the tabs list, don't override the roving
      // focus highlight. This keeps keyboard navigation relative to the focused
      // item after an external/asynchronous selection change.
      if (listElement != null) {
        const activeEl = activeElement(ownerDocument(listElement));
        if (activeEl && contains(listElement, activeEl)) {
          return;
        }
      }

      // Don't highlight disabled tabs to prevent them from interfering with keyboard navigation.
      // Keyboard focus (tabIndex) should remain on an enabled tab even when a disabled tab is selected.
      if (!isDisabled) {
        onHighlightedIndexChange(currentIndex);
      }
    },
    () => [active(), index(), highlightedIndex(), disabled(), tabsListElement()],
  );

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    native: nativeButton,
    focusableWhenDisabled: () => true,
  });

  const tabPanelId = () => getTabPanelIdByValue(componentProps.value);

  let isPressing = false;
  let isMainButton = false;

  // Both callers guard on `!active`, so the current value is never re-committed.
  function activate(event: Event) {
    onValueChange(
      componentProps.value,
      createChangeEventDetails(REASONS.none, event, undefined, {
        activationDirection: 'none',
      }),
    );
  }

  function onClick(event: MouseEvent) {
    // Port note: React drops `click` events from the secondary (right) button, which some
    // browsers dispatch; Solid doesn't, so ignore them here.
    if (event.button === 2) {
      return;
    }

    if (untrack(active) || untrack(disabled)) {
      return;
    }

    activate(event);
  }

  function onFocus(event: FocusEvent) {
    if (untrack(active) || untrack(disabled)) {
      return;
    }

    if (
      untrack(activateOnFocus) &&
      (!isPressing || // keyboard or touch focus
        isMainButton) // main mouse button focus
    ) {
      activate(event);
    }
  }

  function onPointerDown(event: PointerEvent) {
    if (untrack(active) || untrack(disabled)) {
      return;
    }

    isPressing = true;
    // Secondary presses (context menu, middle click) may focus the tab, but
    // must not activate it with `activateOnFocus`.
    isMainButton = event.button === 0;

    // Registered for every button so a secondary press doesn't leave the tab
    // stuck in the pressing state, which would suppress later focus activation.
    const doc = ownerDocument(event.currentTarget as Element);

    function handlePointerEnd() {
      isPressing = false;
      isMainButton = false;
      doc.removeEventListener('pointerup', handlePointerEnd);
      doc.removeEventListener('pointercancel', handlePointerEnd);
    }

    doc.addEventListener('pointerup', handlePointerEnd);
    doc.addEventListener('pointercancel', handlePointerEnd);
  }

  // Port note: Solid has no capture-phase event props, so upstream's `onKeyDownCapture` is a
  // native capture listener.
  const handleKeyDownCapture = () => {
    isNavigating = true;
  };
  let keyDownCaptureElement: HTMLElement | null = null;
  const keyDownCaptureRef = (element: HTMLElement | null) => {
    if (element === keyDownCaptureElement) {
      return;
    }
    keyDownCaptureElement?.removeEventListener('keydown', handleKeyDownCapture, true);
    keyDownCaptureElement = element;
    element?.addEventListener('keydown', handleKeyDownCapture, true);
  };
  onCleanup(() => keyDownCaptureRef(null));

  const state = createMemo<TabsTabState>(() => ({
    disabled: disabled(),
    active: active(),
    orientation: orientation(),
    tabActivationDirection: tabActivationDirection(),
  }));

  return useRenderElement('button', componentProps, {
    state,
    ref: [buttonRef, compositeRef, observeTabElement, keyDownCaptureRef],
    props: () => [
      compositeProps(),
      {
        role: 'tab',
        'aria-controls': tabPanelId(),
        'aria-selected': active(),
        id: id(),
        onClick,
        // Port note: React's `onFocus` bubbles (it listens to `focusin`), Solid's doesn't.
        onFocusIn: onFocus,
        onPointerDown,
        [ACTIVE_COMPOSITE_ITEM as string]: active() ? '' : undefined,
      },
      elementProps,
      getButtonProps,
    ],
    stateAttributesMapping: tabsStateAttributesMapping,
  });
}

export type TabsTabValue = any | null;

export type TabsTabActivationDirection = 'left' | 'right' | 'up' | 'down' | 'none';

export interface TabsTabPosition {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface TabsTabSize {
  width: number;
  height: number;
}

export interface TabsTabMetadata {
  disabled: boolean;
  id: string | undefined;
  value: TabsTab.Value | undefined;
}

export interface TabsTabState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the component is active.
   */
  active: boolean;
  /**
   * The component orientation.
   */
  orientation: TabsRoot.Orientation;
  /**
   * The direction used for tab activation.
   */
  tabActivationDirection: TabsTab.ActivationDirection;
}

export interface TabsTabProps
  extends NativeButtonProps, BaseUIComponentProps<'button', TabsTabState> {
  /**
   * The value of the Tab.
   */
  value: TabsTab.Value;
  /**
   * Whether the Tab is disabled.
   *
   * If a first Tab on a `<Tabs.List>` is disabled, it won't initially be selected.
   * Instead, the next enabled Tab will be selected.
   * However, it does not work like this during server-side rendering, as it is not known
   * during pre-rendering which Tabs are disabled.
   * To work around it, ensure that `defaultValue` or `value` on `<Tabs.Root>` is set to an enabled Tab's value.
   */
  disabled?: boolean | undefined;
}

export namespace TabsTab {
  export type Value = TabsTabValue;
  export type ActivationDirection = TabsTabActivationDirection;
  export type Position = TabsTabPosition;
  export type Size = TabsTabSize;
  export type Metadata = TabsTabMetadata;
  export type State = TabsTabState;
  export type Props = TabsTabProps;
}
