import { createMemo, merge, untrack } from 'solid-js';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import type { Accessor } from 'solid-js';
import { dynamic, isServer } from '@solidjs/web';
import type { JSX } from '@solidjs/web';
import { useMergedRefs } from '@base-ui-solid/utils/useMergedRefs';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { error } from '@base-ui-solid/utils/error';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { onCleanupWithWrites } from '@base-ui-solid/utils/cleanup';
import type { ClassProp, HTMLProps, IntrinsicTagName, RenderProp, StyleProp } from './types';
import type { StateAttributesMapping } from './getStateAttributesProps';
import { getStateAttributesProps } from './getStateAttributesProps';
import { resolveClassName } from '../utils/resolveClassName';
import { resolveStyle } from '../utils/resolveStyle';
import {
  CHILDREN_SOURCE,
  mergeClassNames,
  mergePropsSnapshot,
  mergePropsSnapshotN,
  mergeStyles,
} from '../merge-props/mergeProps';

/**
 * Renders a Base UI element.
 *
 * Unlike upstream, the returned element is created once: every input is read reactively, so
 * changes to the state, props or `render` prop update the element in place.
 *
 * Must be called where its children should be owned. In particular, a component that provides a
 * context must call it inside the provider's JSX so its children can read the context:
 * `<Context value={value}>{useRenderElement(...)}</Context>`.
 *
 * @param element The default HTML element to render. Can be overridden by the `render` prop.
 * @param componentProps An object containing the `render`, `class` and `style` props to be used for element customization. Other props are ignored.
 * @param params Additional parameters for rendering the element.
 */
export function useRenderElement<
  State extends Record<string, any>,
  TagName extends IntrinsicTagName | undefined,
>(
  element: TagName | Accessor<TagName>,
  componentProps: UseRenderElementComponentProps<State>,
  params: UseRenderElementParameters<State, TagName> = {},
): JSX.Element {
  // Port note: `element` may be an accessor (used by `useRender`'s `defaultTagName`), in which case
  // the element is recreated when it changes and no `render` prop is provided.
  const readElement: Accessor<TagName> = typeof element === 'function' ? element : () => element;
  // Port note: internal refs reconcile replacements and detach with React semantics.
  const internalRef = useMergedRefs<Element>(
    () => params.ref,
    () => undefined,
  );
  const stateParam = params.state;

  // A state accessor (e.g. from `useRender`) may return a new but equal object on every run:
  // compare shallowly, so equal states don't re-render.
  const readState: () => State =
    typeof stateParam === 'function'
      ? createMemo(stateParam, { equals: fastObjectShallowCompare })
      : () => stateParam ?? (EMPTY_OBJECT as State);

  // Reactive view of the state passed to the user's `render` callback.
  const state: State = typeof stateParam === 'function' ? (merge(readState) as State) : readState();

  // A memo, so that the element is only recreated when the boolean flips, not whenever a
  // dependency of the `enabled` accessor notifies.
  const enabled = createMemo(() => {
    const enabledParam = params.enabled;
    return typeof enabledParam === 'function' ? enabledParam() : enabledParam !== false;
  });

  // Equal results (e.g. a state change that doesn't change any attribute) don't notify, so the
  // element's props aren't re-applied.
  const computed = createMemo(
    () => computeRenderElementProps(componentProps, params, readState, enabled()),
    { equals: areComputedPropsEqual },
  );

  // `children` are kept out of the memo: they must only be created once by the rendered element,
  // so they're read lazily through the (stable) object that provided them.
  const childrenSource = createMemo(() => computed().childrenSource);

  // Port note: ref attachment reads current props imperatively, outside dependency tracking.
  const refCallback = (node: Element) =>
    untrack(() => {
      applyRefs(computed().ref, node);
      internalRef(node);
    });

  const outProps = merge(() => computed().props, {
    get children() {
      return childrenSource()?.children;
    },
    ref: refCallback,
  }) as HTMLProps;

  // Only a change of the `render` value itself should recreate the element. When the component
  // props are spread from a reactive source (e.g. another part's render function props), reading
  // `render` subscribes to that whole source, so filter the notifications through a memo.
  const renderProp = createMemo(() => componentProps.render);

  // Counts the elements created below, so a stale cleanup can tell it was superseded.
  let renderCount = 0;

  const rendered = createMemo(() => {
    if (!enabled()) {
      return null;
    }

    const render = renderProp();
    const tagName = render ? undefined : readElement();

    // React detaches refs by calling them with `null` when the element unmounts, and the ported
    // internals rely on it. Do the same for the internal `ref`s (not for user refs, which follow
    // Solid's semantics). Elements that a `render` function swaps out on its own can't be
    // observed here; internals that care check `isConnected`. Refs never run on the server, so
    // neither does this cleanup (it would write signals during the server render's disposal).
    // When the element is recreated, the previous run's cleanup only runs after the new element
    // has attached its refs, so it skips its `null` call then: it would detach the new element.
    if (!isServer) {
      renderCount += 1;
      const currentRender = renderCount;
      onCleanupWithWrites(() => {
        if (currentRender === renderCount) {
          untrack(() => internalRef(null));
        }
      });
    }

    // React server-renders an input's defaults as attributes whatever renders it, so normalize
    // them for an `<input>` part before a `render` prop replaces the element too.
    const props =
      isServer && render && readElement() === 'input' ? getServerInputProps(outProps) : outProps;

    return untrack(() => evaluateRenderProp(tagName, render, props, state));
  });

  return <>{rendered()}</>;
}

