import { describe, it, expect } from 'vitest';
import {
  render,
  describeConformance,
  mockRuntimeLocale,
  renderToString,
  screen,
} from '#test-utils';
import { Progress } from '..';
import { FormattedProgressValue } from './ProgressValue.fixtures';

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

  describe('server-side rendering', () => {
    it.each([
      { name: 'directly inside Root', suspense: false },
      { name: 'inside a Suspense boundary', suspense: true },
    ])('hydrates $name without a mismatch, then uses the runtime locale', async ({ suspense }) => {
      // Options no other test here formats with; see `mockRuntimeLocale`.
      const format = { maximumFractionDigits: 1 };
      mockRuntimeLocale('de-DE');

      const { hydrate } = await renderToString(FormattedProgressValue, {
        value: 1234.5,
        max: 2000,
        format,
        suspense,
      });
      const value = screen.getByTestId('value');
      expect(value.textContent).toBe((1234.5).toLocaleString('en-US', format));

      await hydrate();
      // A mismatch would replace the server markup with new nodes.
      expect(screen.getByTestId('value')).toBe(value);
      expect(value.textContent).toBe((1234.5).toLocaleString('de-DE', format));
    });
  });
});
