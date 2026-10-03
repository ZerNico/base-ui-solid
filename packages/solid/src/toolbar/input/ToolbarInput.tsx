import { createMemo, omit, untrack } from 'solid-js';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { useFocusableWhenDisabled } from '../../utils/useFocusableWhenDisabled';
import type { ToolbarRootItemMetadata, ToolbarRootState } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { useToolbarGroupContext } from '../group/ToolbarGroupContext';
import { CompositeItem } from '../../internals/composite/item/CompositeItem';

/**
 * A native input element that integrates with Toolbar keyboard navigation.
 * Renders an `<input>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui.com/react/components/toolbar)
 */
export function ToolbarInput(componentProps: ToolbarInput.Props) {
  const elementProps = omit(
    componentProps,
    'class',
    'focusableWhenDisabled',
    'render',
    'disabled',
    'style',
  );

  const focusableWhenDisabled = () => componentProps.focusableWhenDisabled ?? true;

  const { disabled: toolbarDisabled, orientation } = useToolbarRootContext();

  const groupContext = useToolbarGroupContext();

  const disabled = () =>
    toolbarDisabled() || (groupContext?.disabled() ?? false) || (componentProps.disabled ?? false);

  const itemMetadata = createMemo<ToolbarRootItemMetadata>(() => ({
    disabled: disabled(),
    focusableWhenDisabled: focusableWhenDisabled(),
  }));

  const { props: focusableWhenDisabledProps } = useFocusableWhenDisabled({
    composite: () => true,
    disabled,
    focusableWhenDisabled,
    isNativeButton: () => false,
  });

  const state = createMemo<ToolbarInputState>(() => ({
    disabled: disabled(),
    orientation: orientation(),
    focusable: focusableWhenDisabled(),
  }));

  const preventWhenDisabled = (event: Event) => {
    if (untrack(disabled)) {
      event.preventDefault();
    }
  };

  const defaultProps: HTMLProps = {
    onClick: preventWhenDisabled,
    onPointerDown: preventWhenDisabled,
  };

  return (
    <CompositeItem
      tag="input"
      render={componentProps.render}
      class={componentProps.class}
      style={componentProps.style}
      metadata={itemMetadata()}
      state={state()}
      props={[defaultProps, elementProps, focusableWhenDisabledProps()]}
    />
  );
}

export interface ToolbarInputState extends ToolbarRootState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface ToolbarInputProps extends BaseUIComponentProps<'input', ToolbarInputState> {
  /**
   * When `true` the item is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * When `true` the item remains focusable when disabled.
   * @default true
   */
  focusableWhenDisabled?: boolean | undefined;
  defaultValue?: string | number | string[] | undefined;
}

export namespace ToolbarInput {
  export type State = ToolbarInputState;
  export type Props = ToolbarInputProps;
}
