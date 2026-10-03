import { createSignal, flush } from 'solid-js';
import { Radio } from '..';
import { RadioGroup } from '../../radio-group';
import { Field } from '../../field';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  describeConformance,
} from '#test-utils';

describe('<Radio.Root />', () => {
  describeConformance((props: Record<string, any>) => <Radio.Root value="" {...props} />, {
    refInstanceof: window.HTMLSpanElement,
  });

  it('sets checked and unchecked data attributes', async () => {
    await render(() => (
      <RadioGroup defaultValue="checked">
        <Radio.Root value="checked" data-testid="checked" />
        <Radio.Root value="unchecked" data-testid="unchecked" />
      </RadioGroup>
    ));

    expect(screen.getByTestId('checked')).toHaveAttribute('data-checked');
    expect(screen.getByTestId('checked')).not.toHaveAttribute('data-unchecked');
    expect(screen.getByTestId('unchecked')).toHaveAttribute('data-unchecked');
    expect(screen.getByTestId('unchecked')).not.toHaveAttribute('data-checked');
  });

  it('does not forward `value` prop', async () => {
    await render(() => (
      <RadioGroup>
        <Radio.Root value="test" data-testid="radio-root" />
      </RadioGroup>
    ));

    expect(screen.getByTestId('radio-root')).not.toHaveAttribute('value');
  });

  it('allows `null` value', async () => {
    await render(() => (
      <RadioGroup>
        <Radio.Root value={null} data-testid="radio-null" />
        <Radio.Root value="a" data-testid="radio-a" />
      </RadioGroup>
    ));

    const radioNull = screen.getByTestId('radio-null');
    const radioA = screen.getByTestId('radio-a');
    fireEvent.click(radioNull);
    flush();
    expect(radioNull).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(radioA);
    flush();
    expect(radioNull).toHaveAttribute('aria-checked', 'false');
  });

  it('associates `id` with the native button when `nativeButton=true`', async () => {
    await render(() => (
      <div>
        <label data-testid="label" for="myRadio">
          A
        </label>

        <RadioGroup defaultValue="b">
          {/* Port note: `render={<button />}` → `render="button"` (elements can't be cloned). */}
          <Radio.Root value="a" id="myRadio" nativeButton render="button" data-testid="a" />
          <Radio.Root value="b" data-testid="b" />
        </RadioGroup>
      </div>
    ));

    const radioA = screen.getByTestId('a');
    expect(radioA).toHaveAttribute('id', 'myRadio');

    const hiddenInput = radioA.nextElementSibling as HTMLInputElement | null;
    expect(hiddenInput?.tagName).toBe('INPUT');
    expect(hiddenInput).not.toHaveAttribute('id', 'myRadio');

    expect(radioA).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(screen.getByTestId('label'));
    flush();
    expect(radioA).toHaveAttribute('aria-checked', 'true');
  });

  it('sets `aria-labelledby` from a sibling label associated with the hidden input', async () => {
    await render(() => (
      <div>
        <label for="radio-input">Label</label>
        <RadioGroup>
          <Radio.Root value="a" id="radio-input" />
        </RadioGroup>
      </div>
    ));

    const label = screen.getByText('Label');
    expect(label.id).not.toBe('');
    expect(screen.getByRole('radio')).toHaveAttribute('aria-labelledby', label.id);
  });

  it('updates fallback `aria-labelledby` when the hidden input id changes', async () => {
    const [id, setId] = createSignal('radio-input-a');

    await render(() => (
      <>
        <label for="radio-input-a">Label A</label>
        <label for="radio-input-b">Label B</label>
        <RadioGroup>
          <Radio.Root value="a" id={id()} />
        </RadioGroup>
        <button type="button" onClick={() => setId('radio-input-b')}>
          Toggle
        </button>
      </>
    ));

    const radio = screen.getByRole('radio');
    const labelA = screen.getByText('Label A');

    expect(labelA.id).not.toBe('');
    expect(radio).toHaveAttribute('aria-labelledby', labelA.id);

    fireEvent.click(screen.getByRole('button', { name: 'Toggle' }));

    await waitFor(() => {
      const labelB = screen.getByText('Label B');

      expect(labelB.id).not.toBe('');
      expect(labelA.id).not.toBe(labelB.id);
      expect(radio).toHaveAttribute('aria-labelledby', labelB.id);
    });
  });

  it('prefers `aria-label` over an associated label', async () => {
    await render(() => (
      <RadioGroup>
        <label>
          <Radio.Root value="a" aria-label="Apple" />
          Apple
        </label>
      </RadioGroup>
    ));

    const radio = screen.getByRole('radio');
    expect(radio).not.toHaveAttribute('aria-labelledby');
    expect(radio).toHaveAccessibleName('Apple');
  });

  describe('prop: onClick', () => {
    it('propagates a single click event to ancestors per user click', async () => {
      const handleParentClick = vi.fn();
      await render(() => (
        <RadioGroup>
          <div onClick={handleParentClick}>
            <Radio.Root value="a" data-testid="radio" />
          </div>
        </RadioGroup>
      ));

      fireEvent.click(screen.getByTestId('radio'));
      flush();

      expect(handleParentClick).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('radio')).toHaveAttribute('aria-checked', 'true');
    });

    it('does not propagate to ancestors when stopPropagation() is called', async () => {
      const handleParentClick = vi.fn();
      await render(() => (
        <RadioGroup>
          <div onClick={handleParentClick}>
            <Radio.Root
              value="a"
              data-testid="radio"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </RadioGroup>
      ));

      fireEvent.click(screen.getByTestId('radio'));
      flush();

      expect(handleParentClick).toHaveBeenCalledTimes(0);
      expect(screen.getByTestId('radio')).toHaveAttribute('aria-checked', 'true');
    });

    it('propagates a single click event to ancestors with a native button', async () => {
      const handleParentClick = vi.fn();
      await render(() => (
        <RadioGroup>
          <div onClick={handleParentClick}>
            <Radio.Root value="a" nativeButton render="button" data-testid="radio" />
          </div>
        </RadioGroup>
      ));

      fireEvent.click(screen.getByTestId('radio'));
      flush();

      expect(handleParentClick).toHaveBeenCalledTimes(1);
      expect(screen.getByTestId('radio')).toHaveAttribute('aria-checked', 'true');
    });

    it('does not propagate to ancestors when stopPropagation() is called with a native button', async () => {
      const handleParentClick = vi.fn();
      await render(() => (
        <RadioGroup>
          <div onClick={handleParentClick}>
            <Radio.Root
              value="a"
              nativeButton
              render="button"
              data-testid="radio"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        </RadioGroup>
      ));

      fireEvent.click(screen.getByTestId('radio'));
      flush();

      expect(handleParentClick).toHaveBeenCalledTimes(0);
      expect(screen.getByTestId('radio')).toHaveAttribute('aria-checked', 'true');
    });

    it('does not propagate a click to ancestors when selecting with arrow keys', async () => {
      const handleParentClick = vi.fn();
      const { user } = await render(() => (
        <div onClick={handleParentClick}>
          <RadioGroup defaultValue="a">
            <Radio.Root value="a" data-testid="radio-a" />
            <Radio.Root value="b" data-testid="radio-b" />
          </RadioGroup>
        </div>
      ));

      await user.click(screen.getByTestId('radio-a'));
      handleParentClick.mockClear();

      await user.keyboard('{ArrowDown}');

      expect(screen.getByTestId('radio-b')).toHaveAttribute('aria-checked', 'true');
      expect(handleParentClick).toHaveBeenCalledTimes(0);
    });
  });

  describe('prop: disabled', () => {
    it('uses aria-disabled instead of HTML disabled', async () => {
      await render(() => (
        <RadioGroup>
          <Radio.Root value="a" disabled data-testid="radio" />
        </RadioGroup>
      ));

      const radio = screen.getByTestId('radio');
      expect(radio).not.toHaveAttribute('disabled');
      expect(radio).toHaveAttribute('aria-disabled', 'true');
    });

    it('does not acquire the field focused state when focused programmatically', async () => {
      await render(() => (
        <Field.Root data-testid="field">
          <Radio.Root value="a" disabled data-testid="radio" />
        </Field.Root>
      ));

      const radio = screen.getByTestId('radio');

      radio.focus();
      flush();

      expect(radio).toHaveFocus();
      expect(screen.getByTestId('field')).not.toHaveAttribute('data-focused');
    });
  });

  describe('prop: readOnly', () => {
    it('acquires the field focused state on focus', async () => {
      await render(() => (
        <Field.Root data-testid="field">
          <Radio.Root value="a" readOnly data-testid="radio" />
        </Field.Root>
      ));

      screen.getByTestId('radio').focus();
      flush();

      expect(screen.getByTestId('field')).toHaveAttribute('data-focused', '');
    });
  });
});
