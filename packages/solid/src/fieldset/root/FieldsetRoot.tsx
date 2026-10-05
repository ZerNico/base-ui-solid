import { createMemo, createSignal, omit } from 'solid-js';
import { FieldsetRootContext, useFieldsetRootContext } from './FieldsetRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Groups a shared legend with related controls.
 * Renders a `<fieldset>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui-solid.pages.dev/solid/components/fieldset)
 */
export function FieldsetRoot(componentProps: FieldsetRoot.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'disabled');

  const [legendId, setLegendId] = createSignal<string | undefined>(undefined);

  const parentDisabled = useFieldsetRootContext(true)?.disabled;
  const disabled = () => (parentDisabled?.() ?? false) || (componentProps.disabled ?? false);

  const state = createMemo<FieldsetRootState>(() => ({
    disabled: disabled(),
  }));

  const contextValue: FieldsetRootContext = {
    legendId,
    setLegendId,
    disabled,
  };

  return (
    <FieldsetRootContext value={contextValue}>
      {useRenderElement('fieldset', componentProps, {
        state,
        props: () => [
          {
            'aria-labelledby': legendId(),
            disabled: disabled(),
          },
          elementProps,
        ],
      })}
    </FieldsetRootContext>
  );
}

export interface FieldsetRootState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetRootProps extends Omit<
  BaseUIComponentProps<'fieldset', FieldsetRootState>,
  'disabled'
> {
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
}

export namespace FieldsetRoot {
  export type State = FieldsetRootState;
  export type Props = FieldsetRootProps;
}
