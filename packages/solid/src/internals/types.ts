import type { JSX } from '@solidjs/web';
import type { BaseUIEvent, ComponentRenderFn, HTMLProps } from '../types';

export type { HTMLProps, BaseUIEvent, ComponentRenderFn };

export type MaybeBaseUIEvent<E extends Event> = E &
  Partial<Pick<BaseUIEvent<E>, 'preventBaseUIHandler' | 'baseUIHandlerPrevented'>>;

export interface FloatingUIOpenChangeDetails {
  open: boolean;
  reason: string;
  nativeEvent: Event;
  nested: boolean;
  triggerElement?: Element | undefined;
}

type WithPreventBaseUIHandler<T> = T extends (event: infer E) => any
  ? E extends Event
    ? (event: BaseUIEvent<E>) => ReturnType<T>
    : T
  : T;

/**
 * Adds a `preventBaseUIHandler` method to all event handlers.
 */
export type WithBaseUIEvent<T> = {
  [K in keyof T]: K extends `on${string}` ? WithPreventBaseUIHandler<T[K]> : T[K];
};

/**
 * Tag names that can be rendered by default.
 */
export type IntrinsicTagName = keyof JSX.IntrinsicElements;

/**
 * Value accepted by the `class` prop of Base UI components.
 */
export type ClassProp<State> = JSX.ClassValue | ((state: State) => JSX.ClassValue);

/**
 * Value accepted by the `style` prop of Base UI components.
 */
export type StyleProp<State> =
  JSX.CSSProperties | string | ((state: State) => JSX.CSSProperties | string | undefined);

/**
 * Value accepted by the `render` prop of Base UI components:
 * - a function `(props, state) => JSX.Element` (props must be spread on the rendered element),
 * - a component (receives the props, plus the state as its second argument),
 * - a tag name such as `'a'`.
 */
export type RenderProp<State, RenderFunctionProps = HTMLProps> =
  ComponentRenderFn<RenderFunctionProps, State> | IntrinsicTagName;

/**
 * Props shared by all Base UI components.
 * Contains `class` (class value or callback taking the component's state as an argument) and `render` (function to customize rendering).
 */
export type BaseUIComponentProps<
  ElementType extends IntrinsicTagName,
  State,
  RenderFunctionProps = HTMLProps,
> = Omit<
  WithBaseUIEvent<JSX.IntrinsicElements[ElementType]>,
  'class' | 'color' | 'defaultValue' | 'defaultChecked' | 'style'
> & {
  /**
   * CSS class applied to the element, or a function that
   * returns a class based on the component's state.
   */
  class?: ClassProp<State> | undefined;
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with another component.
   *
   * Accepts a tag name, a component, or a function that returns the element to render.
   */
  render?: RenderProp<State, RenderFunctionProps> | undefined;
  /**
   * Style applied to the element, or a function that
   * returns a style object based on the component's state.
   */
  style?: StyleProp<State> | undefined;
};

export interface NativeButtonProps {
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `false` if the rendered element is not a button (for example, `<div>`).
   * @default true
   */
  nativeButton?: boolean | undefined;
}

export interface NonNativeButtonProps {
  /**
   * Whether the component renders a native `<button>` element when replacing it
   * via the `render` prop.
   * Set to `true` if the rendered element is a native button.
   * @default false
   */
  nativeButton?: boolean | undefined;
}

/**
 * Simplifies the display of a type (without modifying it).
 * Taken from https://effectivetypescript.com/2022/02/25/gentips-4-display/
 */
export type Simplify<T> = T extends Function ? T : { [K in keyof T]: T[K] };

/**
 * Makes specified keys in a type required.
 *
 * @template T - The original type.
 * @template K - The keys to make required.
 */
export type RequiredExcept<T, K extends keyof T> = Required<Omit<T, K>> & Pick<T, K>;

export type Orientation = 'horizontal' | 'vertical';
