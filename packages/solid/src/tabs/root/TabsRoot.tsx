import { createMemo, createSignal, omit, untrack } from 'solid-js';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps, Orientation as BaseOrientation } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { CompositeList } from '../../internals/composite/list/CompositeList';
import type { CompositeMetadata } from '../../internals/composite/list/CompositeList';
import { TabsRootContext } from './TabsRootContext';
import { tabsStateAttributesMapping } from './stateAttributesMapping';
import type { TabsTab } from '../tab/TabsTab';
import type { TabsPanel } from '../panel/TabsPanel';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import type { BaseUIChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';

/**
 * Groups the tabs and the corresponding panels.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsRoot(componentProps: TabsRoot.Props) {
  const elementProps = omit(
    componentProps,
    'class',
    'defaultValue',
    'onValueChange',
    'orientation',
    'render',
    'value',
    'style',
  );

  const orientation = () => componentProps.orientation ?? 'horizontal';
  // `= 0` destructuring default: only `undefined` falls back, `null` means "no tab".
  const getDefaultValueProp = (): TabsTab.Value => {
    const defaultValue = componentProps.defaultValue;
    return defaultValue === undefined ? 0 : defaultValue;
  };
  const defaultValueProp = untrack(getDefaultValueProp);

  // Track whether the user explicitly provided a defined `defaultValue` prop.
  // Used to determine if we should honor a disabled tab selection.
  const hasExplicitDefaultValueProp = untrack(() => componentProps.defaultValue) !== undefined;

  const tabPanelRefs = { current: [] as (HTMLElement | null)[] };
  const [mountedTabPanels, setMountedTabPanels] = createSignal(
    new Map<TabsTab.Value, string>(),
    // Panels unregister from their effect cleanups, which may run while disposing.
    { ownedWrite: true },
  );

  const [value, setValue] = useControlled<TabsTab.Value>({
    controlled: () => componentProps.value,
    // A getter so useControlled can warn when `defaultValue` changes after initialization.
    get default() {
      return getDefaultValueProp();
    },
    name: 'Tabs',
    state: 'value',
  });

  const isControlled = () => componentProps.value !== undefined;

  const [tabMap, setTabMap] = createSignal(new Map<Node, CompositeMetadata<TabsTab.Metadata>>());
  let lastKnownTabElement: Node | undefined;

  // Used for activation direction detection via tab element positions.
  const getTabElementBySelectedValue = (selectedValue: TabsTab.Value): HTMLElement | null =>
    findTabElement(tabMap(), selectedValue);

  // Port note: upstream keeps this snapshot in state and syncs it after commit, which only
  // re-renders to store it. Nothing reads it outside of the computation below, so it's a plain
  // variable here (a signal written from the effect that reads it would make Solid run the
  // effect again for nothing).
  let activationDirectionState = {
    previousValue: untrack(value),
    tabActivationDirection: 'none' as TabsTab.ActivationDirection,
  };

  // Compute activation direction when value changes so children see the correct direction
  // on their very first update after the selection change.
  // The previous value snapshot is synced after commit.
  // https://github.com/mui/base-ui/issues/3873
  const activationDirection = createMemo(() => {
    const currentValue = value();
    const currentOrientation = orientation();
    const currentTabMap = tabMap();
    const { previousValue, tabActivationDirection: committedTabActivationDirection } =
      activationDirectionState;

    let tabActivationDirection = committedTabActivationDirection;
    let directionComputationIncomplete = false;

    if (previousValue !== currentValue) {
      tabActivationDirection = computeActivationDirection(
        previousValue,
        currentValue,
        currentOrientation,
        currentTabMap,
      );

      // When a new tab is added and selected in the same controlled update,
      // the tab element may not yet be registered in tabMap, so direction was
      // computed from a value-based fallback. Keep the previous value snapshot
      // stale so we re-compute from DOM positions once tabMap is up to date.
      directionComputationIncomplete =
        previousValue != null &&
        currentValue != null &&
        findTabElement(currentTabMap, currentValue) == null;
    }

    const nextPreviousValue = directionComputationIncomplete ? previousValue : currentValue;
    const shouldSyncActivationDirectionState =
      previousValue !== nextPreviousValue ||
      committedTabActivationDirection !== tabActivationDirection;

    return { tabActivationDirection, nextPreviousValue, shouldSyncActivationDirectionState };
  });

  const tabActivationDirection = () => activationDirection().tabActivationDirection;

  useIsoLayoutEffect(
    ([nextPreviousValue, shouldSyncActivationDirectionState, nextTabActivationDirection]) => {
      if (!shouldSyncActivationDirectionState) {
        return;
      }

      activationDirectionState = {
        previousValue: nextPreviousValue,
        tabActivationDirection: nextTabActivationDirection,
      };
    },
    () => [
      activationDirection().nextPreviousValue,
      activationDirection().shouldSyncActivationDirectionState,
      activationDirection().tabActivationDirection,
    ],
  );

  const onValueChange = (newValue: TabsTab.Value, eventDetails: TabsRoot.ChangeEventDetails) => {
    const nextActivationDirection = untrack(() =>
      computeActivationDirection(value(), newValue, orientation(), tabMap()),
    );

    eventDetails.activationDirection = nextActivationDirection;

    componentProps.onValueChange?.(newValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValue(newValue);
  };

  const notifyAutomaticValueChange = (
    nextValue: TabsTab.Value,
    reason: TabsRoot.ChangeEventReason,
  ) => {
    componentProps.onValueChange?.(
      nextValue,
      createChangeEventDetails(reason, undefined, undefined, {
        activationDirection: 'none',
      }),
    );
  };

  const registerMountedTabPanel = (panelValue: TabsTab.Value, panelId: string) => {
    setMountedTabPanels((prev) => {
      const next = new Map(prev);
      next.set(panelValue, panelId);
      return next;
    });

    return () => {
      setMountedTabPanels((prev) => {
        // Another panel with the same value took ownership in the meantime;
        // leave its registration in place.
        if (prev.get(panelValue) !== panelId) {
          return prev;
        }

        const next = new Map(prev);
        next.delete(panelValue);
        return next;
      });
    };
  };

  // get the `id` attribute of <Tabs.Panel> to set as the value of `aria-controls` on <Tabs.Tab>
  const getTabPanelIdByValue = (tabValue: TabsTab.Value) => {
    return mountedTabPanels().get(tabValue);
  };

  // get the `id` attribute of <Tabs.Tab> to set as the value of `aria-labelledby` on <Tabs.Panel>
  const getTabIdByPanelValue = (tabPanelValue: TabsTab.Value) => {
    for (const tabMetadata of tabMap().values()) {
      if (tabPanelValue === tabMetadata.value) {
        return tabMetadata.id;
      }
    }
    return undefined;
  };

  const tabsContextValue: TabsRootContext = {
    getTabElementBySelectedValue,
    getTabIdByPanelValue,
    getTabPanelIdByValue,
    onValueChange,
    orientation,
    registerMountedTabPanel,
    setTabMap: (map) => setTabMap(map),
    tabActivationDirection,
    value,
  };

  const selectedTabMetadata = createMemo(() => {
    const currentValue = value();
    for (const tabMetadata of tabMap().values()) {
      if (tabMetadata.value === currentValue) {
        return tabMetadata;
      }
    }
    return undefined;
  });

  // Find the first non-disabled tab value.
  // Used as a fallback when the current selection is disabled or missing.
  const firstEnabledTabValue = createMemo(() => {
    for (const tabMetadata of tabMap().values()) {
      if (!tabMetadata.disabled) {
        return tabMetadata.value;
      }
    }
    return undefined;
  });

  // Implicit uncontrolled selections are still automatic changes, so notify
  // once when the tabs first register. Explicit defaults are treated as user-owned.
  let shouldNotifyInitialValueChange = !hasExplicitDefaultValueProp;
  // useControlled warns if defaultValue changes after mount, but the
  // disabled-default honor policy below still needs a stable initial value.
  const initialDefaultValue = defaultValueProp;
  // An explicit defaultValue can intentionally point at a disabled tab on mount.
  // Once that selection becomes valid, later disabled states should fall back.
  let shouldHonorDisabledDefaultValue = hasExplicitDefaultValueProp;
  let didRegisterTabs = false;

  // Uncontrolled roots own automatic fallback. Controlled roots keep the exact
  // value supplied by the parent, even when that tab is disabled or missing.
  useIsoLayoutEffect(
    ([
      currentFirstEnabledTabValue,
      currentIsControlled,
      currentSelectedTabMetadata,
      currentTabMap,
      currentValue,
    ]) => {
      if (currentIsControlled) {
        return;
      }

      function commitAutomaticValueChange(
        fallbackValue: TabsTab.Value,
        fallbackReason: TabsRoot.ChangeEventReason,
      ) {
        setValue(fallbackValue);
        // Automatic fallbacks are not directional transitions; reset the direction
        // alongside the value so the batched commit keeps both in sync.
        activationDirectionState = {
          previousValue: fallbackValue,
          tabActivationDirection: 'none',
        };
        notifyAutomaticValueChange(fallbackValue, fallbackReason);
        // Mark the initial notification as delivered only after the consumer
        // callback returns. The fallback value is queued first so automatic
        // consistency updates are not cancelable through a throwing handler.
        shouldNotifyInitialValueChange = false;
      }

      if (currentTabMap.size === 0) {
        // A Suspense boundary outside the root can clean up layout effects while
        // keeping the previous tabs connected. Don't treat that as removal.
        if (didRegisterTabs && currentValue !== null && !lastKnownTabElement?.isConnected) {
          commitAutomaticValueChange(null, REASONS.missing);
        }
        return;
      }

      didRegisterTabs = true;
      lastKnownTabElement = currentTabMap.keys().next().value;

      const selectionIsDisabled = currentSelectedTabMetadata?.disabled;
      const selectionIsMissing = currentSelectedTabMetadata == null && currentValue !== null;

      if (!selectionIsDisabled && currentValue === initialDefaultValue) {
        shouldHonorDisabledDefaultValue = false;
      }

      if (
        shouldHonorDisabledDefaultValue &&
        selectionIsDisabled &&
        currentValue === initialDefaultValue
      ) {
        return;
      }

      const shouldNotifyInitial = shouldNotifyInitialValueChange;

      if (selectionIsDisabled || selectionIsMissing) {
        const fallbackValue = currentFirstEnabledTabValue ?? null;

        if (currentValue === fallbackValue) {
          // Already at the fallback value; no commit or notification needed,
          // but record that the implicit-initial transition has resolved.
          shouldNotifyInitialValueChange = false;
          return;
        }

        let fallbackReason: TabsRoot.ChangeEventReason = REASONS.missing;

        if (shouldNotifyInitial) {
          fallbackReason = REASONS.initial;
        } else if (selectionIsDisabled) {
          fallbackReason = REASONS.disabled;
        }

        commitAutomaticValueChange(fallbackValue, fallbackReason);
        return;
      }

      if (shouldNotifyInitial && currentSelectedTabMetadata != null) {
        notifyAutomaticValueChange(currentValue, REASONS.initial);
        shouldNotifyInitialValueChange = false;
      }
    },
    () => [firstEnabledTabValue(), isControlled(), selectedTabMetadata(), tabMap(), value()],
  );

  const state = createMemo<TabsRootState>(() => ({
    orientation: orientation(),
    tabActivationDirection: tabActivationDirection(),
  }));

  return (
    <TabsRootContext value={tabsContextValue}>
      <CompositeList<TabsPanel.Metadata> elementsRef={tabPanelRefs}>
        {useRenderElement('div', componentProps, {
          state,
          props: elementProps,
          stateAttributesMapping: tabsStateAttributesMapping,
        })}
      </CompositeList>
    </TabsRootContext>
  );
}

function findTabElement(
  tabMap: Map<Node, CompositeMetadata<TabsTab.Metadata>>,
  value: TabsTab.Value,
): HTMLElement | null {
  for (const [tabElement, tabMetadata] of tabMap.entries()) {
    if (value === tabMetadata.value) {
      return tabElement as HTMLElement;
    }
  }

  return null;
}

function computeActivationDirection(
  oldValue: TabsTab.Value | null,
  newValue: TabsTab.Value | null,
  orientation: 'horizontal' | 'vertical',
  tabMap: Map<Node, CompositeMetadata<TabsTab.Metadata>>,
): TabsTab.ActivationDirection {
  if (oldValue == null || newValue == null) {
    return 'none';
  }

  const [positionProp, backward, forward] =
    orientation === 'horizontal'
      ? (['left', 'left', 'right'] as const)
      : (['top', 'up', 'down'] as const);

  const oldTab = findTabElement(tabMap, oldValue);
  const newTab = findTabElement(tabMap, newValue);

  if (oldTab == null || newTab == null) {
    // Fallback for dynamic tabs: when a tab element isn't registered yet
    // (e.g. added and selected in the same update), infer direction from
    // the values themselves. Works for comparable types (numbers, strings).
    if (
      oldTab !== newTab &&
      (typeof oldValue === 'number' || typeof oldValue === 'string') &&
      typeof oldValue === typeof newValue
    ) {
      return newValue > oldValue ? forward : backward;
    }
    return 'none';
  }

  const oldPosition = oldTab.getBoundingClientRect()[positionProp];
  const newPosition = newTab.getBoundingClientRect()[positionProp];

  if (newPosition < oldPosition) {
    return backward;
  }
  if (newPosition > oldPosition) {
    return forward;
  }

  return 'none';
}

export type TabsRootOrientation = BaseOrientation;

export interface TabsRootState {
  /**
   * The component orientation.
   */
  orientation: TabsRoot.Orientation;
  /**
   * The direction used for tab activation.
   */
  tabActivationDirection: TabsTab.ActivationDirection;
}

