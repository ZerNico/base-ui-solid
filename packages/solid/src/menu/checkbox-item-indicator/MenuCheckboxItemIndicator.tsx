import { createMemo, omit, untrack } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useMenuCheckboxItemContext } from '../checkbox-item/MenuCheckboxItemContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { itemMapping } from '../utils/stateAttributesMapping';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';

/**
 * Indicates whether the checkbox item is ticked.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuCheckboxItemIndicator(componentProps: MenuCheckboxItemIndicator.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'keepMounted');

  const item = useMenuCheckboxItemContext();

  let indicatorElement: HTMLSpanElement | null = null;

  const checked = () => item().checked;

  const { transitionStatus, mounted, setMounted } = useTransitionStatus(checked);

  useOpenChangeComplete({
    batch: true,
    enabled: () => !checked(),
    open: checked,
    ref: () => indicatorElement,
    onComplete() {
      if (!untrack(checked)) {
        setMounted(false);
      }
    },
  });

  const state = createMemo<MenuCheckboxItemIndicatorState>(
    () => ({
      checked: item().checked,
      disabled: item().disabled,
      highlighted: item().highlighted,
      transitionStatus: transitionStatus(),
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('span', componentProps, {
    state,
    ref: [
      (element: HTMLSpanElement | null) => {
        indicatorElement = element;
      },
    ],
    stateAttributesMapping: itemMapping,
    props: () => [
      {
        'aria-hidden': true,
      },
      elementProps,
    ],
    enabled: () => (componentProps.keepMounted ?? false) || mounted(),
  });
}

export interface MenuCheckboxItemIndicatorProps extends BaseUIComponentProps<
  'span',
  MenuCheckboxItemIndicatorState
> {
  /**
   * Whether to keep the HTML element in the DOM when the checkbox item is not checked.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export interface MenuCheckboxItemIndicatorState {
  /**
   * Whether the checkbox item is currently ticked.
   */
  checked: boolean;
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
}

export namespace MenuCheckboxItemIndicator {
  export type Props = MenuCheckboxItemIndicatorProps;
  export type State = MenuCheckboxItemIndicatorState;
}
