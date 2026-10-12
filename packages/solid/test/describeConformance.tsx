import { createSignal, flush } from 'solid-js';
import type { Component } from 'solid-js';
import { Dynamic } from '@solidjs/web';
import type { JSX } from '@solidjs/web';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from './utils';

export interface ConformanceOptions {
  /** Wraps the component under test, e.g. in its Root. */
  wrap?: (node: () => JSX.Element) => JSX.Element;
  /** Expected element class of the rendered element. */
  refInstanceof: typeof Element;
  /** The default tag name. */
  defaultTagName?: string;
  /**
   * The element the `render` tests render in place of the default one.
   * Rendering a `button` also sets `nativeButton` on components that accept it, and for those
   * components the tests run again with a `div` and `nativeButton={false}`.
   *
   * Port note: defaults to `'section'` (upstream: `'div'`), which the port's suite has always used
   * so the rendered element differs from the default `div` of most parts.
   * @default 'section'
   */
  testRenderPropWith?: keyof JSX.IntrinsicElements;
  /**
   * Whether the component accepts the `nativeButton` prop.
   */
  button?: boolean;
  /** @internal Set by `describeConformance.skip`. */
  skip?: boolean;
}

/**
 * Port of the subset of upstream's `describeConformance` that applies to Solid:
 * ref forwarding, prop spreading, `class`/`style` (static and state callbacks) and the `render` prop
 * (plus, like upstream, a `with a non-native button` run for `button` parts rendered as a `button`).
 */
export function describeConformance<P extends Record<string, any>>(
  TestedComponent: Component<P>,
  options: ConformanceOptions,
) {
  const { wrap = (node) => node(), refInstanceof, button = false, testRenderPropWith } = options;
  const Tested = TestedComponent as Component<any>;

  function renderTested(props: Record<string, any>) {
    return render(() => wrap(() => <Tested {...props} />));
  }

  (options.skip ? describe.skip : describe)('Base UI component API', () => {
    it('forwards the ref', async () => {
      let element: Element | undefined;
      await renderTested({
        ref: (el: Element) => {
          element = el;
        },
      });
      expect(element).toBeInstanceOf(refInstanceof);
    });

    it('spreads unknown props to the rendered element', async () => {
      await renderTested({ 'data-testid': 'tested', 'data-foo': 'bar' });
      expect(screen.getByTestId('tested')).toHaveAttribute('data-foo', 'bar');
    });

    it('applies the class prop', async () => {
      await renderTested({ 'data-testid': 'tested', class: 'custom-class' });
      expect(screen.getByTestId('tested')).toHaveClass('custom-class');
    });

    it('calls the class callback with the state', async () => {
      const classFn = vi.fn(() => 'from-callback');
      await renderTested({ 'data-testid': 'tested', class: classFn });
      expect(screen.getByTestId('tested')).toHaveClass('from-callback');
      expect(classFn).toHaveBeenCalledWith(expect.any(Object));
    });

    it('applies the style prop and the style callback', async () => {
      await renderTested({ 'data-testid': 'tested', style: { 'margin-top': '3px' } });
      expect(screen.getByTestId('tested')).toHaveStyle({ marginTop: '3px' });
    });

    it('applies a style callback', async () => {
      await renderTested({ 'data-testid': 'tested', style: () => ({ 'margin-top': '4px' }) });
      expect(screen.getByTestId('tested')).toHaveStyle({ marginTop: '4px' });
    });

    it('updates when props change', async () => {
      const [value, setValue] = createSignal('a');
      await render(() =>
        wrap(() => <Tested data-testid="tested" data-value={value()} class={value()} />),
      );
      setValue('b');
      flush();
      const element = screen.getByTestId('tested');
      expect(element).toHaveAttribute('data-value', 'b');
      expect(element).toHaveClass('b');
      expect(element).not.toHaveClass('a');
    });

    describeRenderProp(renderTested, testRenderPropWith ?? 'section', button);

    if (button && testRenderPropWith === 'button') {
      // Button parts also support rendering a non-button element with `nativeButton={false}`.
      describe('with a non-native button', () => {
        it('spreads unknown props to the rendered element', async () => {
          await renderTested({
            'data-testid': 'tested',
            'data-foo': 'bar',
            nativeButton: false,
            render: (props: Record<string, any>) => <div {...props} />,
          });
          const rendered = screen.getByTestId('tested');
          expect(rendered.tagName).toBe('DIV');
          expect(rendered).toHaveAttribute('data-foo', 'bar');
        });

        describeRenderProp(renderTested, 'div', button);
      });
    }
  });
}

function describeRenderProp(
  renderTested: (props: Record<string, any>) => unknown,
  element: keyof JSX.IntrinsicElements,
  button: boolean,
) {
  const tagName = element.toUpperCase();
  const buttonProps = button ? { nativeButton: element === 'button' } : {};

  describe('prop: render', () => {
    it('renders the element returned by a render function', async () => {
      let rendered: Element | undefined;
      await renderTested({
        ref: (el: Element) => {
          rendered = el;
        },
        'data-testid': 'tested',
        class: 'custom-class',
        render: (props: Record<string, any>) => (
          <Dynamic component={element} {...props} data-rendered="" />
        ),
        ...buttonProps,
      });
      const customRoot = screen.getByTestId('tested');
      expect(customRoot.tagName).toBe(tagName);
      expect(customRoot).toHaveAttribute('data-rendered');
      expect(customRoot).toHaveClass('custom-class');
      expect(rendered).toBe(customRoot);
    });

    it('passes the state to the render function', async () => {
      const renderFn = vi.fn((props: Record<string, any>) => (
        <Dynamic component={element} {...props} />
      ));
      await renderTested({ render: renderFn, ...buttonProps });
      expect(renderFn).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    });

    it('renders a tag name', async () => {
      await renderTested({ 'data-testid': 'tested', render: element, ...buttonProps });
      expect(screen.getByTestId('tested').tagName).toBe(tagName);
    });
  });
}

/**
 * Counterpart of upstream's `describeConformance.skip`: registers the conformance tests as skipped.
 */
describeConformance.skip = function describeConformanceSkip<P extends Record<string, any>>(
  TestedComponent: Component<P>,
  options: ConformanceOptions,
) {
  describeConformance(TestedComponent, { ...options, skip: true });
};
