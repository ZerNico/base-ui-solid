import { createSignal, flush, For } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { Combobox } from 'base-ui-solid/combobox';
import { Select } from 'base-ui-solid/select';
import { createRenderer, flushMicrotasks, screen } from '#test-utils';

interface Item {
  value: string;
  ariaDisabled?: boolean | undefined;
}

interface Highlight {
  value: string | undefined;
  index: number;
}

function createHarness(initialItems: readonly Item[]) {
  const [items, setItems] = createSignal<readonly Item[]>(initialItems);
  const [open, setOpen] = createSignal(false);
  const [disabled, setDisabled] = createSignal(false);
  const [value, setValue] = createSignal<string | null>(null);
  const highlights: Highlight[] = [];

  return {
    items,
    setItems,
    open,
    setOpen,
    disabled,
    setDisabled,
    value,
    setValue,
    highlights,
    ui: () => (
      <Combobox.Root
        open={open()}
        onOpenChange={setOpen}
        disabled={disabled()}
        value={value()}
        onValueChange={(next: unknown) => setValue(next as string | null)}
        onItemHighlighted={(itemValue, details) => {
          highlights.push({ value: itemValue as string | undefined, index: details.index });
        }}
      >
        <Combobox.Input data-testid="input" />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                <For each={items()}>
                  {(item) => (
                    <Combobox.Item
                      value={item.value}
                      aria-disabled={item.ariaDisabled ? 'true' : undefined}
                      data-testid={`option-${item.value}`}
                    >
                      {item.value}
                    </Combobox.Item>
                  )}
                </For>
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ),
  };
}

function openPending(input: HTMLElement, key = 'ArrowDown'): void {
  input.focus();
  input.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  flush();
}

async function drainFrames(): Promise<void> {
  flush();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  flush();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
  flush();
  await flushMicrotasks();
  flush();
}

describe('<Combobox.Root /> pending initial navigation (port)', () => {
  const { render } = createRenderer();

  it('N02 disposal of an empty list cancels pending initial work', async () => {
    const harness = createHarness([]);
    const view = await render(harness.ui);

    openPending(screen.getByTestId('input'));
    expect(harness.highlights).toEqual([]);

    view.unmount();
    flush();
    harness.setItems([{ value: 'one' }, { value: 'two' }]);
    await drainFrames();

    expect(harness.highlights).toEqual([]);
  });

  it('N03 disabling pending initial work prevents a stale commit', async () => {
    const harness = createHarness([]);
    await render(harness.ui);

    openPending(screen.getByTestId('input'));
    expect(harness.highlights).toEqual([]);

    harness.setDisabled(true);
    flush();
    harness.setItems([{ value: 'one' }, { value: 'two' }]);
    await drainFrames();

    expect(harness.highlights).toEqual([]);
    expect(screen.getByTestId('option-one')).not.toHaveAttribute('data-highlighted');
  });

  it('N03 enable after disable cannot revive the invalidated attempt', async () => {
    const harness = createHarness([]);
    await render(harness.ui);

    openPending(screen.getByTestId('input'));
    // Let the opening bookkeeping settle, so re-enabling does not start a new opening attempt.
    await flushMicrotasks();
    harness.setDisabled(true);
    flush();
    harness.setDisabled(false);
    flush();
    harness.setItems([{ value: 'one' }, { value: 'two' }]);
    await drainFrames();

    expect(harness.highlights).toEqual([]);
  });

  it('N04 pending work skips an item disabled before the list publishes', async () => {
    const harness = createHarness([]);
    await render(harness.ui);

    openPending(screen.getByTestId('input'));
    harness.setItems([
      { value: 'one', ariaDisabled: true },
      { value: 'two' },
      { value: 'three' },
    ]);
    await drainFrames();

    expect(harness.highlights).toEqual([{ value: 'two', index: 1 }]);
    expect(screen.getByTestId('option-two')).toHaveAttribute('data-highlighted');
  });

  it('N04 replaced list resolves from the list rendered at commit', async () => {
    const harness = createHarness([]);
    await render(harness.ui);

    openPending(screen.getByTestId('input'));
    harness.setItems([{ value: 'one' }, { value: 'two' }]);
    flush();
    harness.setItems([{ value: 'two' }, { value: 'three' }]);
    await drainFrames();

    expect(harness.highlights).toEqual([{ value: 'two', index: 0 }]);
    expect(screen.getByTestId('option-two')).toHaveAttribute('data-highlighted');
  });

  it('N05 every candidate disabled at commit leaves no disabled highlight', async () => {
    const harness = createHarness([]);
    await render(harness.ui);

    openPending(screen.getByTestId('input'));
    harness.setItems([
      { value: 'one', ariaDisabled: true },
      { value: 'two', ariaDisabled: true },
    ]);
    await drainFrames();

    expect(harness.highlights).toEqual([]);
    expect(document.querySelector('[data-highlighted]')).toBeNull();
    expect(screen.getByTestId('input')).not.toHaveAttribute('aria-activedescendant');
  });

  it('N05 reverse opening rejects the reverse boundary sentinel', async () => {
    const harness = createHarness([]);
    await render(harness.ui);

    openPending(screen.getByTestId('input'), 'ArrowUp');
    harness.setItems([
      { value: 'one', ariaDisabled: true },
      { value: 'two', ariaDisabled: true },
    ]);
    await drainFrames();

    expect(harness.highlights).toEqual([]);
    expect(document.querySelector('[data-highlighted]')).toBeNull();
  });

  it('N05 all-disabled list never commits an invalid candidate after another publication', async () => {
    const harness = createHarness([]);
    await render(harness.ui);

    openPending(screen.getByTestId('input'));
    harness.setItems([
      { value: 'one', ariaDisabled: true },
      { value: 'two', ariaDisabled: true },
    ]);
    await drainFrames();
    expect(harness.highlights).toEqual([]);

    harness.setItems([{ value: 'one', ariaDisabled: true }, { value: 'two' }]);
    await drainFrames();

    // The bounded microtask/frame retries may have already given up, but no stale or
    // out-of-bounds candidate may ever be reported.
    expect(harness.highlights.every((highlight) => highlight.index === 1)).toBe(true);
    expect(document.querySelectorAll('[data-highlighted]').length).toBeLessThanOrEqual(1);
  });

  it('N06 closing and reopening commits exactly one current opening highlight', async () => {
    const harness = createHarness([]);
    await render(harness.ui);

    openPending(screen.getByTestId('input'));
    harness.setOpen(false);
    flush();
    openPending(screen.getByTestId('input'));
    harness.setItems([{ value: 'one' }, { value: 'two' }]);
    await drainFrames();

    expect(harness.highlights).toEqual([{ value: 'one', index: 0 }]);
    expect(screen.getByTestId('option-one')).toHaveAttribute('data-highlighted');
  });

  it('N07 selected value set during pending work is preserved', async () => {
    const harness = createHarness([]);
    await render(harness.ui);

    openPending(screen.getByTestId('input'));
    harness.setValue('three');
    flush();
    harness.setItems([{ value: 'one' }, { value: 'two' }, { value: 'three' }]);
    await drainFrames();

    expect(harness.highlights.at(-1)).toEqual({ value: 'three', index: 2 });
    expect(screen.getByTestId('option-three')).toHaveAttribute('data-highlighted');
    expect(screen.getByTestId('option-one')).not.toHaveAttribute('data-highlighted');
  });

  it('N08 replacing the list keeps the existing active item', async () => {
    const harness = createHarness([{ value: 'one' }, { value: 'two' }, { value: 'three' }]);
    await render(harness.ui);

    openPending(screen.getByTestId('input'));
    await drainFrames();
    expect(harness.highlights).toEqual([{ value: 'one', index: 0 }]);

    screen
      .getByTestId('input')
      .dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true, cancelable: true }));
    flush();
    await drainFrames();
    expect(harness.highlights.at(-1)).toEqual({ value: 'two', index: 1 });

    harness.setItems([{ value: 'alpha' }, { value: 'beta' }, { value: 'gamma' }]);
    await drainFrames();

    expect(harness.highlights.at(-1)).toEqual({ value: 'two', index: 1 });
    expect(screen.getByTestId('option-beta')).toHaveAttribute('data-highlighted');
  });
});

