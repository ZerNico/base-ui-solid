import type { JSX } from '@solidjs/web';
import { mergeObjects } from '@base-ui-solid/utils/mergeObjects';
import type { BaseUIEvent, WithBaseUIEvent } from '../internals/types';

type PropsOf<T extends object> = WithBaseUIEvent<T>;
type InputProps<T extends object> =
  PropsOf<T> | ((otherProps: PropsOf<T>) => PropsOf<T>) | undefined;

const EMPTY_PROPS = {};

/**
 * Non-enumerable key holding the object `children` are read from, so that the source stays
 * stable through repeated merges (and children are created only once).
 * @internal
 */
export const CHILDREN_SOURCE = Symbol('base-ui.childrenSource');

/* eslint-disable id-denylist */
/**
 * Merges multiple sets of Solid props. It follows the Object.assign pattern where the rightmost object's fields overwrite
 * the conflicting ones from others. This doesn't apply to event handlers, `class`, `style` and `ref` props.
 *
 * Event handlers are merged and called in right-to-left order (rightmost handler executes first, leftmost last).
 * For DOM events, the rightmost handler can prevent prior (left-positioned) handlers from executing
 * by calling `event.preventBaseUIHandler()`. For non-DOM events (custom events with primitive/object values),
 * all handlers always execute without prevention capability.
 * Solid's bound handler form (`[handler, data]`) is supported.
 *
 * The `class` prop is merged into a class array in right-to-left order (rightmost class appears first).
 * The `style` prop is merged with rightmost styles overwriting the prior ones.
 * `ref`s are composed into an array so that every ref receives the element.
 * `children` are forwarded lazily: they are not evaluated by the merge.
 *
 * Props can either be provided as objects or as functions that take the previous props as an argument.
 * The function will receive the merged props up to that point (going from left to right):
 * so in the case of `(obj1, obj2, fn, obj3)`, `fn` will receive the merged props of `obj1` and `obj2`.
 * The function is responsible for chaining event handlers if needed (that is, we don't run the merge logic).
 *
 * Event handlers returned by the functions are not automatically prevented when `preventBaseUIHandler` is called.
 * They must check `event.baseUIHandlerPrevented` themselves and bail out if it's true.
 *
 * Port note: the result is reactive, like Solid's `merge`. Its properties are getters that read
 * the sources when accessed, so a source prop that changes (a Solid props object, a getter) is
 * picked up in a reactive scope. Merged event handlers are stable functions that call the
 * sources' current handlers. Functions passed as props are called once, with a reactive view of
 * the props merged before them. Don't destructure the result.
 *
 * @param a Props object to merge.
 * @param b Props object to merge. The function will overwrite conflicting props from `a`.
 * @param c Props object to merge. The function will overwrite conflicting props from previous parameters.
 * @param d Props object to merge. The function will overwrite conflicting props from previous parameters.
 * @param e Props object to merge. The function will overwrite conflicting props from previous parameters.
 * @returns The merged props.
 * @public
 */
export function mergeProps<T extends object>(
  a: InputProps<T>,
  b: InputProps<T>,
  c: InputProps<T>,
  d: InputProps<T>,
  e: InputProps<T>,
): PropsOf<T>;
export function mergeProps<T extends object>(
  a: InputProps<T>,
  b: InputProps<T>,
  c: InputProps<T>,
  d: InputProps<T>,
): PropsOf<T>;
export function mergeProps<T extends object>(
  a: InputProps<T>,
  b: InputProps<T>,
  c: InputProps<T>,
): PropsOf<T>;
export function mergeProps<T extends object>(a: InputProps<T>, b: InputProps<T>): PropsOf<T>;
export function mergeProps(a: any, b: any, c?: any, d?: any, e?: any) {
  return createReactiveMergedProps([a, b, c, d, e]);
}

