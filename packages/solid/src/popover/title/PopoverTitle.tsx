import { omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import { useRenderElement } from '../../internals/useRenderElement';
import { useBaseUiId } from '../../internals/useBaseUiId';

/**
 * A heading that labels the popover.
 * Renders an `<h2>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui-solid.pages.dev/solid/components/popover)
 */
export function PopoverTitle(componentProps: PopoverTitle.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = usePopoverRootContext();

  // Port note: upstream re-derives the id from the `id` prop on every render (`useBaseUiId(id)`).
  const generatedId = useBaseUiId();
  const id = () => (elementProps.id as string | undefined) ?? generatedId;

  store.useSyncedValueWithCleanup('titleElementId', id);

  const element = useRenderElement('h2', componentProps, {
    props: () => [{ id: id() }, elementProps],
  });

  return element;
}

export interface PopoverTitleState {}

export interface PopoverTitleProps extends BaseUIComponentProps<
  'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
  PopoverTitleState
> {}

export namespace PopoverTitle {
  export type State = PopoverTitleState;
  export type Props = PopoverTitleProps;
}
