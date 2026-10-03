import { vi, expect, describe, it } from 'vitest';
import { createMemo, createSignal, flush, lazy, Loading, omit, untrack } from 'solid-js';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { render, waitFor } from '#test-utils';
import type { BaseUIComponentProps, ComponentRenderFn, HTMLProps } from './types';
import { useRenderElement } from './useRenderElement';
import { mergeProps } from '../merge-props';

// Port note: Solid can't clone elements, so upstream's React element form of `render`
// (`render={<span />}`) is not supported. Tests about cloning are React-only skips; tests about
// something else use the function or component form. `className` is `class`, refs are callbacks.
type RefCallback<T> = (element: T | null) => void;

function createRef<T>() {
  const ref: RefCallback<T> & { current: T | null } = Object.assign(
    (element: T | null) => {
      ref.current = element;
    },
    { current: null as T | null },
  );
  return ref;
}

describe('useRenderElement', () => {
  function TestComponent(
    componentProps: BaseUIComponentProps<'div', { active?: boolean }> & { active?: boolean },
  ) {
    const elementProps = omit(componentProps, 'class', 'render', 'active', 'style');

    const state = createMemo(() => ({ active: componentProps.active }));

    // Port note: the forwarded `ref` is part of `elementProps`.
    const element = useRenderElement('div', componentProps, {
      state,
      props: [elementProps, { class: 'test-component', style: { padding: '10px' } }],
    });

    return element;
  }

  function DirectPropsTestComponent(
    componentProps: BaseUIComponentProps<'div', { active?: boolean }> & { active?: boolean },
  ) {
    const elementProps = omit(componentProps, 'class', 'render', 'active', 'style');

    return useRenderElement('div', componentProps, {
      state: () => ({ active: componentProps.active }),
      props: elementProps,
    });
  }

  function ArrayPropsTestComponent(
    componentProps: BaseUIComponentProps<'div', { active?: boolean }> & { active?: boolean },
  ) {
    const elementProps = omit(componentProps, 'class', 'render', 'active', 'style');

    return useRenderElement('div', componentProps, {
      state: () => ({ active: componentProps.active }),
      props: [elementProps, { class: 'test-component' }],
    });
  }

  function DisabledPropsTestComponent(props: { propsGetter: () => HTMLProps<HTMLDivElement> }) {
    return useRenderElement(
      'div',
      {},
      {
        enabled: false,
        // eslint-disable-next-line solid/reactivity
        props: [props.propsGetter],
      },
    );
  }

  function RerenderTestComponent(props: {
    enabled?: boolean;
    refs?: RefCallback<HTMLDivElement> | Array<RefCallback<HTMLDivElement> | undefined> | undefined;
    onClick?: (event: MouseEvent) => void;
  }) {
    // Port note: the `ref` param is read once, so it forwards to the current `refs` prop. Like
    // upstream's internal refs, it's called with `null` when the element is removed.
    return useRenderElement(
      'div',
      {},
      {
        enabled: () => props.enabled !== false,
        ref: (element: HTMLDivElement | null) => {
          const refs = untrack(() => props.refs);
          for (const ref of Array.isArray(refs) ? refs : [refs]) {
            ref?.(element);
          }
        },
        props: () => [
          {
            id: 'rerender-target',
            onClick: props.onClick,
          },
        ],
      },
    );
  }

  it('accepts className as function', async () => {
    const { container } = await render(() => (
      <TestComponent active class={(state) => (state.active ? 'active-class' : 'inactive-class')} />
    ));

    const element = container.firstElementChild;

    expect(element).toHaveAttribute('class', 'active-class test-component');
  });

  it('accepts className as function that returns undefined', async () => {
    const { container } = await render(() => (
      <TestComponent class={(state) => (state.active ? 'active-class' : undefined)} />
    ));

    const element = container.firstElementChild;

    expect(element).toHaveAttribute('class', 'test-component');
  });

  it('accepts style as function', async () => {
    const { container } = await render(() => (
      <TestComponent
        active
        style={(state) => ({ color: state.active ? 'rgb(255,0,0)' : 'rgb(0,255,0)' })}
      />
    ));

    const element = container.firstElementChild;

    expect(element?.getAttribute('style')).toBe('padding: 10px; color: rgb(255, 0, 0);');
  });

  it('accepts style as function that returns undefined', async () => {
    const { container } = await render(() => (
      <TestComponent style={(state) => (state.active ? { color: 'rgb(255,0,0)' } : undefined)} />
    ));

    const element = container.firstElementChild;

    expect(element?.getAttribute('style')).toBe('padding: 10px;');
  });

  it('makes single prop objects preventable', async () => {
    const handleMouseDown = vi.fn((event) => {
      event.preventBaseUIHandler();
    });

    const { container } = await render(() => (
      <DirectPropsTestComponent onMouseDown={handleMouseDown} />
    ));

    const element = container.firstElementChild as HTMLDivElement;

    expect(() =>
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })),
    ).not.toThrow();
    expect(handleMouseDown).toHaveBeenCalledTimes(1);
  });

  it('makes multi-prop arrays preventable when the event handler is first', async () => {
    const handleMouseDown = vi.fn((event) => {
      event.preventBaseUIHandler();
    });

    const { container } = await render(() => (
      <ArrayPropsTestComponent onMouseDown={handleMouseDown} />
    ));

    const element = container.firstElementChild as HTMLDivElement;

    expect(() =>
      element.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })),
    ).not.toThrow();
    expect(handleMouseDown).toHaveBeenCalledTimes(1);
  });

  it('makes obscure single-prop events preventable', async () => {
    const handleContextMenu = vi.fn((event) => {
      event.preventBaseUIHandler();
    });

    const { container } = await render(() => (
      <DirectPropsTestComponent onContextMenu={handleContextMenu} />
    ));

    const element = container.firstElementChild as HTMLDivElement;

    expect(() =>
      element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })),
    ).not.toThrow();
    expect(handleContextMenu).toHaveBeenCalledTimes(1);
  });

  it('makes obscure multi-prop array events preventable when the event handler is first', async () => {
    const handleContextMenu = vi.fn((event) => {
      event.preventBaseUIHandler();
    });

    const { container } = await render(() => (
      <ArrayPropsTestComponent onContextMenu={handleContextMenu} />
    ));

    const element = container.firstElementChild as HTMLDivElement;

    expect(() =>
      element.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true })),
    ).not.toThrow();
    expect(handleContextMenu).toHaveBeenCalledTimes(1);
  });

  it('does not resolve props when disabled', async () => {
    const propsGetter = vi.fn(() => ({
      onMouseDown() {},
    }));

    const { container } = await render(() => (
      <DisabledPropsTestComponent propsGetter={propsGetter} />
    ));

    expect(container.firstElementChild).toBeNull();
    expect(propsGetter).not.toHaveBeenCalled();
  });

  it('handles enabled toggles across rerenders', async () => {
    const ref = createRef<HTMLDivElement>();
    const handleClick = vi.fn();
    const [enabled, setEnabled] = createSignal(false);
    await render(() => (
      <RerenderTestComponent enabled={enabled()} refs={ref} onClick={handleClick} />
    ));

    expect(document.getElementById('rerender-target')).toBeNull();
    expect(ref.current).toBeNull();

    setEnabled(true);
    flush();

    const element = document.getElementById('rerender-target') as HTMLDivElement;

    expect(element).not.toBeNull();
    expect(ref.current).toBe(element);

    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handleClick).toHaveBeenCalledTimes(1);

    setEnabled(false);
    flush();

    expect(document.getElementById('rerender-target')).toBeNull();
    expect(ref.current).toBeNull();
  });

  it('updates merged refs and event handlers when ref shape changes across rerenders', async () => {
    const primaryRef = createRef<HTMLDivElement>();
    const secondaryRef = createRef<HTMLDivElement>();
    const firstHandleClick = vi.fn();
    const secondHandleClick = vi.fn();
    const [props, setProps] = createSignal<{
      refs: RefCallback<HTMLDivElement> | Array<RefCallback<HTMLDivElement>>;
      onClick: (event: MouseEvent) => void;
    }>({ refs: primaryRef, onClick: firstHandleClick });
    await render(() => <RerenderTestComponent refs={props().refs} onClick={props().onClick} />);

    const initialElement = document.getElementById('rerender-target');

    expect(primaryRef.current).toBe(initialElement);
    expect(secondaryRef.current).toBeNull();

    setProps({ refs: [primaryRef, secondaryRef], onClick: secondHandleClick });
    flush();

    const updatedElement = document.getElementById('rerender-target') as HTMLDivElement;

    // Port note: Solid applies refs once, when the element is created (and the element isn't
    // recreated here), so a ref added to an already rendered element isn't called and a removed one
    // isn't reset to `null`. Event handlers update in place like upstream.
    expect(updatedElement).toBe(initialElement);
    expect(primaryRef.current).toBe(updatedElement);
    expect(secondaryRef.current).toBeNull();

    updatedElement.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(firstHandleClick).toHaveBeenCalledTimes(0);
    expect(secondHandleClick).toHaveBeenCalledTimes(1);

    setProps({ refs: secondaryRef, onClick: secondHandleClick });
    flush();

    expect(primaryRef.current).toBe(document.getElementById('rerender-target'));
    expect(secondaryRef.current).toBeNull();
  });

  describe('prop: render', () => {
    it('accepts render as a function that receives props and state', async () => {
      const renderCalls: Array<[HTMLProps, { active?: boolean }]> = [];
      const renderFn: ComponentRenderFn<HTMLProps, { active?: boolean }> = (props, state) => {
        renderCalls.push([props, state]);
        return <span {...props} data-active={String(state.active)} />;
      };

      const { container } = await render(() => (
        <TestComponent active render={renderFn} data-testid="custom" />
      ));

      const element = container.firstElementChild;

      expect(renderCalls.length).toBeGreaterThan(0);
      const [firstCallProps, firstCallState] = renderCalls[0];
      expect(firstCallProps).toMatchObject({
        class: 'test-component',
        'data-testid': 'custom',
      });
      expect(firstCallProps.style).toEqual({ padding: '10px' });
      expect({ ...firstCallState }).toEqual({ active: true });
      expect(element?.tagName).toBe('SPAN');
      expect(element).toHaveAttribute('data-testid', 'custom');
      expect(element).toHaveAttribute('data-active', 'true');
    });

    // Port note: Solid supports `render={Component}` (the component receives the props), so
    // upstream's warning about uppercase render functions doesn't apply: the component is rendered
    // and nothing is logged.
    it('warns when render is passed a function with an uppercase name', async () => {
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockName('console.warn')
        .mockImplementation(() => {});

      function UppercaseRenderPropWarningTestComponent(props: HTMLProps<HTMLSpanElement>) {
        return <span {...props} />;
      }

      const { container } = await render(() => (
        <TestComponent render={UppercaseRenderPropWarningTestComponent} />
      ));

      expect(warnSpy.mock.calls.length).toBe(0);
      expect(container.firstElementChild?.tagName).toBe('SPAN');
      expect(container.firstElementChild).toHaveAttribute('class', 'test-component');
      warnSpy.mockRestore();
    });

    // Port note: see above, components are valid `render` values in Solid.
    it('warns when render is passed a function with an uppercase acronym prefix', async () => {
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockName('console.warn')
        .mockImplementation(() => {});

      function UIInput(props: HTMLProps<HTMLSpanElement>) {
        return <span {...props} />;
      }

      const { container } = await render(() => <TestComponent render={UIInput} />);

      expect(warnSpy.mock.calls.length).toBe(0);
      expect(container.firstElementChild?.tagName).toBe('SPAN');
      warnSpy.mockRestore();
    });

    it('does not warn when render is passed a lowercase callback', async () => {
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockName('console.warn')
        .mockImplementation(() => {});

      const renderFn = (props: HTMLProps<HTMLSpanElement>) => <span {...props} />;

      await render(() => <TestComponent render={renderFn} />);

      expect(warnSpy.mock.calls.length).toBe(0);
      warnSpy.mockRestore();
    });

    it('does not warn when render is passed a screaming snake case callback', async () => {
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockName('console.warn')
        .mockImplementation(() => {});

      const renderFn = (props: HTMLProps<HTMLSpanElement>) => <span {...props} />;
      Object.defineProperty(renderFn, 'name', {
        value: 'DEFAULT_RENDER',
      });

      await render(() => <TestComponent render={renderFn} />);

      expect(warnSpy.mock.calls.length).toBe(0);
      warnSpy.mockRestore();
    });

    it('does not warn when render is passed a callback with an inferred useCallback name', async () => {
      const warnSpy = vi
        .spyOn(console, 'warn')
        .mockName('console.warn')
        .mockImplementation(() => {});

      const renderFn = (props: HTMLProps<HTMLSpanElement>) => <span {...props} />;
      Object.defineProperty(renderFn, 'name', {
        value: 'DropdownMenuExample.useCallback[renderSearchInput]',
      });

      await render(() => <TestComponent render={renderFn} />);

      expect(warnSpy.mock.calls.length).toBe(0);
      warnSpy.mockRestore();
    });

    // React-only: render elements (`render={<Component />}`) aren't supported in Solid.
    it.skip('does not warn when render is passed as a React element', () => {});

    // React-only: Solid can't clone render elements.
    it.skip('accepts render as a React element and clones it with merged props', () => {});

    it('forwards ref to render element', async () => {
      // Port note: the component form replaces upstream's `render={<CustomElement />}`.
      function CustomElement(props: HTMLProps<HTMLDivElement>) {
        return <div {...props} />;
      }

      const ref = createRef<HTMLDivElement>();
      const { container } = await render(() => <TestComponent ref={ref} render={CustomElement} />);
      const element = container.firstElementChild;
      expect(ref.current).toBe(element);
    });

    // React-only: Solid can't clone render elements, so there are no element props to merge.
    it.skip('merges className from render element and component props', () => {});

    // React-only: Solid can't clone render elements, so there are no element props to merge.
    it.skip('merges className function with render element', () => {});

    // React-only: Solid can't clone render elements, so there are no element props to merge.
    it.skip('merges style from render element and component props', () => {});

    // React-only: Solid can't clone render elements, so there are no element props to merge.
    it.skip('merges style function with render element', () => {});

    it('handles lazy elements', async () => {
      // Port note: Solid's `lazy` component in the component form of `render`, under `<Loading>`
      // (React.lazy element under Suspense upstream).
      const LazyComponent = lazy(() =>
        Promise.resolve({
          default: function LazyDiv(props: HTMLProps<HTMLDivElement>) {
            return <div data-lazy="true" {...props} />;
          },
        }),
      );

      function LazyRender(props: HTMLProps<HTMLDivElement>) {
        return <LazyComponent {...props} data-testid="lazy" />;
      }

      const { container } = await render(() => (
        <Loading fallback={<div>Loading…</div>}>
          <TestComponent active render={LazyRender} />
        </Loading>
      ));

      await waitFor(() => {
        expect(container.firstElementChild?.getAttribute('data-lazy')).toBe('true');
      });

      const element = container.firstElementChild;
      expect(element).not.toBe(null);
      expect(element?.getAttribute('data-testid')).toBe('lazy');
      expect(element?.getAttribute('data-lazy')).toBe('true');
      expect(element?.className).toContain('test-component');
    });

    // React-only: React Server Components (Flight) lazy-wrapped render elements.
    describe.skip('lazy-wrapped render element (Flight shape)', () => {
      it.skip('merges props with the same precedence as a plain render element', () => {});

      it.skip('attaches the render element ref', () => {});

      it.skip('does not unwrap a pending element when disabled', () => {});

      it.each([
        ['null', null],
        ['false', false],
        ['the number 0', 0],
        ['an empty string', ''],
      ])('reports a wrapper that unwraps to %s as an invalid render element', () => {});
    });

    // React-only: React element validation. In Solid a string `render` is a tag name.
    it.skip('throws error for invalid render element in development', () => {});

    it('handles render element with existing ref', async () => {
      // Port note: a render function composing its own ref replaces upstream's
      // `render={<CustomElement ref={renderRef} />}`.
      function CustomElement(props: HTMLProps<HTMLDivElement>) {
        return <div {...props} />;
      }

      const renderRef = createRef<HTMLDivElement>();
      const componentRef = createRef<HTMLDivElement>();

      await render(() => (
        <TestComponent
          ref={componentRef}
          render={(props) => <CustomElement {...mergeProps<any>(props, { ref: renderRef })} />}
        />
      ));

      expect(renderRef.current).toBeInstanceOf(HTMLDivElement);
      expect(componentRef.current).toBeInstanceOf(HTMLDivElement);
      expect(renderRef.current).toBe(componentRef.current);
    });
  });

  describe('EMPTY_OBJECT mutation safety', () => {
    // This test verifies that the hook doesn't attempt to mutate EMPTY_OBJECT
    // which would throw a TypeError in strict mode since it's frozen.
    function MinimalComponent(componentProps: BaseUIComponentProps<'div', Record<string, never>>) {
      // Using EMPTY_OBJECT as state and no additional props simulates the edge case
      // where mergeObjects might return undefined and fall back to EMPTY_OBJECT
      const element = useRenderElement('div', componentProps, {
        state: EMPTY_OBJECT,
        // No props passed - relies on stateProps which will be {}
      });

      return element;
    }

    it('does not throw when className is provided with minimal props', async () => {
      const { container } = await render(() => <MinimalComponent class="test-class" />);
      expect(container.firstElementChild).not.toBeNull();
      expect(container.firstElementChild).toHaveAttribute('class', 'test-class');
    });

    it('does not throw when style is provided with minimal props', async () => {
      const { container } = await render(() => <MinimalComponent style={{ color: 'red' }} />);
      expect(container.firstElementChild).not.toBeNull();
      const element = container.firstElementChild as HTMLElement;
      expect(element.style.color).toBe('red');
    });
  });
});