interface ComputedRenderElementProps {
  props: Record<string, any>;
  ref: unknown;
  childrenSource: { children?: JSX.Element | undefined } | undefined;
}

function areComputedPropsEqual(a: ComputedRenderElementProps, b: ComputedRenderElementProps) {
  return (
    a.ref === b.ref &&
    a.childrenSource === b.childrenSource &&
    fastObjectShallowCompare(a.props, b.props)
  );
}

const EMPTY_COMPUTED: ComputedRenderElementProps = {
  props: EMPTY_OBJECT,
  ref: undefined,
  childrenSource: undefined,
};

/**
 * Computes render element final props.
 */
function computeRenderElementProps<State extends Record<string, any>, TagName>(
  componentProps: UseRenderElementComponentProps<State>,
  params: UseRenderElementParameters<State, TagName>,
  readState: () => State,
  enabled: boolean,
): ComputedRenderElementProps {
  if (!enabled) {
    return EMPTY_COMPUTED;
  }

  const state = readState();
  const className = resolveClassName(componentProps.class, state);
  const style = resolveStyle(componentProps.style, state);
  const stateProps = getStateAttributesProps(state, params.stateAttributesMapping);

  const propsParam = typeof params.props === 'function' ? params.props() : params.props;
  const resolvedProps = propsParam ? resolveRenderFunctionProps(propsParam) : undefined;

  const outProps: Record<string, any> = { ...stateProps };
  let childrenSource: ComputedRenderElementProps['childrenSource'];
  let mergedRef: unknown;

  if (resolvedProps) {
    // eslint-disable-next-line guard-for-in
    for (const key in resolvedProps) {
      if (key === 'children') {
        childrenSource = resolvedProps[CHILDREN_SOURCE as any] ?? {
          // Children that were already evaluated by a props getter.
          children: resolvedProps.children,
        };
        continue;
      }
      if (key === 'ref') {
        mergedRef = resolvedProps.ref;
        continue;
      }
      outProps[key] = normalizeAttributeValue(key, resolvedProps[key]);
    }
  }

  if (className !== undefined) {
    outProps.class = mergeClassNames(outProps.class, className);
  }

  if (style !== undefined) {
    outProps.style = mergeStyles(outProps.style, style);
  }

  return { props: outProps, ref: mergedRef, childrenSource };
}

function resolveRenderFunctionProps(
  props: NonNullable<RenderElementPropsParam>,
): Record<string, any> {
  if (Array.isArray(props)) {
    return mergePropsSnapshotN(props as any[]) as Record<string, any>;
  }

  return mergePropsSnapshot(undefined, props as any) as Record<string, any>;
}

/**
 * React renders boolean `aria-*` values as `"true"`/`"false"`, while Solid removes attributes
 * set to `false`. Keep the upstream semantics so internal props can be ported as-is.
 */
function normalizeAttributeValue(key: string, value: unknown) {
  if (typeof value === 'boolean' && key.startsWith('aria-')) {
    return value ? 'true' : 'false';
  }
  return value;
}

function applyRefs(ref: unknown, node: Element | null) {
  if (Array.isArray(ref)) {
    for (const item of ref) {
      applyRefs(item, node);
    }
  } else if (typeof ref === 'function') {
    ref(node);
  }
}

