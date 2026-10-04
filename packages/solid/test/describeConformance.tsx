import { createSignal, flush } from 'solid-js';
import type { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { render, screen } from './utils';

export interface ConformanceOptions {
  /** Wraps the component under test, e.g. in its Root. */
  wrap?: (node: () => JSX.Element) => JSX.Element;
  /** Expected element class of the rendered element. */
  refInstanceof: typeof Element;
  /** The default tag name. */
  defaultTagName?: string;
  /** @internal Set by `describeConformance.skip`. */
  skip?: boolean;
}

/**
 * Port of the subset of upstream's `describeConformance` that applies to Solid:
 * ref forwarding, prop spreading, `class`/`style` (static and state callbacks) and the `render` prop.
 */
export function describeConformance<P extends Record<string, any>>(
  TestedComponent: Component<P>,
  options: ConformanceOptions,
) {
  const { wrap = (node) => node(), refInstanceof } = options;
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

    describe('prop: render', () => {
      it('renders the element returned by a render function', async () => {
        let element: Element | undefined;
        await renderTested({
          ref: (el: Element) => {
            element = el;
          },
          'data-testid': 'tested',
          class: 'custom-class',
          render: (props: Record<string, any>) => <section {...props} data-rendered="" />,
        });
        const rendered = screen.getByTestId('tested');
        expect(rendered.tagName).toBe('SECTION');
        expect(rendered).toHaveAttribute('data-rendered');
        expect(rendered).toHaveClass('custom-class');
        expect(element).toBe(rendered);
      });

      it('passes the state to the render function', async () => {
        const renderFn = vi.fn((props: Record<string, any>) => <span {...props} />);
        await renderTested({ render: renderFn });
        expect(renderFn).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
      });

      it('renders a tag name', async () => {
        await renderTested({ 'data-testid': 'tested', render: 'section' });
        expect(screen.getByTestId('tested').tagName).toBe('SECTION');
      });
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