/**
 * Merges an arbitrary number of Solid props using the same logic as {@link mergeProps}.
 * This function accepts an array of props instead of individual arguments.
 *
 * This has slightly lower performance than {@link mergeProps} due to accepting an array
 * instead of a fixed number of arguments. Prefer {@link mergeProps} when merging 5 or
 * fewer prop sets for better performance.
 *
 * Port note: the result is reactive, see {@link mergeProps}.
 *
 * @param props Array of props to merge.
 * @returns The merged props.
 * @see mergeProps
 * @public
 */
export function mergePropsN<T extends object>(props: InputProps<T>[]): PropsOf<T> {
  return createReactiveMergedProps(props) as PropsOf<T>;
}

/**
 * Same merge as {@link mergeProps}, but returns a plain object snapshot (except for the lazy
 * `children`).
 *
 * Port note: used internally, where props are merged inside a reactive scope (a props accessor
 * or a memo) that re-runs when a source changes. Snapshots are cheaper to spread than the
 * reactive public result.
 * @internal
 */
export function mergePropsSnapshot<T extends object>(
  a: InputProps<T>,
  b: InputProps<T>,
  c?: InputProps<T>,
  d?: InputProps<T>,
  e?: InputProps<T>,
): PropsOf<T>;
export function mergePropsSnapshot(a: any, b: any, c?: any, d?: any, e?: any) {
  if (!c && !d && !e && !a) {
    return createInitialMergedProps(b);
  }

  // We need to mutably own `merged`.
  let merged = createInitialMergedProps(a);

  if (b) {
    merged = mergeInto(merged, b);
  }
  if (c) {
    merged = mergeInto(merged, c);
  }
  if (d) {
    merged = mergeInto(merged, d);
  }
  if (e) {
    merged = mergeInto(merged, e);
  }

  return merged;
}
/* eslint-enable id-denylist */

/**
 * Array form of {@link mergePropsSnapshot}.
 * @internal
 */
export function mergePropsSnapshotN<T extends object>(props: InputProps<T>[]): PropsOf<T> {
  if (props.length === 0) {
    return EMPTY_PROPS as PropsOf<T>;
  }
  if (props.length === 1) {
    return createInitialMergedProps(props[0]) as PropsOf<T>;
  }

  // We need to mutably own `merged`.
  let merged = createInitialMergedProps(props[0]);

  for (let i = 1; i < props.length; i += 1) {
    merged = mergeInto(merged, props[i]);
  }

  return merged as PropsOf<T>;
}

type Layer = Record<PropertyKey, any>;

/**
 * Builds the reactive result of {@link mergeProps}: the props objects are kept as layers (left
 * to right) and read when a property is accessed. A props function replaces the layers before it
 * with the object it returns, like it replaces the accumulated props in the snapshot merge.
 */
function createReactiveMergedProps(sources: ReadonlyArray<InputProps<any>>) {
  let layers: Layer[] = [];
  for (const source of sources) {
    if (isPropsGetter(source)) {
      layers = [source(createLayeredProps(layers) as PropsOf<any>) ?? EMPTY_PROPS];
    } else if (source) {
      layers.push(source);
    }
  }
  return createLayeredProps(layers);
}

