import { Show, createMemo, omit } from 'solid-js';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useBaseUiId } from '../../internals/useBaseUiId';
import type { StateAttributesMapping } from '../../internals/getStateAttributesProps';
import { transitionStatusMapping } from '../../internals/stateAttributesMapping';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import { useTabsRootContext } from '../root/TabsRootContext';
import type { TabsRootState } from '../root/TabsRoot';
import type { TabsTab } from '../tab/TabsTab';
import * as TabsPanelDataAttributes from './TabsPanelDataAttributes';

const stateAttributesMapping: StateAttributesMapping<TabsPanelState> = {
  ...tabsStateAttributesMapping,
  ...transitionStatusMapping,
};

/**
 * A panel displayed when the corresponding tab is active.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui-solid.pages.dev/solid/components/tabs)
 */
export function TabsPanel(componentProps: TabsPanel.Props) {
  const elementProps = omit(componentProps, 'class', 'value', 'render', 'keepMounted', 'style');

  const keepMounted = () => componentProps.keepMounted ?? false;

  const {
    value: selectedValue,
    getTabIdByPanelValue,
    orientation,
    tabActivationDirection,
    registerMountedTabPanel,
  } = useTabsRootContext();

  const id = useBaseUiId();

  const { ref: listItemRef, index } = useCompositeListItem();

  const open = () => componentProps.value === selectedValue();
  const { mounted, transitionStatus, setMounted } = useTransitionStatus(open);
  const hidden = () => !mounted();

  const correspondingTabId = () => getTabIdByPanelValue(componentProps.value);

  const state = createMemo<TabsPanelState>(() => ({
    hidden: hidden(),
    orientation: orientation(),
    tabActivationDirection: tabActivationDirection(),
    transitionStatus: transitionStatus(),
  }));

  let panelElement: HTMLDivElement | null = null;

  useOpenChangeComplete({
    open,
    ref: () => panelElement,
    onComplete() {
      if (!open()) {
        setMounted(false);
      }
    },
  });

  useIsoLayoutEffect(
    ([isHidden, isKeepMounted, panelValue]) => {
      // Port note: upstream also skips while `id` is undefined (React 17 resolves `useId` in a
      // passive effect). Solid's ids are available synchronously.
      if (isHidden && !isKeepMounted) {
        return undefined;
      }

      return registerMountedTabPanel(panelValue, id);
    },
    () => [hidden(), keepMounted(), componentProps.value],
  );

  const shouldRender = () => keepMounted() || mounted();

  return (
    <Show when={shouldRender()}>
      {useRenderElement('div', componentProps, {
        state,
        ref: [
          listItemRef,
          (element: HTMLDivElement | null) => {
            panelElement = element;
          },
        ],
        props: () => [
          {
            'aria-labelledby': correspondingTabId(),
            hidden: hidden(),
            id,
            role: 'tabpanel',
            tabindex: open() ? 0 : -1,
            inert: inertValue(!open()),
            // Computed key: a plain literal key fails the DOM-props excess property check.
            [TabsPanelDataAttributes.index as string]: index(),
          },
          elementProps,
        ],
        stateAttributesMapping,
      })}
    </Show>
  );
}

export interface TabsPanelMetadata {
  id?: string | undefined;
  value: TabsTab.Value;
}

export interface TabsPanelState extends TabsRootState {
  /**
   * Whether the component is hidden.
   */
  hidden: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export interface TabsPanelProps extends BaseUIComponentProps<'div', TabsPanelState> {
  /**
   * The value of the TabPanel. It will be shown when the Tab with the corresponding value is active.
   */
  value: TabsTab.Value;
  /**
   * Whether to keep the HTML element in the DOM while the panel is hidden.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export namespace TabsPanel {
  export type Metadata = TabsPanelMetadata;
  export type State = TabsPanelState;
  export type Props = TabsPanelProps;
}
