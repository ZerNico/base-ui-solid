import { expect, vi, describe, it } from 'vitest';
import { createSignal, Show } from 'solid-js';
import {
  render,
  screen,
  fireEvent,
  flushMicrotasks,
  describeConformance,
  isJSDOM,
} from '#test-utils';
import { NumberField as NumberFieldBase } from '..';
import { Field } from '../../field';
import { Form } from '../../form';
import { REASONS } from '../../internals/reasons';

async function change(element: Element, value: string) {
  // React's `onChange` on text inputs is the native `input` event.
  fireEvent.input(element, { target: { value } });
  await flushMicrotasks();
}

async function focus(element: Element) {
  fireEvent.focus(element);
  await flushMicrotasks();
}

async function blur(element: Element) {
  fireEvent.blur(element);
  await flushMicrotasks();
}

async function click(element: Element) {
  fireEvent.click(element);
  await flushMicrotasks();
}

async function keyDown(element: Element | Document, init: Record<string, unknown>) {
  const result = fireEvent.keyDown(element, init);
  await flushMicrotasks();
  return result;
}

async function wheel(element: Element, init: Record<string, unknown>) {
  const result = fireEvent.wheel(element, init);
  await flushMicrotasks();
  return result;
}

async function pointerDown(element: Element, init?: Record<string, unknown>) {
  fireEvent.pointerDown(element, init);
  await flushMicrotasks();
}