function createLayeredProps(layersParam: Layer[]): Record<string, any> {
  const layers = layersParam.slice();
  // One stable function per event handler key, calling the layers' current handlers.
  const handlers = new Map<string, Function>();

  const getChildrenSource = () => {
    for (let i = layers.length - 1; i >= 0; i -= 1) {
      if ('children' in layers[i]) {
        return layers[i][CHILDREN_SOURCE as any] ?? layers[i];
      }
    }
    return undefined;
  };

  const getEventHandler = (key: string) => {
    let value: unknown;
    let hasHandler = false;
    for (const layer of layers) {
      if (!(key in layer)) {
        continue;
      }
      const layerValue = layer[key];
      if (layerValue === undefined) {
        // An undefined handler doesn't remove the handlers merged before it.
        continue;
      }
      if (typeof layerValue === 'function' || isBoundEventHandler(layerValue)) {
        hasHandler = true;
        value = undefined;
      } else {
        // Not a handler: it replaces whatever was merged before it, like other props.
        hasHandler = false;
        value = layerValue;
      }
    }
    if (!hasHandler) {
      return value;
    }
    let handler = handlers.get(key);
    if (!handler) {
      handler = (...args: unknown[]) => callLayeredEventHandlers(layers, key, args);
      handlers.set(key, handler);
    }
    return handler;
  };

  const getValue = (key: PropertyKey) => {
    if (key === CHILDREN_SOURCE) {
      return getChildrenSource();
    }
    if (typeof key !== 'string') {
      return undefined;
    }
    switch (key) {
      case 'children':
        return getChildrenSource()?.children;
      case 'class':
        return foldLayers(layers, key, mergeClassNames);
      case 'style':
        return foldLayers(layers, key, mergeStyles);
      case 'ref':
        return foldLayers(layers, key, mergeRefs);
      default:
        if (isEventHandlerKey(key)) {
          return getEventHandler(key);
        }
        for (let i = layers.length - 1; i >= 0; i -= 1) {
          if (key in layers[i]) {
            return layers[i][key];
          }
        }
        return undefined;
    }
  };

  const getKeys = () => {
    const keys = new Set<string>();
    for (const layer of layers) {
      for (const key of Object.keys(layer)) {
        keys.add(key);
      }
    }
    return Array.from(keys);
  };

  const hasKey = (key: PropertyKey) => {
    if (key === CHILDREN_SOURCE) {
      return getChildrenSource() !== undefined;
    }
    return layers.some((layer) => key in layer);
  };

  return new Proxy(
    {},
    {
      get: (_target, key) => getValue(key),
      has: (_target, key) => hasKey(key),
      ownKeys: () => getKeys(),
      getOwnPropertyDescriptor: (_target, key) => {
        if (typeof key !== 'string' || !hasKey(key)) {
          return undefined;
        }
        return {
          configurable: true,
          enumerable: true,
          get: () => getValue(key),
        };
      },
      set: () => false,
      defineProperty: () => false,
      deleteProperty: () => false,
    },
  );
}

function foldLayers(layers: Layer[], key: string, merge: (ours: any, theirs: any) => unknown): any {
  let result: unknown;
  for (const layer of layers) {
    if (key in layer) {
      result = merge(result, layer[key]);
    }
  }
  return result;
}

/**
 * Calls the layers' handlers for `key` right to left, like nested `mergeEventHandlers` calls:
 * for DOM events, a handler calling `event.preventBaseUIHandler()` stops the ones to its left.
 */
function callLayeredEventHandlers(layers: Layer[], key: string, args: unknown[]) {
  const event = args[0];
  const domEvent = isDOMEvent(event) ? (event as BaseUIEvent<Event>) : null;
  if (domEvent) {
    makeEventPreventable(domEvent);
  }

  let result: unknown;
  let isRightmost = true;
  for (let i = layers.length - 1; i >= 0; i -= 1) {
    if (!(key in layers[i])) {
      continue;
    }
    const value = layers[i][key];
    if (value === undefined) {
      continue;
    }
    if (typeof value !== 'function' && !isBoundEventHandler(value)) {
      // A non-handler value replaced the handlers to its left.
      break;
    }
    if (!isRightmost && domEvent?.baseUIHandlerPrevented) {
      break;
    }
    const handlerResult = normalizeEventHandler(value)!(...args);
    if (isRightmost) {
      result = handlerResult;
      isRightmost = false;
    }
  }
  return result;
}

function isEventHandlerKey(key: string) {
  const code0 = key.charCodeAt(0);
  const code1 = key.charCodeAt(1);
  const code2 = key.charCodeAt(2);
  return (
    code0 === 111 /* o */ && code1 === 110 /* n */ && code2 >= 65 /* A */ && code2 <= 90
  ); /* Z */
}

