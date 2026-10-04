import { createSignal, flush } from 'solid-js';
import { describe, it, expect } from 'vitest';
import { render, renderToString, screen, flushMicrotasks, waitFor } from '#test-utils';
import { CustomToastParts } from './useToastLabelPart.fixtures';

// Port note: custom render DOM mutations/fragments and server output have no upstream regressions.
describe('custom toast render content', () => {
  it.each([false, true])('tracks empty/nonempty children with fragment=%s', async (fragment) => {
    const [empty, setEmpty] = createSignal(true);
    await render(() => <CustomToastParts empty={empty()} fragment={fragment} />);
    const root = screen.getByTestId('root');
    expect(screen.queryByRole('heading')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(root).not.toHaveAttribute('aria-describedby');
    setEmpty(false);
    flush();
    // Each part detects its content on its own, so WebKit may reveal them in separate ticks.
    await waitFor(() => {
      expect(screen.getByRole('heading')).toHaveTextContent('title');
      expect(screen.getByRole('button')).toHaveTextContent('action');
      expect(root.getAttribute('aria-describedby')).toBe(screen.getByText('description').id);
    });
    expect(root.getAttribute('aria-labelledby')).toBe(screen.getByRole('heading').id);
    setEmpty(true);
    flush();
    await waitFor(() => {
      expect(screen.queryByRole('heading')).toBeNull();
      expect(screen.queryByRole('button')).toBeNull();
    });
    expect(root).not.toHaveAttribute('aria-labelledby');
    expect(root).not.toHaveAttribute('aria-describedby');
    // Detached custom roots must still be observed when content returns.
    setEmpty(false);
    flush();
    await waitFor(() => expect(screen.getByRole('heading')).toHaveTextContent('title'));
    await flushMicrotasks();
  });

  // Port note: inspect server markup directly before hydration, as in upstream SSR tests.
  /* eslint-disable testing-library/no-container */
  it.each([false, true])('preserves custom SSR content with fragment=%s', async (fragment) => {
    const { container, hydrate } = await renderToString(CustomToastParts, { fragment });
    expect(container.querySelector('h2')).toHaveTextContent('title');
    expect(container.querySelector('p')).toHaveTextContent('description');
    expect(container.querySelector('button')).toHaveTextContent('action');
    await hydrate();
    expect(container.querySelector('h2')).toHaveTextContent('title');
  });

  it.each([false, true])(
    'hydrates initially empty custom SSR content with fragment=%s',
    async (fragment) => {
      const { container, hydrate } = await renderToString(CustomToastParts, {
        empty: true,
        fragment,
      });
      expect(container.querySelector('h2')).toBeNull();
      expect(container.querySelector('p')).toBeNull();
      expect(container.querySelector('button')).toBeNull();
      const { setProps } = await hydrate();
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
      expect(container.querySelector('h2')).toBeNull();
      expect(container.querySelector('p')).toBeNull();
      expect(container.querySelector('button')).toBeNull();
      setProps({ empty: false });
      await waitFor(() => expect(container.querySelector('h2')).toHaveTextContent('title'));
      await waitFor(() => expect(container.querySelector('p')).toHaveTextContent('description'));
      await waitFor(() => expect(container.querySelector('button')).toHaveTextContent('action'));
      expect(container.querySelector('[data-testid="root"]')).toHaveAttribute(
        'aria-labelledby',
        container.querySelector('h2')!.id,
      );
      expect(container.querySelector('[data-testid="root"]')).toHaveAttribute(
        'aria-describedby',
        container.querySelector('p')!.id,
      );
    },
  );
  /* eslint-enable testing-library/no-container */
});