function evaluateRenderProp<State>(
  element: IntrinsicTagName | undefined,
  render: RenderProp<State> | undefined,
  props: HTMLProps,
  state: State,
): JSX.Element {
  if (render) {
    if (typeof render === 'function') {
      return render(props, state);
    }

    if (typeof render !== 'string') {
      // Port note: upstream clones a React element passed as `render={<a />}`. Solid creates the
      // element right away and can't clone it, so it's not supported.
      if (IS_DEV) {
        error(
          'The `render` prop received an element (for example `render={<a />}`), which Solid ' +
            "can't clone, so nothing was rendered. Pass a render function that spreads the props " +
            'instead: `render={(props) => <a {...props} />}`, or a tag name (`render="a"`) or a ' +
            'component.',
        );
      }
      return null;
    }

    return renderTag(render, props, false);
  }
  // `element` is always provided when there is no `render` prop.
  return renderTag(element as IntrinsicTagName, props, true);
}

function renderTag(Tag: IntrinsicTagName, props: HTMLProps, isDefaultElement: boolean) {
  const Component = dynamic(() => Tag, { static: true });
  if (isServer && Tag === 'input' && !isServerInputProps(props)) {
    props = getServerInputProps(props);
  }
  if (isDefaultElement && Tag === 'button') {
    return <Component {...merge({ type: 'button' }, props)} />;
  }
  if (isDefaultElement && Tag === 'img') {
    return <Component {...merge({ alt: '' }, props)} />;
  }
  return <Component {...props} />;
}

const SERVER_INPUT_PROPS = Symbol('base-ui.serverInputProps');

/**
 * Port note: React server-renders an input's `defaultValue`/`defaultChecked` as its `value`/
 * `checked` attributes. Solid's server spread prints them verbatim (`defaultValue="…"`), which
 * browsers ignore, and hydration doesn't set DOM properties, so the input would start empty.
 */
function getServerInputProps(props: HTMLProps): HTMLProps {
  const { defaultValue, defaultChecked, ...other } = props as Record<string, any>;
  return {
    ...other,
    value: other.value ?? defaultValue,
    checked: other.checked ?? defaultChecked,
    [SERVER_INPUT_PROPS]: true,
  } as HTMLProps;
}

function isServerInputProps(props: HTMLProps) {
  return (props as Record<PropertyKey, unknown>)[SERVER_INPUT_PROPS] === true;
}

type RenderFunctionProps<TagName> = TagName extends IntrinsicTagName
  ? Record<string, any>
  : HTMLProps;

type RenderElementPropsSource<TagName> =
  | RenderFunctionProps<TagName>
  | undefined
  | ((props: RenderFunctionProps<TagName>) => RenderFunctionProps<TagName>);

type RenderElementPropsParam<TagName = any> =
  RenderFunctionProps<TagName> | Array<RenderElementPropsSource<TagName>>;

export type UseRenderElementParameters<State, TagName> = {
  /**
   * If `false`, the element is not rendered.
   * This is useful for rendering a component conditionally.
   * @default true
   */
  enabled?: boolean | Accessor<boolean> | undefined;
  /**
   * The ref (or refs) to apply to the rendered element.
   */
  ref?: ((element: any) => void) | Array<((element: any) => void) | undefined> | undefined;
  /**
   * The state of the component.
   * Pass an accessor (for example a memo) or a reactive object.
   */
  state?: State | Accessor<State> | undefined;
  /**
   * Intrinsic props to be spread on the rendered element.
   * Either a props object, an array of props objects and props getters (merged with
   * `mergeProps` semantics), or an accessor returning either of them. The accessor form is
   * evaluated reactively, like a React render.
   */
  props?: RenderElementPropsParam<TagName> | Accessor<RenderElementPropsParam<TagName>> | undefined;
  /**
   * A mapping of state to `data-*` attributes.
   */
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
};

export interface UseRenderElementComponentProps<State> {
  /**
   * The class to apply to the rendered element.
   * Can be a class value or a function that accepts the state and returns a class value.
   */
  class?: ClassProp<State> | undefined;
  /**
   * The render prop to override the default element.
   */
  render?: RenderProp<State> | undefined;
  /**
   * The style to apply to the rendered element.
   * Can be a style object/string or a function that accepts the state and returns one.
   */
  style?: StyleProp<State> | undefined;
}

export interface UseRenderElementState {}
