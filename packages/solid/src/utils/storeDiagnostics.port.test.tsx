import { createSignal, flush, For, OBSERVE } from 'solid-js';
import type { DiagnosticCode, DiagnosticEvent } from 'solid-js';
import { attribution } from 'solid-js/attribution';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Dialog } from 'base-ui-solid/dialog';
import { Menu } from 'base-ui-solid/menu';
import { Popover } from 'base-ui-solid/popover';
import { Select } from 'base-ui-solid/select';
import { Tooltip } from 'base-ui-solid/tooltip';
import { createRenderer, flushMicrotasks, screen, waitFor } from '#test-utils';

// Port note: regressions absent upstream. Popups copy their props into the store from effects
// (`useSyncedValue`, `useControlledProp`, ...), like upstream's layout effects, so Solid's dev
// diagnostics report relays through the store (`EFFECT_RELAY_TEAR`, `EFFECT_WRITES_OWN_SOURCE`)
// when attribution is enabled (see PORTING.md, "Known issues"). These tests guard that:
// - the number of findings per code stays at or below the recorded baseline, so a change that
//   adds relays fails. A change that removes some only needs the baseline lowered.
// - the library's own nodes in a finding carry a `BaseUI.` name instead of Solid's anonymous
//   defaults, so users can tell the findings apart from their own code.

type Counts = Partial<Record<DiagnosticCode, number>>;

// Findings (`info` and `warn` events) recorded on 2026-10-06 with Solid 2.0.0-rc.13. The counts were
// identical across runs, in isolation and in jsdom and Chromium. All of them are the known
// upstream-shaped relays: the store's synced props (`useSyncedValues`, `useControlledProp`, ...)
// and the transition status effects reading the store.
const BASELINE = {
  'Popover (controlled open)': { EFFECT_RELAY_TEAR: 6, EFFECT_WRITES_OWN_SOURCE: 1 },
  'Popover (detached handle)': { EFFECT_RELAY_TEAR: 7, EFFECT_WRITES_OWN_SOURCE: 1 },
  'Select (controlled value and open)': { EFFECT_RELAY_TEAR: 3, EFFECT_WRITES_OWN_SOURCE: 1 },
  'Dialog (controlled open)': { EFFECT_RELAY_TEAR: 4, EFFECT_WRITES_OWN_SOURCE: 1 },
  'Menu (controlled open)': { EFFECT_RELAY_TEAR: 6, EFFECT_WRITES_OWN_SOURCE: 1 },
  'Tooltip (controlled open)': { EFFECT_RELAY_TEAR: 4, EFFECT_WRITES_OWN_SOURCE: 1 },
} satisfies Record<string, Counts>;

// Solid's labels for unnamed nodes.
const ANONYMOUS_NAMES = new Set(['signal', 'computed', 'effect', 'trackedEffect', 'memo']);

/** The names of the reactive nodes that relayed or wrote, as reported by the finding. */
function getRelayNames(event: DiagnosticEvent): string[] {
  const data = (event.data ?? {}) as {
    root?: unknown;
    relay?: unknown;
    wrote?: unknown;
    effects?: unknown;
    writes?: unknown;
  };
  const names: unknown[] = [data.root, data.relay, data.wrote];
  if (Array.isArray(data.effects)) {
    names.push(...data.effects);
  }
  if (Array.isArray(data.writes)) {
    for (const write of data.writes as { effect?: unknown; name?: unknown }[]) {
      names.push(write.effect, write.name);
    }
  }
  return names.filter((name): name is string => typeof name === 'string');
}

