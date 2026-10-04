import { describe, it, expect } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { render, describeConformance, screen } from '#test-utils';
import { Meter } from '..';

describe('<Meter.Value />', () => {
  describeConformance(Meter.Value, {
    wrap: (node) => <Meter.Root value={30}>{node()}</Meter.Root>,
    refInstanceof: window.HTMLSpanElement,
  });

  describe('prop: children', () => {
    it('renders the value when children is not provided', async () => {
      await render(() => (
        <Meter.Root value={30}>
          <Meter.Value data-testid="value" />
        </Meter.Root>
      ));

      const value = screen.getByTestId('value');
      expect(value.textContent).toBe((0.3).toLocaleString(undefined, { style: 'percent' }));
    });

    it('renders a formatted value when a format is provided', async () => {
      const format: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
      };
      function formatValue(v: number) {
        return new Intl.NumberFormat(undefined, format).format(v);
      }

      await render(() => (
        <Meter.Root value={30} format={format}>
          <Meter.Value data-testid="value" />
        </Meter.Root>
      ));

      const value = screen.getByTestId('value');
      expect(value.textContent).toBe(formatValue(30));
    });

    it('accepts a render function', async () => {
      const renderSpy = vi.fn();
      const format: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'USD',
      };
      function formatValue(v: number) {
        return new Intl.NumberFormat(undefined, format).format(v);
      }
      await render(() => (
        <Meter.Root value={30} format={format}>
          <Meter.Value data-testid="value">{renderSpy}</Meter.Value>
        </Meter.Root>
      ));
      expect(renderSpy.mock.lastCall?.[0]).toEqual(formatValue(30));
      expect(renderSpy.mock.lastCall?.[1]).toEqual(30);
    });

    it('passes updated arguments to the render function when value changes', async () => {
      const renderSpy = vi.fn();

      const [value, setValue] = createSignal(30);
      await render(() => (
        <Meter.Root value={value()}>
          <Meter.Value>{renderSpy}</Meter.Value>
        </Meter.Root>
      ));

      expect(renderSpy.mock.lastCall?.[0]).toEqual(
        (0.3).toLocaleString(undefined, { style: 'percent' }),
      );
      expect(renderSpy.mock.lastCall?.[1]).toEqual(30);

      setValue(60);
      flush();

      expect(renderSpy.mock.lastCall?.[0]).toEqual(
        (0.6).toLocaleString(undefined, { style: 'percent' }),
      );
      expect(renderSpy.mock.lastCall?.[1]).toEqual(60);
    });
  });
});
