import { flush, For, OBSERVE } from 'solid-js';
import type { DiagnosticEvent } from 'solid-js';
import { attribution } from 'solid-js/attribution';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isJSDOM } from '@base-ui-solid/utils/testUtils';
import { Accordion } from 'base-ui-solid/accordion';
import { Autocomplete } from 'base-ui-solid/autocomplete';
import { Collapsible } from 'base-ui-solid/collapsible';
import { Combobox } from 'base-ui-solid/combobox';
import { Dialog } from 'base-ui-solid/dialog';
import { Menu } from 'base-ui-solid/menu';
import { NavigationMenu } from 'base-ui-solid/navigation-menu';
import { OTPField } from 'base-ui-solid/otp-field';
import { Popover } from 'base-ui-solid/popover';
import { Select } from 'base-ui-solid/select';
import { Tooltip } from 'base-ui-solid/tooltip';
import { createRenderer, flushMicrotasks, screen, waitFor } from '#test-utils';

// Port note: regressions absent upstream. Like `storeDiagnostics.port.test.tsx`, but driven by real
// user interactions in Chromium with animations enabled, as in an app: none of them may report a
// Solid diagnostic warning, or an effect relaying state (`EFFECT_RELAY_TEAR`) at any severity
// (see PORTING.md, "Stores and popups"). Decisions made from layout measurements are effects by
// nature and are not covered: a Select aligned to a trigger at the viewport's edge falls back to
// anchoring, a Collapsible panel without CSS motion skips its transition phases, and a Menu opened
// with the keyboard highlights its first item after the items are sorted by their DOM order.

const FRUITS = ['Apple', 'Banana', 'Cherry'];

