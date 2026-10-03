import type { JSX } from '@solidjs/web';

export type {
  BaseUIChangeEventDetails,
  BaseUIGenericEventDetails,
} from '../internals/createBaseUIEventDetails';

export type HTMLProps<T = any> = JSX.HTMLAttributes<T>;

/**
 * Shape of the render prop: a function that takes props to be spread on the element and component's state and returns a Solid element.
 *
 * Unlike React, Solid can't clone an already created element, so the element form of the
 * upstream `render` prop (`render={<a />}`) is not supported. Use the function form, a component,
 * or a tag name instead.
 *
 * Both `props` and `state` are reactive: read them in JSX (or spread `props`), don't destructure.
 *
 * @template Props Props to be spread on the rendered element.
 * @template State Component's internal state.
 */
export type ComponentRenderFn<Props, State> = (props: Props, state: State) => JSX.Element;

export type BaseUIEvent<E extends Event> = E & {
  preventBaseUIHandler: () => void;
  readonly baseUIHandlerPrevented?: boolean | undefined;
};
