import { createMemo, omit } from 'solid-js';
import type { BaseUIComponentProps, Orientation } from '../internals/types';
import { useRenderElement } from '../internals/useRenderElement';

/**
 * A separator element accessible to screen readers.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Separator](https://base-ui-solid.pages.dev/solid/components/separator)
 */
export function Separator(componentProps: Separator.Props) {
  const elementProps = omit(componentProps, 'class', 'render', 'orientation', 'style');

  const orientation = () => componentProps.orientation ?? 'horizontal';

  const state = createMemo<SeparatorState>(() => ({ orientation: orientation() }));

  return useRenderElement('div', componentProps, {
    state,
    props: () => [{ role: 'separator', 'aria-orientation': orientation() }, elementProps],
  });
}

export interface SeparatorProps extends BaseUIComponentProps<'div', SeparatorState> {
  /**
   * The orientation of the separator.
   * @default 'horizontal'
   */
  orientation?: Orientation | undefined;
}

export interface SeparatorState {
  /**
   * The orientation of the separator.
   */
  orientation: Orientation;
}

export namespace Separator {
  export type Props = SeparatorProps;
  export type State = SeparatorState;
}
