import { createMemo, omit } from 'solid-js';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import {
  useToastLabelElement,
  useToastLabelPart,
  useToastRenderedElement,
} from '../utils/useToastLabelPart';

/**
 * A description that describes the toast.
 * Can be used as the default message for the toast when no title is provided.
 * Renders a `<p>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui.com/react/components/toast)
 */
export function ToastDescription(componentProps: ToastDescription.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'id', 'children');

  const { id, children, type, setId } = useToastLabelPart(componentProps, 'description');

  const state = createMemo<ToastDescriptionState>(() => ({ type: type() }));

  const childrenProps = {
    get children() {
      return children();
    },
  };

  const element = useToastRenderedElement(() =>
    useRenderElement('p', componentProps, {
      state,
      props: () => [elementProps, { id: id() }, childrenProps],
    }),
  );

  return useToastLabelElement(element, children, () => componentProps.render, id, setId);
}

export interface ToastDescriptionState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastDescriptionProps extends BaseUIComponentProps<'p', ToastDescriptionState> {}

export namespace ToastDescription {
  export type State = ToastDescriptionState;
  export type Props = ToastDescriptionProps;
}
