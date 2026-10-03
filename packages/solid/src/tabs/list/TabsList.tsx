import { createMemo, createSignal, omit } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { EMPTY_ARRAY } from '@base-ui-solid/utils/empty';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import type { TabsRootState } from '../root/TabsRoot';
import { CompositeRoot } from '../../internals/composite/root/CompositeRoot';
import { tabsStateAttributesMapping } from '../root/stateAttributesMapping';
import { useTabsRootContext } from '../root/TabsRootContext';
import { TabsListContext } from './TabsListContext';
import type { TabsTab } from '../tab/TabsTab';

/**
 * Groups the individual tab buttons.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Tabs](https://base-ui.com/react/components/tabs)
 */
export function TabsList(componentProps: TabsList.Props) {
  const elementProps = omit(
    componentProps,
    'activateOnFocus',
    'class',
    'loopFocus',
    'render',
    'style',
  );

  const activateOnFocus = () => componentProps.activateOnFocus ?? false;
  const loopFocus = () => componentProps.loopFocus ?? true;

  const { orientation, setTabMap, tabActivationDirection } = useTabsRootContext();

  const [highlightedTabIndex, setHighlightedTabIndex] = createSignal(0);
  const [tabsListElement, setTabsListElement] = createSignal<HTMLElement | null>(null);

  const indicatorUpdateListeners = new Set<() => void>();
  const tabResizeObserverElements = new Set<HTMLElement>();
  let resizeObserver: ResizeObserver | null = null;

  useIsoLayoutEffect(
    ([listElement]) => {
      if (typeof ResizeObserver === 'undefined') {
        return undefined;
      }

      const observer = new ResizeObserver(() => {
        indicatorUpdateListeners.forEach((listener) => {
          listener();
        });
      });

      resizeObserver = observer;

      if (listElement) {
        observer.observe(listElement);
      }

      tabResizeObserverElements.forEach((element) => {
        observer.observe(element);
      });

      return () => {
        observer.disconnect();
        resizeObserver = null;
      };
    },
    () => [tabsListElement()],
  );

  const registerIndicatorUpdateListener = (listener: () => void) => {
    indicatorUpdateListeners.add(listener);
    return () => {
      indicatorUpdateListeners.delete(listener);
    };
  };

  const registerTabResizeObserverElement = (element: HTMLElement) => {
    tabResizeObserverElements.add(element);
    resizeObserver?.observe(element);
    return () => {
      tabResizeObserverElements.delete(element);
      resizeObserver?.unobserve(element);
    };
  };

  const state = createMemo<TabsListState>(() => ({
    orientation: orientation(),
    tabActivationDirection: tabActivationDirection(),
  }));

  const defaultProps = (): HTMLProps => ({
    'aria-orientation': orientation() === 'vertical' ? 'vertical' : undefined,
    role: 'tablist',
  });

  const tabsListContextValue: TabsListContext = {
    activateOnFocus,
    registerIndicatorUpdateListener,
    registerTabResizeObserverElement,
    tabsListElement,
  };

  return (
    <TabsListContext value={tabsListContextValue}>
      <CompositeRoot<TabsTab.Metadata, TabsListState>
        render={componentProps.render}
        class={componentProps.class}
        style={componentProps.style}
        state={state()}
        refs={[setTabsListElement]}
        props={[defaultProps(), elementProps]}
        stateAttributesMapping={tabsStateAttributesMapping}
        highlightedIndex={highlightedTabIndex()}
        enableHomeAndEndKeys
        loopFocus={loopFocus()}
        orientation={orientation()}
        onHighlightedIndexChange={(index) => setHighlightedTabIndex(index)}
        onMapChange={(newMap) => setTabMap(newMap)}
        disabledIndices={EMPTY_ARRAY as number[]}
      />
    </TabsListContext>
  );
}

export interface TabsListState extends TabsRootState {}

export interface TabsListProps extends BaseUIComponentProps<'div', TabsListState> {
  /**
   * Whether to automatically change the active tab on arrow key focus.
   * Otherwise, tabs will be activated using <kbd>Enter</kbd> or <kbd>Space</kbd> key press.
   * @default false
   */
  activateOnFocus?: boolean | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
}

export namespace TabsList {
  export type State = TabsListState;
  export type Props = TabsListProps;
}