describe.skipIf(isJSDOM)('store diagnostics (port), user interactions', () => {
  const { render } = createRenderer();

  let stopCapture: (() => void) | undefined;

  beforeEach(() => {
    (globalThis as any).SPIKE_EFFECT_LABELS = true;
    globalThis.BASE_UI_ANIMATIONS_DISABLED = false;
  });

  afterEach(() => {
    stopCapture?.();
    stopCapture = undefined;
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  function captureDiagnostics() {
    const events: DiagnosticEvent[] = [];
    // The time-based checks depend on the machine's load, so they're off.
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

  function expectNoFindings(
    events: DiagnosticEvent[],
    isInherent: (event: DiagnosticEvent) => boolean = () => false,
  ) {
    const findings = events
      .filter(
        (event) =>
          (event.severity === 'warn' ||
            event.severity === 'error' ||
            event.code === 'EFFECT_RELAY_TEAR') &&
          // Solid escalates a relay to a warning once it repeats.
          !(event.code === 'EFFECT_RELAY_TEAR' && isInherent(event)),
      )
      .map(
        (event) =>
          `${event.code}: relay=${(event.data as any)?.relay} wrote=${(event.data as any)?.wrote} writes=${JSON.stringify((event.data as any)?.writes)} msg=${event.message.slice(0, 300)}`,
      );
    expect(findings).toEqual([]);
  }

  async function settle() {
    flush();
    await flushMicrotasks();
  }

  async function user() {
    return (await import('vitest/browser')).userEvent;
  }

  it('Popover (click)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      <Popover.Root>
        <Popover.Trigger>Open</Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner>
            <Popover.Popup data-testid="popup">Content</Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    ));

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('button', { name: 'Open' }));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByTestId('popup')).toBeVisible());
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{Escape}');
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.queryByTestId('popup')).toBe(null));
    }

    expectNoFindings(events);
  });

  it('Dialog (click)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      <Dialog.Root>
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

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('button', { name: 'Open' }));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByTestId('popup')).toBeVisible());
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{Escape}');
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.queryByTestId('popup')).toBe(null));
    }

    expectNoFindings(events);
  });

  it('Menu (click)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      <Menu.Root>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup data-testid="popup">
              <Menu.Item>One</Menu.Item>
              <Menu.Item>Two</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('button', { name: 'Open' }));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByTestId('popup')).toBeVisible());
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{ArrowDown}');
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{Escape}');
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.queryByTestId('popup')).toBe(null));
    }

    expectNoFindings(events);
  });

  it('Menu (keyboard)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      <Menu.Root>
        <Menu.Trigger>Open</Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner>
            <Menu.Popup data-testid="popup">
              <Menu.Item>One</Menu.Item>
              <Menu.Item>Two</Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    ));

    for (let i = 0; i < 3; i += 1) {
      screen.getByRole('button', { name: 'Open' }).focus();
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{ArrowDown}');
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'One' })).toHaveFocus());
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{ArrowDown}{Escape}');
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.queryByTestId('popup')).toBe(null));
    }

    // The first item is highlighted from the item list, whose indices come from the items' DOM
    // order once they rendered. Like the measurements above, it's relayed after the open renders.
    expectNoFindings(events, (event) =>
      event.message.includes('writing "BaseUI.Store(MenuStore).track"'),
    );
  });

  it('Select (keyboard)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      <div style={{ padding: '200px' }}>
        <Select.Root defaultValue="Banana">
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <For each={FRUITS}>
                  {(fruit) => (
                    <Select.Item value={fruit}>
                      <Select.ItemText>{fruit}</Select.ItemText>
                    </Select.Item>
                  )}
                </For>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>
    ));

    for (let i = 0; i < 3; i += 1) {
      screen.getByRole('combobox').focus();
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{ArrowDown}');
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByRole('listbox')).toBeVisible());
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{ArrowDown}{Escape}');
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null));
    }

    expectNoFindings(events);
  });

  it('Tooltip (hover)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      <Tooltip.Provider delay={0} closeDelay={0}>
        <Tooltip.Root>
          <Tooltip.Trigger>Hover</Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner>
              <Tooltip.Popup data-testid="popup">Tip</Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
        <button type="button">Elsewhere</button>
      </Tooltip.Provider>
    ));

    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.hover(screen.getByRole('button', { name: 'Hover' }));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByTestId('popup')).toBeVisible());
      // eslint-disable-next-line no-await-in-loop
      await userEvent.hover(screen.getByRole('button', { name: 'Elsewhere' }));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.queryByTestId('popup')).toBe(null));
    }

    expectNoFindings(events);
  });

  it('Select (click)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      // Away from the viewport's edges, so the popup stays aligned with the trigger.
      <div style={{ padding: '200px' }}>
        <Select.Root defaultValue="Apple">
          <Select.Trigger>
            <Select.Value />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner>
              <Select.Popup>
                <For each={FRUITS}>
                  {(fruit) => (
                    <Select.Item value={fruit}>
                      <Select.ItemText>{fruit}</Select.ItemText>
                    </Select.Item>
                  )}
                </For>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>
    ));

    for (const fruit of ['Banana', 'Cherry']) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('combobox'));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByRole('listbox')).toBeVisible());
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('option', { name: fruit }));
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.queryByRole('listbox')).toBe(null));
    }

    expectNoFindings(events);
  });

  it('Combobox (typing)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      <Combobox.Root items={FRUITS}>
        <Combobox.Input aria-label="Fruit" />
        <Combobox.Portal>
          <Combobox.Positioner>
            <Combobox.Popup>
              <Combobox.List>
                {(fruit: () => string) => <Combobox.Item value={fruit()}>{fruit()}</Combobox.Item>}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
    ));

    for (let i = 0; i < 2; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('combobox'));
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('a');
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByRole('listbox')).toBeVisible());
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{ArrowDown}{Enter}');
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{Escape}');
      // eslint-disable-next-line no-await-in-loop
      await settle();
    }

    expectNoFindings(events);
  });

  it('Autocomplete (typing)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      <Autocomplete.Root items={FRUITS}>
        <Autocomplete.Input aria-label="Fruit" />
        <Autocomplete.Portal>
          <Autocomplete.Positioner>
            <Autocomplete.Popup>
              <Autocomplete.List>
                {(fruit: () => string) => (
                  <Autocomplete.Item value={fruit()}>{fruit()}</Autocomplete.Item>
                )}
              </Autocomplete.List>
            </Autocomplete.Popup>
          </Autocomplete.Positioner>
        </Autocomplete.Portal>
      </Autocomplete.Root>
    ));

    for (let i = 0; i < 2; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('combobox'));
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('a');
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() => expect(screen.getByRole('listbox')).toBeVisible());
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{ArrowDown}{Escape}{Escape}');
      // eslint-disable-next-line no-await-in-loop
      await settle();
    }

    expectNoFindings(events);
  });

  it('Accordion and Collapsible (toggle)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      <>
        <Accordion.Root>
          <Accordion.Item>
            <Accordion.Header>
              <Accordion.Trigger>Section</Accordion.Trigger>
            </Accordion.Header>
            <Accordion.Panel style={{ transition: 'height 10ms' }}>
              Accordion content
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion.Root>
        <Collapsible.Root>
          <Collapsible.Trigger>Details</Collapsible.Trigger>
          <Collapsible.Panel style={{ transition: 'height 10ms' }}>
            Collapsible content
          </Collapsible.Panel>
        </Collapsible.Root>
      </>
    ));

    for (let i = 0; i < 4; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('button', { name: 'Section' }));
      // eslint-disable-next-line no-await-in-loop
      await userEvent.click(screen.getByRole('button', { name: 'Details' }));
      // eslint-disable-next-line no-await-in-loop
      await settle();
      // Let the transitions finish.
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    }

    expectNoFindings(events);
  });

  it('OTP Field (typing)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      <OTPField.Root length={4}>
        <OTPField.Input aria-label="Digit 1" />
        <OTPField.Input aria-label="Digit 2" />
        <OTPField.Input aria-label="Digit 3" />
        <OTPField.Input aria-label="Digit 4" />
      </OTPField.Root>
    ));

    await userEvent.click(screen.getAllByRole('textbox')[0]);
    await userEvent.keyboard('1234');
    await settle();
    await waitFor(() => expect(screen.getAllByRole('textbox')[3]).toHaveValue('4'));

    expectNoFindings(events);
  });

  it('Navigation Menu (keyboard)', async () => {
    const userEvent = await user();
    const events = captureDiagnostics();
    await render(() => (
      <NavigationMenu.Root>
        <NavigationMenu.List>
          <NavigationMenu.Item value="one">
            <NavigationMenu.Trigger>One</NavigationMenu.Trigger>
            <NavigationMenu.Content>First</NavigationMenu.Content>
          </NavigationMenu.Item>
          <NavigationMenu.Item value="two">
            <NavigationMenu.Trigger>Two</NavigationMenu.Trigger>
            <NavigationMenu.Content>Second</NavigationMenu.Content>
          </NavigationMenu.Item>
        </NavigationMenu.List>
        <NavigationMenu.Portal>
          <NavigationMenu.Positioner>
            <NavigationMenu.Popup>
              <NavigationMenu.Viewport />
            </NavigationMenu.Popup>
          </NavigationMenu.Positioner>
        </NavigationMenu.Portal>
      </NavigationMenu.Root>
    ));

    for (const name of ['One', 'Two']) {
      screen.getByRole('button', { name }).focus();
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{Enter}');
      // eslint-disable-next-line no-await-in-loop
      await waitFor(() =>
        expect(screen.getByRole('button', { name })).toHaveAttribute('aria-expanded', 'true'),
      );
      // eslint-disable-next-line no-await-in-loop
      await userEvent.keyboard('{Escape}');
      // eslint-disable-next-line no-await-in-loop
      await settle();
    }

    expectNoFindings(events);
  });
});
