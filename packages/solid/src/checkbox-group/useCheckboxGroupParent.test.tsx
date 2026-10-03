import { expect, describe, it } from 'vitest';
import { createSignal, Show } from 'solid-js';
import { fireEvent, flushMicrotasks, render, screen } from '#test-utils';
import { CheckboxGroup } from '.';
import { Checkbox } from '../checkbox';

async function click(element: HTMLElement) {
  fireEvent.click(element);
  await flushMicrotasks();
}

describe('useCheckboxGroupParent', () => {
  const allValues = ['a', 'b', 'c'];

  it('should control child checkboxes', async () => {
    const parentCheckedChange = vi.fn();
    const childCheckedChange = vi.fn();
    function App() {
      const [value, setValue] = createSignal<string[]>([]);
      return (
        <CheckboxGroup value={value()} onValueChange={setValue} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" onCheckedChange={parentCheckedChange} />
          <Checkbox.Root value="a" />
          <Checkbox.Root value="b" onCheckedChange={childCheckedChange} />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    }

    await render(() => <App />);

    const checkboxes = screen
      .getAllByRole('checkbox')
      .filter((v) => v.getAttribute('data-parent') == null);
    const parent = screen.getByTestId('parent');

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    await click(parent);
    expect(parent).toHaveAttribute('aria-checked', 'true');

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'true');
    });

    expect(parentCheckedChange.mock.calls.length).toBe(1);
    expect(childCheckedChange.mock.calls.length).toBe(0);

    await click(parent);
    expect(parent).toHaveAttribute('aria-checked', 'false');

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    expect(parentCheckedChange.mock.calls.length).toBe(2);
    expect(childCheckedChange.mock.calls.length).toBe(0);
  });

  it('parent should be marked as mixed if some children are checked', async () => {
    const childCheckedChange = vi.fn();
    function App() {
      const [value, setValue] = createSignal<string[]>([]);
      return (
        <CheckboxGroup value={value()} onValueChange={setValue} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" onCheckedChange={childCheckedChange} />
          <Checkbox.Root value="b" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    }

    await render(() => <App />);

    const checkboxes = screen
      .getAllByRole('checkbox')
      .filter((v) => v.getAttribute('data-parent') == null);

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });
    await click(checkboxes[0]);
    expect(childCheckedChange.mock.calls.length).toBe(1);

    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'mixed');
  });

  it('updates uncontrolled parent-enabled groups from child clicks without duplicate callbacks', async () => {
    const handleValueChange = vi.fn();

    await render(() => (
      <CheckboxGroup allValues={allValues} onValueChange={handleValueChange}>
        <Checkbox.Root parent data-testid="parent" />
        <Checkbox.Root value="a" data-testid="checkboxA" />
        <Checkbox.Root value="b" data-testid="checkboxB" />
        <Checkbox.Root value="c" data-testid="checkboxC" />
      </CheckboxGroup>
    ));

    const parent = screen.getByTestId('parent');
    const checkboxA = screen.getByTestId('checkboxA');
    const checkboxB = screen.getByTestId('checkboxB');
    const checkboxC = screen.getByTestId('checkboxC');

    await click(checkboxA);

    expect(handleValueChange.mock.calls.length).toBe(1);
    expect(handleValueChange.mock.calls[0][0]).toEqual(['a']);
    expect(parent).toHaveAttribute('aria-checked', 'mixed');
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    expect(checkboxB).toHaveAttribute('aria-checked', 'false');

    await click(parent);

    expect(handleValueChange.mock.calls.length).toBe(2);
    expect(handleValueChange.mock.calls[1][0]).toEqual(['a', 'b', 'c']);
    expect(parent).toHaveAttribute('aria-checked', 'true');
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    expect(checkboxB).toHaveAttribute('aria-checked', 'true');
    expect(checkboxC).toHaveAttribute('aria-checked', 'true');

    await click(parent);

    expect(handleValueChange.mock.calls.length).toBe(3);
    expect(handleValueChange.mock.calls[2][0]).toEqual([]);
    expect(parent).toHaveAttribute('aria-checked', 'false');
    expect(checkboxA).toHaveAttribute('aria-checked', 'false');
    expect(checkboxB).toHaveAttribute('aria-checked', 'false');
    expect(checkboxC).toHaveAttribute('aria-checked', 'false');
  });

  it('should correctly initialize the values array', async () => {
    function App() {
      const [value, setValue] = createSignal<string[]>(['a']);
      return (
        <CheckboxGroup value={value()} onValueChange={setValue} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="checkboxA" />
          <Checkbox.Root value="b" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    }

    await render(() => <App />);

    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'mixed');

    expect(screen.getByTestId('checkboxA')).toHaveAttribute('aria-checked', 'true');
  });

  it('should update the values array when a child checkbox is clicked', async () => {
    function App() {
      const [value, setValue] = createSignal<string[]>(['a']);
      return (
        <CheckboxGroup value={value()} onValueChange={setValue} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="checkboxA" />
          <Checkbox.Root value="b" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    }

    await render(() => <App />);

    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'mixed');

    const checkboxes = screen
      .getAllByRole('checkbox')
      .filter((v) => v.getAttribute('data-parent') == null);

    const checkboxA = screen.getByTestId('checkboxA');
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');

    for (const checkbox of checkboxes) {
      if (checkbox !== checkboxA) {
        // eslint-disable-next-line no-await-in-loop
        await click(checkbox);
      }
    }

    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'true');
  });

  it('should apply space-separated aria-controls attribute with child names', async () => {
    function App() {
      const [value, setValue] = createSignal<string[]>([]);
      return (
        <CheckboxGroup value={value()} onValueChange={setValue} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          {allValues.map((v) => (
            <Checkbox.Root value={v} data-testid={v} />
          ))}
        </CheckboxGroup>
      );
    }

    await render(() => <App />);

    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      allValues.map((v) => screen.getByTestId(v).id).join(' '),
    );
  });

  it('keeps a custom child id in aria-controls', async () => {
    await render(() => (
      <CheckboxGroup allValues={['a']}>
        <Checkbox.Root parent data-testid="parent" nativeButton render="button" />
        <Checkbox.Root id="custom" value="a" data-testid="a" nativeButton render="button" />
      </CheckboxGroup>
    ));

    expect(screen.getByTestId('a')).toHaveAttribute('id', 'custom');
    expect(screen.getByTestId('parent')).toHaveAttribute('aria-controls', 'custom');
  });

  it.each([false, true])(
    'keeps a rendered child id in aria-controls (nativeButton=%s)',
    async (nativeButton) => {
      await render(() => (
        <CheckboxGroup allValues={['a']}>
          <Checkbox.Root
            parent
            data-testid="parent"
            nativeButton={nativeButton}
            render={nativeButton ? 'button' : undefined}
          />
          <Checkbox.Root
            value="a"
            nativeButton={nativeButton}
            // Port note: upstream's `render={<button id="rendered" />}` element props win over
            // the component's, so the explicit `id` is spread last.
            render={(props) =>
              nativeButton ? (
                <button {...(props as any)} id="rendered" />
              ) : (
                <span {...(props as any)} id="rendered" />
              )
            }
          />
        </CheckboxGroup>
      ));

      expect(screen.getByTestId('parent')).toHaveAttribute('aria-controls', 'rendered');
    },
  );

  it('references the exposed child rather than its custom-id input without nativeButton', async () => {
    await render(() => (
      <CheckboxGroup allValues={['a']}>
        <Checkbox.Root parent data-testid="parent" />
        <Checkbox.Root id="custom" value="a" data-testid="a" />
      </CheckboxGroup>
    ));

    // The custom `id` lands on the hidden input, so `aria-controls` has to name the exposed
    // element instead.
    expect(document.querySelector('input[type="checkbox"][id="custom"]')).not.toBe(null);
    expect(screen.getByTestId('a').id).not.toBe('custom');
    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      screen.getByTestId('a').id,
    );
  });

  it('does not read aria-controls ids off Object.prototype', async () => {
    await render(() => (
      <CheckboxGroup allValues={['a', 'constructor']}>
        <Checkbox.Root parent data-testid="parent" />
        <Checkbox.Root value="a" data-testid="a" />
      </CheckboxGroup>
    ));

    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      screen.getByTestId('a').id,
    );
  });

  it('drops an unmounted child from aria-controls', async () => {
    const [showB, setShowB] = createSignal(true);

    await render(() => (
      <CheckboxGroup allValues={allValues}>
        <Checkbox.Root parent data-testid="parent" />
        <Checkbox.Root value="a" data-testid="a" />
        <Show when={showB()}>
          <Checkbox.Root value="b" data-testid="b" />
        </Show>
      </CheckboxGroup>
    ));

    setShowB(false);
    await flushMicrotasks();

    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      screen.getByTestId('a').id,
    );
  });

  it('keeps both ids for checkboxes sharing a value and retains the survivor', async () => {
    const [showSecondB, setShowSecondB] = createSignal(true);

    await render(() => (
      <CheckboxGroup allValues={allValues}>
        <Checkbox.Root parent data-testid="parent" />
        <Checkbox.Root value="a" data-testid="a" />
        <Checkbox.Root value="b" data-testid="b" />
        <Show when={showSecondB()}>
          <Checkbox.Root value="b" data-testid="second-b" />
        </Show>
      </CheckboxGroup>
    ));

    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      `${screen.getByTestId('a').id} ${screen.getByTestId('b').id} ${screen.getByTestId('second-b').id}`,
    );

    setShowSecondB(false);
    await flushMicrotasks();

    expect(screen.getByTestId('parent')).toHaveAttribute(
      'aria-controls',
      `${screen.getByTestId('a').id} ${screen.getByTestId('b').id}`,
    );
  });

  it('does not select a child without an identifying value', async () => {
    await render(() => (
      <CheckboxGroup allValues={['a']}>
        <Checkbox.Root parent data-testid="parent" />
        <Checkbox.Root id="standalone" data-testid="no-value" />
        <Checkbox.Root value="a" data-testid="checkbox-a" />
      </CheckboxGroup>
    ));

    const parent = screen.getByTestId('parent');
    const noValue = screen.getByTestId('no-value');
    const checkboxA = screen.getByTestId('checkbox-a');

    await click(parent);

    expect(parent).toHaveAttribute('aria-checked', 'true');
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    expect(noValue).toHaveAttribute('aria-checked', 'false');
    expect(noValue.nextElementSibling).toHaveAttribute('id', 'standalone');
  });

  it('preserves initial state if mixed when parent is clicked', async () => {
    function App() {
      const [value, setValue] = createSignal<string[]>([]);
      return (
        <CheckboxGroup value={value()} onValueChange={setValue} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="checkboxA" />
          <Checkbox.Root value="b" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    }

    await render(() => <App />);

    const checkboxes = screen
      .getAllByRole('checkbox')
      .filter((v) => v.getAttribute('data-parent') == null);
    const checkboxA = screen.getByTestId('checkboxA');
    const parent = screen.getByTestId('parent');

    await click(checkboxA);

    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'mixed');

    await click(parent);

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'true');
    });

    await click(parent);

    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
    });

    await click(parent);

    expect(parent).toHaveAttribute('aria-checked', 'mixed');
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    checkboxes.forEach((checkbox) => {
      expect(checkbox).toHaveAttribute('aria-checked', checkbox === checkboxA ? 'true' : 'false');
    });
  });

  it('lets a parent checkbox cancel a parent-enabled group change', async () => {
    const handleValueChange = vi.fn();
    const handleParentChange = vi.fn((_, eventDetails: Checkbox.Root.ChangeEventDetails) => {
      eventDetails.cancel();
    });

    await render(() => (
      <CheckboxGroup allValues={allValues} onValueChange={handleValueChange}>
        <Checkbox.Root parent data-testid="parent" onCheckedChange={handleParentChange} />
        <Checkbox.Root value="a" data-testid="checkboxA" />
        <Checkbox.Root value="b" data-testid="checkboxB" />
        <Checkbox.Root value="c" data-testid="checkboxC" />
      </CheckboxGroup>
    ));

    await click(screen.getByTestId('parent'));

    expect(handleParentChange.mock.calls.length).toBe(1);
    expect(handleValueChange.mock.calls.length).toBe(0);
    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('checkboxA')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('checkboxB')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('checkboxC')).toHaveAttribute('aria-checked', 'false');
  });

  it('lets a child checkbox cancel a parent-enabled group change', async () => {
    const handleValueChange = vi.fn();
    const handleChildChange = vi.fn((_, eventDetails: Checkbox.Root.ChangeEventDetails) => {
      eventDetails.cancel();
    });

    await render(() => (
      <CheckboxGroup allValues={allValues} onValueChange={handleValueChange}>
        <Checkbox.Root parent data-testid="parent" />
        <Checkbox.Root value="a" data-testid="checkboxA" onCheckedChange={handleChildChange} />
        <Checkbox.Root value="b" />
        <Checkbox.Root value="c" />
      </CheckboxGroup>
    ));

    await click(screen.getByTestId('checkboxA'));

    expect(handleChildChange.mock.calls.length).toBe(1);
    expect(handleValueChange.mock.calls.length).toBe(0);
    expect(screen.getByTestId('parent')).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByTestId('checkboxA')).toHaveAttribute('aria-checked', 'false');
  });

  it('does not advance the parent toggle cycle when the group cancels a parent change', async () => {
    const handleValueChange = vi.fn((_, eventDetails: CheckboxGroup.ChangeEventDetails) => {
      eventDetails.cancel();
    });

    await render(() => (
      <CheckboxGroup value={['a']} allValues={allValues} onValueChange={handleValueChange}>
        <Checkbox.Root parent data-testid="parent" />
        <Checkbox.Root value="a" />
        <Checkbox.Root value="b" />
        <Checkbox.Root value="c" />
      </CheckboxGroup>
    ));

    const parent = screen.getByTestId('parent');

    // From a mixed state the parent attempts to check all. The group cancels, so
    // the internal status must not advance to 'on'.
    await click(parent);
    // A second click must retry the same 'mixed -> on' transition instead of
    // skipping ahead to 'on -> off' and proposing an empty value.
    await click(parent);

    expect(handleValueChange).toHaveBeenCalledTimes(2);
    expect(handleValueChange.mock.calls[0][0]).toEqual(allValues);
    expect(handleValueChange.mock.calls[1][0]).toEqual(allValues);
  });

  it('does not pollute the parent snapshot when the group cancels a child change', async () => {
    const handleValueChange = vi.fn((_, eventDetails: CheckboxGroup.ChangeEventDetails) => {
      eventDetails.cancel();
    });

    await render(() => (
      <CheckboxGroup value={allValues} allValues={allValues} onValueChange={handleValueChange}>
        <Checkbox.Root parent data-testid="parent" />
        <Checkbox.Root value="a" data-testid="checkboxA" />
        <Checkbox.Root value="b" />
        <Checkbox.Root value="c" />
      </CheckboxGroup>
    ));

    // Unchecking a child is canceled, so the parent's snapshot of checked
    // children must stay intact.
    await click(screen.getByTestId('checkboxA'));
    // The parent still sees an all-checked group and toggles to none. A polluted
    // snapshot would make it propose checking everything again.
    await click(screen.getByTestId('parent'));

    expect(handleValueChange).toHaveBeenCalledTimes(2);
    expect(handleValueChange.mock.calls[0][0]).toEqual(['b', 'c']);
    expect(handleValueChange.mock.calls[1][0]).toEqual([]);
  });

  it('handles unchecked disabled checkboxes', async () => {
    function App() {
      const [value, setValue] = createSignal<string[]>([]);
      return (
        <CheckboxGroup value={value()} onValueChange={setValue} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" disabled data-testid="checkboxA" />
          <Checkbox.Root value="b" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    }

    await render(() => <App />);

    const parent = screen.getByTestId('parent');
    await click(parent);

    expect(parent).toHaveAttribute('aria-checked', 'mixed');
    expect(screen.getByTestId('checkboxA')).toHaveAttribute('aria-checked', 'false');
  });

  it('handles checked disabled checkboxes', async () => {
    function App() {
      const [value, setValue] = createSignal<string[]>(['a']);
      return (
        <CheckboxGroup value={value()} onValueChange={setValue} allValues={allValues}>
          <Checkbox.Root parent data-testid="parent" />
          <Checkbox.Root value="a" data-testid="checkboxA" disabled />
          <Checkbox.Root value="b" data-testid="checkboxB" />
          <Checkbox.Root value="c" />
        </CheckboxGroup>
      );
    }

    await render(() => <App />);

    const checkboxA = screen.getByTestId('checkboxA');
    const checkboxB = screen.getByTestId('checkboxB');
    const parent = screen.getByTestId('parent');

    await click(parent);
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    expect(checkboxB).toHaveAttribute('aria-checked', 'true');

    await click(parent);
    expect(checkboxA).toHaveAttribute('aria-checked', 'true');
    expect(checkboxB).toHaveAttribute('aria-checked', 'false');
  });
});