describe('<Select.Root /> pending initial navigation (port)', () => {
  const { render } = createRenderer();

  function SelectHarness(props: { items: () => readonly Item[] }) {
    const [open, setOpen] = createSignal(false);
    return (
      <Select.Root open={open()} onOpenChange={setOpen}>
        <Select.Trigger data-testid="trigger">Choose</Select.Trigger>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup>
              <Select.List>
                <For each={props.items()}>
                  {(item) => (
                    <Select.Item
                      value={item.value}
                      aria-disabled={item.ariaDisabled ? 'true' : undefined}
                      data-testid={`select-option-${item.value}`}
                    >
                      {item.value}
                    </Select.Item>
                  )}
                </For>
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    );
  }

  it('listVersion path rejects an all-disabled published list', async () => {
    const [items, setItems] = createSignal<readonly Item[]>([]);
    await render(() => <SelectHarness items={items} />);

    openPending(screen.getByTestId('trigger'));
    setItems([
      { value: 'one', ariaDisabled: true },
      { value: 'two', ariaDisabled: true },
    ]);
    await drainFrames();

    expect(document.querySelector('[data-highlighted]')).toBeNull();
    expect(screen.getByTestId('trigger')).not.toHaveAttribute('aria-activedescendant');
  });

  it('listVersion path highlights a valid item published later', async () => {
    const [items, setItems] = createSignal<readonly Item[]>([]);
    await render(() => <SelectHarness items={items} />);

    openPending(screen.getByTestId('trigger'));
    setItems([
      { value: 'one', ariaDisabled: true },
      { value: 'two', ariaDisabled: true },
    ]);
    await drainFrames();
    expect(document.querySelector('[data-highlighted]')).toBeNull();

    setItems([{ value: 'one', ariaDisabled: true }, { value: 'two' }]);
    await drainFrames();

    expect(screen.getByTestId('select-option-two')).toHaveAttribute('data-highlighted');
    expect(document.querySelectorAll('[data-highlighted]')).toHaveLength(1);
  });
});
