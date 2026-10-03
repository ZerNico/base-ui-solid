import { omit, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { EMPTY_ARRAY, EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { CompositeList } from '../list/CompositeList';
import type { CompositeMetadata } from '../list/CompositeList';
import { useCompositeRoot } from './useCompositeRoot';
import { CompositeRootContext } from './CompositeRootContext';
import { useRenderElement } from '../../useRenderElement';
import type { BaseUIComponentProps, BaseUIEvent, IntrinsicTagName } from '../../types';
import type { ModifierKey } from '../composite';
import type { CompositeGridNavigator } from './gridNavigation';
import { useDirection } from '../../direction-context/DirectionContext';
import type { StateAttributesMapping } from '../../getStateAttributesProps';

export function CompositeRoot<Metadata extends {}, State extends Record<string, any>>(
  componentProps: CompositeRoot.Props<Metadata, State>,
) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'refs',
    'props',
    'state',
    'stateAttributesMapping',
    'highlightedIndex',
    'onHighlightedIndexChange',
    'orientation',
    'grid',
    'loopFocus',
    'onLoop',
    'enableHomeAndEndKeys',
    'onMapChange',
    'stopEventPropagation',
    'rootRef',
    'disabledIndices',
    'modifierKeys',
    'highlightItemOnHover',
    'tag',
  );

  const direction = useDirection();

  const {
    props: defaultProps,
    highlightedIndex,
    onHighlightedIndexChange,
    elementsRef,
    onMapChange: onMapChangeUnwrapped,
    relayKeyboardEvent,
  } = useCompositeRoot({
    get grid() {
      return componentProps.grid;
    },
    get loopFocus() {
      return componentProps.loopFocus;
    },
    get onLoop() {
      return componentProps.onLoop;
    },
    get orientation() {
      return componentProps.orientation;
    },
    get highlightedIndex() {
      return componentProps.highlightedIndex;
    },
    get onHighlightedIndexChange() {
      return componentProps.onHighlightedIndexChange;
    },
    get rootRef() {
      return componentProps.rootRef;
    },
    get stopEventPropagation() {
      return componentProps.stopEventPropagation ?? true;
    },
    get enableHomeAndEndKeys() {
      return componentProps.enableHomeAndEndKeys;
    },
    get direction() {
      return direction();
    },
    get disabledIndices() {
      return componentProps.disabledIndices;
    },
    get modifierKeys() {
      return componentProps.modifierKeys;
    },
  });

  const contextValue: CompositeRootContext = {
    highlightedIndex,
    onHighlightedIndexChange,
    highlightItemOnHover: () => componentProps.highlightItemOnHover ?? false,
    relayKeyboardEvent,
  };

  return (
    <CompositeRootContext value={contextValue}>
      <CompositeList<Metadata>
        elementsRef={elementsRef}
        onMapChange={(newMap) => {
          componentProps.onMapChange?.(newMap);
          onMapChangeUnwrapped(newMap);
        }}
      >
        {useRenderElement(untrack(() => componentProps.tag) ?? 'div', componentProps, {
          state: () => componentProps.state ?? (EMPTY_OBJECT as State),
          ref: untrack(() => componentProps.refs),
          props: () => [defaultProps, ...(componentProps.props ?? EMPTY_ARRAY), elementProps],
          stateAttributesMapping: untrack(() => componentProps.stateAttributesMapping),
        })}
      </CompositeList>
    </CompositeRootContext>
  );
}

export interface CompositeRootState {}

export interface CompositeRootProps<Metadata, State extends Record<string, any>> extends Pick<
  BaseUIComponentProps<'div', State>,
  'render' | 'class' | 'style'
> {
  children?: JSX.Element | undefined;
  /**
   * Props merged into the rendered element. Read reactively.
   */
  props?:
    | Array<Record<string, any> | ((props: Record<string, any>) => Record<string, any>) | undefined>
    | undefined;
  state?: State | undefined;
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
  refs?: Array<((element: any) => void) | undefined> | undefined;
  tag?: IntrinsicTagName | undefined;
  orientation?: 'horizontal' | 'vertical' | 'both' | undefined;
  grid?: CompositeGridNavigator | undefined;
  loopFocus?: boolean | undefined;
  onLoop?:
    | ((
        event: KeyboardEvent,
        prevIndex: number,
        nextIndex: number,
        elementsRef: RefObject<Array<HTMLElement | null>>,
      ) => number)
    | undefined;
  highlightedIndex?: number | undefined;
  onHighlightedIndexChange?: ((index: number) => void) | undefined;
  enableHomeAndEndKeys?: boolean | undefined;
  onMapChange?: ((newMap: Map<Element, CompositeMetadata<Metadata>>) => void) | undefined;
  onKeyDown?: ((event: BaseUIEvent<KeyboardEvent>) => void) | undefined;
  stopEventPropagation?: boolean | undefined;
  rootRef?: RefObject<HTMLElement | null> | ((element: HTMLElement | null) => void) | undefined;
  disabledIndices?: number[] | undefined;
  modifierKeys?: ModifierKey[] | undefined;
  highlightItemOnHover?: boolean | undefined;
  [key: string]: any;
}

export namespace CompositeRoot {
  export type State = CompositeRootState;
  export type Props<Metadata, TState extends Record<string, any>> = CompositeRootProps<
    Metadata,
    TState
  >;
}
