import { omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useComboboxGroupContext } from '../group/ComboboxGroupContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Combobox](https://base-ui.com/react/components/combobox)
 */
export function ComboboxGroupLabel(componentProps: ComboboxGroupLabel.Props): JSX.Element {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id');

  const { setLabelId } = useComboboxGroupContext();

  const generatedId = useBaseUiId();
  const id = () => (componentProps.id || undefined) ?? generatedId;

  useIsoLayoutEffect(
    ([currentId]) => {
      setLabelId(currentId);
      return () => {
        setLabelId((currentLabelId) => (currentLabelId === currentId ? undefined : currentLabelId));
      };
    },
    () => [id()],
  );

  const element = useRenderElement('div', componentProps, {
    props: () => [{ id: id(), 'aria-hidden': true }, elementProps],
  });

  return element;
}

export interface ComboboxGroupLabelState {}

export interface ComboboxGroupLabelProps extends BaseUIComponentProps<
  'div',
  ComboboxGroupLabelState
> {}

export namespace ComboboxGroupLabel {
  export type State = ComboboxGroupLabelState;
  export type Props = ComboboxGroupLabelProps;
}
