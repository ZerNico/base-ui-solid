import { omit } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useMenuGroupRootContext } from '../group/MenuGroupContext';

/**
 * An accessible label that is automatically associated with its parent group.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuGroupLabel(componentProps: MenuGroupLabel.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id');

  const generatedId = useBaseUiId();
  const id = () => (componentProps.id as string | undefined) ?? generatedId;

  const setLabelId = useMenuGroupRootContext();

  useIsoLayoutEffect(
    ([idValue]) => {
      setLabelId(() => idValue);
      return () => {
        setLabelId((currentId) => (currentId === idValue ? undefined : currentId));
      };
    },
    () => [id()] as const,
  );

  return useRenderElement('div', componentProps, {
    props: () => [
      {
        id: id(),
        'aria-hidden': true,
      },
      elementProps,
    ],
  });
}

export interface MenuGroupLabelProps extends BaseUIComponentProps<'div', MenuGroupLabelState> {}

export interface MenuGroupLabelState {}

export namespace MenuGroupLabel {
  export type Props = MenuGroupLabelProps;
  export type State = MenuGroupLabelState;
}
