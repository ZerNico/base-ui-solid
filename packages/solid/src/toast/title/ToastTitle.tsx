import { createMemo, omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useToastLabelElement, useToastLabelPart } from '../utils/useToastLabelPart';

/**
 * A title that labels the toast.
 * Renders an `<h2>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastTitle(componentProps: ToastTitle.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id', 'children');

  const { id, children, type, setId } = useToastLabelPart(componentProps, 'title');

  const state = createMemo<ToastTitleState>(() => ({ type: type() }));

  const childrenProps = {
    get children() {
      return children();
    },
  };

  const element = useRenderElement('h2', componentProps, {
    state,
    props: () => [elementProps, { id: id() }, childrenProps],
  });

  return useToastLabelElement(element, children, () => componentProps.render, id, setId);
}

export interface ToastTitleState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastTitleProps extends BaseUIComponentProps<'h2', ToastTitleState> {}

export namespace ToastTitle {
  export type State = ToastTitleState;
  export type Props = ToastTitleProps;
}
