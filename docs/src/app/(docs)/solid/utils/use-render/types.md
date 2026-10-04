# Use Render

## API Reference

### useRender

Renders a Base UI element.

```typescript
export type UseRenderRenderProp<State = Record<string, unknown>> =
  ComponentRenderFn<HTMLProps, State> | IntrinsicTagName;

export type UseRenderElementProps<ElementType extends IntrinsicTagName> =
  JSX.IntrinsicElements[ElementType];

export type UseRenderComponentProps<
  ElementType extends IntrinsicTagName,
  State = {},
  RenderFunctionProps = HTMLProps,
> = JSX.IntrinsicElements[ElementType] & {
  /**
   * Allows you to replace the component's HTML element
   * with a different tag, or compose it with another component.
   *
   * Accepts a tag name, a component, or a function that returns the element to render.
   */
  render?: ComponentRenderFn<RenderFunctionProps, State> | IntrinsicTagName | undefined;
};

export interface UseRenderParameters<State> {
  /**
   * The tag name, component, or function returning the element to override the default element.
   */
  render?: UseRenderRenderProp<State> | undefined;
  /**
   * The ref (or refs) to apply to the rendered element.
   */
  ref?: ((element: any) => void) | Array<((element: any) => void) | undefined> | undefined;
  /**
   * The state of the component, passed as the second argument to the `render` callback.
   * State properties are automatically converted to data-* attributes.
   * Pass an accessor or a reactive object to keep it up to date.
   */
  state?: State | Accessor<State> | undefined;
  /**
   * Custom mapping for converting state properties to data-* attributes.
   * @example
   * { isActive: (value) => (value ? { 'data-is-active': '' } : null) }
   */
  stateAttributesMapping?: StateAttributesMapping<State> | undefined;
  /**
   * Props to be spread on the rendered element.
   * They are merged with the internal props of the component, so that event handlers
   * are merged, `class` values and `style` properties are joined, while other external props overwrite the
   * internal ones.
   */
  props?: Record<string, unknown> | Accessor<Record<string, unknown>> | undefined;
  /**
   * If `false`, the element is not rendered.
   * This is useful for rendering a component conditionally.
   * @default true
   */
  enabled?: boolean | Accessor<boolean> | undefined;
  /**
   * The default tag name to use for the rendered element when `render` is not provided.
   * @default 'div'
   */
  defaultTagName?: IntrinsicTagName | undefined;
  /**
   * The class to apply to the rendered element.
   */
  class?: ClassProp<State> | undefined;
  /**
   * The style to apply to the rendered element.
   */
  style?: StyleProp<State> | undefined;
}

export type UseRenderReturnValue = JSX.Element;

export interface UseRenderState {}

export namespace useRender {
  export type State = UseRenderState;
  export type RenderProp<TState = Record<string, unknown>> = UseRenderRenderProp<TState>;

  export type ElementProps<ElementType extends IntrinsicTagName> =
    UseRenderElementProps<ElementType>;

  export type ComponentProps<
    ElementType extends IntrinsicTagName,
    TState = {},
    RenderFunctionProps = HTMLProps,
  > = UseRenderComponentProps<ElementType, TState, RenderFunctionProps>;

  export type Parameters<TState> = UseRenderParameters<TState>;

  export type ReturnValue = UseRenderReturnValue;
}
```