function createInitialMergedProps<T extends object>(inputProps: InputProps<T>) {
  if (isPropsGetter(inputProps)) {
    // Getter-returned handlers intentionally keep their existing semantics.
    return { ...inputProps(EMPTY_PROPS as PropsOf<T>) } as Record<string, any>;
  }

  return mutablyMergeInto({}, inputProps, true);
}

function mergeInto<T extends object>(merged: Record<string, any>, inputProps: InputProps<T>) {
  if (isPropsGetter(inputProps)) {
    return inputProps(merged as PropsOf<T>) as Record<string, any>;
  }
  return mutablyMergeInto(merged, inputProps, false);
}

/**
 * Merges two sets of props. In case of conflicts, the external props take precedence.
 */
function mutablyMergeInto(
  mergedProps: Record<string, any>,
  externalProps: Record<string, any> | undefined,
  isInitial: boolean,
) {
  if (!externalProps) {
    return mergedProps;
  }

  // Solid props are proxies/getters, `for...in` walks their enumerable keys.
  // eslint-disable-next-line guard-for-in
  for (const propName in externalProps) {
    if (propName === 'children') {
      // Reading `children` would create the child nodes, so forward it lazily through its
      // own object instead.
      defineLazyChildren(mergedProps, externalProps);
      continue;
    }

    const externalPropValue = externalProps[propName];

    switch (propName) {
      case 'style': {
        mergedProps[propName] = mergeStyles(mergedProps.style, externalPropValue);
        break;
      }
      case 'class': {
        mergedProps[propName] = mergeClassNames(mergedProps.class, externalPropValue);
        break;
      }
      case 'ref': {
        mergedProps[propName] = mergeRefs(mergedProps.ref, externalPropValue);
        break;
      }
      default: {
        if (isEventHandler(propName, externalPropValue)) {
          mergedProps[propName] = isInitial
            ? wrapEventHandler(externalPropValue)
            : mergeEventHandlers(mergedProps[propName], externalPropValue);
        } else {
          mergedProps[propName] = externalPropValue;
        }
      }
    }
  }

  return mergedProps;
}

function defineLazyChildren(target: Record<string, any>, sourceParam: Record<string, any>) {
  const source: Record<string, any> = sourceParam[CHILDREN_SOURCE as any] ?? sourceParam;
  Object.defineProperty(target, 'children', {
    configurable: true,
    enumerable: true,
    get() {
      return source.children;
    },
  });
  Object.defineProperty(target, CHILDREN_SOURCE, {
    configurable: true,
    enumerable: false,
    value: source,
  });
}

/**
 * Returns a copy of `props` without `keys`. Unlike object rest destructuring, it doesn't read
 * the props, so `children` stay lazy.
 * @internal
 */
export function omitProps<T extends Record<string, any>, K extends keyof T>(
  props: T,
  keys: readonly K[],
): Omit<T, K> {
  const result = Object.defineProperties({}, Object.getOwnPropertyDescriptors(props));
  for (const key of keys) {
    delete (result as any)[key];
  }
  return result as Omit<T, K>;
}

function isEventHandler(key: string, value: unknown) {
  // This approach is more efficient than using a regex.
  const code0 = key.charCodeAt(0);
  const code1 = key.charCodeAt(1);
  const code2 = key.charCodeAt(2);
  return (
    code0 === 111 /* o */ &&
    code1 === 110 /* n */ &&
    code2 >= 65 /* A */ &&
    code2 <= 90 /* Z */ &&
    (typeof value === 'function' || typeof value === 'undefined' || isBoundEventHandler(value))
  );
}

function isBoundEventHandler(value: unknown): value is [Function, unknown] {
  return Array.isArray(value) && typeof value[0] === 'function';
}

function normalizeEventHandler(handler: unknown): Function | undefined {
  if (isBoundEventHandler(handler)) {
    const [fn, data] = handler;
    return (...args: unknown[]) => fn(data, ...args);
  }
  return handler as Function | undefined;
}

