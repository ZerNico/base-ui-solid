import { createMemo, createSignal, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useControlled } from '@base-ui-solid/utils/useControlled';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useMenuFilterImpl } from '../filter-root/MenuFilterContext';
import { MenuRadioGroupContext } from './MenuRadioGroupContext';
import { MenuGroupContext } from '../group/MenuGroupContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import type { MenuRoot } from '../root/MenuRoot';

export function MenuRadioGroupPlain(componentProps: MenuRadioGroup.Props) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'value',
    'defaultValue',
    'onValueChange',
    'disabled',
    'style',
    'aria-labelledby',
  );

  const disabled = () => componentProps.disabled ?? false;

  const [labelId, setLabelId] = createSignal<string | undefined>(undefined);

  const [value, setValueUnwrapped] = useControlled({
    controlled: () => componentProps.value,
    get default() {
      return componentProps.defaultValue;
    },
    name: 'MenuRadioGroup',
  });

  const setValue = (newValue: any, eventDetails: MenuRadioGroup.ChangeEventDetails) => {
    componentProps.onValueChange?.(newValue, eventDetails);

    if (eventDetails.isCanceled) {
      return;
    }

    setValueUnwrapped(newValue);
  };

  const state = createMemo<MenuRadioGroupState>(() => ({ disabled: disabled() }), {
    equals: fastObjectShallowCompare,
  });

  const context: MenuRadioGroupContext = {
    get value() {
      return value();
    },
    setValue,
    get disabled() {
      return disabled();
    },
  };

  return (
    <MenuGroupContext value={setLabelId}>
      <MenuRadioGroupContext value={context}>
        {useRenderElement('div', componentProps, {
          state,
          props: () => [
            {
              role: 'group',
              'aria-labelledby': componentProps['aria-labelledby'] ?? labelId(),
              'aria-disabled': disabled() || undefined,
            },
            elementProps,
          ],
        })}
      </MenuRadioGroupContext>
    </MenuGroupContext>
  );
}

/**
 * Groups related radio items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuRadioGroup(props: MenuRadioGroup.Props) {
  const RadioGroup = useMenuFilterImpl()?.RadioGroup ?? MenuRadioGroupPlain;
  return <RadioGroup {...props} />;
}

export interface MenuRadioGroupProps extends BaseUIComponentProps<'div', MenuRadioGroupState> {
  /**
   * The content of the component.
   */
  children?: JSX.Element | undefined;
  /**
   * The controlled value of the radio item that should be currently selected.
   *
   * To render an uncontrolled radio group, use the `defaultValue` prop instead.
   */
  value?: any;
  /**
   * The uncontrolled value of the radio item that should be initially selected.
   *
   * To render a controlled radio group, use the `value` prop instead.
   */
  defaultValue?: any;
  /**
   * Function called when the selected value changes.
   */
  onValueChange?:
    ((value: any, eventDetails: MenuRadioGroup.ChangeEventDetails) => void) | undefined;
  /**
   * Whether the component should ignore user interaction.
   *
   * @default false
   */
  disabled?: boolean | undefined;
}

export interface MenuRadioGroupState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
}

export type MenuRadioGroupChangeEventReason = MenuRoot.ChangeEventReason;
export type MenuRadioGroupChangeEventDetails = MenuRoot.ChangeEventDetails;

export namespace MenuRadioGroup {
  export type Props = MenuRadioGroupProps;
  export type State = MenuRadioGroupState;
  export type ChangeEventReason = MenuRadioGroupChangeEventReason;
  export type ChangeEventDetails = MenuRadioGroupChangeEventDetails;
}
