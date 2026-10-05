import { createMemo, omit } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useSelectRootContext } from '../root/SelectRootContext';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';

/**
 * An icon that indicates that the trigger button opens a select popup.
 * Renders a `<span>` element.
 *
 * Documentation: [Base UI Select](https://base-ui-solid.pages.dev/solid/components/select)
 */
export function SelectIcon(componentProps: SelectIcon.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const store = useSelectRootContext();
  const open = store.useState('open');

  const state = createMemo<SelectIconState>(
    () => ({
      open: open(),
    }),
    { equals: fastObjectShallowCompare },
  );

  const element = useRenderElement('span', componentProps, {
    state,
    props: () => [{ 'aria-hidden': true, children: '▼' }, elementProps],
    stateAttributesMapping: triggerOpenStateMapping,
  });

  return element;
}

export interface SelectIconState {
  /**
   * Whether the select popup is currently open.
   */
  open: boolean;
}

export interface SelectIconProps extends BaseUIComponentProps<'span', SelectIconState> {}

export namespace SelectIcon {
  export type State = SelectIconState;
  export type Props = SelectIconProps;
}