export interface TabsRootProps extends BaseUIComponentProps<'div', TabsRootState> {
  /**
   * The value of the currently active `Tab`. Use when the component is controlled.
   * When the value is `null`, no Tab will be active.
   */
  value?: TabsTab.Value | undefined;
  /**
   * The default value. Use when the component is not controlled.
   * When the value is `null`, no Tab will be active.
   * @default 0
   */
  defaultValue?: TabsTab.Value | undefined;
  /**
   * The component orientation (layout flow direction).
   * @default 'horizontal'
   */
  orientation?: TabsRoot.Orientation | undefined;
  /**
   * Callback invoked when new value is being set.
   *
   * The event `reason` is `'none'` for user-initiated changes, such as a click
   * or keyboard navigation; `'initial'` for the first automatic selection or
   * fallback in uncontrolled roots when `defaultValue` is omitted or
   * `undefined`, including when the implicit initial value is disabled or
   * missing; `'disabled'` for automatic fallback when the selected tab becomes
   * disabled in uncontrolled roots; or `'missing'` for automatic fallback when
   * the selected tab is removed, or when an explicit `defaultValue` never
   * matches a mounted tab in uncontrolled roots.
   *
   * For automatic changes, the selected value can be `null` when no enabled Tab
   * is available as a fallback.
   *
   * Automatic changes cannot be canceled; calling `eventDetails.cancel()` for
   * `'initial'`, `'disabled'`, or `'missing'` has no effect.
   */
  onValueChange?:
    ((value: TabsTab.Value, eventDetails: TabsRoot.ChangeEventDetails) => void) | undefined;
}

export type TabsRootChangeEventReason =
  typeof REASONS.none | typeof REASONS.disabled | typeof REASONS.missing | typeof REASONS.initial;
export type TabsRootChangeEventDetails = BaseUIChangeEventDetails<
  TabsRoot.ChangeEventReason,
  { activationDirection: TabsTab.ActivationDirection }
>;

export namespace TabsRoot {
  export type State = TabsRootState;
  export type Props = TabsRootProps;
  export type Orientation = TabsRootOrientation;
  export type ChangeEventReason = TabsRootChangeEventReason;
  export type ChangeEventDetails = TabsRootChangeEventDetails;
}
