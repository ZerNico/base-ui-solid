import { expect, describe, it } from 'vitest';
import { Show, createSignal } from 'solid-js';
import {
  fireEvent,
  flushMicrotasks,
  render,
  renderToString,
  screen,
  waitFor,
  describeConformance,
  isJSDOM,
} from '#test-utils';
import { Fieldset } from '..';
import { FieldsetWithLegend, FieldsetWithoutLegend } from './FieldsetLegend.fixtures';

describe('<Fieldset.Legend />', () => {
  describeConformance(Fieldset.Legend, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => <Fieldset.Root>{node()}</Fieldset.Root>,
  });

  it('should set aria-labelledby on the fieldset automatically', async () => {
    await render(() => (
      <Fieldset.Root>
        <Fieldset.Legend data-testid="legend">Legend</Fieldset.Legend>
      </Fieldset.Root>
    ));

    expect(screen.getByRole('group')).toHaveAttribute(
      'aria-labelledby',
      screen.getByTestId('legend').id,
    );
  });

  it('should set aria-labelledby on the fieldset with custom id', async () => {
    await render(() => (
      <Fieldset.Root>
        <Fieldset.Legend id="legend-id" />
      </Fieldset.Root>
    ));

    expect(screen.getByRole('group')).toHaveAttribute('aria-labelledby', 'legend-id');
  });

  it('updates and clears the legend association', async () => {
    function App() {
      const [legendId, setLegendId] = createSignal('legend-a');
      const [showLegend, setShowLegend] = createSignal(true);

      return (
        <>
          <Fieldset.Root>
            <Show when={showLegend()}>
              <Fieldset.Legend id={legendId()}>Legend</Fieldset.Legend>
            </Show>
          </Fieldset.Root>
          <button type="button" onClick={() => setLegendId('legend-b')}>
            Change id
          </button>
          <button type="button" onClick={() => setShowLegend(false)}>
            Remove legend
          </button>
        </>
      );
    }

    await render(() => <App />);

    expect(screen.getByRole('group')).toHaveAttribute('aria-labelledby', 'legend-a');
    fireEvent.click(screen.getByRole('button', { name: 'Change id' }));
    await flushMicrotasks();
    expect(screen.getByRole('group')).toHaveAttribute('aria-labelledby', 'legend-b');
    fireEvent.click(screen.getByRole('button', { name: 'Remove legend' }));
    await flushMicrotasks();
    expect(screen.getByRole('group')).not.toHaveAttribute('aria-labelledby');
  });

  it('throws a descriptive error when rendered outside <Fieldset.Root>', async () => {
    await expect(render(() => <Fieldset.Legend />)).rejects.toThrow(
      'Base UI: FieldsetRootContext is missing. Fieldset parts must be placed within <Fieldset.Root>.',
    );
  });

  it.skipIf(isJSDOM)(
    'does not set `aria-labelledby` during SSR when legend is absent',
    async () => {
      await renderToString(FieldsetWithoutLegend);

      expect(screen.getByTestId('fieldset')).not.toHaveAttribute('aria-labelledby');
    },
  );

  it.skipIf(isJSDOM)(
    'sets `aria-labelledby` after hydration without a custom legend id',
    async () => {
      const { hydrate } = await renderToString(FieldsetWithLegend);

      const fieldset = screen.getByTestId('fieldset');
      const legend = screen.getByTestId('legend');

      expect(legend.id).not.toBe('');
      expect(fieldset).not.toHaveAttribute('aria-labelledby');

      hydrate();

      await waitFor(() => {
        expect(screen.getByTestId('fieldset')).toHaveAttribute('aria-labelledby', legend.id);
      });
    },
  );
});
