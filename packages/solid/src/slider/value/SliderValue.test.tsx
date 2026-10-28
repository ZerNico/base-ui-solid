import { expect, vi, describe, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import {
  render,
  describeConformance,
  mockRuntimeLocale,
  renderToString,
  screen,
} from '#test-utils';
import { Slider } from '..';
import { FormattedSliderValue } from './SliderValue.fixtures';

describe('<Slider.Value />', () => {
  describeConformance(Slider.Value, {
    wrap: (node) => <Slider.Root>{node()}</Slider.Root>,
    refInstanceof: window.HTMLOutputElement,
  });

  it('renders a single value', async () => {
    await render(() => (
      <Slider.Root defaultValue={40}>
        <Slider.Value data-testid="output" />
      </Slider.Root>
    ));

    const sliderValue = screen.getByTestId('output');

    expect(sliderValue).toHaveTextContent('40');
  });

  it('renders a range', async () => {
    await render(() => (
      <Slider.Root defaultValue={[40, 65]}>
        <Slider.Value data-testid="output" />
      </Slider.Root>
    ));

    const sliderValue = screen.getByTestId('output');

    expect(sliderValue).toHaveTextContent('40 – 65');
  });

  it('associates the output with every thumb input', async () => {
    await render(() => (
      <Slider.Root defaultValue={[40, 65]}>
        <Slider.Value data-testid="output" />
        <Slider.Control>
          <Slider.Thumb index={0} />
          <Slider.Thumb index={1} />
        </Slider.Control>
      </Slider.Root>
    ));

    const thumbIds = screen.getAllByRole('slider').map((thumb) => thumb.id);

    expect(thumbIds).not.toContain('');
    expect(new Set(thumbIds).size).toBe(thumbIds.length);
    expect(screen.getByTestId('output')).toHaveAttribute('for', thumbIds.join(' '));
  });

  it('renders all thumb values', async () => {
    await render(() => (
      <Slider.Root defaultValue={[40, 60, 80, 95]}>
        <Slider.Value data-testid="output" />
      </Slider.Root>
    ));

    const sliderValue = screen.getByTestId('output');

    expect(sliderValue).toHaveTextContent('40 – 60 – 80 – 95');
  });

  it('recomputes the formatted output when the format option changes', async () => {
    function formatValue(v: number, format?: Intl.NumberFormatOptions) {
      return new Intl.NumberFormat(undefined, format).format(v);
    }

    const [format, setFormat] = createSignal<Intl.NumberFormatOptions | undefined>(undefined);
    await render(() => (
      <Slider.Root defaultValue={40} format={format()}>
        <Slider.Value data-testid="output" />
      </Slider.Root>
    ));

    expect(screen.getByTestId('output').textContent).toBe(formatValue(40));

    setFormat({ style: 'currency', currency: 'USD' });
    flush();

    expect(screen.getByTestId('output').textContent).toBe(
      formatValue(40, { style: 'currency', currency: 'USD' }),
    );
  });

  describe('prop: children', () => {
    it('accepts a render function', async () => {
      const format: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
      };
      function formatValue(v: number) {
        return new Intl.NumberFormat(undefined, format).format(v);
      }
      // Port note: the render function is called once with accessors of its arguments.
      const renderSpy = vi.fn();
      await render(() => (
        <Slider.Root defaultValue={[40, 60]} format={format}>
          <Slider.Value data-testid="output">{renderSpy}</Slider.Value>
        </Slider.Root>
      ));

      expect(renderSpy.mock.lastCall?.[0]()).toEqual([formatValue(40), formatValue(60)]);
      expect(renderSpy.mock.lastCall?.[1]()).toEqual([40, 60]);
    });
  });

  describe('server-side rendering', () => {
    async function expectHydratesWithRuntimeLocale(suspense: boolean) {
      // Options no other test here formats with; see `mockRuntimeLocale`.
      const format = { maximumFractionDigits: 1 };
      mockRuntimeLocale('de-DE');

      const { hydrate } = await renderToString(FormattedSliderValue, {
        defaultValue: 1000,
        max: 2000,
        format,
        suspense,
      });
      const value = screen.getByTestId('output');
      expect(value.textContent).toBe((1000).toLocaleString('en-US', format));

      await hydrate();
      // A mismatch would replace the server markup with new nodes.
      expect(screen.getByTestId('output')).toBe(value);
      expect(value.textContent).toBe((1000).toLocaleString('de-DE', format));
    }

    it('hydrates directly inside Root without a mismatch, then uses the runtime locale', () =>
      expectHydratesWithRuntimeLocale(false));

    it('hydrates inside a Suspense boundary without a mismatch, then uses the runtime locale', () =>
      expectHydratesWithRuntimeLocale(true));
  });
});
