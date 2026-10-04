import { createMemo, omit, untrack } from 'solid-js';
import { useMenuRadioItemContext } from '../radio-item/MenuRadioItemContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { itemMapping } from '../utils/stateAttributesMapping';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { useTransitionStatus } from '../../internals/useTransitionStatus';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';

/**
 * Indicates whether the radio item is selected.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuRadioItemIndicator(componentProps: MenuRadioItemIndicator.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'keepMounted');

  const item = useMenuRadioItemContext();

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

  const state = createMemo<MenuRadioItemIndicatorState>(() => ({
    checked: item().checked,
    disabled: item().disabled,
    highlighted: item().highlighted,
    transitionStatus: transitionStatus(),
  }));

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

export interface MenuRadioItemIndicatorProps extends BaseUIComponentProps<
  'span',
  MenuRadioItemIndicatorState
> {
  /**
   * Whether to keep the HTML element in the DOM when the radio item is inactive.
   * @default false
   */
  keepMounted?: boolean | undefined;
}

export interface MenuRadioItemIndicatorState {
  /**
   * Whether the radio item is currently selected.
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

export namespace MenuRadioItemIndicator {
  export type Props = MenuRadioItemIndicatorProps;
  export type State = MenuRadioItemIndicatorState;
}
