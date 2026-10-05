import { createMemo, omit } from 'solid-js';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { useButton } from '../../internals/use-button';
import type { ToolbarRootItemMetadata, ToolbarRootState } from '../root/ToolbarRoot';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import { useToolbarGroupContext } from '../group/ToolbarGroupContext';
import { CompositeItem } from '../../internals/composite/item/CompositeItem';

/**
 * A button that can be used as-is or as a trigger for other components.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui-solid.pages.dev/solid/components/toolbar)
 */
export function ToolbarButton(componentProps: ToolbarButton.Props) {
  const elementProps = omit(
    componentProps,
    'class',
    'disabled',
    'focusableWhenDisabled',
    'render',
    'nativeButton',
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

  const { getButtonProps, buttonRef } = useButton({
    disabled,
    focusableWhenDisabled,
    native: () => componentProps.nativeButton,
  });

  const state = createMemo<ToolbarButtonState>(() => ({
    disabled: disabled(),
    orientation: orientation(),
    focusable: focusableWhenDisabled(),
  }));

  return (
    <CompositeItem
      tag="button"
      render={componentProps.render}
      class={componentProps.class}
      style={componentProps.style}
      metadata={itemMetadata()}
      state={state()}
      refs={[buttonRef]}
      props={[
        elementProps,
        // When a render prop is provided (typically another Base UI component
        // like Menu.Trigger), forward `disabled` so the rendered component can
        // derive its own disabled state. For the default toolbar button, avoid
        // forwarding a `disabled` prop so focusable disabled buttons remain
        // hoverable for interactions like tooltips.
        // TODO: follow up after https://github.com/mui/base-ui/issues/1976#issuecomment-2916905663
        componentProps.render ? { disabled: disabled() } : EMPTY_OBJECT,
        getButtonProps,
      ]}
    />
  );
}

export interface ToolbarButtonState extends ToolbarRootState {
  /**
   * Whether the component is disabled.
   */
  disabled: boolean;
  /**
   * Whether the component remains focusable when disabled.
   */
  focusable: boolean;
}

export interface ToolbarButtonProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ToolbarButtonState> {
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
}

export namespace ToolbarButton {
  export type State = ToolbarButtonState;
  export type Props = ToolbarButtonProps;
}
