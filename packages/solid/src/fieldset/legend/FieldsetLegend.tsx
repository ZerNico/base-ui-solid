import { createMemo, omit } from 'solid-js';
import { useRenderElement } from '../../internals/useRenderElement';
import { useFieldsetRootContext } from '../root/FieldsetRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRegisteredLabelId } from '../../utils/useRegisteredLabelId';

/**
 * An accessible label that is automatically associated with the fieldset.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Fieldset](https://base-ui.com/react/components/fieldset)
 */
export function FieldsetLegend(componentProps: FieldsetLegend.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id');

  const { disabled, setLegendId } = useFieldsetRootContext();

  const id = useRegisteredLabelId(() => componentProps.id || undefined, setLegendId);

  const state = createMemo<FieldsetLegendState>(() => ({
    disabled: disabled(),
  }));

  return useRenderElement('div', componentProps, {
    state,
    props: () => [{ id: id() }, elementProps],
  });
}

export interface FieldsetLegendState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
}

export interface FieldsetLegendProps extends BaseUIComponentProps<'div', FieldsetLegendState> {}

export namespace FieldsetLegend {
  export type State = FieldsetLegendState;
  export type Props = FieldsetLegendProps;
}
