import { createSignal, flush, For, OBSERVE } from 'solid-js';
import type { DiagnosticCode, DiagnosticEvent } from 'solid-js';
import { attribution } from 'solid-js/attribution';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isJSDOM } from '@base-ui-solid/utils/testUtils';
import { ContextMenu } from 'base-ui-solid/context-menu';
import { Dialog } from 'base-ui-solid/dialog';
import { Menu } from 'base-ui-solid/menu';
import { Popover } from 'base-ui-solid/popover';
import { Select } from 'base-ui-solid/select';
import { Tooltip } from 'base-ui-solid/tooltip';
import { createRenderer, flushMicrotasks, screen, waitFor } from '#test-utils';

// Port note: regressions absent upstream. Solid's dev diagnostics report effects that relay
// state (`EFFECT_RELAY_TEAR`, `EFFECT_WRITES_OWN_SOURCE`) when attribution is enabled. The popups
// derive their store state instead of copying it from effects (see PORTING.md, "Store"), so with
// animations enabled, as in an app, opening and closing them reports nothing. These tests guard
// that:
// - the number of findings per code stays at or below the recorded baseline, so a change that
//   adds relays fails. A change that removes some only needs the baseline lowered.
// - the library's own nodes in a finding carry a `BaseUI.` name instead of Solid's anonymous
//   defaults, so users can tell the findings apart from their own code.

type Counts = Partial<Record<DiagnosticCode, number>>;

type Scenario =
  | 'Popover (controlled open)'
  | 'Popover (detached handle)'
  | 'Select (controlled value and open)'
  | 'Dialog (controlled open)'
  | 'Menu (controlled open)'
  | 'Tooltip (controlled open)'
  | 'ContextMenu (right-click)';

// With animations disabled (the test default), the close completes synchronously inside the
// effect that waits for the exit animation, so the closing writes are reported as relays. Apps
// never take that path: without animations, the completion still waits for a frame.
const BASELINE_ANIMATIONS_DISABLED = {
  'Popover (controlled open)': { EFFECT_RELAY_TEAR: 4, EFFECT_WRITES_OWN_SOURCE: 1 },
  'Popover (detached handle)': { EFFECT_RELAY_TEAR: 5, EFFECT_WRITES_OWN_SOURCE: 1 },
  'Select (controlled value and open)': { EFFECT_RELAY_TEAR: 4, EFFECT_WRITES_OWN_SOURCE: 1 },
  'Dialog (controlled open)': { EFFECT_RELAY_TEAR: 4, EFFECT_WRITES_OWN_SOURCE: 1 },
  'Menu (controlled open)': { EFFECT_RELAY_TEAR: 4, EFFECT_WRITES_OWN_SOURCE: 1 },
  'Tooltip (controlled open)': { EFFECT_RELAY_TEAR: 4, EFFECT_WRITES_OWN_SOURCE: 1 },
  // Not measured (see the scenario).
  'ContextMenu (right-click)': {},
} satisfies Record<Scenario, Counts>;

// Chromium with animations enabled: the app conditions.
const BASELINE_ANIMATIONS_ENABLED = {
  'Popover (controlled open)': {},
  'Popover (detached handle)': {},
  'Select (controlled value and open)': {},
  'Dialog (controlled open)': {},
  'Menu (controlled open)': {},
  'Tooltip (controlled open)': {},
  'ContextMenu (right-click)': {},
} satisfies Record<Scenario, Counts>;

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

describe.each([
  { animations: 'disabled', baseline: BASELINE_ANIMATIONS_DISABLED as Record<Scenario, Counts> },
  { animations: 'enabled', baseline: BASELINE_ANIMATIONS_ENABLED as Record<Scenario, Counts> },
])('store diagnostics (port), animations $animations', ({ animations, baseline }) => {
  const { render } = createRenderer();

  // Animations can only run in a browser.
  const skip = animations === 'enabled' && isJSDOM;

  beforeEach(() => {
    if (animations === 'enabled') {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
    }
  });

  let stopCapture: (() => void) | undefined;

  afterEach(() => {
    stopCapture?.();
    stopCapture = undefined;
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
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

  it.skipIf(skip)('Popover (controlled open)', async () => {
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

    expectWithinBaseline(events, baseline['Popover (controlled open)']);
    expectNamedLibraryNodes(events);
  });

  it.skipIf(skip)('Popover (detached handle)', async () => {
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

    expectWithinBaseline(events, baseline['Popover (detached handle)']);
    expectNamedLibraryNodes(events);
  });

  it.skipIf(skip)('Select (controlled value and open)', async () => {
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

    expectWithinBaseline(events, baseline['Select (controlled value and open)']);
    expectNamedLibraryNodes(events);
  });

  it.skipIf(skip)('Dialog (controlled open)', async () => {
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

    expectWithinBaseline(events, baseline['Dialog (controlled open)']);
    expectNamedLibraryNodes(events);
  });

  it.skipIf(skip)('Menu (controlled open)', async () => {
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

    expectWithinBaseline(events, baseline['Menu (controlled open)']);
    expectNamedLibraryNodes(events);
  });

  it.skipIf(skip)('Tooltip (controlled open)', async () => {
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

    expectWithinBaseline(events, baseline['Tooltip (controlled open)']);
    expectNamedLibraryNodes(events);
  });

  // Real right-clicks need a browser. Only measured with animations, as in an app.
  it.skipIf(animations === 'disabled' || isJSDOM)('ContextMenu (right-click)', async () => {
    const { userEvent } = await import('vitest/browser');
    const events = captureDiagnostics();

    await render(() => (
      <ContextMenu.Root>
        <ContextMenu.Trigger
          render={(props) => (
            <div {...props} data-testid="area" style={{ width: '200px', height: '100px' }}>
              Right click here
            </div>
          )}
        />
        <ContextMenu.Portal>
          <ContextMenu.Positioner>
            <ContextMenu.Popup data-testid="popup">
              <ContextMenu.Item>Cut</ContextMenu.Item>
              <ContextMenu.Item>Copy</ContextMenu.Item>
              <ContextMenu.Separator />
              <ContextMenu.Item>Paste</ContextMenu.Item>
            </ContextMenu.Popup>
          </ContextMenu.Positioner>
        </ContextMenu.Portal>
      </ContextMenu.Root>
    ));

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByTestId('area'), { button: 'right' });
      // eslint-disable-next-line no-await-in-loop
      await settle();
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByTestId('popup')).toBeVisible());
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{Escape}');
      // eslint-disable-next-line no-await-in-loop
      await settle();
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.queryByTestId('popup')).toBe(null));
    }

    expectWithinBaseline(events, baseline['ContextMenu (right-click)']);
    expectNamedLibraryNodes(events);
  });
});
