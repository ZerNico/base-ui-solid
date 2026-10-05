import { children as resolveChildren, createMemo, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { BaseUIComponentProps, NativeButtonProps } from '../../internals/types';
import { omitProps } from '../../merge-props/mergeProps';
import { useToastRootContext } from '../root/ToastRootContext';
import { useButton } from '../../internals/use-button/useButton';
import { useRenderElement } from '../../internals/useRenderElement';
import { useRenderableContent, useToastRenderedElement } from '../utils/useToastLabelPart';

/**
 * Performs an action when clicked.
 * Renders a `<button>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui-solid.pages.dev/solid/components/toast)
 */
export function ToastAction(componentProps: ToastAction.Props) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'disabled',
    'nativeButton',
    'children',
  );

  const { toast } = useToastRootContext();

  // Port note: resolved once, since Solid creates JSX children each time `children` is read.
  const computedChildren = resolveChildren(
    () => (toast().actionProps?.children as JSX.Element) ?? componentProps.children,
  );

  const { getButtonProps, buttonRef } = useButton({
    disabled: () => componentProps.disabled as boolean | undefined,
    native: () => componentProps.nativeButton ?? true,
  });

  const state = createMemo<ToastActionState>(
    () => ({
      type: toast().type,
    }),
    { equals: fastObjectShallowCompare },
  );

  const childrenProps = {
    get children() {
      return computedChildren();
    },
  };

  const resolvedElement = useToastRenderedElement(() =>
    useRenderElement('button', componentProps, {
      ref: buttonRef,
      state,
      props: () => [
        elementProps,
        toast().actionProps && omitProps(toast().actionProps!, ['children']),
        getButtonProps,
        childrenProps,
      ],
    }),
  );
  const shouldRender = useRenderableContent(
    resolvedElement,
    computedChildren,
    () => componentProps.render,
  );

  return createMemo(() => (shouldRender() ? resolvedElement() : null)) as unknown as JSX.Element;
}

export interface ToastActionState {
  /**
   * The type of the toast.
   */
  type: string | undefined;
}

export interface ToastActionProps
  extends NativeButtonProps, BaseUIComponentProps<'button', ToastActionState> {}

export namespace ToastAction {
  export type State = ToastActionState;
  export type Props = ToastActionProps;
}
