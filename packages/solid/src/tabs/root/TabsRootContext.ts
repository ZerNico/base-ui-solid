import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { CompositeMetadata } from '../../internals/composite/list/CompositeList';
import type { TabsTab } from '../tab/TabsTab';
import type { TabsRoot } from './TabsRoot';

export interface TabsRootContext {
  /**
   * The currently active tab's value.
   */
  value: Accessor<TabsTab.Value>;
  /**
   * Callback for setting new value.
   */
  onValueChange: (value: TabsTab.Value, eventDetails: TabsRoot.ChangeEventDetails) => void;
  /**
   * The component orientation (layout flow direction).
   */
  orientation: Accessor<'horizontal' | 'vertical'>;
  /**
   * Gets the element of the Tab with the given value.
   */
  getTabElementBySelectedValue: (selectedValue: TabsTab.Value) => HTMLElement | null;
  /**
   * Gets the `id` attribute of the Tab that corresponds to the given TabPanel value.
   */
  getTabIdByPanelValue: (panelValue: TabsTab.Value) => string | undefined;
  /**
   * Gets the `id` attribute of the TabPanel that corresponds to the given Tab value.
   */
  getTabPanelIdByValue: (tabValue: TabsTab.Value) => string | undefined;
  registerMountedTabPanel: (panelValue: TabsTab.Value, panelId: string) => () => void;
  setTabMap: (map: Map<Node, CompositeMetadata<TabsTab.Metadata>>) => void;
  /**
   * The position of the active tab relative to the previously active tab.
   */
  tabActivationDirection: Accessor<TabsTab.ActivationDirection>;
}

/**
 * @internal
 */
// `null` stands in for upstream's `undefined` default (see PORTING.md).
export const TabsRootContext = createContext<TabsRootContext | null>(null);

export function useTabsRootContext() {
  const context = useContext(TabsRootContext) ?? undefined;
  if (context === undefined) {
    throw new Error(
      'Base UI: TabsRootContext is missing. Tabs parts must be placed within <Tabs.Root>.',
    );
  }

  return context;
}
