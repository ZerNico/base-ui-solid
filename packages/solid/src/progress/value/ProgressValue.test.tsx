import { describe, it, expect } from 'vitest';
import { render, describeConformance, screen } from '#test-utils';
import { Progress } from '..';

describe('<Progress.Value />', () => {
  describeConformance(Progress.Value, {
    wrap: (node) => <Progress.Root value={40}>{node()}</Progress.Root>,
    refInstanceof: window.HTMLSpanElement,
  });

  describe('prop: children', () => {
    it('renders the value when children is not provided', async () => {
      await render(() => (
        <Progress.Root value={30}>
          <Progress.Value data-testid="value" />
        </Progress.Root>
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
        <Progress.Root value={30} format={format}>
          <Progress.Value data-testid="value" />
        </Progress.Root>
      ));

      const value = screen.getByTestId('value');
      expect(value.textContent).toBe(formatValue(30));
    });

    describe('it accepts a render function', () => {
      it('numerical value', async () => {
        // Port note: the render function is called once with accessors of its arguments.
        const renderSpy = vi.fn();
        const format: Intl.NumberFormatOptions = {
          style: 'currency',
          currency: 'USD',
        };
        function formatValue(v: number) {
          return new Intl.NumberFormat(undefined, format).format(v);
        }
        await render(() => (
          <Progress.Root value={30} format={format}>
            <Progress.Value data-testid="value">{renderSpy}</Progress.Value>
          </Progress.Root>
        ));
        expect(renderSpy.mock.lastCall?.[0]()).toEqual(formatValue(30));
        expect(renderSpy.mock.lastCall?.[1]()).toEqual(30);
      });

      it.each([null, Number.NaN])('indeterminate value %s', async (value) => {
        // Port note: the render function is called once with accessors of its arguments.
        const renderSpy = vi.fn();
        const format: Intl.NumberFormatOptions = {
          style: 'currency',
          currency: 'USD',
        };
        await render(() => (
          <Progress.Root value={value} format={format}>
            <Progress.Value data-testid="value">{renderSpy}</Progress.Value>
          </Progress.Root>
        ));
        expect(renderSpy.mock.lastCall?.[0]()).toEqual('indeterminate');
        expect(renderSpy.mock.lastCall?.[1]()).toEqual(value);
      });
    });
  });
});
