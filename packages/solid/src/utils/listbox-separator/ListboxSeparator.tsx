import { createMemo, omit } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps, Orientation } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * A visual separator between items.
 * Renders a `<div>` element.
 *
 * @internal
 */
export function ListboxSeparator(componentProps: ListboxSeparator.Props) {
  const elementProps = omit(componentProps, 'class', 'render', 'orientation', 'style');

  const state = createMemo<ListboxSeparatorState>(
    () => ({
      orientation: componentProps.orientation ?? 'horizontal',
    }),
    { equals: fastObjectShallowCompare },
  );

  return useRenderElement('div', componentProps, {
    state,
    props: () => [{ role: 'presentation' }, elementProps],
  });
}

export interface ListboxSeparatorProps extends BaseUIComponentProps<'div', ListboxSeparatorState> {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
}

export interface ListboxSeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace ListboxSeparator {
  export type Props = ListboxSeparatorProps;
  export type State = ListboxSeparatorState;
}