describe('<NumberField />', () => {
  async function pasteText(target: HTMLElement, value: string) {
    if (isJSDOM) {
      fireEvent.paste(target, {
        clipboardData: {
          getData: (type: string) => (type === 'text/plain' ? value : ''),
        },
      });
      await flushMicrotasks();
      return;
    }

    const pasteEvent = new Event('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(pasteEvent, 'clipboardData', {
      value: {
        getData: (type: string) => (type === 'text/plain' ? value : ''),
      },
    });

    fireEvent(target, pasteEvent);
    await flushMicrotasks();
  }

  describeConformance(NumberFieldBase.Root, {
    refInstanceof: window.HTMLDivElement,
  });

  function NumberField(props: NumberFieldBase.Root.Props) {
    return (
      <NumberFieldBase.Root {...props}>
        <NumberFieldBase.Group>
          <NumberFieldBase.Input />
          <NumberFieldBase.Increment />
          <NumberFieldBase.Decrement />
          <NumberFieldBase.ScrubArea />
        </NumberFieldBase.Group>
      </NumberFieldBase.Root>
    );
  }

  describe('prop: defaultValue', () => {
    it('should accept a number value', async () => {
      await render(() => <NumberField defaultValue={1} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('1');
    });

    it('should accept an `undefined` value', async () => {
      await render(() => <NumberField />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });
  });

  describe('prop: value', () => {
    it('should accept a number value that can change over time', async () => {
      const [value, setValue] = createSignal(1);
      await render(() => <NumberField value={value()} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('1');
      setValue(2);
      await flushMicrotasks();
      expect(input).toHaveValue('2');
    });

    it('should accept an `undefined` value', async () => {
      await render(() => <NumberField />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    it('should accept a `null` value', async () => {
      await render(() => <NumberField value={null} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('');
    });

    it('should be `null` when the input is empty but not trimmed', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField value={1} onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox');
      await change(input, '  ');
      expect(onValueChange.mock.calls[0][0]).toBe(null);
    });
  });

  it('blocks submission when step mismatch occurs', async () => {
    await render(() => (
      <form data-testid="form">
        <NumberFieldBase.Root name="quantity" min={0} step={0.1}>
          <NumberFieldBase.Group>
            <NumberFieldBase.Input />
          </NumberFieldBase.Group>
        </NumberFieldBase.Root>
        <button type="submit">Submit</button>
      </form>
    ));

    const input = screen.getByRole('textbox');
    await change(input, '0.11');

    const hiddenInput = document.querySelector(
      'input[type="number"][name="quantity"]',
    ) as HTMLInputElement;
    expect(hiddenInput).not.toBe(null);
    expect(hiddenInput.validity.stepMismatch).toBe(true);

    const form = screen.getByTestId<HTMLFormElement>('form');
    expect(form.checkValidity()).toBe(false);
  });

  it.skipIf(isJSDOM)('blocks submission when step mismatch occurs with default step', async () => {
    await render(() => (
      <form data-testid="form">
        <NumberFieldBase.Root name="quantity" min={0}>
          <NumberFieldBase.Group>
            <NumberFieldBase.Input />
          </NumberFieldBase.Group>
        </NumberFieldBase.Root>
        <button type="submit">Submit</button>
      </form>
    ));

    const input = screen.getByRole('textbox');
    await change(input, '0.11');

    const hiddenInput = document.querySelector(
      'input[type="number"][name="quantity"]',
    ) as HTMLInputElement;
    expect(hiddenInput).not.toBe(null);
    expect(hiddenInput.validity.stepMismatch).toBe(true);

    const form = screen.getByTestId<HTMLFormElement>('form');
    expect(form.checkValidity()).toBe(false);
  });

  it('does not block submission when step="any"', async () => {
    await render(() => (
      <form data-testid="form">
        <NumberFieldBase.Root name="quantity" min={0} step="any">
          <NumberFieldBase.Group>
            <NumberFieldBase.Input />
          </NumberFieldBase.Group>
        </NumberFieldBase.Root>
        <button type="submit">Submit</button>
      </form>
    ));

    const input = screen.getByRole('textbox');
    await change(input, '0.11');

    const hiddenInput = document.querySelector(
      'input[type="number"][name="quantity"]',
    ) as HTMLInputElement;
    expect(hiddenInput).not.toBe(null);
    expect(hiddenInput.validity.stepMismatch).toBe(false);

    const form = screen.getByTestId<HTMLFormElement>('form');
    expect(form.checkValidity()).toBe(true);
  });

  describe('prop: onValueChange', () => {
    it('should be called when the value changes', async () => {
      const onValueChange = vi.fn();
      function App() {
        const [value, setValue] = createSignal<number | null>(1);
        return (
          <NumberField
            value={value()}
            onValueChange={(val) => {
              onValueChange(val);
              setValue(val);
            }}
          />
        );
      }
      await render(() => <App />);
      const input = screen.getByRole('textbox');
      await change(input, '2');
      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(2);
    });

    it('should be called with a number when transitioning from `null`', async () => {
      const onValueChange = vi.fn();
      function App() {
        const [value, setValue] = createSignal<number | null>(null);
        return (
          <NumberField
            value={value()}
            onValueChange={(val) => {
              onValueChange(val);
              setValue(val);
            }}
          />
        );
      }
      await render(() => <App />);
      const input = screen.getByRole('textbox');
      await change(input, '5');
      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(5);
    });

    it('should be called with `null` when empty and transitioning from a number', async () => {
      const onValueChange = vi.fn();
      function App() {
        const [value, setValue] = createSignal<number | null>(5);
        return (
          <NumberField
            value={value()}
            onValueChange={(val) => {
              onValueChange(val);
              setValue(val);
            }}
          />
        );
      }
      await render(() => <App />);
      const input = screen.getByRole('textbox');
      await change(input, '');
      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(null);
    });

    it('includes the reason for parseable typing', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox');

      await change(input, '12');

      expect(onValueChange).toHaveBeenCalledTimes(1);
      const [, details] = onValueChange.mock.calls[0] as [
        number | null,
        NumberFieldBase.Root.ChangeEventDetails,
      ];
      expect(details.reason).toBe(REASONS.inputChange);
    });

    it('includes the reason when clearing the value', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField defaultValue={5} onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox');

      await change(input, '');

      expect(onValueChange).toHaveBeenCalledTimes(1);
      const [, details] = onValueChange.mock.calls[0] as [
        number | null,
        NumberFieldBase.Root.ChangeEventDetails,
      ];
      expect(details.reason).toBe(REASONS.inputClear);
    });

    it('includes the reason for keyboard increments', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField defaultValue={1} onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox');

      input.focus();
      await flushMicrotasks();
      await keyDown(input, { key: 'ArrowUp' });

      expect(onValueChange).toHaveBeenCalledTimes(1);
      const [, details] = onValueChange.mock.calls[0] as [
        number | null,
        NumberFieldBase.Root.ChangeEventDetails,
      ];
      expect(details.reason).toBe('keyboard');
    });

    it('includes the reason for increment button presses', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField defaultValue={1} onValueChange={onValueChange} />);
      const incrementButton = screen.getByRole('button', { name: 'Increase' });

      await click(incrementButton);

      expect(onValueChange.mock.calls.length).toBe(1);
      const [, details] = onValueChange.mock.calls[0] as [
        number | null,
        NumberFieldBase.Root.ChangeEventDetails,
      ];
      expect(details.reason).toBe('increment-press');
    });

    it('includes the reason for decrement button presses', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField defaultValue={1} onValueChange={onValueChange} />);
      const decrementButton = screen.getByRole('button', { name: 'Decrease' });

      await click(decrementButton);

      expect(onValueChange.mock.calls.length).toBe(1);
      const [, details] = onValueChange.mock.calls[0] as [
        number | null,
        NumberFieldBase.Root.ChangeEventDetails,
      ];
      expect(details.reason).toBe('decrement-press');
    });

    it('includes the reason for wheel scrubbing', async () => {
      const onValueChange = vi.fn();
      await render(() => (
        <NumberField allowWheelScrub defaultValue={4} onValueChange={onValueChange} />
      ));
      const input = screen.getByRole('textbox');

      input.focus();
      await flushMicrotasks();
      await wheel(input, { deltaY: -100 });

      expect(onValueChange.mock.calls.length).toBe(1);
      const [, details] = onValueChange.mock.calls[0] as [
        number | null,
        NumberFieldBase.Root.ChangeEventDetails,
      ];
      expect(details.reason).toBe('wheel');
    });
  });

  describe('typing behavior (parseable changes)', () => {
    it('fires onValueChange for each parseable change while typing', async () => {
      const onValueChange = vi.fn();
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField onValueChange={onValueChange} onValueCommitted={onValueCommitted} />
      ));
      const input = screen.getByRole('textbox');

      // Type '1' -> parseable
      await change(input, '1');
      // Type '12' -> parseable
      await change(input, '12');
      // Type '12.' -> parseable (treated as 12)
      await change(input, '12.');
      // Type '12.a' -> not parseable, should not fire
      await change(input, '12.a');

      expect(onValueChange.mock.calls.length).toBe(3);
      expect(onValueChange.mock.calls[0][0]).toBe(1);
      expect(onValueChange.mock.calls[1][0]).toBe(12);
      expect(onValueChange.mock.calls[2][0]).toBe(12);

      expect(onValueCommitted.mock.calls.length).toBe(0);
    });

    it('does not fire onValueChange for non-numeric composition/partial input', async () => {
      const onValueChange = vi.fn();
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField onValueChange={onValueChange} onValueCommitted={onValueCommitted} />
      ));
      const input = screen.getByRole('textbox');

      // Simulate IME composition of non-numeric text; intermediate values like 'ni'
      fireEvent.compositionStart(input);
      await change(input, 'n');
      await change(input, 'ni');
      fireEvent.compositionEnd(input);
      await flushMicrotasks();

      expect(onValueChange.mock.calls.length).toBe(0);

      // Now enter a Han numeral which is parseable
      await change(input, '一');
      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(1);

      expect(onValueCommitted.mock.calls.length).toBe(0);
      await blur(input);
      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.calls[0][0]).toBe(1);
    });

    it('handles sign and decimal partials vs. parseable numbers', async () => {
      const onValueChange = vi.fn();
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField onValueChange={onValueChange} onValueCommitted={onValueCommitted} min={-10} />
      ));
      const input = screen.getByRole('textbox');

      // '-' or '.' alone aren't parseable
      await change(input, '-');
      await change(input, '.');
      // '0.' is parseable (-> 0)
      await change(input, '0.');
      await change(input, '-1');
      await change(input, '-1.5');

      expect(onValueChange.mock.calls.length).toBe(3);
      expect(onValueChange.mock.calls[0][0]).toBe(0);
      expect(onValueChange.mock.calls[1][0]).toBe(-1);
      expect(onValueChange.mock.calls[2][0]).toBe(-1.5);

      // No commit until blur
      expect(onValueCommitted.mock.calls.length).toBe(0);

      await blur(input);
      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.calls[0][0]).toBe(-1.5);
    });

    it('allows typing a decimal while replacing a selection', async () => {
      await render(() => <NumberField defaultValue={12.3} locale="en-US" />);
      const input = screen.getByRole<HTMLInputElement>('textbox');

      input.focus();
      await flushMicrotasks();

      const decimalIndex = input.value.indexOf('.');
      expect(decimalIndex).toBeGreaterThan(-1);
      input.setSelectionRange(1, decimalIndex + 2);
      await flushMicrotasks();

      const keydownResult = await keyDown(input, { key: '.' });
      expect(keydownResult).toBe(true);
    });

    it('accepts grouping while typing and parses progressively', async () => {
      const onValueChange = vi.fn();
      const onValueCommitted = vi.fn();
      const groupSeparator =
        new Intl.NumberFormat().formatToParts(10000).find((part) => part.type === 'group')?.value ??
        '';
      expect(groupSeparator).not.toBe('');

      await render(() => (
        <NumberField onValueChange={onValueChange} onValueCommitted={onValueCommitted} />
      ));
      const input = screen.getByRole('textbox');

      await change(input, '1'); // 1
      await change(input, `1${groupSeparator}`); // 1 (group symbol)
      await change(input, `1${groupSeparator}2`); // 12
      await change(input, `1${groupSeparator}23`); // 123
      await change(input, `1${groupSeparator}234`); // 1234

      expect(onValueChange.mock.calls.length).toBe(5);
      expect(onValueChange.mock.calls[0][0]).toBe(1);
      expect(onValueChange.mock.calls[1][0]).toBe(1);
      expect(onValueChange.mock.calls[2][0]).toBe(12);
      expect(onValueChange.mock.calls[3][0]).toBe(123);
      expect(onValueChange.mock.calls[4][0]).toBe(1234);

      expect(onValueCommitted.mock.calls.length).toBe(0);
      await blur(input);
      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.calls[0][0]).toBe(1234);
    });

    it('respects locale decimal separator while typing (de-DE)', async () => {
      const onValueChange = vi.fn();
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField
          onValueChange={onValueChange}
          onValueCommitted={onValueCommitted}
          locale="de-DE"
        />
      ));
      const input = screen.getByRole('textbox');

      await change(input, '1'); // 1
      await change(input, '1,'); // 1 (decimal separator typed)
      await change(input, '1,5'); // 1.5

      expect(onValueChange.mock.calls.length).toBe(3);
      expect(onValueChange.mock.calls[0][0]).toBe(1);
      expect(onValueChange.mock.calls[1][0]).toBe(1);
      expect(onValueChange.mock.calls[2][0]).toBe(1.5);

      await blur(input);
      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.calls[0][0]).toBe(1.5);
    });

    it('parses percent while typing and commits canonical percent value', async () => {
      const onValueChange = vi.fn();
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField
          onValueChange={onValueChange}
          onValueCommitted={onValueCommitted}
          format={{ style: 'percent' }}
        />
      ));
      const input = screen.getByRole('textbox');

      // Typing digits in percent style represents a fraction (12 -> 0.12)
      await change(input, '12');
      // Typing with explicit percent sign also remains 0.12
      await change(input, '12%');

      expect(onValueChange.mock.calls.length).toBe(2);
      expect(onValueChange.mock.calls[0][0]).toBe(0.12);
      expect(onValueChange.mock.calls[1][0]).toBe(0.12);
      expect(onValueCommitted.mock.calls.length).toBe(0);

      await blur(input);
      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.calls[0][0]).toBe(0.12);
    });

    it('parses an interleaved percent sign while typing (1%2 -> 12%)', async () => {
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField
          defaultValue={0.01}
          format={{ style: 'percent' }}
          locale="en-US"
          onValueCommitted={onValueCommitted}
        />
      ));

      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('1%');

      // Typing `2` after the rendered `1%` yields `1%2`, which must reformat to `12%` on blur.
      await focus(input);
      await change(input, '1%2');
      await blur(input);

      expect(input).toHaveValue('12%');
      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.calls[0][0]).toBe(0.12);
    });

    it('accepts currency symbol while typing and parses numeric value', async () => {
      const onValueChange = vi.fn();
      const format: Intl.NumberFormatOptions = { style: 'currency', currency: 'USD' };
      const formatter = new Intl.NumberFormat(undefined, format);
      const parts = formatter.formatToParts(12345);
      const groupSeparator = parts.find((part) => part.type === 'group')?.value ?? '';
      expect(groupSeparator).not.toBe('');

      function formatPartialValue(value: string) {
        let valueInserted = false;
        return parts
          .map((part) => {
            if (
              part.type === 'integer' ||
              part.type === 'group' ||
              part.type === 'decimal' ||
              part.type === 'fraction'
            ) {
              if (!valueInserted) {
                valueInserted = true;
                return value;
              }
              return '';
            }
            return part.value;
          })
          .join('');
      }

      await render(() => <NumberField onValueChange={onValueChange} format={format} />);
      const input = screen.getByRole('textbox');

      await change(input, formatPartialValue('1'));
      await change(input, formatPartialValue(`1${groupSeparator}2`));

      expect(onValueChange.mock.calls.length).toBe(2);
      expect(onValueChange.mock.calls[0][0]).toBe(1);
      expect(onValueChange.mock.calls[1][0]).toBe(12);
    });

    it('accepts multi-character currency symbols while typing (e.g. pt-BR BRL)', async () => {
      const onValueChange = vi.fn();
      const format: Intl.NumberFormatOptions = { style: 'currency', currency: 'BRL' };
      await render(() => (
        <NumberField
          defaultValue={1234.56}
          locale="pt-BR"
          format={format}
          onValueChange={onValueChange}
        />
      ));
      const input = screen.getByRole('textbox');
      const formatted = new Intl.NumberFormat('pt-BR', format).format(1234.56);

      // Type a trailing digit. Previously every keystroke was rejected because the multi-character
      // `R$` symbol failed the per-character validation in the change handler.
      await change(input, `${formatted}7`);

      expect(input).toHaveValue(`${formatted}7`);
      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(1234.567);
    });

    it('accepts multi-character unit symbols while typing (e.g. km/h)', async () => {
      const onValueChange = vi.fn();
      await render(() => (
        <NumberField
          locale="en-US"
          format={{ style: 'unit', unit: 'kilometer-per-hour' }}
          onValueChange={onValueChange}
        />
      ));
      const input = screen.getByRole('textbox');

      // The `km/h` unit must not block editing the numeric region.
      await change(input, '1 km/h');
      await change(input, '12 km/h');

      expect(onValueChange.mock.calls.length).toBe(2);
      expect(onValueChange.mock.calls[0][0]).toBe(1);
      expect(onValueChange.mock.calls[1][0]).toBe(12);
    });

    it('accepts exponent separators while typing (scientific notation)', async () => {
      const onValueChange = vi.fn();
      const format: Intl.NumberFormatOptions = { notation: 'scientific' };
      await render(() => (
        <NumberField locale="en-US" format={format} onValueChange={onValueChange} />
      ));
      const input = screen.getByRole('textbox');

      // `1.5E3` should parse to 1500 rather than being rejected for the `E` separator.
      await change(input, '1.5E3');

      expect(input).toHaveValue('1.5E3');
      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(1500);
    });

    it('ignores bidi/format control characters in the value (e.g. RTL exponent signs)', async () => {
      const onValueChange = vi.fn();
      const format: Intl.NumberFormatOptions = { notation: 'scientific' };
      await render(() => (
        <NumberField locale="en-US" format={format} onValueChange={onValueChange} />
      ));
      const input = screen.getByRole('textbox');

      // RTL locales (e.g. fa-IR) insert a U+200E LEFT-TO-RIGHT MARK around the exponent sign in
      // scientific notation. Inject one into an otherwise-valid value so the test is deterministic
      // across ICU versions: the validator must ignore the control character rather than reject it.
      await change(input, '5E‎-1');

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(0.5);
    });

    it('allows deleting trailing currency symbols with locale literals', async () => {
      const onValueChange = vi.fn();
      const format: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };
      const formatter = new Intl.NumberFormat('de-DE', format);

      await render(() => (
        <NumberField
          defaultValue={12.34}
          locale="de-DE"
          format={format}
          onValueChange={onValueChange}
        />
      ));
      const input = screen.getByRole('textbox');
      const formatted = formatter.format(12.34);
      const withoutCurrency = formatted.replace('€', '');

      await change(input, withoutCurrency);

      expect(input).toHaveValue(withoutCurrency);
      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(12.34);
    });

    it('allows backspace to remove trailing currency symbol that follows a locale literal', async () => {
      const onValueChange = vi.fn();
      const format: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };
      const formatter = new Intl.NumberFormat('de-DE', format);

      await render(() => (
        <NumberField
          defaultValue={12.34}
          locale="de-DE"
          format={format}
          onValueChange={onValueChange}
        />
      ));

      const input = screen.getByRole('textbox');
      const formatted = formatter.format(12.34);
      const afterBackspace = formatted.slice(0, -1);

      input.focus();
      await flushMicrotasks();

      const keydownResult = await keyDown(input, { key: 'Backspace' });
      expect(keydownResult).toBe(true);

      await change(input, afterBackspace);

      expect(input).toHaveValue(afterBackspace);
      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(12.34);
    });

    it('does not commit on blur for invalid input', async () => {
      const onValueCommitted = vi.fn();
      await render(() => <NumberField onValueCommitted={onValueCommitted} />);
      const input = screen.getByRole('textbox');

      await change(input, '.');
      expect(input).toHaveValue('.');
      await blur(input);

      expect(onValueCommitted.mock.calls.length).toBe(0);
    });
  });

  describe('prop: onValueCommitted', () => {
    it('fires on blur with committed numeric value', async () => {
      const onValueCommitted = vi.fn();
      await render(() => <NumberField onValueCommitted={onValueCommitted} />);
      const input = screen.getByRole('textbox');

      await focus(input);
      await change(input, '123.');
      await blur(input);

      expect(onValueCommitted.mock.calls.length).toBe(1);
      // Canonicalizes to 123
      expect(onValueCommitted.mock.calls[0][0]).toBe(123);
    });

    it('fires null on blur when input is cleared', async () => {
      const onValueCommitted = vi.fn();
      await render(() => <NumberField defaultValue={5} onValueCommitted={onValueCommitted} />);
      const input = screen.getByRole('textbox');

      await focus(input);
      await change(input, '');
      await blur(input);

      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.calls[0][0]).toBe(null);
    });

    it('reports and displays the clamped value on blur, not the raw input', async () => {
      const onValueCommitted = vi.fn();
      await render(() => <NumberField max={10} onValueCommitted={onValueCommitted} />);
      const input = screen.getByRole('textbox');

      await focus(input);
      await change(input, '1000');
      await blur(input);

      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.calls[0][0]).toBe(10);
      expect(input).toHaveValue('10');
    });

    it('reports and displays the min-clamped value on blur, not the raw input', async () => {
      const onValueCommitted = vi.fn();
      await render(() => <NumberField min={0} onValueCommitted={onValueCommitted} />);
      const input = screen.getByRole('textbox');

      await focus(input);
      await change(input, '-50');
      await blur(input);

      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.calls[0][0]).toBe(0);
      expect(input).toHaveValue('0');
    });

    it('fires on keyboard interactions (ArrowUp/Down/Home/End)', async () => {
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField defaultValue={0} min={-10} max={10} onValueCommitted={onValueCommitted} />
      ));

      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();

      await keyDown(input, { key: 'ArrowUp' });
      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.lastCall?.[0]).toBe(1);

      await keyDown(input, { key: 'ArrowDown' });
      expect(onValueCommitted.mock.calls.length).toBe(2);
      expect(onValueCommitted.mock.lastCall?.[0]).toBe(0);

      await keyDown(input, { key: 'Home' });
      expect(onValueCommitted.mock.calls.length).toBe(3);
      expect(onValueCommitted.mock.lastCall?.[0]).toBe(-10);

      await keyDown(input, { key: 'End' });
      expect(onValueCommitted.mock.calls.length).toBe(4);
      expect(onValueCommitted.mock.lastCall?.[0]).toBe(10);
    });

    it('fires when using increment/decrement buttons', async () => {
      const onValueCommitted = vi.fn();
      await render(() => <NumberField defaultValue={0} onValueCommitted={onValueCommitted} />);

      const input = screen.getByRole('textbox');
      const inc = screen.getByLabelText('Increase');
      const dec = screen.getByLabelText('Decrease');

      await click(inc);
      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.lastCall?.[0]).toBe(1);
      expect(input).toHaveValue('1');

      await click(dec);
      expect(onValueCommitted.mock.calls.length).toBe(2);
      expect(onValueCommitted.mock.lastCall?.[0]).toBe(0);
      expect(input).toHaveValue('0');
    });

    it('includes the correct reason for increment and decrement button presses', async () => {
      const onValueCommitted = vi.fn();
      await render(() => <NumberField defaultValue={0} onValueCommitted={onValueCommitted} />);

      const inc = screen.getByLabelText('Increase');
      const dec = screen.getByLabelText('Decrease');

      await click(inc);
      expect(onValueCommitted.mock.lastCall?.[1].reason).toBe(REASONS.incrementPress);

      await click(dec);
      expect(onValueCommitted.mock.lastCall?.[1].reason).toBe(REASONS.decrementPress);
    });

    it('does not fire when blurring an untouched empty field', async () => {
      const onValueCommitted = vi.fn();
      await render(() => <NumberField onValueCommitted={onValueCommitted} />);
      const input = screen.getByRole('textbox');

      await focus(input);
      await blur(input);

      expect(onValueCommitted.mock.calls.length).toBe(0);
    });

    it('does not fire on keyboard steps that do not change the value', async () => {
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField defaultValue={5} min={0} max={5} onValueCommitted={onValueCommitted} />
      ));
      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();

      await keyDown(input, { key: 'ArrowUp' });
      await keyDown(input, { key: 'End' });
      expect(onValueCommitted.mock.calls.length).toBe(0);

      await keyDown(input, { key: 'ArrowDown' });
      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.lastCall?.[0]).toBe(4);
    });

    it('fires once per press-release even after mouseleave/mouseenter during a hold', async () => {
      const onValueCommitted = vi.fn();
      await render(() => <NumberField defaultValue={0} onValueCommitted={onValueCommitted} />);
      const inc = screen.getByLabelText('Increase');

      fireEvent.pointerDown(inc, { button: 0 });
      fireEvent.mouseLeave(inc);
      fireEvent.mouseEnter(inc, { buttons: 1 });
      fireEvent.pointerUp(inc, { button: 0 });
      await flushMicrotasks();

      expect(onValueCommitted.mock.calls.length).toBe(1);
    });

    it('does not commit a canceled keyboard change', async () => {
      const onValueChange = vi.fn((_value, details) => details.cancel());
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField
          defaultValue={0}
          onValueChange={onValueChange}
          onValueCommitted={onValueCommitted}
        />
      ));
      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();

      await keyDown(input, { key: 'ArrowUp' });

      expect(input).toHaveValue('0');
      expect(onValueCommitted.mock.calls.length).toBe(0);
    });

    it('does not commit a canceled clear on blur', async () => {
      const onValueChange = vi.fn((_value, details) => details.cancel());
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField
          defaultValue={5}
          onValueChange={onValueChange}
          onValueCommitted={onValueCommitted}
        />
      ));
      const input = screen.getByRole('textbox');

      await focus(input);
      await change(input, '');
      await blur(input);

      expect(onValueCommitted.mock.calls.length).toBe(0);
    });
  });

  describe('prop: disabled', () => {
    it('should disable the input', async () => {
      await render(() => <NumberField disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('disabled');
    });
  });

  describe('prop: readOnly', () => {
    it('should mark the input as readOnly', async () => {
      await render(() => <NumberField readOnly />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });

    it('keeps focus state in sync on a readOnly field', async () => {
      await render(() => (
        <Field.Root>
          <NumberFieldBase.Root readOnly>
            <NumberFieldBase.Input data-testid="input" />
          </NumberFieldBase.Root>
        </Field.Root>
      ));
      const input = screen.getByTestId('input');

      await focus(input);
      expect(input).toHaveAttribute('data-focused', '');

      await blur(input);
      expect(input).not.toHaveAttribute('data-focused');
    });

    it('does not render aria-readonly on stepper buttons', async () => {
      await render(() => <NumberField readOnly />);

      const input = screen.getByRole('textbox');
      const increment = screen.getByRole('button', { name: 'Increase' });
      const decrement = screen.getByRole('button', { name: 'Decrease' });

      // `aria-readonly` isn't valid on the `button` role; the readonly state lives on the input,
      // and the steppers are exposed as unavailable via disabled semantics instead.
      expect(input).toHaveAttribute('readonly');
      expect(increment).not.toHaveAttribute('aria-readonly');
      expect(decrement).not.toHaveAttribute('aria-readonly');
      expect(increment).toHaveAttribute('aria-disabled', 'true');
      expect(decrement).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('prop: required', () => {
    it('should mark the input as required', async () => {
      await render(() => <NumberField required />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('required');
    });
  });

  describe('prop: name', () => {
    it('should set the name attribute on the hidden input', async () => {
      await render(() => <NumberField name="test" />);
      const hiddenInput = screen.getByText('', {
        selector: 'input[aria-hidden][type=number]',
      });
      expect(hiddenInput).toHaveAttribute('name', 'test');
    });

    it('marks the hidden input readOnly when the field is readOnly', async () => {
      await render(() => <NumberField name="test" readOnly />);
      const hiddenInput = screen.getByText('', {
        selector: 'input[aria-hidden][type=number]',
      });
      expect(hiddenInput).toHaveAttribute('readonly');
    });
  });

  describe('prop: min', () => {
    it('prevents the raw value from going below the `min` prop', async () => {
      const fn = vi.fn();

      function App() {
        const [value, setValue] = createSignal<number | null>(5);
        return (
          <NumberField
            value={value()}
            onValueChange={(v) => {
              fn(v);
              setValue(v);
            }}
            min={5}
          />
        );
      }

      await render(() => <App />);

      const input = screen.getByRole('textbox');
      await change(input, '4');

      expect(input).toHaveValue('4');
      expect(fn.mock.calls[0][0]).toBe(5);
    });

    it('allows the value to go above the `min` prop', async () => {
      const fn = vi.fn();

      function App() {
        const [value, setValue] = createSignal<number | null>(5);
        return (
          <NumberField
            value={value()}
            onValueChange={(v) => {
              fn(v);
              setValue(v);
            }}
            min={5}
          />
        );
      }

      await render(() => <App />);

      const input = screen.getByRole('textbox');
      await change(input, '6');

      expect(input).toHaveValue('6');
    });
  });

  describe('prop: max', () => {
    it('prevents the value from going above the `max` prop', async () => {
      const fn = vi.fn();

      function App() {
        const [value, setValue] = createSignal<number | null>(5);
        return (
          <NumberField
            value={value()}
            onValueChange={(v) => {
              fn(v);
              setValue(v);
            }}
            max={5}
          />
        );
      }

      await render(() => <App />);

      const input = screen.getByRole('textbox');
      await change(input, '6');

      expect(input).toHaveValue('6');
      expect(fn.mock.calls[0][0]).toBe(5);
    });

    it('allows the value to go below the `max` prop', async () => {
      const fn = vi.fn();

      function App() {
        const [value, setValue] = createSignal<number | null>(5);
        return (
          <NumberField
            value={value()}
            onValueChange={(v) => {
              fn(v);
              setValue(v);
            }}
            max={5}
          />
        );
      }

      await render(() => <App />);

      const input = screen.getByRole('textbox');
      await change(input, '4');

      expect(input).toHaveValue('4');
      expect(fn.mock.calls[0][0]).toBe(4);
    });
  });

  describe('prop: allowOutOfRange', () => {
    it('allows typing a negative value via keyboard when min is 0', async () => {
      await render(() => <NumberField min={0} allowOutOfRange />);
      const input = screen.getByRole('textbox') as HTMLInputElement;
      input.focus();

      // The minus key must not be blocked, so native underflow validation is reachable.
      const preventDefaultSpy = vi.fn();
      await keyDown(input, { key: '-', preventDefault: preventDefaultSpy });
      expect(preventDefaultSpy).toHaveBeenCalledTimes(0);

      await change(input, '-1');
      expect(input).toHaveValue('-1');
    });

    it('allows range overflow validation when true', async () => {
      await render(() => (
        <form data-testid="form">
          <NumberFieldBase.Root name="quantity" max={5} allowOutOfRange>
            <NumberFieldBase.Group>
              <NumberFieldBase.Input />
            </NumberFieldBase.Group>
          </NumberFieldBase.Root>
          <button type="submit">Submit</button>
        </form>
      ));

      const input = screen.getByRole('textbox');
      await change(input, '6');

      const hiddenInput = document.querySelector(
        'input[type="number"][name="quantity"]',
      ) as HTMLInputElement;

      expect(hiddenInput).not.toBe(null);
      expect(hiddenInput.value).toBe('6');
      expect(hiddenInput.validity.rangeOverflow).toBe(true);

      const form = screen.getByTestId<HTMLFormElement>('form');
      expect(form.checkValidity()).toBe(false);
    });

    it('still clamps step interactions when true', async () => {
      await render(() => (
        <form data-testid="form">
          <NumberField defaultValue={5} max={5} allowOutOfRange name="quantity" />
          <button type="submit">Submit</button>
        </form>
      ));

      const input = screen.getByRole('textbox');
      await click(screen.getByLabelText('Increase'));

      const hiddenInput = document.querySelector(
        'input[type="number"][name="quantity"]',
      ) as HTMLInputElement;

      expect(input).toHaveValue('5');
      expect(hiddenInput).not.toBe(null);
      expect(hiddenInput.value).toBe('5');
      expect(hiddenInput.validity.rangeOverflow).toBe(false);

      const form = screen.getByTestId<HTMLFormElement>('form');
      expect(form.checkValidity()).toBe(true);
    });

    it('clamps to range when false', async () => {
      await render(() => (
        <form data-testid="form">
          <NumberFieldBase.Root name="quantity" max={5} allowOutOfRange={false}>
            <NumberFieldBase.Group>
              <NumberFieldBase.Input />
            </NumberFieldBase.Group>
          </NumberFieldBase.Root>
          <button type="submit">Submit</button>
        </form>
      ));

      const input = screen.getByRole('textbox');
      await change(input, '6');

      const hiddenInput = document.querySelector(
        'input[type="number"][name="quantity"]',
      ) as HTMLInputElement;

      expect(hiddenInput).not.toBe(null);
      expect(hiddenInput.value).toBe('5');
      expect(hiddenInput.validity.rangeOverflow).toBe(false);

      const form = screen.getByTestId<HTMLFormElement>('form');
      expect(form.checkValidity()).toBe(true);
    });
  });

  describe('prop: step', () => {
    it('defaults to 1', async () => {
      await render(() => <NumberField defaultValue={5} />);
      const input = screen.getByRole('textbox');
      await click(screen.getByLabelText('Increase'));
      expect(input).toHaveValue('6');
    });

    it('should increment the value by the `step` prop', async () => {
      await render(() => <NumberField defaultValue={4} step={2} />);
      const input = screen.getByRole('textbox');
      await click(screen.getByLabelText('Increase'));
      expect(input).toHaveValue('6');
    });

    it('should snap when incrementing to the nearest multiple of the `step` prop', async () => {
      await render(() => <NumberField defaultValue={5} step={2} snapOnStep />);
      const input = screen.getByRole('textbox');
      await click(screen.getByLabelText('Increase'));
      expect(input).toHaveValue('6');
    });

    it('should decrement the value by the `step` prop', async () => {
      await render(() => <NumberField defaultValue={6} step={2} />);
      const input = screen.getByRole('textbox');
      await click(screen.getByLabelText('Decrease'));
      expect(input).toHaveValue('4');
    });

    it('should snap when decrementing to the nearest multiple of the `step` prop', async () => {
      await render(() => <NumberField defaultValue={5} step={2} snapOnStep />);
      const input = screen.getByRole('textbox');
      await click(screen.getByLabelText('Decrease'));
      expect(input).toHaveValue('4');
    });
  });

  describe.skipIf(isJSDOM)('prop: largeStep', () => {
    it('should increment the value by the default `largeStep` prop of 10 while holding the shift key', async () => {
      await render(() => <NumberField defaultValue={5} />);
      const input = screen.getByRole('textbox');
      await pointerDown(screen.getByLabelText('Increase'), { shiftKey: true });
      expect(input).toHaveValue('15');
    });

    it('should decrement the value by the default `largeStep` prop of 10 while holding the shift key', async () => {
      await render(() => <NumberField defaultValue={6} />);
      const input = screen.getByRole('textbox');
      await pointerDown(screen.getByLabelText('Decrease'), { shiftKey: true });
      expect(input).toHaveValue('-4');
    });

    it('should use explicit `largeStep` value if provided while holding the shift key', async () => {
      await render(() => <NumberField defaultValue={5} largeStep={5} />);
      const input = screen.getByRole('textbox');
      await pointerDown(screen.getByLabelText('Increase'), { shiftKey: true });
      expect(input).toHaveValue('10');
    });

    it('should not use the `largeStep` prop if no longer holding the shift key', async () => {
      await render(() => <NumberField defaultValue={5} largeStep={5} />);
      const input = screen.getByRole('textbox');
      await pointerDown(screen.getByLabelText('Increase'), { shiftKey: true });
      expect(input).toHaveValue('10');
      fireEvent.keyUp(input, { shiftKey: true });
      await pointerDown(screen.getByLabelText('Increase'), { shiftKey: true });
      expect(input).toHaveValue('15');
    });
  });

  describe.skipIf(isJSDOM)('prop: smallStep', () => {
    it('should increment the value by the default `smallStep` prop of 0.1 while holding the alt key', async () => {
      await render(() => <NumberField defaultValue={5} />);
      const input = screen.getByRole('textbox');
      await pointerDown(screen.getByLabelText('Increase'), { altKey: true });
      expect(input).toHaveValue((5.1).toLocaleString());
    });

    it('should decrement the value by the default `smallStep` prop of 0.1 while holding the alt key', async () => {
      await render(() => <NumberField defaultValue={6} />);
      const input = screen.getByRole('textbox');
      await pointerDown(screen.getByLabelText('Decrease'), { altKey: true });
      expect(input).toHaveValue((5.9).toLocaleString());
    });

    it('should use explicit `smallStep` value if provided while holding the alt key', async () => {
      await render(() => <NumberField defaultValue={5} smallStep={0.5} />);
      const input = screen.getByRole('textbox');
      fireEvent.keyDown(document.body, { altKey: true });
      await pointerDown(screen.getByLabelText('Increase'), { altKey: true });
      expect(input).toHaveValue((5.5).toLocaleString());
    });

    it('should not use the `smallStep` prop if no longer holding the alt key', async () => {
      await render(() => <NumberField defaultValue={5} smallStep={0.5} />);
      const input = screen.getByRole('textbox');
      const button = screen.getByLabelText('Increase');
      await pointerDown(button, { altKey: true });
      expect(input).toHaveValue((5.5).toLocaleString());
      fireEvent.keyUp(input, { altKey: false });
      await pointerDown(button);
      expect(input).toHaveValue((6.5).toLocaleString());
    });
  });

  describe('prop: format', () => {
    it('reformats the visible text when the format prop changes at the same value', async () => {
      const [format, setFormat] = createSignal<Intl.NumberFormatOptions | undefined>(undefined);
      await render(() => <NumberField value={1000} format={format()} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue(new Intl.NumberFormat().format(1000));

      setFormat({ style: 'currency', currency: 'USD' });
      await flushMicrotasks();
      expect(input).toHaveValue(
        new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(1000),
      );
    });

    it('should format the value using the provided options', async () => {
      await render(() => (
        <NumberField defaultValue={1000} format={{ style: 'currency', currency: 'USD' }} />
      ));
      const input = screen.getByRole('textbox');
      const expectedValue = new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
      }).format(1000);
      expect(input).toHaveValue(expectedValue);
    });

    it('reflects controlled value changes in the textbox', async () => {
      function App() {
        const [val, setVal] = createSignal<number | null>(1);
        return (
          <div>
            <NumberField value={val()} onValueChange={(next) => setVal(next)} />
            <button onClick={() => setVal(1234)}>set</button>
          </div>
        );
      }

      const { user } = await render(() => <App />);
      const input = screen.getByRole('textbox');

      expect(input).toHaveValue('1');

      await user.click(screen.getByText('set'));
      expect(input).toHaveValue((1234).toLocaleString());
    });
  });

  describe('prop: allowWheelScrub', () => {
    it('does not scrub on wheel when disabled', async () => {
      const onValueChange = vi.fn();
      await render(() => (
        <NumberField defaultValue={5} allowWheelScrub disabled onValueChange={onValueChange} />
      ));
      await wheel(screen.getByRole('textbox'), { deltaY: 1 });
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does not scrub on wheel when readOnly', async () => {
      const onValueChange = vi.fn();
      await render(() => (
        <NumberField defaultValue={5} allowWheelScrub readOnly onValueChange={onValueChange} />
      ));
      await wheel(screen.getByRole('textbox'), { deltaY: 1 });
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('should allow the user to scrub the input value with the mouse wheel', async () => {
      await render(() => <NumberField defaultValue={5} allowWheelScrub />);
      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();
      await wheel(input, { deltaY: 1 });
      expect(input).toHaveValue('4');
      await wheel(input, { deltaY: -1 });
      expect(input).toHaveValue('5');
    });

    it('should not allow the user to scrub the input value with the mouse wheel if `allowWheelScrub` is `false`', async () => {
      await render(() => <NumberField defaultValue={5} allowWheelScrub={false} />);
      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();
      await wheel(input, { deltaY: 1 });
      expect(input).toHaveValue('5');
      await wheel(input, { deltaY: -5 });
      expect(input).toHaveValue('5');
    });

    it('does not scrub on wheel while pinch-zooming (ctrlKey)', async () => {
      const onValueChange = vi.fn();
      await render(() => (
        <NumberField defaultValue={5} allowWheelScrub onValueChange={onValueChange} />
      ));
      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();

      await wheel(input, { deltaY: 1, ctrlKey: true });
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does not scrub on wheel when the input is not focused', async () => {
      const onValueChange = vi.fn();
      await render(() => (
        <NumberField defaultValue={5} allowWheelScrub onValueChange={onValueChange} />
      ));
      const input = screen.getByRole('textbox');

      await wheel(input, { deltaY: 1 });
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does not scrub on a horizontal wheel event, and lets it scroll the page', async () => {
      const onValueChange = vi.fn();
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField
          defaultValue={5}
          allowWheelScrub
          onValueChange={onValueChange}
          onValueCommitted={onValueCommitted}
        />
      ));
      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();

      // `fireEvent` returns false when the event was canceled with `preventDefault`.
      expect(await wheel(input, { deltaY: 0, deltaX: 100 })).toBe(true);
      expect(await wheel(input, { deltaY: 0, deltaX: -100 })).toBe(true);
      // A precision touchpad emits sub-pixel noise on the cross axis during a sideways swipe.
      expect(await wheel(input, { deltaY: -0.5, deltaX: 100 })).toBe(true);
      expect(await wheel(input, { deltaY: 0.5, deltaX: -100 })).toBe(true);
      // An event with no movement at all.
      expect(await wheel(input, { deltaY: 0, deltaX: 0 })).toBe(true);

      expect(input).toHaveValue('5');
      expect(onValueChange).not.toHaveBeenCalled();
      expect(onValueCommitted).not.toHaveBeenCalled();
    });

    it('scrubs on a vertical wheel event that carries horizontal noise', async () => {
      await render(() => <NumberField defaultValue={5} allowWheelScrub />);
      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();

      // `fireEvent` returns false when the event was canceled, which is what stops the page
      // from scrolling out from under the user while the value scrubs.
      expect(await wheel(input, { deltaY: 1, deltaX: -0.5 })).toBe(false);
      expect(input).toHaveValue('4');

      expect(await wheel(input, { deltaY: -1, deltaX: 0.5 })).toBe(false);
      expect(input).toHaveValue('5');

      expect(await wheel(input, { deltaY: 1 })).toBe(false);
      expect(input).toHaveValue('4');
    });

    it('uses largeStep when shift is held and the browser swaps the wheel axis', async () => {
      await render(() => <NumberField defaultValue={0} largeStep={10} allowWheelScrub />);
      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();

      // Chromium delivers shift + wheel as a horizontal event, so the horizontal delta carries
      // the intended direction: positive is "down", which steps the value down.
      expect(await wheel(input, { deltaY: 0, deltaX: -100, shiftKey: true })).toBe(false);
      expect(input).toHaveValue('10');

      expect(await wheel(input, { deltaY: 0, deltaX: 100, shiftKey: true })).toBe(false);
      expect(input).toHaveValue('0');

      // Cross-axis noise must not flip the direction of the same physical gesture, so the noise
      // here opposes the horizontal delta: the dominant axis has to win.
      expect(await wheel(input, { deltaY: 0.5, deltaX: -100, shiftKey: true })).toBe(false);
      expect(input).toHaveValue('10');

      expect(await wheel(input, { deltaY: -0.5, deltaX: 100, shiftKey: true })).toBe(false);
      expect(input).toHaveValue('0');
    });

    it('uses largeStep when shift is held during wheel', async () => {
      const onValueChange = vi.fn();
      await render(() => (
        <NumberField
          defaultValue={0}
          largeStep={10}
          allowWheelScrub
          onValueChange={onValueChange}
        />
      ));
      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();

      await wheel(input, { deltaY: -1, shiftKey: true });
      expect(onValueChange.mock.lastCall?.[0]).toBe(10);
    });

    it('calls onValueChange and onValueCommitted on wheel', async () => {
      const onValueChange = vi.fn();
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField
          defaultValue={5}
          allowWheelScrub
          onValueChange={onValueChange}
          onValueCommitted={onValueCommitted}
        />
      ));
      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();

      await wheel(input, { deltaY: 1 });
      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.lastCall?.[0]).toBe(4);
      expect(onValueCommitted.mock.calls.length).toBe(1);
      expect(onValueCommitted.mock.lastCall?.[0]).toBe(4);
      expect(onValueCommitted.mock.lastCall?.[1].reason).toBe(REASONS.wheel);

      await wheel(input, { deltaY: -1 });
      expect(onValueChange.mock.calls.length).toBe(2);
      expect(onValueChange.mock.lastCall?.[0]).toBe(5);
      expect(onValueCommitted.mock.calls.length).toBe(2);
      expect(onValueCommitted.mock.lastCall?.[0]).toBe(5);

      // Blur doesn't commit again; the wheel changes were already committed.
      await blur(input);
      expect(onValueCommitted.mock.calls.length).toBe(2);
    });

    it('does not commit when a wheel step is a no-op at the boundary', async () => {
      const onValueChange = vi.fn();
      const onValueCommitted = vi.fn();
      await render(() => (
        <NumberField
          defaultValue={5}
          max={5}
          allowWheelScrub
          onValueChange={onValueChange}
          onValueCommitted={onValueCommitted}
        />
      ));
      const input = screen.getByRole('textbox');
      input.focus();
      await flushMicrotasks();

      await wheel(input, { deltaY: -1 });

      expect(onValueChange).not.toHaveBeenCalled();
      expect(onValueCommitted).not.toHaveBeenCalled();
      expect(input).toHaveValue('5');
    });

    it('syncs the visible input value when using the mouse wheel after pasting', async () => {
      const onValueChange = vi.fn();

      await render(() => (
        <NumberField defaultValue={10} allowWheelScrub onValueChange={onValueChange} />
      ));

      const input = screen.getByRole('textbox') as HTMLInputElement;
      input.focus();
      await flushMicrotasks();

      // Select the existing value so the paste replaces it rather than inserting at the caret.
      input.select();
      await pasteText(input, '20');

      expect(input).toHaveValue('20');
      expect(onValueChange.mock.lastCall?.[0]).toBe(20);

      await wheel(input, { deltaY: -1 });

      expect(onValueChange.mock.lastCall?.[0]).toBe(21);
      expect(input).toHaveValue('21');
    });
  });

  describe('Form', () => {
    it('should include the input value in the form submission', async ({ skip }) => {
      if (isJSDOM) {
        // FormData is not available in JSDOM
        skip();
      }

      let fieldValue = '';

      await render(() => (
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget as HTMLFormElement);
            fieldValue = formData.get('test') as string;
          }}
        >
          <Field.Root name="test">
            <NumberFieldBase.Root defaultValue={undefined}>
              <NumberFieldBase.Input />
            </NumberFieldBase.Root>
            <button type="submit">Submit</button>
          </Field.Root>
        </Form>
      ));

      const submitButton = screen.getByText('Submit');
      submitButton.click();
      await flushMicrotasks();
      expect(fieldValue).toBe('');

      await change(screen.getByRole('textbox'), '50');
      submitButton.click();
      await flushMicrotasks();
      expect(fieldValue).toBe('50');
    });

    it('should not include formatting in the submitted value', async ({ skip }) => {
      if (isJSDOM) {
        // FormData is not available in JSDOM
        skip();
      }

      const format: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      };

      let fieldValue = '';

      await render(() => (
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget as HTMLFormElement);
            fieldValue = formData.get('test') as string;
          }}
        >
          <Field.Root name="test">
            <NumberFieldBase.Root defaultValue={54.5} format={format} locale="de-DE">
              <NumberFieldBase.Input />
            </NumberFieldBase.Root>
            <button type="submit">Submit</button>
          </Field.Root>
        </Form>
      ));

      const input = screen.getByRole('textbox');
      const expectedValue = new Intl.NumberFormat('de-DE', format).format(54.5);
      expect(input).toHaveValue(expectedValue);

      const submitButton = screen.getByText('Submit');

      submitButton.click();
      await flushMicrotasks();

      expect(fieldValue).toBe('54.5');
    });

    it.skipIf(isJSDOM)('submits to an external form when `form` is provided', async () => {
      let fieldValue = '';

      await render(() => (
        <>
          <form
            id="external-form"
            onSubmit={(event) => {
              event.preventDefault();
              const formData = new FormData(event.currentTarget);
              fieldValue = formData.get('test') as string;
            }}
          >
            <button type="submit">Submit</button>
          </form>
          <NumberFieldBase.Root name="test" form="external-form" defaultValue={54.5}>
            <NumberFieldBase.Input />
          </NumberFieldBase.Root>
        </>
      ));

      screen.getByText('Submit').click();
      await flushMicrotasks();

      expect(fieldValue).toBe('54.5');
    });

    it('triggers native HTML validation on submit', async () => {
      const { user } = await render(() => (
        <Form>
          <Field.Root name="test" data-testid="field">
            <NumberField required />
            <Field.Error match="valueMissing" data-testid="error">
              required
            </Field.Error>
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>
      ));

      const submit = screen.getByText('Submit');

      expect(screen.queryByTestId('error')).toBe(null);

      await user.click(submit);

      const error = screen.getByTestId('error');
      expect(error).toHaveTextContent('required');
    });

    it('focuses the input when the field receives an error from Form', async () => {
      function App() {
        const [errors, setErrors] = createSignal<Form.Props['errors']>({});
        return (
          <Form
            errors={errors()}
            onSubmit={(event) => {
              event.preventDefault();
              setErrors({ quantity: 'server error' });
            }}
          >
            <Field.Root name="quantity" data-testid="field">
              <NumberField defaultValue={1} />
              <Field.Error data-testid="error" />
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>
        );
      }

      const { user } = await render(() => <App />);
      expect(screen.queryByTestId('error')).toBe(null);
      const submit = screen.getByText('Submit');
      await user.click(submit);

      const input = screen.getByRole('textbox');
      expect(input).toHaveFocus();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByTestId('error')).toHaveTextContent('server error');
    });

    it('clears external errors on change', async () => {
      await render(() => (
        <Form
          errors={{
            test: 'test',
          }}
        >
          <Field.Root name="test" data-testid="field">
            <NumberField defaultValue={1} />
            <Field.Error data-testid="error" />
          </Field.Root>
        </Form>
      ));

      const input = screen.getByRole('textbox');

      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(screen.queryByTestId('error')).toHaveTextContent('test');

      await change(input, '5');

      expect(input).not.toHaveAttribute('aria-invalid');
      expect(screen.queryByTestId('error')).toBe(null);
    });

    it('revalidates immediately after form submission errors using increment button', async () => {
      const { user } = await render(() => (
        <Form>
          <Field.Root name="quantity">
            <NumberField required />
            <Field.Error match="valueMissing" data-testid="error">
              required
            </Field.Error>
          </Field.Root>
          <button type="submit" data-testid="submit">
            Submit
          </button>
        </Form>
      ));

      const submit = screen.getByTestId('submit');
      await user.click(submit);

      expect(screen.getByTestId('error')).toHaveTextContent('required');
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-invalid', 'true');

      const incrementButton = screen.getByLabelText('Increase');
      await user.click(incrementButton);

      expect(screen.queryByTestId('error')).toBe(null);
      expect(input).not.toHaveAttribute('aria-invalid');
    });

    it('should handle browser autofill', async () => {
      const onValueChange = vi.fn();

      await render(() => (
        <Field.Root name="quantity">
          <NumberFieldBase.Root onValueChange={onValueChange}>
            <NumberFieldBase.Input />
          </NumberFieldBase.Root>
        </Field.Root>
      ));

      const input = screen.getByRole('textbox');
      const hiddenInput = document.querySelector('input[type="number"][name="quantity"]');

      expect(hiddenInput).not.toBe(null);
      await change(hiddenInput!, '42');

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(42);
      expect(input).toHaveValue('42');
    });

    it('validates the parsed number when handling browser autofill', async () => {
      const validate = vi.fn((_value: unknown) => null);

      await render(() => (
        <Field.Root name="quantity" validationMode="onChange" validate={validate}>
          <NumberFieldBase.Root>
            <NumberFieldBase.Input />
          </NumberFieldBase.Root>
        </Field.Root>
      ));

      const hiddenInput = document.querySelector('input[type="number"][name="quantity"]');

      expect(hiddenInput).not.toBe(null);
      await change(hiddenInput!, '42');

      expect(validate).toHaveBeenCalled();
      expect(validate.mock.calls.every(([value]) => value === 42)).toBe(true);
      expect(validate.mock.lastCall?.[0]).toBe(42);
    });

    it.each([
      { lockState: 'readOnly', label: 'inside Field', withField: true },
      { lockState: 'disabled', label: 'inside Field', withField: true },
      { lockState: 'readOnly', label: 'outside Field', withField: false },
      { lockState: 'disabled', label: 'outside Field', withField: false },
    ] as const)(
      'ignores hidden-input autofill when $lockState $label',
      async ({ lockState, withField }) => {
        const onValueChange = vi.fn();
        // Port note: Solid JSX creates elements eagerly, so the shared subtree is a function.
        const numberField = () => (
          <NumberFieldBase.Root
            name={withField ? undefined : 'quantity'}
            defaultValue={1}
            readOnly={lockState === 'readOnly'}
            disabled={lockState === 'disabled'}
            onValueChange={onValueChange}
          >
            <NumberFieldBase.Input />
          </NumberFieldBase.Root>
        );

        await render(() =>
          withField ? (
            <Form errors={{ quantity: 'test' }}>
              <Field.Root name="quantity">
                {numberField()}
                <Field.Error data-testid="error" />
              </Field.Root>
            </Form>
          ) : (
            numberField()
          ),
        );

        const input = screen.getByRole('textbox');
        const hiddenInput = document.querySelector(
          'input[type="number"][name="quantity"]',
        ) as HTMLInputElement;

        expect(hiddenInput).not.toBe(null);

        // Only the Field wrapper renders an error and marks the input invalid,
        // unless the field is disabled.
        const expectedError = withField ? 'test' : undefined;
        const expectedAriaInvalid = withField && lockState !== 'disabled' ? 'true' : null;

        expect(screen.queryByTestId('error')?.textContent).toBe(expectedError);
        expect(input.getAttribute('aria-invalid')).toBe(expectedAriaInvalid);

        await change(hiddenInput, '42');

        expect(onValueChange).not.toHaveBeenCalled();
        expect(input).toHaveValue('1');

        expect(screen.queryByTestId('error')?.textContent).toBe(expectedError);
      },
    );
  });

  describe('Field', () => {
    it('[data-touched]', async () => {
      await render(() => (
        <Field.Root>
          <NumberFieldBase.Root>
            <NumberFieldBase.Input />
          </NumberFieldBase.Root>
        </Field.Root>
      ));

      const input = screen.getByRole<HTMLInputElement>('textbox');

      await focus(input);
      await blur(input);

      expect(input).toHaveAttribute('data-touched', '');
    });

    it('[data-dirty]', async () => {
      await render(() => (
        <Field.Root>
          <NumberFieldBase.Root>
            <NumberFieldBase.Input />
          </NumberFieldBase.Root>
        </Field.Root>
      ));

      const input = screen.getByRole<HTMLInputElement>('textbox');

      expect(input).not.toHaveAttribute('data-dirty');

      await change(input, '1');

      expect(input).toHaveAttribute('data-dirty', '');
    });

    describe('[data-filled]', () => {
      it('adds [data-filled] attribute when filled', async () => {
        await render(() => (
          <Field.Root>
            <NumberFieldBase.Root>
              <NumberFieldBase.Input data-testid="input" />
            </NumberFieldBase.Root>
          </Field.Root>
        ));

        const input = screen.getByTestId('input');

        expect(input).not.toHaveAttribute('data-filled');

        await change(input, '1');

        expect(input).toHaveAttribute('data-filled', '');

        await change(input, '');

        expect(input).not.toHaveAttribute('data-filled');
      });

      it('has [data-filled] attribute when already filled', async () => {
        await render(() => (
          <Field.Root>
            <NumberFieldBase.Root defaultValue={1}>
              <NumberFieldBase.Input data-testid="input" />
            </NumberFieldBase.Root>
          </Field.Root>
        ));

        const input = screen.getByTestId('input');

        expect(input).toHaveAttribute('data-filled');

        await change(input, '');

        expect(input).not.toHaveAttribute('data-filled');
      });
    });

    it('[data-filled]', async () => {
      await render(() => (
        <Field.Root>
          <NumberFieldBase.Root>
            <NumberFieldBase.Input data-testid="input" />
          </NumberFieldBase.Root>
        </Field.Root>
      ));

      const input = screen.getByTestId('input');

      expect(input).not.toHaveAttribute('data-focused');

      await focus(input);

      expect(input).toHaveAttribute('data-focused', '');

      await blur(input);

      expect(input).not.toHaveAttribute('data-focused');
    });

    it('adds [data-focused] attribute on every focus', async () => {
      await render(() => (
        <Field.Root>
          <NumberFieldBase.Root>
            <NumberFieldBase.Input data-testid="input" />
          </NumberFieldBase.Root>
        </Field.Root>
      ));

      const input = screen.getByTestId('input');

      await focus(input);
      expect(input).toHaveAttribute('data-focused', '');

      await blur(input);
      expect(input).not.toHaveAttribute('data-focused');

      await focus(input);
      expect(input).toHaveAttribute('data-focused', '');
    });

    describe('[data-focused] without a blur event', () => {
      function NumberFields(props: { firstMounted?: boolean; firstDisabled?: boolean }) {
        return (
          <Field.Root data-testid="root">
            <Show when={props.firstMounted ?? true}>
              <NumberFieldBase.Root disabled={props.firstDisabled ?? false}>
                <NumberFieldBase.Input data-testid="first" />
              </NumberFieldBase.Root>
            </Show>
          </Field.Root>
        );
      }

      it('is removed when the focused input becomes disabled', async () => {
        const [firstDisabled, setFirstDisabled] = createSignal(false);
        await render(() => <NumberFields firstDisabled={firstDisabled()} />);

        const input = screen.getByTestId('first');
        input.focus();
        await flushMicrotasks();

        expect(screen.getByTestId('root')).toHaveAttribute('data-focused', '');

        setFirstDisabled(true);
        await flushMicrotasks();

        expect(screen.getByTestId('root')).not.toHaveAttribute('data-focused');
        expect(input).not.toHaveAttribute('data-focused');
      });

      it('is removed when the focused input unmounts', async () => {
        const [firstMounted, setFirstMounted] = createSignal(true);
        await render(() => <NumberFields firstMounted={firstMounted()} />);

        screen.getByTestId('first').focus();
        await flushMicrotasks();

        expect(screen.getByTestId('root')).toHaveAttribute('data-focused', '');

        setFirstMounted(false);
        await flushMicrotasks();

        expect(screen.getByTestId('root')).not.toHaveAttribute('data-focused');
      });
    });

    it('prop: validate', async () => {
      await render(() => (
        <Field.Root validationMode="onBlur" validate={() => 'error'}>
          <NumberFieldBase.Root>
            <NumberFieldBase.Input />
          </NumberFieldBase.Root>
          <Field.Error data-testid="error" />
        </Field.Root>
      ));

      const input = screen.getByRole('textbox');

      expect(input).not.toHaveAttribute('aria-invalid');

      await focus(input);
      await blur(input);

      expect(input).toHaveAttribute('aria-invalid', 'true');
    });

    describe('prop: validationMode', () => {
      it('onSubmit', async () => {
        await render(() => (
          <Form>
            <Field.Root validate={(value) => (value === 1 ? 'custom error' : null)}>
              <NumberFieldBase.Root required data-testid="root">
                <NumberFieldBase.Input data-testid="input" />
              </NumberFieldBase.Root>
              <Field.Error data-testid="error" match="valueMissing">
                valueMissing error
              </Field.Error>
              <Field.Error data-testid="error" match="customError" />
            </Field.Root>
            <button type="submit">submit</button>
          </Form>
        ));

        const input = screen.getByRole('textbox');
        expect(input).not.toHaveAttribute('aria-invalid');

        await change(input, '1');
        await blur(input);
        expect(input).not.toHaveAttribute('aria-invalid');
        expect(screen.queryByTestId('error')).toBe(null);

        await change(input, '');
        await blur(input);
        expect(input).not.toHaveAttribute('aria-invalid');
        expect(screen.queryByTestId('error')).toBe(null);

        await click(screen.getByText('submit'));
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(screen.queryByTestId('error')).toHaveTextContent('valueMissing error');
        expect(screen.getByTestId('root')).toHaveAttribute('data-invalid');
        expect(input).toHaveAttribute('data-invalid');

        await change(input, '2');
        expect(input).not.toHaveAttribute('aria-invalid');
        expect(screen.queryByTestId('error')).toBe(null);
        expect(screen.getByTestId('root')).not.toHaveAttribute('data-invalid');
        expect(input).not.toHaveAttribute('data-invalid');
        expect(screen.getByTestId('root')).toHaveAttribute('data-valid');
        expect(input).toHaveAttribute('data-valid');
        // re-invalidate the field value
        await change(input, '1');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(screen.queryByTestId('error')).toHaveTextContent('custom error');

        await change(input, '3');
        expect(input).not.toHaveAttribute('aria-invalid');
        expect(screen.queryByTestId('error')).toBe(null);

        await change(input, '');
        expect(input).toHaveAttribute('aria-invalid', 'true');
        expect(screen.queryByTestId('error')).toHaveTextContent('valueMissing error');
      });

      it('onChange', async () => {
        await render(() => (
          <Field.Root
            validationMode="onChange"
            validate={(value) => {
              return value === 1 ? 'error' : null;
            }}
          >
            <NumberFieldBase.Root>
              <NumberFieldBase.Input data-testid="input" />
            </NumberFieldBase.Root>
          </Field.Root>
        ));

        const input = screen.getByTestId('input');

        expect(input).not.toHaveAttribute('aria-invalid');

        await change(input, '1');

        expect(input).toHaveAttribute('aria-invalid', 'true');
      });

      it('revalidates when the controlled value changes externally', async () => {
        const validateSpy = vi.fn((value: unknown) =>
          (value as number | null) === 5 ? 'error' : null,
        );

        function App() {
          const [value, setValue] = createSignal<number | null>(null);

          return (
            <>
              <Field.Root validationMode="onChange" validate={validateSpy} name="quantity">
                <NumberFieldBase.Root value={value()} onValueChange={(next) => setValue(next)}>
                  <NumberFieldBase.Input data-testid="input" />
                </NumberFieldBase.Root>
              </Field.Root>
              <button type="button" onClick={() => setValue(5)}>
                Set externally
              </button>
            </>
          );
        }

        await render(() => <App />);

        const input = screen.getByTestId('input');
        const toggle = screen.getByText('Set externally');

        expect(input).not.toHaveAttribute('aria-invalid');
        const initialCallCount = validateSpy.mock.calls.length;

        await click(toggle);

        expect(validateSpy.mock.calls.length).toBe(initialCallCount + 1);
        expect(validateSpy.mock.lastCall?.[0]).toBe(5);
        expect(input).toHaveAttribute('aria-invalid', 'true');
      });

      it('onBlur', async () => {
        await render(() => (
          <Field.Root
            validationMode="onBlur"
            validate={(value) => {
              return value === 1 ? 'error' : null;
            }}
          >
            <NumberFieldBase.Root required>
              <NumberFieldBase.Input data-testid="input" />
            </NumberFieldBase.Root>
            <Field.Error data-testid="error" />
          </Field.Root>
        ));

        const input = screen.getByTestId('input');
        expect(input).not.toHaveAttribute('aria-invalid');

        await change(input, '1');
        expect(input).not.toHaveAttribute('aria-invalid');
        await blur(input);
        expect(input).toHaveAttribute('aria-invalid', 'true');
        // revalidation
        await change(input, '2');
        expect(input).not.toHaveAttribute('aria-invalid');
        expect(screen.queryByTestId('error')).toBe(null);
      });
    });

    // Chromium shows a native validation popup when stepMismatch occurs that blocks the test
    it.skipIf(!isJSDOM)(
      'prevents form submission when the value does not match the step',
      async () => {
        const handleSubmit = vi.fn();
        await render(() => (
          <form onSubmit={handleSubmit}>
            <NumberFieldBase.Root name="quantity" defaultValue={0} min={0} step={0.1}>
              <NumberFieldBase.Input data-testid="input" />
            </NumberFieldBase.Root>
            <button type="submit">submit</button>
          </form>
        ));

        const input = screen.getByTestId('input');

        input.focus();
        await flushMicrotasks();

        await change(input, '0.11');
        await click(screen.getByText('submit'));

        expect(handleSubmit.mock.calls.length).toBe(0);

        await change(input, '0.1');
        await click(screen.getByText('submit'));

        expect(handleSubmit.mock.calls.length).toBe(1);
        expect(new FormData(handleSubmit.mock.calls[0][0].target).get('quantity')).toBe('0.1');
      },
    );

    it('prevents Form/Field submission when the value does not match the step', async () => {
      const handleSubmit = vi.fn();
      await render(() => (
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="quantity">
            <NumberFieldBase.Root defaultValue={0} min={0} step={0.1}>
              <NumberFieldBase.Input data-testid="input" />
            </NumberFieldBase.Root>
            <Field.Error match="stepMismatch" data-testid="error">
              step mismatch
            </Field.Error>
          </Field.Root>
          <button type="submit">submit</button>
        </Form>
      ));

      const input = screen.getByTestId('input');

      input.focus();
      await flushMicrotasks();

      expect(screen.queryByTestId('error')).toBe(null);

      await change(input, '0.11');
      await click(screen.getByText('submit'));

      expect(handleSubmit.mock.calls.length).toBe(0);
      expect(screen.getByTestId('error')).toHaveTextContent('step mismatch');

      await change(input, '0.1');
      await click(screen.getByText('submit'));

      expect(handleSubmit.mock.calls.length).toBe(1);
      expect(handleSubmit.mock.calls[0][0].quantity).toBe(0.1);
    });

    it('disables the input when disabled=true', async () => {
      await render(() => (
        <Field.Root disabled>
          <NumberFieldBase.Root>
            <NumberFieldBase.Input />
          </NumberFieldBase.Root>
        </Field.Root>
      ));

      const input = screen.getByRole<HTMLInputElement>('textbox');

      expect(input).toHaveAttribute('disabled', '');
    });

    it('does not disable the input when disabled=false', async () => {
      await render(() => (
        <Field.Root disabled={false}>
          <NumberFieldBase.Root>
            <NumberFieldBase.Input />
          </NumberFieldBase.Root>
        </Field.Root>
      ));

      const input = screen.getByRole<HTMLInputElement>('textbox');

      expect(input).not.toHaveAttribute('disabled');
    });

    it('is validated with latest value when validationMode=onBlur', async () => {
      const validate = vi.fn(() => 'error');

      await render(() => (
        <Form>
          <Field.Root validationMode="onBlur" validate={validate} name="quantity">
            <NumberFieldBase.Root defaultValue={undefined}>
              <NumberFieldBase.Input />
            </NumberFieldBase.Root>
          </Field.Root>
        </Form>
      ));

      const input = screen.getByRole('textbox');

      await focus(input);
      await change(input, '1');
      await blur(input);

      expect(validate.mock.calls.length).toBe(1);
      expect(validate.mock.calls[0]).toEqual([1, { quantity: 1 }]);
    });

    it('is validated with clamped value when validationMode=onBlur', async () => {
      const validate = vi.fn(() => null);

      await render(() => (
        <Form>
          <Field.Root validationMode="onBlur" validate={validate} name="quantity">
            <NumberFieldBase.Root max={10}>
              <NumberFieldBase.Input />
            </NumberFieldBase.Root>
          </Field.Root>
        </Form>
      ));

      const input = screen.getByRole('textbox');

      await focus(input);
      await change(input, '1000');
      await blur(input);

      expect(validate.mock.calls.length).toBe(1);
      expect(validate.mock.calls[0]).toEqual([10, { quantity: 10 }]);
      expect(input).toHaveValue('10');
    });

    it('revalidates an external change after a blur that normalizes back to the current value', async () => {
      const validate = (value: unknown) => (value === 5 ? 'error' : null);

      function App() {
        const [value, setValue] = createSignal<number | null>(5);
        return (
          <Form>
            <Field.Root validationMode="onBlur" validate={validate} name="quantity">
              <NumberFieldBase.Root
                value={value()}
                onValueChange={(next) => setValue(next)}
                max={5}
              >
                <NumberFieldBase.Input />
              </NumberFieldBase.Root>
            </Field.Root>
            <button type="button" onClick={() => setValue(3)}>
              external
            </button>
          </Form>
        );
      }

      const { user } = await render(() => <App />);
      const input = screen.getByRole('textbox');

      // Blur after typing a value that clamps back to the current value (5). This sets the
      // internal block-revalidation flag and commits an error, but since the stored value is
      // unchanged `useValueChanged` won't fire to reset the flag.
      await focus(input);
      await change(input, '9');
      await blur(input);
      expect(input).toHaveValue('5');
      expect(input).toHaveAttribute('aria-invalid', 'true');

      // The flag must have been reset on blur so the next external change revalidates and
      // clears the error rather than being swallowed.
      await user.click(screen.getByText('external'));
      expect(input).not.toHaveAttribute('aria-invalid');
    });

    it('Field.Label', async () => {
      await render(() => (
        <Field.Root>
          <NumberFieldBase.Root>
            <NumberFieldBase.Input />
          </NumberFieldBase.Root>
          <Field.Label data-testid="label" />
        </Field.Root>
      ));

      expect(screen.getByTestId('label')).toHaveAttribute('for', screen.getByRole('textbox').id);
    });

    it('Field.Description', async () => {
      await render(() => (
        <Field.Root>
          <NumberFieldBase.Root>
            <NumberFieldBase.Input aria-describedby="external-description" />
          </NumberFieldBase.Root>
          <Field.Description data-testid="description" />
        </Field.Root>
      ));

      expect(screen.getByRole('textbox')).toHaveAttribute(
        'aria-describedby',
        `external-description ${screen.getByTestId('description').id}`,
      );
    });
  });

  describe('prop: inputMode', () => {
    it('should set the inputMode to numeric', async () => {
      await render(() => <NumberField />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('inputmode', 'numeric');
    });
  });

  describe('hidden input', () => {
    function getHiddenInput() {
      const hiddenInput = document.querySelector<HTMLInputElement>(
        'input[aria-hidden][type=number]',
      );
      if (!hiddenInput) {
        throw new Error('Expected a hidden number input.');
      }
      return hiddenInput;
    }

    it('forwards focus to the visible input', async () => {
      await render(() => <NumberField defaultValue={5} />);

      getHiddenInput().focus();
      await flushMicrotasks();

      expect(screen.getByRole('textbox')).toHaveFocus();
    });

    it('places the caret at the end of the visible input when forwarding focus', async () => {
      await render(() => <NumberField defaultValue={100} />);

      const input = screen.getByRole<HTMLInputElement>('textbox');
      input.setSelectionRange(0, 0);

      getHiddenInput().focus();
      await flushMicrotasks();

      expect(input).toHaveFocus();
      expect(input.selectionStart).toBe(input.value.length);
      expect(input.selectionEnd).toBe(input.value.length);
    });

    it('keeps a selection the consumer sets in onFocus when forwarding focus', async () => {
      await render(() => (
        <NumberFieldBase.Root defaultValue={100}>
          <NumberFieldBase.Input
            onFocus={(event) => (event.currentTarget as HTMLInputElement).select()}
          />
        </NumberFieldBase.Root>
      ));

      const input = screen.getByRole<HTMLInputElement>('textbox');

      getHiddenInput().focus();
      await flushMicrotasks();

      expect(input).toHaveFocus();
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe(input.value.length);
    });

    it('clears the value when autofill empties the hidden input', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField defaultValue={5} onValueChange={onValueChange} />);

      await change(getHiddenInput(), '');

      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(onValueChange.mock.lastCall?.[0]).toBe(null);
    });

    it('applies an autofilled value to the visible input', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField onValueChange={onValueChange} />);

      await change(getHiddenInput(), '7');

      expect(screen.getByRole('textbox')).toHaveValue('7');
      expect(onValueChange.mock.lastCall?.[0]).toBe(7);
    });

    it('validates the autofilled value even when the change is canceled', async () => {
      const validate = vi.fn((_value: unknown) => null);

      await render(() => (
        <Field.Root validate={validate} validationMode="onChange">
          <NumberField onValueChange={(_value, details) => details.cancel()} />
        </Field.Root>
      ));

      await change(getHiddenInput(), '7');

      expect(screen.getByRole('textbox')).toHaveValue('');
      expect(validate.mock.lastCall?.[0]).toBe(7);
    });
  });

  describe('integration: exotic inputs and IME', () => {
    it('accepts Persian digit keyboard input', async () => {
      const onValueChange = vi.fn();
      function App() {
        const [value, setValue] = createSignal<number | null>(null);
        return (
          <NumberField
            value={value()}
            onValueChange={(v) => {
              onValueChange(v);
              setValue(v);
            }}
          />
        );
      }
      const { user } = await render(() => <App />);
      const input = screen.getByRole('textbox');

      await user.type(input, '۱۲۳');

      expect(onValueChange.mock.calls.at(-1)?.[0]).toBe(123);
    });

    it.each([
      ['Persian', '۱۲۳', 123],
      ['Arabic-Indic', '١٢٣', 123],
      ['fullwidth', '１２３', 123],
      ['Han', '一二三', 123],
    ] as const)('pastes %s numerals through the input contract', async (_label, text, value) => {
      const onValueChange = vi.fn();
      await render(() => <NumberField defaultValue={0} onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;

      input.focus();
      await flushMicrotasks();
      input.select();
      await pasteText(input, text);

      expect(input).toHaveValue(text);
      expect(onValueChange.mock.lastCall?.[0]).toBe(value);
      expect(onValueChange.mock.lastCall?.[1].reason).toBe(REASONS.inputPaste);
    });

    it('rejects invalid pasted characters without changing the value contract', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField defaultValue={12} onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;

      input.focus();
      await flushMicrotasks();
      input.select();
      await pasteText(input, 'abc');

      expect(input).toHaveValue('12');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('parses Persian digits and separators via change events', async () => {
      const onValueChange = vi.fn();
      function App() {
        const [value, setValue] = createSignal<number | null>(null);
        return (
          <NumberField
            value={value()}
            onValueChange={(v) => {
              onValueChange(v);
              setValue(v);
            }}
          />
        );
      }
      await render(() => <App />);

      const input = screen.getByRole('textbox');
      // ۱۲٫۳۴ => 12.34
      await change(input, '۱۲٫۳۴');

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(12.34);
    });

    it('parses Persian digits with Arabic group/decimal separators', async () => {
      const onValueChange = vi.fn();
      function App() {
        const [value, setValue] = createSignal<number | null>(null);
        return (
          <NumberField
            value={value()}
            onValueChange={(v) => {
              onValueChange(v);
              setValue(v);
            }}
          />
        );
      }
      await render(() => <App />);

      const input = screen.getByRole('textbox');
      // ۱۲٬۳۴۵٫۶۷ => 12345.67
      await change(input, '۱۲٬۳۴۵٫۶۷');

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(12345.67);
    });

    it('parses fullwidth digits and punctuation', async () => {
      const onValueChange = vi.fn();
      function App() {
        const [value, setValue] = createSignal<number | null>(null);
        return (
          <NumberField
            value={value()}
            onValueChange={(v) => {
              onValueChange(v);
              setValue(v);
            }}
          />
        );
      }

      await render(() => <App />);

      const input = screen.getByRole('textbox');

      await change(input, '１，２３４．５６');

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(1234.56);
    });

    it('parses percent and permille signs in exotic forms when formatted as percent', async () => {
      const onValueChange = vi.fn();
      function App() {
        const [value, setValue] = createSignal<number | null>(null);
        return (
          <NumberField
            value={value()}
            format={{ style: 'percent' }}
            onValueChange={(v) => {
              onValueChange(v);
              setValue(v);
            }}
          />
        );
      }

      await render(() => <App />);

      const input = screen.getByRole('textbox');
      await change(input, '١٢٪');

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(0.12);

      // reset by typing again
      await change(input, '12؉');
      expect(onValueChange.mock.calls.length).toBe(2);
      expect(onValueChange.mock.calls[1][0]).toBe(0.012);
    });

    it('ignores percent and permille symbols when not formatted as percent', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField onValueChange={onValueChange} />);

      const input = screen.getByRole('textbox');
      await change(input, '12');
      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(12);

      await change(input, '12%');
      await change(input, '12‰');

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(input).toHaveValue('12');
    });

    it('parses trailing unicode minus', async () => {
      const onValueChange = vi.fn();
      function App() {
        const [value, setValue] = createSignal<number | null>(null);
        return (
          <NumberField
            value={value()}
            onValueChange={(v) => {
              onValueChange(v);
              setValue(v);
            }}
          />
        );
      }

      await render(() => <App />);

      const input = screen.getByRole('textbox');
      await change(input, '1234−');

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(-1234);
    });

    it('treats parentheses negatives as invalid input', async () => {
      const onValueChange = vi.fn();
      function App() {
        const [value, setValue] = createSignal<number | null>(null);
        return (
          <NumberField
            value={value()}
            onValueChange={(v) => {
              onValueChange(v);
              setValue(v);
            }}
          />
        );
      }

      await render(() => <App />);

      const input = screen.getByRole('textbox');
      await change(input, '(1,234.5)');

      expect(onValueChange.mock.calls.length).toBe(0);
      expect(input).toHaveValue('');
    });

    it('collapses extra dots from mixed-locale inputs', async () => {
      const onValueChange = vi.fn();
      function App() {
        const [value, setValue] = createSignal<number | null>(null);
        return (
          <NumberField
            value={value()}
            onValueChange={(v) => {
              onValueChange(v);
              setValue(v);
            }}
          />
        );
      }

      await render(() => <App />);

      const input = screen.getByRole('textbox');
      await change(input, '1.234.567.89');

      expect(onValueChange.mock.calls.length).toBe(1);
      expect(onValueChange.mock.calls[0][0]).toBe(1234567.89);
    });

    it('allows composition key events (IME) without preventing default', async () => {
      await render(() => <NumberField />);

      const input = screen.getByRole('textbox');

      input.focus();
      await flushMicrotasks();

      const preventDefaultSpy = vi.fn();

      // 229 indicates a composition key event
      await keyDown(input, { which: 229, preventDefault: preventDefaultSpy });
      expect(preventDefaultSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe.skipIf(isJSDOM)('pasting', () => {
    it('should allow pasting a valid number', async () => {
      await render(() => <NumberField />);
      const input = screen.getByRole('textbox');

      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', '123');

      fireEvent.paste(input, { clipboardData: dataTransfer });
      await change(input, '123');
      expect(input).toHaveValue('123');
    });

    it('should not allow pasting an invalid number', async () => {
      await render(() => <NumberField />);
      const input = screen.getByRole('textbox');

      const dataTransfer = new DataTransfer();
      dataTransfer.setData('text/plain', 'abc');

      fireEvent.paste(input, { clipboardData: dataTransfer });
      await change(input, 'abc');
      expect(input).toHaveValue('');
      await blur(input);
      expect(input).toHaveValue('');
    });
  });

  describe('pasting at the caret', () => {
    it('ignores a paste that does not parse to a number', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField defaultValue={1} onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;

      input.focus();
      await flushMicrotasks();
      input.select();
      await pasteText(input, 'abc');

      expect(input).toHaveValue('1');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('does not paste into a readOnly field', async () => {
      await render(() => <NumberField defaultValue={1} readOnly />);
      const input = screen.getByRole('textbox') as HTMLInputElement;

      input.focus();
      await flushMicrotasks();
      input.select();
      await pasteText(input, '9');

      expect(input).toHaveValue('1');
    });

    it('inserts pasted text at the caret instead of replacing the whole value', async () => {
      const onValueChange = vi.fn();
      await render(() => <NumberField defaultValue={123} onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;

      input.focus();
      await flushMicrotasks();
      input.setSelectionRange(3, 3);
      await pasteText(input, '5');

      expect(input).toHaveValue('1235');
      expect(onValueChange.mock.lastCall?.[0]).toBe(1235);
    });

    it('replaces the selected range when pasting over a selection', async () => {
      await render(() => <NumberField defaultValue={123} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;

      input.focus();
      await flushMicrotasks();
      input.setSelectionRange(1, 2);
      await pasteText(input, '9');

      expect(input).toHaveValue('193');
    });

    it('keeps the caret just after the pasted text', async () => {
      await render(() => <NumberField defaultValue={123} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;

      input.focus();
      await flushMicrotasks();
      input.setSelectionRange(1, 2);
      await pasteText(input, '9');

      expect(input).toHaveValue('193');
      expect(input.selectionStart).toBe(2);
      expect(input.selectionEnd).toBe(2);
    });
  });

  it('should allow navigation keys and not prevent their default behavior', async () => {
    await render(() => <NumberField />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    input.focus();
    await change(input, '123');

    const navigateKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
    navigateKeys.forEach((key) => {
      const preventDefaultSpy = vi.fn();
      fireEvent.keyDown(input, { key, preventDefault: preventDefaultSpy });
      expect(preventDefaultSpy).toHaveBeenCalledTimes(0);
    });
  });

  it('does not prevent native caret movement for Home/End without min/max', async () => {
    await render(() => <NumberField defaultValue={5} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    input.focus();

    ['Home', 'End'].forEach((key) => {
      const preventDefaultSpy = vi.fn();
      fireEvent.keyDown(input, { key, preventDefault: preventDefaultSpy });
      expect(preventDefaultSpy).toHaveBeenCalledTimes(0);
    });
  });

  it('does not swallow non-printing keys it does not handle', async () => {
    await render(() => <NumberField defaultValue={5} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    input.focus();

    ['PageUp', 'PageDown', 'Insert', 'F5'].forEach((key) => {
      const preventDefaultSpy = vi.fn();
      fireEvent.keyDown(input, { key, preventDefault: preventDefaultSpy });
      expect(preventDefaultSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('prop: locale', () => {
    it('should set the locale of the input', async () => {
      await render(() => <NumberField defaultValue={1000.5} locale="de-DE" />);
      const input = screen.getByRole('textbox');

      // In German locale, numbers use dot as thousands separator and comma as decimal separator
      const expectedValue = new Intl.NumberFormat('de-DE').format(1000.5);
      expect(input).toHaveValue(expectedValue);
    });

    it('should use the default locale if no locale is provided', async () => {
      await render(() => <NumberField defaultValue={1000.5} />);
      const input = screen.getByRole('textbox');
      const expectedValue = new Intl.NumberFormat().format(1000.5);
      expect(input).toHaveValue(expectedValue);
    });

    it('should handle locales using space as the thousands separator', async () => {
      await render(() => <NumberField defaultValue={12345.5} locale="pl" />);

      const input = screen.getByRole('textbox');
      const expectedValue = new Intl.NumberFormat('pl').format(12345.5);
      expect(input).toHaveValue(expectedValue);

      const incrementButton = screen.getByLabelText('Increase');
      await click(incrementButton);

      const newExpectedValue = new Intl.NumberFormat('pl').format(12346.5);
      expect(input).toHaveValue(newExpectedValue);
    });
  });
});