describe('store diagnostics (port)', () => {
  const { render } = createRenderer();

  let stopCapture: (() => void) | undefined;

  afterEach(() => {
    stopCapture?.();
    stopCapture = undefined;
  });

  function captureDiagnostics() {
    const events: DiagnosticEvent[] = [];
    // The time-based checks (`HOT_SCOPE_*`, `WASTED_RECOMPUTE`) depend on the machine's load, so
    // they're off: the counts only cover structural findings.
    const release = attribution.enable({
      log: false,
      hotRuns: false,
      hotTime: false,
      wastedRecompute: false,
    });
    const unsubscribe = OBSERVE!.diagnostics.subscribe((event) => {
      events.push(event);
    });
    // The findings are asserted on, so keep their console reports out of the test output.
    const consoleWarn = console.warn;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
      if (typeof args[0] !== 'string' || !/^\[[A-Z_]+\] /.test(args[0])) {
        consoleWarn(...args);
      }
    });
    stopCapture = () => {
      warnSpy.mockRestore();
      unsubscribe();
      release();
    };
    return events;
  }

  function countByCode(events: DiagnosticEvent[]) {
    const counts: Counts = {};
    for (const event of events) {
      counts[event.code] = (counts[event.code] ?? 0) + 1;
    }
    return counts;
  }

  function expectWithinBaseline(events: DiagnosticEvent[], baseline: Counts) {
    const counts = countByCode(events);
    for (const code of Object.keys(counts) as DiagnosticCode[]) {
      expect({ code, count: counts[code] }).toEqual({
        code,
        count: Math.min(counts[code]!, baseline[code] ?? 0),
      });
    }
  }

  function expectNamedLibraryNodes(events: DiagnosticEvent[]) {
    for (const event of events) {
      const names = getRelayNames(event);
      // None of the nodes that relayed or wrote is anonymous...
      expect({
        code: event.code,
        anonymous: names.filter((name) => ANONYMOUS_NAMES.has(name)),
      }).toEqual({ code: event.code, anonymous: [] });
      // ...and the store's nodes carry its `BaseUI.Store(<name>)` label.
      const storeNames = names.filter((name) => /store|track/i.test(name));
      expect(storeNames.every((name) => name.startsWith('BaseUI.Store'))).toBe(true);
    }
  }

  async function settle() {
    flush();
    await flushMicrotasks();
  }

  /** Opens and closes the popup (`data-testid="popup"`) three times, settling each step. */
  async function toggleOpen(setOpen: (open: boolean) => void) {
    for (let i = 0; i < 3; i += 1) {
      setOpen(true);
      // Each step has to settle before the next one.
      // eslint-disable-next-line no-await-in-loop
      await settle();
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByTestId('popup')).toBeVisible());
      setOpen(false);
      // eslint-disable-next-line no-await-in-loop
      await settle();
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.queryByTestId('popup')).toBe(null));
    }
  }

  it('Popover (controlled open)', async () => {
    const events = captureDiagnostics();
    const [open, setOpen] = createSignal(false);

    await render(() => (
      <Popover.Root open={open()} onOpenChange={setOpen}>
        <Popover.Trigger>Toggle</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup data-testid="popup">Content</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    await toggleOpen(setOpen);

    expectWithinBaseline(events, BASELINE['Popover (controlled open)']);
    expectNamedLibraryNodes(events);
  });

  it('Popover (detached handle)', async () => {
    const events = captureDiagnostics();
    const handle = Popover.createHandle();

    await render(() => (
      <div>
        <Popover.Trigger handle={handle} id="trigger-1">
          One
        </Popover.Trigger>
        <Popover.Trigger handle={handle} id="trigger-2">
          Two
        </Popover.Trigger>
        <Popover.Root handle={handle}>
          <Popover.Portal>
            <Popover.Positioner>
              <Popover.Popup data-testid="popup">Content</Popover.Popup>
            </Popover.Positioner>
          </Popover.Portal>
        </Popover.Root>
      </div>
    ));

    for (const triggerId of ['trigger-1', 'trigger-2', 'trigger-1']) {
      handle.open(triggerId);
      // eslint-disable-next-line no-await-in-loop
      await settle();
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByTestId('popup')).toBeVisible());
    }
    handle.close();
    await settle();
    await waitFor(() => expect(screen.queryByTestId('popup')).toBe(null));

    expectWithinBaseline(events, BASELINE['Popover (detached handle)']);
    expectNamedLibraryNodes(events);
  });

  it('Select (controlled value and open)', async () => {
    const events = captureDiagnostics();
    const [value, setValue] = createSignal('a');
    const [open, setOpen] = createSignal(false);

    await render(() => (
      <Select.Root value={value()} onValueChange={setValue} open={open()} onOpenChange={setOpen}>
        <Select.Trigger>
          <Select.Value data-testid="value" />
        </Select.Trigger>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup>
              <For each={['a', 'b', 'c']}>
                {(item) => (
                  <Select.Item value={item}>
                    <Select.ItemText>{item}</Select.ItemText>
                  </Select.Item>
                )}
              </For>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    ));

    setOpen(true);
    await settle();
    await waitFor(() => expect(screen.getByRole('listbox')).toBeVisible());
    for (const nextValue of ['b', 'c', 'a']) {
      setValue(nextValue);
      // eslint-disable-next-line no-await-in-loop
      await settle();
      expect(screen.getByTestId('value')).toHaveTextContent(nextValue);
    }
    setOpen(false);
    await settle();
    await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null));
    setValue('b');
    await settle();
    expect(screen.getByTestId('value')).toHaveTextContent('b');

    expectWithinBaseline(events, BASELINE['Select (controlled value and open)']);
    expectNamedLibraryNodes(events);
  });

  it('Dialog (controlled open)', async () => {
    const events = captureDiagnostics();
    const [open, setOpen] = createSignal(false);

    await render(() => (
      <Dialog.Root open={open()} onOpenChange={setOpen}>
        <Dialog.Trigger>Open</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop />
          <Dialog.Popup data-testid="popup">
            <Dialog.Title>Title</Dialog.Title>
            <Dialog.Close>Close</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    ));

    await toggleOpen(setOpen);

    expectWithinBaseline(events, BASELINE['Dialog (controlled open)']);
    expectNamedLibraryNodes(events);
  });

  it('Menu (controlled open)', async () => {
    const events = captureDiagnostics();
    const [open, setOpen] = createSignal(false);

    await render(() => (
      <Menu.Root open={open()} onOpenChange={setOpen}>
        <Menu.Trigger>Toggle</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup data-testid="popup">
              <Menu.Item>one</Menu.Item>
              <Menu.Item>two</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    await toggleOpen(setOpen);

    expectWithinBaseline(events, BASELINE['Menu (controlled open)']);
    expectNamedLibraryNodes(events);
  });

  it('Tooltip (controlled open)', async () => {
    const events = captureDiagnostics();
    const [open, setOpen] = createSignal(false);

    await render(() => (
      <Tooltip.Provider>
        <Tooltip.Root open={open()} onOpenChange={setOpen}>
          <Tooltip.Trigger>Hover</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup data-testid="popup">Tip</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      </Tooltip.Provider>
    ));

    await toggleOpen(setOpen);

    expectWithinBaseline(events, BASELINE['Tooltip (controlled open)']);
    expectNamedLibraryNodes(events);
  });
});
