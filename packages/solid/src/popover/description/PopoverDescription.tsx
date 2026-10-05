import { omit } from 'solid-js';
import { usePopoverRootContext } from '../root/PopoverRootContext';
import type { BaseUIComponentProps } from '../../internals/types';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A paragraph with additional information about the popover.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Popover](https://base-ui-solid.pages.dev/solid/components/popover)
 */
export function PopoverDescription(componentProps: PopoverDescription.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = usePopoverRootContext();

  // Port note: upstream re-derives the id from the `id` prop on every render (`useBaseUiId(id)`).
  const generatedId = useBaseUiId();
  const id = () => (elementProps.id as string | undefined) ?? generatedId;

  store.useSyncedValueWithCleanup('descriptionElementId', id);

  const element = useRenderElement('p', componentProps, {
    props: () => [{ id: id() }, elementProps],
  });

  return element;
}

export interface PopoverDescriptionState {}

export interface PopoverDescriptionProps extends BaseUIComponentProps<
  'p',
  PopoverDescriptionState
> {}

export namespace PopoverDescription {
  export type State = PopoverDescriptionState;
  export type Props = PopoverDescriptionProps;
}
