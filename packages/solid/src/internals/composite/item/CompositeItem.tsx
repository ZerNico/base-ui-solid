import { omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { EMPTY_OBJECT, EMPTY_ARRAY } from '@base-ui-solid/utils/empty';
import { useRenderElement } from '../../useRenderElement';
import { useCompositeItem } from './useCompositeItem';
import type { BaseUIComponentProps, IntrinsicTagName } from '../../types';
import type { StateAttributesMapping } from '../../getStateAttributesProps';

export function CompositeItem<Metadata, State extends Record<string, any>>(
  componentProps: CompositeItem.Props<Metadata, State>,
) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'state',
    'props',
    'refs',
    'metadata',
    'stateAttributesMapping',
    'tag',
  );

  const { compositeProps, compositeRef } = useCompositeItem<Metadata>({
    metadata: () => componentProps.metadata,
  });

  return useRenderElement(untrack(() => componentProps.tag) ?? 'div', componentProps, {
    state: () => componentProps.state ?? (EMPTY_OBJECT as State),
    // The composite ref attaches first so an outer item wins when nested items share a DOM node.
    ref: [compositeRef, ...(untrack(() => componentProps.refs) ?? EMPTY_ARRAY)],
    props: () => [compositeProps(), ...(componentProps.props ?? EMPTY_ARRAY), elementProps],
    stateAttributesMapping: untrack(() => componentProps.stateAttributesMapping),
  });
}

export interface CompositeItemState {}

export interface CompositeItemProps<Metadata, State extends Record<string, any>> extends Pick<
  BaseUIComponentProps<any, State>,
  'render' | 'class' | 'style'
> {
  children?: JSX.Element;
  metadata?: Metadata | undefined;
  refs?: Array<((element: any) => void) | undefined> | undefined;
  /**
   * Props merged into the rendered element. Read reactively.
   */
  props?:
    | Array<Record<string, any> | ((props: Record<string, any>) => Record<string, any>) | undefined>
    | undefined;
  state?: State | undefined;
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
  tag?: IntrinsicTagName | undefined;
  [key: string]: any;
}

export namespace CompositeItem {
  export type State = CompositeItemState;
  export type Props<Metadata, TState extends Record<string, any>> = CompositeItemProps<
    Metadata,
    TState
  >;
}
