import { expect, vi, describe, it } from 'vitest';
import { createSignal, flush, Show, untrack } from 'solid-js';
import { Select } from 'base-ui-solid/select';
import { describeConformance, render, screen } from '#test-utils';

describe('<Select.GroupLabel />', () => {
  describeConformance(Select.GroupLabel, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <Select.Root open>
        <Select.Group>{node()}</Select.Group>
      </Select.Root>
    ),
  });

  it('is hidden from the accessibility tree by default', async () => {
    await render(() => (
      <Select.Root open>
        <Select.Group>
          <Select.GroupLabel>Fruits</Select.GroupLabel>
        </Select.Group>
      </Select.Root>
    ));

    expect(screen.getByText('Fruits')).toHaveAttribute('aria-hidden', 'true');
  });

  it('allows overriding aria-hidden', async () => {
    await render(() => (
      <Select.Root open>
        <Select.Group>
          <Select.GroupLabel aria-hidden={undefined}>Fruits</Select.GroupLabel>
        </Select.Group>
      </Select.Root>
    ));

    expect(screen.getByText('Fruits')).not.toHaveAttribute('aria-hidden');
  });

  it('throws a descriptive error when rendered outside <Select.Group>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Port note: this intentional render failure emits Solid's REACTIVITY_HALTED repair hint.
    const originalWarn = console.warn;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      if (!String(args[0]).includes('[REACTIVITY_HALTED]')) {
        originalWarn(...args);
      }
    });
    // Port note: Solid may report the error that `render` rejects with once more as an uncaught
    // error (through `window`'s `error` event). Swallow that duplicate report only.
    const handleWindowError = (event: ErrorEvent) => {
      if (event.message.includes('SelectGroupContext is missing')) {
        event.preventDefault();
      }
    };
    window.addEventListener('error', handleWindowError);

    try {
      await expect(
        render(() => (
          <Select.Root open>
            <Select.GroupLabel />
          </Select.Root>
        )),
      ).rejects.toThrow(
        'Base UI: SelectGroupContext is missing. SelectGroup parts must be placed within <Select.Group>.',
      );
      await new Promise((resolve) => {
        setTimeout(resolve);
      });
    } finally {
      window.removeEventListener('error', handleWindowError);
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    }
  });

  it('removes the group aria-labelledby attribute when unmounted', async () => {
    const [labelMounted, setLabelMounted] = createSignal(true);

    await render(() => (
      <Select.Root open>
        <Select.Group>
          <Show when={labelMounted()}>
            <Select.GroupLabel id="group-label">Fruits</Select.GroupLabel>
          </Show>
        </Select.Group>
      </Select.Root>
    ));

    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-labelledby', 'group-label');

    setLabelMounted(false);
    flush();

    expect(screen.queryByText('Fruits')).toBe(null);
    expect(group).not.toHaveAttribute('aria-labelledby');
  });

  it('does not let an older label cleanup clear a newer label', async () => {
    const [labels, setLabels] = createSignal<'old' | 'both' | 'new'>('old');

    await render(() => (
      <Select.Root open>
        <Select.Group>
          <Show when={labels() !== 'new'}>
            <Select.GroupLabel id="old-label">Old</Select.GroupLabel>
          </Show>
          <Show when={labels() !== 'old'}>
            <Select.GroupLabel id="new-label">New</Select.GroupLabel>
          </Show>
        </Select.Group>
      </Select.Root>
    ));

    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-labelledby', 'old-label');

    setLabels('both');
    flush();
    expect(group).toHaveAttribute('aria-labelledby', 'new-label');

    setLabels('new');
    flush();
    expect(group).toHaveAttribute('aria-labelledby', 'new-label');
  });

  it('updates explicit and generated ids independently of ref churn', async () => {
    const firstRef = vi.fn();
    const secondRef = vi.fn();
    const [id, setId] = createSignal<string | undefined>(undefined);
    const [labelRef, setLabelRef] = createSignal<{ ref: (element: HTMLDivElement) => void }>({
      ref: firstRef,
    });

    // Port note: Solid applies the `ref` prop once, when the element is created, and doesn't call
    // refs with `null`. Changing `ref` afterwards therefore isn't observable, so the ref
    // assertions check Solid's semantics (the first ref received the label, the later one is never
    // called) while the ids are asserted like upstream.
    await render(() => (
      <Select.Root open>
        <Select.Group>
          <Select.GroupLabel id={id()} ref={untrack(labelRef).ref}>
            Fruits
          </Select.GroupLabel>
        </Select.Group>
      </Select.Root>
    ));

    const group = screen.getByRole('group');
    const label = screen.getByText('Fruits');
    const generatedId = label.id;
    expect(group).toHaveAttribute('aria-labelledby', generatedId);

    setId('custom-label');
    setLabelRef({ ref: secondRef });
    flush();
    expect(group).toHaveAttribute('aria-labelledby', 'custom-label');
    expect(firstRef).toHaveBeenLastCalledWith(label);
    expect(secondRef).not.toHaveBeenCalled();

    setId(undefined);
    flush();
    expect(group).toHaveAttribute('aria-labelledby', generatedId);
  });

  it('replaces and unregisters its label in Strict Mode', async () => {
    // Port note: there's no StrictMode in Solid; the replace/unregister sequence still applies.
    const [labelId, setLabelId] = createSignal<string | undefined>('first-label');

    await render(() => (
      <Select.Root open>
        <Select.Group>
          <Show when={labelId()} keyed>
            {(currentLabelId) => (
              <Select.GroupLabel id={currentLabelId}>{currentLabelId}</Select.GroupLabel>
            )}
          </Show>
        </Select.Group>
      </Select.Root>
    ));

    const group = screen.getByRole('group');
    expect(group).toHaveAttribute('aria-labelledby', 'first-label');

    setLabelId('second-label');
    flush();
    expect(group).toHaveAttribute('aria-labelledby', 'second-label');

    setLabelId(undefined);
    flush();
    expect(group).not.toHaveAttribute('aria-labelledby');
  });
});