function isPropsGetter<T extends object>(
  inputProps: InputProps<T>,
): inputProps is (props: PropsOf<T>) => PropsOf<T> {
  return typeof inputProps === 'function';
}

function mergeEventHandlers(ourHandlerParam: unknown, theirHandlerParam: unknown) {
  const ourHandler = normalizeEventHandler(ourHandlerParam);
  const theirHandler = normalizeEventHandler(theirHandlerParam);

  if (!theirHandler) {
    return ourHandler;
  }
  if (!ourHandler) {
    return wrapEventHandler(theirHandler);
  }

  return (...args: unknown[]) => {
    const event = args[0];

    if (isDOMEvent(event)) {
      const baseUIEvent = event as BaseUIEvent<typeof event>;

      makeEventPreventable(baseUIEvent);

      const result = theirHandler(...args);

      if (!baseUIEvent.baseUIHandlerPrevented) {
        ourHandler?.(...args);
      }

      return result;
    }

    const result = theirHandler(...args);
    ourHandler?.(...args);
    return result;
  };
}

function wrapEventHandler(handlerParam: unknown) {
  const handler = normalizeEventHandler(handlerParam);
  if (!handler) {
    return handler;
  }

  return (...args: unknown[]) => {
    const event = args[0];

    if (isDOMEvent(event)) {
      makeEventPreventable(event as BaseUIEvent<typeof event>);
    }

    return handler(...args);
  };
}

export function makeEventPreventable<T extends Event>(event: BaseUIEvent<T>) {
  event.preventBaseUIHandler = () => {
    (event.baseUIHandlerPrevented as boolean) = true;
  };

  // Port note: React's synthetic `preventDefault()` sets `defaultPrevented` even on events that
  // aren't cancelable (e.g. `focus`/`blur`), and Base UI's handlers rely on it to let a composed
  // handler opt out. Native events ignore it, so record it on the event instance.
  if (!event.cancelable && !Object.prototype.hasOwnProperty.call(event, 'preventDefault')) {
    const nativePreventDefault = event.preventDefault;
    event.preventDefault = () => {
      nativePreventDefault.call(event);
      Object.defineProperty(event, 'defaultPrevented', { value: true, configurable: true });
    };
  }

  return event;
}

export function mergeClassNames(
  ourClassName: JSX.ClassValue | undefined,
  theirClassName: JSX.ClassValue | undefined,
): JSX.ClassValue | undefined {
  if (theirClassName) {
    if (ourClassName) {
      return [theirClassName, ourClassName];
    }

    return theirClassName;
  }

  return ourClassName;
}

type StyleValue = JSX.CSSProperties | string | undefined;

export function mergeStyles(ourStyle: StyleValue, theirStyle: StyleValue): StyleValue {
  if (typeof ourStyle === 'string' || typeof theirStyle === 'string') {
    return mergeObjects(parseStyle(ourStyle), parseStyle(theirStyle));
  }
  return mergeObjects(ourStyle, theirStyle);
}

/**
 * Converts a `style` string into a Solid style object so that it can be merged.
 */
function parseStyle(style: StyleValue): JSX.CSSProperties | undefined {
  if (typeof style !== 'string') {
    return style;
  }

  const result: Record<string, string> = {};
  for (const declaration of style.split(';')) {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) {
      continue;
    }
    const property = declaration.slice(0, colonIndex).trim();
    const value = declaration.slice(colonIndex + 1).trim();
    if (property) {
      result[property] = value;
    }
  }
  return result as JSX.CSSProperties;
}

export function mergeRefs(ourRef: unknown, theirRef: unknown) {
  if (theirRef == null) {
    return ourRef;
  }
  if (ourRef == null) {
    return theirRef;
  }
  return [ourRef, theirRef];
}

function isDOMEvent(event: unknown): event is Event {
  return (
    event != null &&
    typeof event === 'object' &&
    typeof (event as Event).stopPropagation === 'function' &&
    'currentTarget' in event
  );
}
