import { expect, describe, it } from 'vitest';
import { Show, createSignal, flush } from 'solid-js';
import { Portal } from '@solidjs/web';
import { fireEvent, render, screen, describeConformance, isJSDOM } from '#test-utils';
import { RadioGroup } from '.';
import { Radio } from '../radio';
import { Field } from '../field';
import { Fieldset } from '../fieldset';
import { Form } from '../form';
import { DirectionProvider } from '../direction-provider';
import type { TextDirection } from '../direction-provider';

function click(element: Element) {
  fireEvent.click(element);
  flush();
}

describe('<RadioGroup />', () => {
  describeConformance(RadioGroup, {
    refInstanceof: window.HTMLDivElement,
  });

  describe('extra props', () => {
    it('can override the built-in attributes', async () => {
      const { container } = await render(() => <RadioGroup role="switch" />);
      expect(container.firstElementChild as HTMLElement).toHaveAttribute('role', 'switch');
    });
  });

  describe('prop: id', () => {
    it('is forwarded to the root element', async () => {
      await render(() => <RadioGroup id="group-id" />);

      expect(screen.getByRole('radiogroup')).toHaveAttribute('id', 'group-id');
    });
  });

  describe('prop: onValueChange', () => {
    it('should call onValueChange when an item is clicked', async () => {
      const handleChange = vi.fn();
      await render(() => (
        <RadioGroup onValueChange={handleChange}>
          <Radio.Root value="a" data-testid="item" />
        </RadioGroup>
      ));

      click(screen.getByTestId('item'));

      expect(handleChange.mock.calls.length).toBe(1);
      expect(handleChange.mock.calls[0][0]).toBe('a');
    });

    it('should report keyboard modifier event properties when calling onCheckedChange', async () => {
      const handleChange = vi.fn((_value, eventDetails) => eventDetails);

      const { user } = await render(() => (
        <RadioGroup onValueChange={handleChange}>
          <Radio.Root value="a" data-testid="item" />
        </RadioGroup>
      ));

      const item = screen.getByTestId('item');

      await user.keyboard('{Shift>}');
      await user.click(item);
      await user.keyboard('{/Shift}');

      expect(handleChange.mock.calls.length).toBe(1);
      expect(handleChange.mock.results[0]?.value.event.shiftKey).toBe(true);
    });

    it('should select an item with Space on keyup', async () => {
      const handleChange = vi.fn();
      const { user } = await render(() => (
        <RadioGroup onValueChange={handleChange}>
          <Radio.Root value="a" data-testid="item" />
        </RadioGroup>
      ));

      const item = screen.getByTestId('item');

      item.focus();
      flush();

      await user.keyboard('[Space>]');

      expect(handleChange).not.toHaveBeenCalled();

      await user.keyboard('[/Space]');

      expect(handleChange).toHaveBeenCalledOnce();
      expect(handleChange).toHaveBeenLastCalledWith('a', expect.anything());
    });

    it('should not select an item with Enter', async () => {
      const handleChange = vi.fn();
      const { user } = await render(() => (
        <RadioGroup onValueChange={handleChange}>
          <Radio.Root value="a" data-testid="item" />
        </RadioGroup>
      ));

      const item = screen.getByTestId('item');

      item.focus();
      flush();

      await user.keyboard('[Enter]');

      expect(handleChange).not.toHaveBeenCalled();
      expect(item).toHaveAttribute('aria-checked', 'false');
    });

    it('does not change state when canceled via a root click', async () => {
      const { user } = await render(() => (
        <Field.Root>
          <RadioGroup onValueChange={(_, eventDetails) => eventDetails.cancel()}>
            <Radio.Root value="a" data-testid="item" />
          </RadioGroup>
        </Field.Root>
      ));

      const group = screen.getByRole('radiogroup');
      const item = screen.getByTestId('item');
      const input = document.querySelector<HTMLInputElement>('input[type="radio"]');

      await user.click(item);

      expect(item).toHaveAttribute('aria-checked', 'false');
      expect(input?.checked).toBe(false);
      expect(group).not.toHaveAttribute('data-touched');
      expect(group).not.toHaveAttribute('data-dirty');
      expect(group).not.toHaveAttribute('data-filled');
    });

    it('does not change state when canceled via a hidden input click', async () => {
      const { user } = await render(() => (
        <Field.Root>
          <RadioGroup onValueChange={(_, eventDetails) => eventDetails.cancel()}>
            <Radio.Root value="a" data-testid="item" />
          </RadioGroup>
        </Field.Root>
      ));

      const group = screen.getByRole('radiogroup');
      const item = screen.getByTestId('item');
      const input = document.querySelector<HTMLInputElement>('input[type="radio"]');

      expect(input).not.toBe(null);
      if (!input) {
        return;
      }

      await user.click(input);

      expect(item).toHaveAttribute('aria-checked', 'false');
      expect(input.checked).toBe(false);
      expect(group).not.toHaveAttribute('data-touched');
      expect(group).not.toHaveAttribute('data-dirty');
      expect(group).not.toHaveAttribute('data-filled');
    });

    it('does not change state when canceled via arrow key navigation', async () => {
      const { user } = await render(() => (
        <Field.Root>
          <RadioGroup onValueChange={(_, eventDetails) => eventDetails.cancel()}>
            <Radio.Root value="a" data-testid="a" />
            <Radio.Root value="b" data-testid="b" />
          </RadioGroup>
        </Field.Root>
      ));

      const group = screen.getByRole('radiogroup');
      const a = screen.getByTestId('a');
      const b = screen.getByTestId('b');
      const inputs = document.querySelectorAll<HTMLInputElement>('input[type="radio"]');

      a.focus();
      flush();

      await user.keyboard('{ArrowDown}');

      expect(b).toHaveFocus();
      expect(a).toHaveAttribute('aria-checked', 'false');
      expect(b).toHaveAttribute('aria-checked', 'false');
      expect(inputs[0]?.checked).toBe(false);
      expect(inputs[1]?.checked).toBe(false);
      expect(group).not.toHaveAttribute('data-touched');
      expect(group).not.toHaveAttribute('data-dirty');
      expect(group).not.toHaveAttribute('data-filled');
    });
  });

  describe('prop: disabled', () => {
    it('should have the `aria-disabled` attribute', async () => {
      await render(() => (
        <RadioGroup disabled>
          <Radio.Root value="a" />
        </RadioGroup>
      ));
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('radio')).toHaveAttribute('aria-disabled', 'true');
      expect(screen.getByRole('radio')).toHaveAttribute('data-disabled');
      const input = document.querySelector('input[type="radio"]');
      expect(input).toHaveAttribute('disabled');
    });

    it('should not have the aria attribute when `disabled` is not set', async () => {
      await render(() => <RadioGroup />);
      expect(screen.getByRole('radiogroup')).not.toHaveAttribute('aria-disabled');
    });

    it('should not change its state when clicked', async () => {
      await render(() => (
        <RadioGroup disabled>
          <Radio.Root value="" data-testid="item" />
        </RadioGroup>
      ));

      const item = screen.getByTestId('item');

      expect(item).toHaveAttribute('aria-checked', 'false');

      click(item);

      expect(item).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('prop: readOnly', () => {
    it('should have the `aria-readonly` attribute', async () => {
      await render(() => <RadioGroup readOnly />);
      expect(screen.getByRole('radiogroup')).toHaveAttribute('aria-readonly', 'true');
    });

    it('should not have the aria attribute when `readOnly` is not set', async () => {
      await render(() => <RadioGroup />);
      expect(screen.getByRole('radiogroup')).not.toHaveAttribute('aria-readonly');
    });

    it('should not change its state when clicked', async () => {
      await render(() => (
        <RadioGroup readOnly>
          <Radio.Root value="" data-testid="item" />
        </RadioGroup>
      ));

      const item = screen.getByTestId('item');

      expect(item).toHaveAttribute('aria-checked', 'false');

      click(item);

      expect(item).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('should update its state if the underlying input is toggled', async () => {
    await render(() => (
      <RadioGroup data-testid="root">
        <Radio.Root value="" data-testid="item" />
      </RadioGroup>
    ));

    const group = screen.getByTestId('root');
    const item = screen.getByTestId('item');

    const input = group.querySelector<HTMLInputElement>('input')!;

    click(input);

    expect(item).toHaveAttribute('aria-checked', 'true');
  });

  it('should place the style hooks on the root and subcomponents', async () => {
    await render(() => (
      <RadioGroup defaultValue="1" disabled readOnly required>
        <Radio.Root value="1" data-testid="item">
          <Radio.Indicator data-testid="indicator" />
        </Radio.Root>
      </RadioGroup>
    ));

    const root = screen.getByRole('radiogroup');
    const item = screen.getByTestId('item');
    const indicator = screen.getByTestId('indicator');

    expect(root).toHaveAttribute('data-disabled', '');
    expect(root).toHaveAttribute('data-readonly', '');
    expect(root).toHaveAttribute('data-required', '');

    expect(item).toHaveAttribute('data-checked', '');
    expect(item).toHaveAttribute('data-disabled', '');
    expect(item).toHaveAttribute('data-readonly', '');
    expect(item).toHaveAttribute('data-required', '');

    expect(indicator).toHaveAttribute('data-checked', '');
    expect(indicator).toHaveAttribute('data-disabled', '');
    expect(indicator).toHaveAttribute('data-readonly', '');
    expect(indicator).toHaveAttribute('data-required', '');
  });

  it('should set the name attribute on each radio input', async () => {
    await render(() => (
      <RadioGroup name="radio-group">
        <Radio.Root value="a" data-testid="radio" />
      </RadioGroup>
    ));
    const input = screen.getByTestId('radio').nextElementSibling as HTMLInputElement;

    expect(input).toHaveAttribute('name', 'radio-group');
    expect(input).toHaveAttribute('value', 'a');
  });

  it('points inputRef to the checked radio input when present', async () => {
    const groupInputRef = { current: null as HTMLInputElement | null };

    await render(() => (
      <RadioGroup defaultValue="a" inputRef={groupInputRef}>
        <Radio.Root value="a" data-testid="radio-a" />
        <Radio.Root value="b" data-testid="radio-b" />
      </RadioGroup>
    ));

    const radioB = screen.getByTestId('radio-b');
    const inputA = screen.getByTestId('radio-a').nextElementSibling as HTMLInputElement;
    const inputB = radioB.nextElementSibling as HTMLInputElement;

    expect(groupInputRef.current).toBe(inputA);

    click(radioB);

    expect(groupInputRef.current).toBe(inputB);
  });

  it('allows reading inputRef.current in an effect', async () => {
    // Port note: upstream reads the ref in a parent `useLayoutEffect`; the closest Solid
    // equivalent is reading it once the initial render has settled.
    const inputRef = { current: null as HTMLInputElement | null };

    await render(() => (
      <RadioGroup defaultValue="a" inputRef={inputRef}>
        <Radio.Root value="a" />
        <Radio.Root value="b" />
      </RadioGroup>
    ));

    expect(inputRef.current?.value ?? null).toBe('a');
  });

  it('supports inputRef as a function', async () => {
    const inputRefSpy = vi.fn();

    await render(() => (
      <RadioGroup defaultValue="a" inputRef={inputRefSpy}>
        <Radio.Root value="a" data-testid="radio-a" />
        <Radio.Root value="b" data-testid="radio-b" />
      </RadioGroup>
    ));

    const radioB = screen.getByTestId('radio-b');
    const inputA = screen.getByTestId('radio-a').nextElementSibling as HTMLInputElement;
    const inputB = radioB.nextElementSibling as HTMLInputElement;

    click(radioB);

    expect(inputRefSpy.mock.calls.some((args) => args[0] === inputA)).toBe(true);
    expect(inputRefSpy.mock.calls.some((args) => args[0] === inputB)).toBe(true);
    expect(inputRefSpy.mock.lastCall?.[0]).toBe(inputB);
  });

  it('does not detach a stable inputRef callback on unrelated re-renders', async () => {
    const inputRefSpy = vi.fn();
    const [count, setCount] = createSignal(0);
    const inputRef = (input: HTMLInputElement | null) => {
      inputRefSpy(input);
    };

    await render(() => (
      <>
        <RadioGroup inputRef={inputRef} data-count={count()}>
          <Radio.Root value="a" data-testid="radio-a" />
        </RadioGroup>
        <button type="button" onClick={() => setCount((value) => value + 1)}>
          Re-render
        </button>
      </>
    ));

    const callCountAfterMount = inputRefSpy.mock.calls.length;

    click(screen.getByText('Re-render'));

    expect(inputRefSpy).toHaveBeenCalledTimes(callCountAfterMount);
  });

  it('transfers the current input when the object inputRef changes', async () => {
    const oldRef = { current: null as HTMLInputElement | null };
    const newRef = { current: null as HTMLInputElement | null };
    const [inputRef, setInputRef] = createSignal<typeof oldRef | undefined>(oldRef);

    const { unmount } = await render(() => (
      <RadioGroup defaultValue="b" inputRef={inputRef()}>
        <Radio.Root value="a" />
        <Radio.Root value="b" />
      </RadioGroup>
    ));
    const input = oldRef.current;
    expect(input).toHaveAttribute('value', 'b');

    setInputRef(newRef);
    flush();

    expect(oldRef.current).toBe(null);
    expect(newRef.current).toBe(input);

    setInputRef(undefined);
    flush();
    expect(newRef.current).toBe(null);

    setInputRef(newRef);
    flush();
    expect(newRef.current).toBe(input);

    unmount();
    expect(newRef.current).toBe(null);
  });

  it.each([false, true])(
    'detaches the previous callback inputRef when it changes (cleanup: %s)',
    async (returnsCleanup) => {
      const cleanup = vi.fn();
      const oldRef = vi.fn((input: HTMLInputElement | null) =>
        input && returnsCleanup ? cleanup : undefined,
      );
      const newRef = vi.fn();
      const [inputRef, setInputRef] = createSignal<(input: HTMLInputElement | null) => any>(
        () => oldRef,
      );

      await render(() => (
        <RadioGroup defaultValue="a" inputRef={inputRef()}>
          <Radio.Root value="a" />
        </RadioGroup>
      ));
      const input = oldRef.mock.lastCall?.[0];
      expect(input).toHaveAttribute('value', 'a');
      oldRef.mockClear();
      cleanup.mockClear();

      setInputRef(() => newRef);
      flush();

      expect(newRef).toHaveBeenLastCalledWith(input);
      expect(cleanup).toHaveBeenCalledTimes(returnsCleanup ? 1 : 0);
      expect(oldRef.mock.calls).toEqual(returnsCleanup ? [] : [[null]]);
    },
  );

  it('cleans up inputRef bindings when selecting, clearing, and unmounting', async () => {
    const bindings = new Set<{ input: HTMLInputElement }>();
    const inputRef = (input: HTMLInputElement | null) => {
      if (!input) {
        return undefined;
      }
      const binding = { input };
      bindings.add(binding);
      return () => {
        bindings.delete(binding);
      };
    };
    const [value, setValue] = createSignal<string | null>('a');

    const { unmount } = await render(() => (
      <>
        <RadioGroup value={value()} onValueChange={(next) => setValue(next)} inputRef={inputRef}>
          <Radio.Root value="a" data-testid="radio-a" />
          <Radio.Root value="b" data-testid="radio-b" />
        </RadioGroup>
        <button type="button" onClick={() => setValue(null)}>
          Clear
        </button>
      </>
    ));
    const inputA = screen.getByTestId('radio-a').nextElementSibling;
    const inputB = screen.getByTestId('radio-b').nextElementSibling;
    expect(Array.from(bindings, (binding) => binding.input)).toEqual([inputA]);

    click(screen.getByTestId('radio-b'));
    expect(Array.from(bindings, (binding) => binding.input)).toEqual([inputB]);

    click(screen.getByText('Clear'));
    expect(Array.from(bindings, (binding) => binding.input)).toEqual([inputA]);

    unmount();
    expect(bindings.size).toBe(0);
  });

  it('detaches inputRef when an initially disabled radio is enabled and then unmounted', async () => {
    const inputRef = { current: null as HTMLInputElement | null };
    const [disabled, setDisabled] = createSignal(true);
    const [mounted, setMounted] = createSignal(true);

    await render(() => (
      <RadioGroup inputRef={inputRef}>
        <Show when={mounted()}>
          <Radio.Root value="a" disabled={disabled()} />
        </Show>
      </RadioGroup>
    ));
    expect(inputRef.current).toBe(null);

    setDisabled(false);
    flush();
    expect(inputRef.current).toHaveAttribute('value', 'a');

    setMounted(false);
    flush();
    expect(inputRef.current).toBe(null);
  });

  it('skips disabled radios when assigning inputRef', async () => {
    const groupInputRef = { current: null as HTMLInputElement | null };

    await render(() => (
      <RadioGroup inputRef={groupInputRef}>
        <Radio.Root value="a" disabled data-testid="radio-a" />
        <Radio.Root value="b" data-testid="radio-b" />
      </RadioGroup>
    ));

    const inputB = (screen.getByTestId('radio-b').nextElementSibling ??
      null) as HTMLInputElement | null;

    expect(groupInputRef.current).toBe(inputB);
  });

  it('points inputRef to the first radio input when nativeButton wraps a button', async () => {
    const groupInputRef = { current: null as HTMLInputElement | null };

    await render(() => (
      <RadioGroup inputRef={groupInputRef}>
        <Radio.Root
          nativeButton
          value="a"
          render={(props) => (
            <label>
              <button {...props} data-testid="radio-a" />
              <span>Label A</span>
            </label>
          )}
        />
        <Radio.Root
          nativeButton
          value="b"
          render={(props) => (
            <label>
              <button {...props} data-testid="radio-b" />
              <span>Label B</span>
            </label>
          )}
        />
      </RadioGroup>
    ));

    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    expect(inputs.length).toBe(2);
    expect(groupInputRef.current).toBe(inputs[0]);
  });

  it('keeps inputRef pointing to the first radio when the value is cleared', async () => {
    const groupInputRef = { current: null as HTMLInputElement | null };
    const [value, setValue] = createSignal<null | string>('a');

    await render(() => (
      <>
        <RadioGroup value={value()} inputRef={groupInputRef}>
          <Radio.Root value="a" data-testid="radio-a" />
          <Radio.Root value="b" data-testid="radio-b" />
        </RadioGroup>
        <button type="button" onClick={() => setValue(null)}>
          Clear
        </button>
      </>
    ));

    const inputA = screen.getByTestId('radio-a').nextElementSibling as HTMLInputElement;

    expect(groupInputRef.current).toBe(inputA);

    click(screen.getByText('Clear'));

    expect(groupInputRef.current).toBe(inputA);
  });

  it('detaches inputRef when its current radio unmounts', async () => {
    const groupInputRef = { current: null as HTMLInputElement | null };
    const [showFirst, setShowFirst] = createSignal(true);

    await render(() => (
      <>
        <RadioGroup inputRef={groupInputRef}>
          <Show when={showFirst()}>
            <Radio.Root value="a" data-testid="radio-a" />
          </Show>
          <Radio.Root value="b" data-testid="radio-b" />
        </RadioGroup>
        <button type="button" onClick={() => setShowFirst(false)}>
          Remove first
        </button>
      </>
    ));

    const inputA = screen.getByTestId('radio-a').nextElementSibling as HTMLInputElement;

    expect(groupInputRef.current).toBe(inputA);

    click(screen.getByText('Remove first'));

    expect(groupInputRef.current).toBe(null);
  });

  it('detaches inputRef when a radio selected after mount unmounts', async () => {
    const groupInputRef = { current: null as HTMLInputElement | null };
    const [showSecond, setShowSecond] = createSignal(true);

    await render(() => (
      <>
        <RadioGroup inputRef={groupInputRef}>
          <Radio.Root value="a" data-testid="radio-a" />
          <Show when={showSecond()}>
            <Radio.Root value="b" data-testid="radio-b" />
          </Show>
        </RadioGroup>
        <button type="button" onClick={() => setShowSecond(false)}>
          Remove second
        </button>
      </>
    ));

    const inputA = screen.getByTestId('radio-a').nextElementSibling as HTMLInputElement;
    const inputB = screen.getByTestId('radio-b').nextElementSibling as HTMLInputElement;

    expect(groupInputRef.current).toBe(inputA);

    click(screen.getByTestId('radio-b'));
    expect(groupInputRef.current).toBe(inputB);

    click(screen.getByText('Remove second'));
    expect(groupInputRef.current).toBe(null);
  });

  it.skipIf(isJSDOM)(
    'should return null when no radio is selected (matching native behavior)',
    async () => {
      await render(() => (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            expect(formData.get('test-group')).toBe(null);
          }}
        >
          <RadioGroup name="test-group">
            <Radio.Root value="option-a" />
            <Radio.Root value="option-b" />
          </RadioGroup>
          <button type="submit">Submit</button>
        </form>
      ));

      screen.getByRole('button').click();
    },
  );

  it.skipIf(isJSDOM)('should return null in form data when no radio is selected', async () => {
    await render(() => (
      <form data-testid="form">
        <RadioGroup name="group">
          <Radio.Root value="a" />
          <Radio.Root value="b" />
          <Radio.Root value="c" />
        </RadioGroup>
      </form>
    ));

    const form = screen.getByTestId('form') as HTMLFormElement;
    expect(new FormData(form).get('group')).toBe(null);
  });

  it.skipIf(isJSDOM)('should include selected radio value in form data', async () => {
    await render(() => (
      <form data-testid="form">
        <RadioGroup name="group">
          <Radio.Root value="a" data-testid="radio-a" />
          <Radio.Root value="b" />
          <Radio.Root value="c" />
        </RadioGroup>
      </form>
    ));

    const form = screen.getByTestId('form') as HTMLFormElement;

    screen.getByTestId('radio-a').click();
    flush();

    expect(new FormData(form).get('group')).toBe('a');
  });

  it('should automatically select radio upon navigation', async () => {
    const { user } = await render(() => (
      <Field.Root>
        <RadioGroup>
          <Radio.Root value="a" data-testid="a" />
          <Radio.Root value="b" data-testid="b" />
        </RadioGroup>
      </Field.Root>
    ));

    const group = screen.getByRole('radiogroup');
    const a = screen.getByTestId('a');
    const b = screen.getByTestId('b');

    a.focus();
    flush();

    expect(group).not.toHaveAttribute('data-touched');
    expect(a).toHaveAttribute('aria-checked', 'false');

    await user.keyboard('{ArrowDown}');

    expect(a).toHaveAttribute('aria-checked', 'false');

    expect(b).toHaveFocus();
    expect(b).toHaveAttribute('aria-checked', 'true');
    expect(group).toHaveAttribute('data-touched', '');
  });

  describe('should manage arrow key navigation', () => {
    it.each(['metaKey', 'ctrlKey', 'altKey', 'single'])(
      'does not select on refocus after an ignored arrow (%s)',
      async (scenario) => {
        const onValueChange = vi.fn();

        const { user } = await render(() => (
          <>
            <RadioGroup onValueChange={onValueChange}>
              <Radio.Root value="a" aria-label="A" />
              <Radio.Root value="b" aria-label="B" disabled={scenario === 'single'} />
            </RadioGroup>
            <button>Outside</button>
          </>
        ));

        const radio = screen.getByRole('radio', { name: 'A' });

        radio.focus();
        flush();

        fireEvent.keyDown(radio, {
          key: 'ArrowDown',
          ...(scenario === 'single' ? {} : { [scenario]: true }),
        });
        flush();

        expect(radio).toHaveFocus();
        expect(radio).toHaveAttribute('aria-checked', 'false');

        await user.tab();

        expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();

        await user.tab({ shift: true });

        expect(radio).toHaveFocus();
        expect(radio).toHaveAttribute('aria-checked', 'false');
        expect(onValueChange).not.toHaveBeenCalled();
      },
    );

    [
      ['ltr', 'ArrowRight', 'ArrowLeft'],
      ['rtl', 'ArrowLeft', 'ArrowRight'],
    ].forEach((entry) => {
      const [direction, horizontalNextKey, horizontalPrevKey] = entry;

      describe.skipIf(isJSDOM && direction === 'rtl')(direction, () => {
        it(direction, async () => {
          const { user } = await render(() => (
            <DirectionProvider direction={direction as TextDirection}>
              <button data-testid="before" />
              <RadioGroup>
                <Radio.Root value="a" data-testid="a" />
                <Radio.Root value="b" data-testid="b" />
                <Radio.Root value="c" data-testid="c" />
              </RadioGroup>
              <button data-testid="after" />
            </DirectionProvider>
          ));

          const a = screen.getByTestId('a');
          const b = screen.getByTestId('b');
          const c = screen.getByTestId('c');
          const after = screen.getByTestId('after');

          a.focus();
          flush();

          expect(a).toHaveFocus();

          await user.keyboard('{ArrowDown}');
          expect(b).toHaveFocus();

          await user.keyboard('{ArrowDown}');
          expect(c).toHaveFocus();

          await user.keyboard('{ArrowDown}');
          expect(a).toHaveFocus();

          await user.keyboard('{ArrowUp}');
          expect(c).toHaveFocus();

          await user.keyboard('{ArrowUp}');
          expect(b).toHaveFocus();

          await user.keyboard('{ArrowUp}');
          expect(a).toHaveFocus();

          await user.keyboard(`{${horizontalPrevKey}}`);
          expect(c).toHaveFocus();

          await user.keyboard(`{${horizontalNextKey}}`);
          expect(a).toHaveFocus();

          await user.tab();
          expect(after).toHaveFocus();

          await user.tab({ shift: true });
          expect(a).toHaveFocus();

          await user.keyboard(`{${horizontalPrevKey}}`);
          expect(c).toHaveFocus();

          await user.tab({ shift: true });
          await user.tab();

          expect(c).toHaveFocus();
        });

        describe('modifier keys', () => {
          it('when Shift is pressed arrow keys move focus normally', async () => {
            const { user } = await render(() => (
              <DirectionProvider direction={direction as TextDirection}>
                <RadioGroup>
                  <Radio.Root value="a" data-testid="a" />
                  <Radio.Root value="b" data-testid="b" />
                  <Radio.Root value="c" data-testid="c" />
                </RadioGroup>
              </DirectionProvider>
            ));

            const a = screen.getByTestId('a');
            const b = screen.getByTestId('b');
            const c = screen.getByTestId('c');

            await user.keyboard('{Tab}');
            expect(a).toHaveFocus();

            await user.keyboard(`{Shift>}{${horizontalNextKey}}`);
            expect(b).toHaveFocus();

            await user.keyboard('{Shift>}{ArrowDown}');
            expect(c).toHaveFocus();
          });
        });
      });
    });
  });

  describe('item removal', () => {
    it('moves the tab stop to the checked radio when the highlighted radio is removed', async () => {
      const [showLast, setShowLast] = createSignal(true);

      const { user } = await render(() => (
        <RadioGroup value="b">
          <Radio.Root value="a" data-testid="a" />
          <Radio.Root value="b" data-testid="b" />
          <Show when={showLast()}>
            <Radio.Root value="c" data-testid="c" />
          </Show>
        </RadioGroup>
      ));

      screen.getByTestId('b').focus();
      flush();

      await user.keyboard('{ArrowDown}');

      expect(screen.getByTestId('c')).toHaveAttribute('tabindex', '0');

      setShowLast(false);
      flush();

      expect(screen.getByTestId('a')).toHaveAttribute('tabindex', '-1');
      expect(screen.getByTestId('b')).toHaveAttribute('tabindex', '0');
    });
  });

  describe('style hooks', () => {
    it('should apply data-checked and data-unchecked to radio root and indicator', async () => {
      await render(() => (
        <RadioGroup>
          <Radio.Root value="a" data-testid="a">
            <Radio.Indicator keepMounted data-testid="indicator-a" />
          </Radio.Root>
          <Radio.Root value="b" data-testid="b">
            <Radio.Indicator keepMounted data-testid="indicator-b" />
          </Radio.Root>
        </RadioGroup>
      ));

      const a = screen.getByTestId('a');
      const b = screen.getByTestId('b');
      const indicatorA = screen.getByTestId('indicator-a');
      const indicatorB = screen.getByTestId('indicator-b');

      expect(a).toHaveAttribute('data-unchecked', '');
      expect(indicatorA).toHaveAttribute('data-unchecked', '');
      expect(b).toHaveAttribute('data-unchecked', '');
      expect(indicatorB).toHaveAttribute('data-unchecked', '');

      click(a);

      expect(a).toHaveAttribute('data-checked', '');
      expect(indicatorA).toHaveAttribute('data-checked', '');
      expect(b).toHaveAttribute('data-unchecked', '');
      expect(indicatorB).toHaveAttribute('data-unchecked', '');

      click(b);

      expect(a).toHaveAttribute('data-unchecked', '');
      expect(indicatorA).toHaveAttribute('data-unchecked', '');
      expect(b).toHaveAttribute('data-checked', '');
      expect(indicatorB).toHaveAttribute('data-checked', '');

      click(a);

      expect(a).toHaveAttribute('data-checked', '');
      expect(indicatorA).toHaveAttribute('data-checked', '');
      expect(b).toHaveAttribute('data-unchecked', '');
      expect(indicatorB).toHaveAttribute('data-unchecked', '');
    });
  });

  it('does not forward `value` prop', async () => {
    await render(() => (
      <RadioGroup value="test" data-testid="radio-group">
        <Radio.Root value="" />
      </RadioGroup>
    ));

    expect(screen.getByTestId('radio-group')).not.toHaveAttribute('value');
  });

  it('sets tabIndex=0 to the correct element initially', async () => {
    await render(() => (
      <RadioGroup defaultValue="b">
        <Radio.Root value="a" data-testid="radio-a" />
        <Radio.Root value="b" data-testid="radio-b" />
      </RadioGroup>
    ));

    expect(screen.getByTestId('radio-a')).not.toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('radio-b')).toHaveAttribute('tabindex', '0');
  });

  describe('with native <label>', () => {
    it('associates implicitly', async () => {
      const changeSpy = vi.fn((newValue) => newValue);
      await render(() => (
        <RadioGroup onValueChange={changeSpy}>
          <label data-testid="label">
            <Radio.Root value="apple" />
            Apple
          </label>

          <label data-testid="label">
            <Radio.Root value="banana" />
            Banana
          </label>
        </RadioGroup>
      ));

      const [label1, label2] = screen.getAllByTestId('label');

      click(label1);
      expect(changeSpy.mock.calls.length).toBe(1);
      expect(changeSpy.mock.results.at(-1)?.value).toBe('apple');

      click(label2);
      expect(changeSpy.mock.calls.length).toBe(2);
      expect(changeSpy.mock.results.at(-1)?.value).toBe('banana');
    });

    it('associates explicitly', async () => {
      const changeSpy = vi.fn((newValue) => newValue);
      await render(() => (
        <RadioGroup onValueChange={changeSpy}>
          <div>
            <label data-testid="label" for="RadioA">
              Apple
            </label>
            <Radio.Root value="apple" id="RadioA" />
          </div>

          <div>
            <label data-testid="label" for="RadioB">
              Banana
            </label>
            <Radio.Root value="banana" id="RadioB" />
          </div>
        </RadioGroup>
      ));

      const [label1, label2] = screen.getAllByTestId('label');

      click(label1);
      expect(changeSpy.mock.calls.length).toBe(1);
      expect(changeSpy.mock.results.at(-1)?.value).toBe('apple');

      click(label2);
      expect(changeSpy.mock.calls.length).toBe(2);
      expect(changeSpy.mock.results.at(-1)?.value).toBe('banana');
    });
  });
  describe('Field', () => {
    it('passes the `name` prop to the radio input', async () => {
      await render(() => (
        <Field.Root name="test" data-testid="field">
          <RadioGroup name="group">
            <Field.Item>
              <Radio.Root value="a" data-testid="item" />
            </Field.Item>
          </RadioGroup>
        </Field.Root>
      ));

      const input = screen.getByTestId('item').nextElementSibling as HTMLInputElement;

      expect(input).toHaveAttribute('name', 'test');
    });

    describe('[data-focused] without a blur event', () => {
      it('is removed when the focused group becomes disabled', async () => {
        const [firstDisabled, setFirstDisabled] = createSignal(false);
        await render(() => (
          <Field.Root data-testid="field">
            <RadioGroup data-testid="first" disabled={firstDisabled()}>
              <Radio.Root value="a" data-testid="first-radio" />
            </RadioGroup>
          </Field.Root>
        ));

        screen.getByTestId('first-radio').focus();
        flush();

        expect(screen.getByTestId('field')).toHaveAttribute('data-focused', '');

        setFirstDisabled(true);
        flush();

        expect(screen.getByTestId('field')).not.toHaveAttribute('data-focused');
      });

      it('is removed when the focused group unmounts', async () => {
        const [firstMounted, setFirstMounted] = createSignal(true);
        await render(() => (
          <Field.Root data-testid="field">
            <Show when={firstMounted()}>
              <RadioGroup data-testid="first">
                <Radio.Root value="a" data-testid="first-radio" />
              </RadioGroup>
            </Show>
          </Field.Root>
        ));

        screen.getByTestId('first-radio').focus();
        flush();

        expect(screen.getByTestId('field')).toHaveAttribute('data-focused', '');

        setFirstMounted(false);
        flush();

        expect(screen.getByTestId('field')).not.toHaveAttribute('data-focused');
      });

      it('is kept when a previously focused radio unmounts after focus moves to a sibling', async () => {
        const [firstMounted, setFirstMounted] = createSignal(true);
        await render(() => (
          <Field.Root data-testid="field">
            <RadioGroup>
              <Show when={firstMounted()}>
                <Radio.Root value="a" data-testid="first-radio" />
              </Show>
              <Radio.Root value="b" data-testid="second-radio" />
            </RadioGroup>
          </Field.Root>
        ));
        const first = screen.getByTestId('first-radio');
        const second = screen.getByTestId('second-radio');

        first.focus();
        flush();
        second.focus();
        flush();

        expect(second).toHaveFocus();
        expect(screen.getByTestId('field')).toHaveAttribute('data-focused', '');

        setFirstMounted(false);
        flush();

        expect(second).toHaveFocus();
        expect(screen.getByTestId('field')).toHaveAttribute('data-focused', '');
      });

      it('is removed when the focused radio unmounts but its group remains', async () => {
        const [firstMounted, setFirstMounted] = createSignal(true);
        await render(() => (
          <Field.Root data-testid="field">
            <RadioGroup>
              <Show when={firstMounted()}>
                <Radio.Root value="a" data-testid="first-radio" />
              </Show>
              <Radio.Root value="b" />
            </RadioGroup>
          </Field.Root>
        ));

        screen.getByTestId('first-radio').focus();
        flush();
        expect(screen.getByTestId('field')).toHaveAttribute('data-focused', '');

        setFirstMounted(false);
        flush();

        expect(screen.getByTestId('field')).not.toHaveAttribute('data-focused');
      });

      it('is not acquired when focus lands on a disabled radio', async () => {
        await render(() => (
          <Field.Root data-testid="field">
            <RadioGroup>
              <Radio.Root value="a" disabled data-testid="disabled-radio" />
              <Radio.Root value="b" />
            </RadioGroup>
          </Field.Root>
        ));

        screen.getByTestId('disabled-radio').focus();
        flush();

        expect(screen.getByTestId('disabled-radio')).toHaveFocus();
        expect(screen.getByTestId('field')).not.toHaveAttribute('data-focused');
      });

      it('is not reacquired when a radio disabled while focused is refocused', async () => {
        const [firstDisabled, setFirstDisabled] = createSignal(false);
        await render(() => (
          <Field.Root data-testid="field">
            <RadioGroup>
              <Radio.Root value="a" disabled={firstDisabled()} data-testid="first-radio" />
              <Radio.Root value="b" />
            </RadioGroup>
          </Field.Root>
        ));
        const first = screen.getByTestId('first-radio');

        first.focus();
        flush();
        expect(screen.getByTestId('field')).toHaveAttribute('data-focused', '');

        setFirstDisabled(true);
        flush();
        expect(screen.getByTestId('field')).not.toHaveAttribute('data-focused');

        first.blur();
        flush();
        first.focus();
        flush();

        expect(first).toHaveFocus();
        expect(screen.getByTestId('field')).not.toHaveAttribute('data-focused');
      });

      it('is reacquired when a radio that kept focus while disabled is re-enabled', async () => {
        const [firstDisabled, setFirstDisabled] = createSignal(false);
        await render(() => (
          <Field.Root data-testid="field">
            <RadioGroup>
              <Radio.Root value="a" disabled={firstDisabled()} data-testid="first-radio" />
              <Radio.Root value="b" />
            </RadioGroup>
          </Field.Root>
        ));
        const first = screen.getByTestId('first-radio');

        first.focus();
        flush();

        setFirstDisabled(true);
        flush();
        expect(first).toHaveFocus();
        expect(screen.getByTestId('field')).not.toHaveAttribute('data-focused');

        setFirstDisabled(false);
        flush();
        expect(screen.getByTestId('field')).toHaveAttribute('data-focused', '');
      });

      it('is not acquired when a radio inherits disabled from Field.Item', async () => {
        await render(() => (
          <Field.Root data-testid="field">
            <RadioGroup>
              <Field.Item disabled>
                <Radio.Root value="a" data-testid="disabled-radio" />
              </Field.Item>
              <Field.Item>
                <Radio.Root value="b" />
              </Field.Item>
            </RadioGroup>
          </Field.Root>
        ));

        screen.getByTestId('disabled-radio').focus();
        flush();

        expect(screen.getByTestId('field')).not.toHaveAttribute('data-focused');
      });

      it('is reacquired when an arrow key moves focus from a disabled radio to an enabled sibling', async () => {
        const [firstDisabled, setFirstDisabled] = createSignal(false);
        const { user } = await render(() => (
          <Field.Root data-testid="field">
            <RadioGroup>
              <Radio.Root value="a" disabled={firstDisabled()} data-testid="first-radio" />
              <Radio.Root value="b" data-testid="second-radio" />
            </RadioGroup>
          </Field.Root>
        ));
        const first = screen.getByTestId('first-radio');
        const second = screen.getByTestId('second-radio');

        first.focus();
        flush();
        expect(screen.getByTestId('field')).toHaveAttribute('data-focused', '');

        setFirstDisabled(true);
        flush();
        expect(screen.getByTestId('field')).not.toHaveAttribute('data-focused');

        await user.keyboard('{ArrowDown}');

        expect(second).toHaveFocus();
        expect(screen.getByTestId('field')).toHaveAttribute('data-focused', '');
      });
    });

    describe('Field.Root', () => {
      it('should receive disabled prop from Field.Root', async () => {
        await render(() => (
          <Field.Root disabled>
            <RadioGroup>
              <Field.Item>
                <Radio.Root value="a" data-testid="radio" />
              </Field.Item>
            </RadioGroup>
          </Field.Root>
        ));

        const radioGroup = screen.getByRole('radiogroup');
        const radio = screen.getByTestId('radio');

        expect(radioGroup).toHaveAttribute('aria-disabled', 'true');
        expect(radioGroup).toHaveAttribute('data-disabled');
        expect(radio).toHaveAttribute('aria-disabled', 'true');
        expect(radio).toHaveAttribute('data-disabled');
      });

      it('should receive name prop from Field.Root', async () => {
        await render(() => (
          <Field.Root name="field-radio">
            <RadioGroup value="a">
              <Field.Item>
                <Radio.Root value="a" data-testid="radio" />
              </Field.Item>
            </RadioGroup>
          </Field.Root>
        ));

        const input = screen.getByTestId('radio').nextElementSibling as HTMLInputElement;

        expect(input).toHaveAttribute('name', 'field-radio');
      });

      it('revalidates when the controlled value changes externally', async () => {
        const validateSpy = vi.fn((value: unknown) => ((value as string) === 'b' ? 'error' : null));
        const [value, setValue] = createSignal('a');

        await render(() => (
          <>
            <Field.Root validationMode="onChange" validate={validateSpy} name="choices">
              <RadioGroup
                value={value()}
                onValueChange={(nextValue) => setValue(nextValue as string)}
              >
                <Field.Item>
                  <Radio.Root value="a" data-testid="radio" />
                </Field.Item>
                <Field.Item>
                  <Radio.Root value="b" data-testid="radio" />
                </Field.Item>
              </RadioGroup>
            </Field.Root>
            <button type="button" onClick={() => setValue('b')}>
              Select externally
            </button>
          </>
        ));

        const radioGroup = screen.getByRole('radiogroup');

        expect(radioGroup).not.toHaveAttribute('aria-invalid');
        const initialCallCount = validateSpy.mock.calls.length;

        click(screen.getByText('Select externally'));

        expect(validateSpy.mock.calls.length).toBe(initialCallCount + 1);
        expect(validateSpy.mock.lastCall?.[0]).toBe('b');
        expect(radioGroup).toHaveAttribute('aria-invalid', 'true');
      });
    });

    describe('Field.Label', () => {
      it('associates implicitly', async () => {
        const changeSpy = vi.fn((newValue) => newValue);
        await render(() => (
          <Field.Root name="options">
            <RadioGroup onValueChange={changeSpy}>
              <Field.Item>
                <Field.Label data-testid="label">
                  <Radio.Root value="apple" />
                  Apple
                </Field.Label>
              </Field.Item>
              <Field.Item>
                <Field.Label data-testid="label">
                  <Radio.Root value="banana" />
                  Banana
                </Field.Label>
              </Field.Item>
            </RadioGroup>
          </Field.Root>
        ));

        const labels = screen.getAllByTestId('label');
        expect(labels.length).toBe(2);
        labels.forEach((label) => {
          expect(label).toHaveAttribute('for');
        });

        click(screen.getByText('Apple'));
        expect(changeSpy.mock.calls.length).toBe(1);
        expect(changeSpy.mock.results.at(-1)?.value).toBe('apple');
      });

      it('associates explicitly', async () => {
        const changeSpy = vi.fn((newValue) => newValue);
        await render(() => (
          <Field.Root name="options">
            <RadioGroup onValueChange={changeSpy}>
              <Field.Item>
                <Radio.Root value="apple" />
                <Field.Label data-testid="label">Apple</Field.Label>
                <Field.Description data-testid="description">
                  An apple is the round, edible fruit of an apple tree
                </Field.Description>
              </Field.Item>
              <Field.Item>
                <Radio.Root value="banana" />
                <Field.Label data-testid="label">Banana</Field.Label>
                <Field.Description data-testid="description">
                  A banana is an elongated, edible fruit
                </Field.Description>
              </Field.Item>
            </RadioGroup>
          </Field.Root>
        ));

        const radios = screen.getAllByRole('radio');
        const labels = screen.getAllByTestId('label');
        const descriptions = screen.getAllByTestId('description');
        const inputs = document.querySelectorAll('input[type="radio"]');

        radios.forEach((radio, index) => {
          const label = labels[index];
          const description = descriptions[index];
          const input = inputs[index];

          expect(label.getAttribute('for')).not.toBe(null);
          expect(label.getAttribute('for')).toBe(input?.getAttribute('id'));
          expect(description.getAttribute('id')).not.toBe(null);
          expect(description.getAttribute('id')).toBe(radio.getAttribute('aria-describedby'));
        });

        click(screen.getByText('Banana'));
        expect(changeSpy.mock.results.at(-1)?.value).toBe('banana');
      });
    });

    describe('Field.Description', () => {
      it('links the group and individual radios', async () => {
        await render(() => (
          <Field.Root name="apple">
            <RadioGroup defaultValue={[]} aria-describedby="external-description">
              <Field.Description data-testid="group-description">
                Group description
              </Field.Description>
              <Field.Item>
                <Field.Label>
                  <Radio.Root value="fuji-apple" aria-describedby="radio-description" />
                  Fuji
                </Field.Label>
              </Field.Item>
            </RadioGroup>
          </Field.Root>
        ));

        const groupDescriptionId = screen.getByTestId('group-description').getAttribute('id');
        expect(groupDescriptionId).not.toBe(null);
        expect(screen.getByRole('radiogroup').getAttribute('aria-describedby')).toContain(
          groupDescriptionId,
        );
        expect(screen.getByRole('radio').getAttribute('aria-describedby')).toContain(
          groupDescriptionId,
        );
        expect(screen.getByRole('radio')).toHaveAttribute(
          'aria-describedby',
          `radio-description ${groupDescriptionId}`,
        );
        expect(screen.getByRole('radiogroup')).toHaveAttribute(
          'aria-describedby',
          `external-description ${groupDescriptionId}`,
        );
      });
    });

    describe('prop: validationMode', () => {
      it('onSubmit', async () => {
        const { user } = await render(() => (
          <Form>
            <Field.Root
              validate={(val) => {
                if (val === 'a') {
                  return 'custom error a';
                }
                if (val === 'c') {
                  return 'custom error c';
                }
                return null;
              }}
            >
              <RadioGroup>
                <Radio.Root value="a" data-testid="item" />
                <Radio.Root value="b" data-testid="item" />
                <Radio.Root value="c" data-testid="item" />
              </RadioGroup>
            </Field.Root>
            <button type="submit">submit</button>
          </Form>
        ));

        const radioGroup = screen.getByRole('radiogroup');
        const [radioA, radioB, radioC] = screen.getAllByTestId('item');
        expect(radioGroup).not.toHaveAttribute('aria-invalid');

        await user.click(radioA);
        expect(radioA).toHaveAttribute('data-checked', '');
        expect(radioGroup).not.toHaveAttribute('aria-invalid');

        await user.click(radioC);
        expect(radioC).toHaveAttribute('data-checked', '');
        expect(radioGroup).not.toHaveAttribute('aria-invalid');

        await user.click(screen.getByText('submit'));
        expect(radioGroup).toHaveAttribute('aria-invalid');

        await user.click(radioB);
        expect(radioB).toHaveAttribute('data-checked', '');
        expect(radioGroup).not.toHaveAttribute('aria-invalid');
      });

      it('onBlur validates only when focus leaves the group', async () => {
        const validate = vi.fn((value) => (value === 'a' ? 'error' : null));
        await render(() => (
          <>
            <Field.Root validationMode="onBlur" validate={validate}>
              <RadioGroup defaultValue="a">
                <Radio.Root value="a" data-testid="radio-a" />
                <Radio.Root value="b" data-testid="radio-b" />
              </RadioGroup>
            </Field.Root>
            <button type="button">Outside</button>
          </>
        ));

        const group = screen.getByRole('radiogroup');
        const radioA = screen.getByTestId('radio-a');
        const radioB = screen.getByTestId('radio-b');

        // Port note: React's `onFocus`/`onBlur` listen to `focusin`/`focusout`, and React
        // Testing Library's `fireEvent.focus`/`blur` dispatch those too. Solid's handlers here
        // are `onFocusIn`/`onFocusOut`, so dispatch those events directly.
        fireEvent.focusIn(radioA);
        fireEvent.focusOut(group, { relatedTarget: radioB });
        flush();

        expect(validate).not.toHaveBeenCalled();

        fireEvent.focusOut(group, { relatedTarget: screen.getByText('Outside') });
        flush();
        await Promise.resolve();
        flush();

        expect(validate).toHaveBeenCalledTimes(1);
        expect(validate.mock.calls[0][0]).toBe('a');
        expect(group).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });

  describe('Fieldset', () => {
    it('keeps inputRef available after an ancestor fieldset is enabled', async () => {
      const groupInputRef = { current: null as HTMLInputElement | null };
      const [disabled, setDisabled] = createSignal(true);

      await render(() => (
        <>
          <fieldset disabled={disabled()}>
            <RadioGroup inputRef={groupInputRef}>
              <Radio.Root value="a" data-testid="radio-a" />
            </RadioGroup>
          </fieldset>
          <button type="button" onClick={() => setDisabled(false)}>
            Enable
          </button>
        </>
      ));

      const input = screen.getByTestId('radio-a').nextElementSibling as HTMLInputElement;

      click(screen.getByText('Enable'));

      expect(groupInputRef.current).toBe(input);
    });

    it('labels the radio group from the fieldset legend', async () => {
      await render(() => (
        <Field.Root name="test">
          {/* Port note: `render={<RadioGroup />}` → a render function (elements can't be cloned). */}
          <Fieldset.Root render={(props) => <RadioGroup {...(props as any)} />}>
            <Fieldset.Legend>Legend</Fieldset.Legend>
            <Field.Item>
              <Radio.Root value="a" />
            </Field.Item>
          </Fieldset.Root>
        </Field.Root>
      ));

      const legend = screen.getByText('Legend');
      const radioGroup = screen.getByRole('radiogroup');

      expect(radioGroup.getAttribute('aria-labelledby')).toBe(legend.getAttribute('id'));
    });

    it('updates label precedence without retaining replaced or unmounted IDs', async () => {
      const [explicit, setExplicit] = createSignal(true);
      const [fieldLabel, setFieldLabel] = createSignal<'field-label-a' | 'field-label-b'>(
        'field-label-a',
      );
      const [showFieldLabel, setShowFieldLabel] = createSignal(true);
      const [legend, setLegend] = createSignal<'legend-a' | 'legend-b'>('legend-a');
      const [showLegend, setShowLegend] = createSignal(true);

      const { user } = await render(() => (
        <>
          <span id="explicit-label">Explicit label</span>
          <Field.Root name="choice">
            {/* Port note: upstream remounts via `key`; a keyed `<Show>` does the same. */}
            <Show when={showFieldLabel() && fieldLabel()} keyed>
              {(id) => (
                <Field.Label id={id} render="span" nativeLabel={false}>
                  Field label
                </Field.Label>
              )}
            </Show>
            <Fieldset.Root>
              <Show when={showLegend() && legend()} keyed>
                {(id) => <Fieldset.Legend id={id}>Legend</Fieldset.Legend>}
              </Show>
              <RadioGroup {...(explicit() ? { 'aria-labelledby': 'explicit-label' } : {})}>
                <Radio.Root value="a" />
              </RadioGroup>
            </Fieldset.Root>
          </Field.Root>
          <button type="button" onClick={() => setExplicit(false)}>
            remove explicit
          </button>
          <button
            type="button"
            onClick={() => {
              setFieldLabel('field-label-b');
              setShowFieldLabel(true);
            }}
          >
            mount field replacement
          </button>
          <button type="button" onClick={() => setShowFieldLabel(false)}>
            remove field label
          </button>
          <button
            type="button"
            onClick={() => {
              setLegend('legend-b');
              setShowLegend(true);
            }}
          >
            mount legend replacement
          </button>
          <button type="button" onClick={() => setShowLegend(false)}>
            remove legend
          </button>
        </>
      ));
      const radioGroup = screen.getByRole('radiogroup');

      expect(radioGroup).toHaveAttribute('aria-labelledby', 'explicit-label');

      await user.click(screen.getByRole('button', { name: 'remove explicit' }));
      expect(radioGroup).toHaveAttribute('aria-labelledby', 'field-label-a');

      await user.click(screen.getByRole('button', { name: 'remove field label' }));
      expect(radioGroup).toHaveAttribute('aria-labelledby', 'legend-a');

      await user.click(screen.getByRole('button', { name: 'mount field replacement' }));
      expect(radioGroup).toHaveAttribute('aria-labelledby', 'field-label-b');

      await user.click(screen.getByRole('button', { name: 'remove field label' }));
      expect(radioGroup).toHaveAttribute('aria-labelledby', 'legend-a');

      await user.click(screen.getByRole('button', { name: 'remove legend' }));
      expect(radioGroup).not.toHaveAttribute('aria-labelledby');

      await user.click(screen.getByRole('button', { name: 'mount legend replacement' }));
      expect(radioGroup).toHaveAttribute('aria-labelledby', 'legend-b');

      await user.click(screen.getByRole('button', { name: 'remove legend' }));
      expect(radioGroup).not.toHaveAttribute('aria-labelledby');
    });
  });

  // Port note: upstream renders these with a fake clock that advances with real time
  // (`shouldAdvanceTime`). None of them advance the clock manually, so real timers are used.
  describe('Form', () => {
    it.skipIf(isJSDOM)('submits to an external form when `form` is provided', async () => {
      const submitSpy = vi.fn((event: SubmitEvent) => {
        event.preventDefault();
        return new FormData(event.currentTarget as HTMLFormElement).get('group');
      });

      await render(() => (
        <>
          <form id="external-form" onSubmit={submitSpy}>
            <button type="submit">Submit</button>
          </form>
          <RadioGroup name="group" form="external-form" defaultValue="b">
            <Radio.Root value="a" />
            <Radio.Root value="b" />
          </RadioGroup>
        </>
      ));

      click(screen.getByRole('button'));

      expect(submitSpy.mock.calls.length).toBe(1);
      expect(submitSpy.mock.results.at(-1)?.value).toBe('b');
    });

    it('triggers native HTML validation on submit', async () => {
      const { user } = await render(() => (
        <Form>
          <Field.Root name="test" data-testid="field">
            <RadioGroup name="group" required>
              <Field.Item>
                <Radio.Root value="a" data-testid="item" />
              </Field.Item>
            </RadioGroup>
            <Field.Error match="valueMissing" data-testid="error">
              required
            </Field.Error>
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>
      ));

      expect(screen.queryByTestId('error')).toBe(null);

      await user.click(screen.getByText('Submit'));

      expect(screen.getByTestId('error')).toHaveTextContent('required');
    });

    it('submits null to onFormSubmit when no radio is selected', async () => {
      const handleSubmit = vi.fn();

      await render(() => (
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="test">
            <RadioGroup name="group">
              <Radio.Root value="a" data-testid="item-a" />
              <Radio.Root value="b" data-testid="item-b" />
            </RadioGroup>
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>
      ));

      click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls.length).toBe(1);
      expect(handleSubmit.mock.calls[0][0]).toEqual({ test: null });
    });

    it('unblocks submission after every radio in the group unmounts', async () => {
      const handleSubmit = vi.fn();
      const [mounted, setMounted] = createSignal(true);

      const { user } = await render(() => (
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="choice">
            <RadioGroup required>
              <Show when={mounted()}>
                <Radio.Root value="a" />
              </Show>
            </RadioGroup>
          </Field.Root>
          <button type="button" onClick={() => setMounted(false)}>
            Remove
          </button>
          <button type="submit">Submit</button>
        </Form>
      ));

      await user.click(screen.getByText('Submit'));
      expect(handleSubmit).not.toHaveBeenCalled();

      await user.click(screen.getByText('Remove'));
      await user.click(screen.getByText('Submit'));

      expect(handleSubmit.mock.lastCall?.[0]).toEqual({ choice: null });
    });

    it('runs the custom validator after every radio in the group unmounts', async () => {
      const handleSubmit = vi.fn();
      const validate = vi.fn(() => 'always invalid');
      const [mounted, setMounted] = createSignal(true);

      const { user } = await render(() => (
        <Form onFormSubmit={handleSubmit}>
          <Field.Root name="choice" validate={validate}>
            <RadioGroup>
              <Show when={mounted()}>
                <Radio.Root value="a" />
              </Show>
            </RadioGroup>
            <Field.Error data-testid="error" />
          </Field.Root>
          <button type="button" onClick={() => setMounted(false)}>
            Remove
          </button>
          <button type="submit">Submit</button>
        </Form>
      ));

      await user.click(screen.getByText('Remove'));
      await user.click(screen.getByText('Submit'));

      expect(handleSubmit).not.toHaveBeenCalled();
      expect(screen.getByTestId('error')).toHaveTextContent('always invalid');
    });

    it('excludes a disabled selected radio from onFormSubmit to match native form data', async () => {
      const handleSubmit = vi.fn();
      const [disabled, setDisabled] = createSignal(false);

      await render(() => (
        <Form onFormSubmit={handleSubmit} data-testid="form">
          <Field.Root name="test">
            <RadioGroup name="group" defaultValue="a">
              <Radio.Root value="a" disabled={disabled()} data-testid="item-a" />
              <Radio.Root value="b" data-testid="item-b" />
            </RadioGroup>
          </Field.Root>
          <button type="button" onClick={() => setDisabled(true)}>
            Disable
          </button>
          <button type="submit">Submit</button>
        </Form>
      ));

      click(screen.getByText('Disable'));

      const form = screen.getByTestId('form') as HTMLFormElement;
      expect(new FormData(form).get('test')).toBe(null);

      click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls[0][0]).toEqual({ test: null });
    });

    it('includes a selected radio again when it is re-enabled before form submission', async () => {
      const handleSubmit = vi.fn();
      const [disabled, setDisabled] = createSignal(false);

      await render(() => (
        <Form onFormSubmit={handleSubmit} data-testid="form">
          <Field.Root name="test">
            <RadioGroup name="group" defaultValue="a">
              <Radio.Root value="a" disabled={disabled()} data-testid="item-a" />
              <Radio.Root value="b" data-testid="item-b" />
            </RadioGroup>
          </Field.Root>
          <button type="button" onClick={() => setDisabled((value) => !value)}>
            Toggle disabled
          </button>
          <button type="submit">Submit</button>
        </Form>
      ));

      const form = screen.getByTestId('form') as HTMLFormElement;

      click(screen.getByText('Toggle disabled'));
      expect(new FormData(form).get('test')).toBe(null);

      click(screen.getByText('Toggle disabled'));
      expect(new FormData(form).get('test')).toBe('a');

      click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls[0][0]).toEqual({ test: 'a' });
    });

    it('excludes an initially disabled selected radio from onFormSubmit to match native form data', async () => {
      const handleSubmit = vi.fn();

      await render(() => (
        <Form onFormSubmit={handleSubmit} data-testid="form">
          <Field.Root name="test">
            <RadioGroup name="group" defaultValue="a">
              <Radio.Root value="a" disabled data-testid="item-a" />
              <Radio.Root value="b" data-testid="item-b" />
            </RadioGroup>
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>
      ));

      const form = screen.getByTestId('form') as HTMLFormElement;
      expect(new FormData(form).get('test')).toBe(null);

      click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls[0][0]).toEqual({ test: null });
    });

    it.skipIf(isJSDOM)(
      'projects an enabled selected radio, matching native form data',
      async () => {
        const handleSubmit = vi.fn();

        await render(() => (
          <Form onFormSubmit={handleSubmit} data-testid="form">
            <Field.Root name="choice">
              <RadioGroup defaultValue="a">
                <Radio.Root value="a" data-testid="item-a" />
                <Radio.Root value="b" data-testid="item-b" />
              </RadioGroup>
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>
        ));

        const form = screen.getByTestId('form') as HTMLFormElement;
        expect(new FormData(form).getAll('choice')).toEqual(['a']);

        click(screen.getByText('Submit'));

        expect(handleSubmit.mock.calls[0][0]).toEqual({ choice: 'a' });
      },
    );

    it.skipIf(isJSDOM)(
      'excludes a radio disabled through an ancestor <fieldset disabled> to match native form data',
      async () => {
        const handleSubmit = vi.fn();

        await render(() => (
          <Form onFormSubmit={handleSubmit} data-testid="form">
            <fieldset disabled>
              <Field.Root name="choice">
                <RadioGroup defaultValue="a">
                  <Radio.Root value="a" data-testid="item-a" />
                  <Radio.Root value="b" data-testid="item-b" />
                </RadioGroup>
              </Field.Root>
            </fieldset>
            <button type="submit">Submit</button>
          </Form>
        ));

        const form = screen.getByTestId('form') as HTMLFormElement;
        // Native submission omits controls disabled by an ancestor fieldset, even though
        // their `disabled` property is `false`.
        expect(new FormData(form).getAll('choice')).toEqual([]);

        click(screen.getByText('Submit'));

        expect(handleSubmit.mock.calls[0][0]).toEqual({ choice: null });
      },
    );

    it.skipIf(isJSDOM)(
      'includes a selected radio after its ancestor fieldset is enabled',
      async () => {
        const handleSubmit = vi.fn();
        const [disabled, setDisabled] = createSignal(true);

        await render(() => (
          <Form onFormSubmit={handleSubmit} data-testid="form">
            <fieldset disabled={disabled()}>
              <Field.Root name="choice">
                <RadioGroup defaultValue="a">
                  <Radio.Root value="a" />
                  <Radio.Root value="b" />
                </RadioGroup>
              </Field.Root>
            </fieldset>
            <button type="button" onClick={() => setDisabled(false)}>
              Enable
            </button>
            <button type="submit">Submit</button>
          </Form>
        ));

        const form = screen.getByTestId('form') as HTMLFormElement;
        expect(new FormData(form).getAll('choice')).toEqual([]);

        click(screen.getByText('Enable'));
        expect(new FormData(form).getAll('choice')).toEqual(['a']);

        click(screen.getByText('Submit'));
        expect(handleSubmit.mock.calls[0][0]).toEqual({ choice: 'a' });
      },
    );

    it.skipIf(isJSDOM)('omits a radio associated to another form via the `form` prop', async () => {
      const handleSubmit = vi.fn();

      await render(() => (
        <>
          <form id="external-form" />
          <Form onFormSubmit={handleSubmit} data-testid="form">
            <Field.Root name="choice">
              <RadioGroup form="external-form" defaultValue="a">
                <Radio.Root value="a" data-testid="item-a" />
                <Radio.Root value="b" data-testid="item-b" />
              </RadioGroup>
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>
        </>
      ));

      const form = screen.getByTestId('form') as HTMLFormElement;
      // The radio is associated to #external-form, so this form excludes it natively.
      expect(new FormData(form).getAll('choice')).toEqual([]);

      click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls[0][0]).toEqual({ choice: null });
    });

    it.skipIf(isJSDOM)(
      'includes a context-portaled radio without native form association in onFormSubmit',
      async () => {
        const handleSubmit = vi.fn();
        const portalContainer = document.createElement('div');
        document.body.append(portalContainer);

        await render(() => (
          <Form onFormSubmit={handleSubmit} data-testid="form">
            <Field.Root name="choice">
              <RadioGroup defaultValue="a">
                <Portal mount={portalContainer}>
                  <Radio.Root value="a" />
                </Portal>
              </RadioGroup>
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>
        ));

        const form = screen.getByTestId('form') as HTMLFormElement;
        // Native submission omits the portaled radio since it has no DOM form association.
        expect(new FormData(form).getAll('choice')).toEqual([]);

        click(screen.getByText('Submit'));

        // Field registration is context-driven, so the portaled radio still projects its value
        // into `onFormSubmit`, like other field controls.
        expect(handleSubmit.mock.calls[0][0]).toEqual({ choice: 'a' });
        portalContainer.remove();
      },
    );

    it('includes a group fully portaled outside the form element in onFormSubmit', async () => {
      const handleSubmit = vi.fn();
      const portalContainer = document.createElement('div');
      document.body.append(portalContainer);

      await render(() => (
        <Form onFormSubmit={handleSubmit}>
          <Portal mount={portalContainer}>
            <Field.Root name="choice">
              <RadioGroup defaultValue="a">
                <Radio.Root value="a" />
                <Radio.Root value="b" />
              </RadioGroup>
            </Field.Root>
          </Portal>
          <button type="submit">Submit</button>
        </Form>
      ));

      click(screen.getByText('Submit'));

      expect(handleSubmit.mock.calls[0][0]).toEqual({ choice: 'a' });
      portalContainer.remove();
    });

    it.skipIf(isJSDOM)(
      'submits null when the selected radio in a required group is disabled, matching native validity',
      async () => {
        const handleSubmit = vi.fn();

        await render(() => (
          <Form onFormSubmit={handleSubmit} data-testid="form">
            <Field.Root name="choice">
              <RadioGroup required defaultValue="a">
                <Radio.Root value="a" disabled data-testid="item-a" />
                <Radio.Root value="b" data-testid="item-b" />
              </RadioGroup>
              <Field.Error match="valueMissing" data-testid="error">
                required
              </Field.Error>
            </Field.Root>
            <button type="submit">Submit</button>
          </Form>
        ));

        const form = screen.getByTestId('form') as HTMLFormElement;
        expect(new FormData(form).getAll('choice')).toEqual([]);

        click(screen.getByText('Submit'));

        // Natively, a disabled checked radio still satisfies its radio group's `valueMissing`
        // constraint even though its value is not submitted.
        expect(screen.queryByTestId('error')).toBe(null);
        expect(handleSubmit.mock.calls[0][0]).toEqual({ choice: null });
      },
    );

    it('clears required validation when a value is selected', async () => {
      const { user } = await render(() => (
        <Form>
          <Field.Root name="test" data-testid="field">
            <RadioGroup name="group" required data-testid="group">
              <Radio.Root value="a" data-testid="item-a" />
              <Radio.Root value="b" data-testid="item-b" />
            </RadioGroup>
            <Field.Error match="valueMissing" data-testid="error">
              required
            </Field.Error>
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>
      ));

      expect(screen.queryByTestId('error')).toBe(null);

      const group = screen.getByTestId('group');
      const radioA = screen.getByTestId('item-a');
      const radioB = screen.getByTestId('item-b');

      await user.click(screen.getByText('Submit'));

      expect(screen.getByTestId('error')).toHaveTextContent('required');
      expect(group).toHaveAttribute('aria-invalid', 'true');
      expect(radioA).toHaveAttribute('aria-invalid', 'true');
      expect(radioB).toHaveAttribute('aria-invalid', 'true');

      await user.click(radioB);

      expect(screen.queryByTestId('error')).toBe(null);
      expect(group).not.toHaveAttribute('aria-invalid', 'true');
      expect(radioA).not.toHaveAttribute('aria-invalid', 'true');
      expect(radioB).not.toHaveAttribute('aria-invalid', 'true');
    });

    it('validates when inputRef is a function', async () => {
      const inputRefSpy = vi.fn(() => () => {});
      const { user } = await render(() => (
        <Form>
          <Field.Root name="test">
            <RadioGroup name="group" required inputRef={inputRefSpy}>
              <Radio.Root value="a" data-testid="item-a" />
              <Radio.Root value="b" data-testid="item-b" />
            </RadioGroup>
            <Field.Error match="valueMissing" data-testid="error">
              required
            </Field.Error>
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>
      ));

      expect(screen.queryByTestId('error')).toBe(null);

      await user.click(screen.getByText('Submit'));

      expect(inputRefSpy.mock.calls.length > 0).toBe(true);
      expect(screen.getByTestId('error')).toHaveTextContent('required');
    });

    it('focuses the first enabled radio when all radios start disabled', async () => {
      const [disabled, setDisabled] = createSignal(true);

      const { user } = await render(() => (
        <Form>
          <Field.Root name="test">
            <RadioGroup name="group" required>
              <Radio.Root value="a" disabled={disabled()} data-testid="item-a" />
              <Radio.Root value="b" disabled={disabled()} data-testid="item-b" />
            </RadioGroup>
          </Field.Root>
          <button type="button" onClick={() => setDisabled(false)}>
            Enable
          </button>
          <button type="submit">Submit</button>
        </Form>
      ));

      await user.click(screen.getByText('Enable'));

      const radioA = screen.getByTestId('item-a');

      await user.click(screen.getByText('Submit'));

      expect(document.activeElement).toBe(radioA);
    });

    it.skipIf(isJSDOM)(
      'validates and focuses the first radio after its ancestor fieldset is enabled',
      async () => {
        const [disabled, setDisabled] = createSignal(true);

        const { user } = await render(() => (
          <Form>
            <fieldset disabled={disabled()}>
              <Field.Root name="test">
                <RadioGroup required>
                  <Radio.Root value="a" data-testid="item-a" />
                  <Radio.Root value="b" />
                </RadioGroup>
                <Field.Error match="valueMissing">required</Field.Error>
              </Field.Root>
            </fieldset>
            <button type="button" onClick={() => setDisabled(false)}>
              Enable
            </button>
            <button type="submit">Submit</button>
          </Form>
        ));

        await user.click(screen.getByText('Enable'));
        await user.click(screen.getByText('Submit'));

        expect(screen.getByText('required')).toBeVisible();
        expect(screen.getByTestId('item-a')).toHaveFocus();
      },
    );

    it('clears external errors on change', async () => {
      await render(() => (
        <Form errors={{ test: 'test' }}>
          <Field.Root name="test" data-testid="field">
            <RadioGroup data-testid="radio-group">
              <Field.Item>
                <Radio.Root value="a" data-testid="item-a" />
              </Field.Item>
              <Field.Item>
                <Radio.Root value="b" data-testid="item-b" />
              </Field.Item>
            </RadioGroup>
            <Field.Error data-testid="error" />
          </Field.Root>
        </Form>
      ));

      const radioGroup = screen.getByTestId('radio-group');

      expect(screen.queryByTestId('error')).toHaveTextContent('test');

      click(screen.getByTestId('item-a'));

      expect(screen.queryByTestId('error')).toBe(null);
      expect(radioGroup).not.toHaveAttribute('aria-invalid', 'true');
    });

    it('appends the id attribute of the error to aria-describedby of individual radios', async () => {
      const { user } = await render(() => (
        <Form>
          <Field.Root name="test" data-testid="field">
            <RadioGroup name="group" required>
              <Field.Item>
                <Radio.Root value="a" />
                <Field.Description>description</Field.Description>
              </Field.Item>
            </RadioGroup>
            <Field.Error match="valueMissing" data-testid="error" />
          </Field.Root>
          <button type="submit">Submit</button>
        </Form>
      ));

      expect(screen.queryByTestId('error')).toBe(null);

      await user.click(screen.getByText('Submit'));

      const error = screen.getByTestId('error');
      const radio = screen.getByRole('radio');
      const description = screen.getByText('description');
      expect(radio.getAttribute('aria-describedby')).toContain(error.getAttribute('id'));
      expect(radio.getAttribute('aria-describedby')).toContain(description.getAttribute('id'));
    });
  });
});
