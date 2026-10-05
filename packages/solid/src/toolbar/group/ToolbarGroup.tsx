import { createMemo, omit } from 'solid-js';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import { useToolbarRootContext } from '../root/ToolbarRootContext';
import type { ToolbarRootState } from '../root/ToolbarRoot';
import { ToolbarGroupContext } from './ToolbarGroupContext';

/**
 * Groups several toolbar items or toggles.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toolbar](https://base-ui-solid.pages.dev/solid/components/toolbar)
 */
export function ToolbarGroup(componentProps: ToolbarGroup.Props) {
  const elementProps = omit(componentProps, 'class', 'disabled', 'render', 'style');

  const { orientation, disabled: toolbarDisabled } = useToolbarRootContext();

  const disabled = () => toolbarDisabled() || (componentProps.disabled ?? false);

  const contextValue: ToolbarGroupContext = {
    disabled,
  };

  const state = createMemo<ToolbarRootState>(() => ({
    disabled: disabled(),
    orientation: orientation(),
  }));

  return (
    <ToolbarGroupContext value={contextValue}>
      {useRenderElement('div', componentProps, {
        state,
        props: [{ role: 'group' }, elementProps],
      })}
    </ToolbarGroupContext>
  );
}

export interface ToolbarGroupState extends ToolbarRootState {}

export interface ToolbarGroupProps extends BaseUIComponentProps<'div', ToolbarGroupState> {
  /**
   * When `true` all toolbar items in the group are disabled.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace ToolbarGroup {
  export type State = ToolbarGroupState;
  export type Props = ToolbarGroupProps;
}
