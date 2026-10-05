import { omit } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useSelectGroupContext } from '../group/SelectGroupContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Select](https://base-ui-solid.pages.dev/solid/components/select)
 */
export function SelectGroupLabel(componentProps: SelectGroupLabel.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id');

  const { setLabelId } = useSelectGroupContext();

  // Port note: the generated id is created once; an `id` prop overrides it reactively.
  const generatedId = useBaseUiId();
  const id = () => (componentProps.id as string | undefined) ?? generatedId;

  useIsoLayoutEffect(
    ([currentId]) => {
      setLabelId(currentId);
      return () => {
        setLabelId((labelId) => (labelId === currentId ? undefined : labelId));
      };
    },
    () => [id()],
  );

  const element = useRenderElement('div', componentProps, {
    props: () => [{ id: id(), 'aria-hidden': true }, elementProps],
  });

  return element;
}

export interface SelectGroupLabelState {}

export interface SelectGroupLabelProps extends BaseUIComponentProps<'div', SelectGroupLabelState> {}

export namespace SelectGroupLabel {
  export type State = SelectGroupLabelState;
  export type Props = SelectGroupLabelProps;
}
