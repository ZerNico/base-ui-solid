import { expect, describe, it, afterEach } from 'vitest';
import { createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { Select } from 'base-ui-solid/select';
import { Toolbar } from 'base-ui-solid/toolbar';
import { DirectionProvider } from 'base-ui-solid/direction-provider';
import {
  fireEvent,
  screen,
  waitFor,
  flushMicrotasks,
  createRenderer,
  describeConformance,
  isJSDOM,
} from '#test-utils';
// Port note: flush Solid updates after imperative actions, replacing React act.
async function act(fn: () => unknown) {
  await fn();
  await flushMicrotasks();
}

describe('<Select.Popup />', () => {
  const { render } = createRenderer();

  describeConformance(Select.Popup, {
    refInstanceof: window.HTMLDivElement,
    wrap(node) {
      return (
        <Select.Root open>
          <Select.Portal>
            <Select.Positioner>{node()}</Select.Positioner>
          </Select.Portal>
        </Select.Root>
      );
    },
  });

  it('throws a descriptive error when rendered outside <Select.Positioner>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Port note: the intentional render failure emits Solid's REACTIVITY_HALTED repair hint.
    const originalWarn = console.warn;
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation((...args) => {
      if (!String(args[0]).includes('[REACTIVITY_HALTED]')) {
        originalWarn(...args);
      }
    });

    // Port note: Solid reports a nested render failure through the window as well.
    const handleWindowError = (event: ErrorEvent) => {
      if (event.message.includes('SelectPositionerContext is missing')) {
        event.preventDefault();
      }
    };
    window.addEventListener('error', handleWindowError);
    try {
      await expect(
        render(() => (
          <Select.Root open>
            <Select.Popup />
          </Select.Root>
        )),
      ).rejects.toThrow(
        'Base UI: SelectPositionerContext is missing. SelectPositioner parts must be placed within <Select.Positioner>.',
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

  it('keeps arrow keys inside the popup when the trigger lives in a toolbar', async () => {
    // Clicking the trigger starts its deferred `forceMount` timer, which settles after the
    // assertions below.
    // Port note: Solid has no React act warnings.
    const onToolbarKeyDown = vi.fn();
    const { user } = await render(() => (
      <Toolbar.Root onKeyDown={onToolbarKeyDown}>
        <Select.Root defaultValue="a">
          <Toolbar.Button
            render={(props) => (
              <Select.Trigger {...(props as Select.Trigger.Props)} data-testid="trigger" />
            )}
          >
            <Select.Value />
          </Toolbar.Button>
          {/* Rendered inline rather than portaled, so the popup sits inside the toolbar's own
              DOM subtree and its composite key handling actually sees these events. */}
          <Select.Positioner>
            <Select.Popup>
              <Select.Item value="a">a</Select.Item>
              <Select.Item value="b">b</Select.Item>
            </Select.Popup>
          </Select.Positioner>
        </Select.Root>
        <Toolbar.Button data-testid="next">Next</Toolbar.Button>
      </Toolbar.Root>
    ));

    const trigger = screen.getByTestId('trigger');
    await act(async () => {
      trigger.focus();
    });

    // Opening with the keyboard moves focus onto the selected item inside the popup.
    await user.keyboard('{Enter}');
    await screen.findByRole('listbox');
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'a' })).toHaveFocus();
    });

    // Enter isn't a composite key, so opening legitimately reaches the toolbar.
    onToolbarKeyDown.mockClear();

    // A horizontal toolbar navigates with ArrowRight. While the select popup owns focus that key
    // belongs to the popup, so it must not bubble out and move focus off the toolbar button.
    await user.keyboard('{ArrowRight}');

    expect(onToolbarKeyDown).not.toHaveBeenCalled();
    expect(screen.getByTestId('next')).not.toHaveFocus();
  });

  it('has aria attributes when no Select.List is present', async () => {
    const { user } = await render(() => (
      <Select.Root multiple>
        <Select.Trigger>Trigger</Select.Trigger>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup data-testid="popup">Popup</Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    ));

    const trigger = screen.getByRole('combobox');

    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);

    const popup = await screen.findByTestId('popup');
    const listbox = await screen.findByRole('listbox');

    expect(popup).toBe(listbox);
    expect(popup.id).not.toBe('');
    expect(popup).toHaveAttribute('aria-multiselectable', 'true');
    expect(trigger).toHaveAttribute('aria-controls', popup.id);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('places aria attributes on Select.List instead if it is present', async () => {
    const { user } = await render(() => (
      <Select.Root multiple>
        <Select.Trigger>Trigger</Select.Trigger>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup data-testid="popup">
              <Select.List data-testid="list">
                <Select.Item value="1">Item 1</Select.Item>
                <Select.Item value="2">Item 2</Select.Item>
              </Select.List>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    ));

    const trigger = screen.getByRole('combobox');

    expect(trigger).not.toHaveAttribute('aria-controls');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');

    await user.click(trigger);

    const popup = await screen.findByTestId('popup');
    const list = await screen.findByTestId('list');
    const listbox = await screen.findByRole('listbox');

    expect(list).toBe(listbox);
    expect(list).toHaveAttribute('aria-multiselectable');
    expect(popup).toHaveAttribute('role', 'presentation');
    expect(popup).not.toHaveAttribute('aria-multiselectable');
    expect(list.id).not.toBe('');
    expect(trigger).toHaveAttribute('aria-controls', list.id);
    expect(trigger).not.toHaveAttribute('aria-controls', popup.id);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox');
  });

  it('restores transform-related inline styles after measurement', async () => {
    let popupElement: HTMLElement | null = null;

    await render(() => (
      <Select.Root open>
        <Select.Trigger>Trigger</Select.Trigger>
        <Select.Portal>
          <Select.Positioner>
            <Select.Popup
              ref={(node) => {
                if (node) {
                  node.style.setProperty('transform', 'translateX(10px)');
                  node.style.setProperty('scale', '0.8');
                  node.style.setProperty('translate', '1px 2px');
                }
                popupElement = node;
              }}
            >
              <Select.Item value="1">
                <Select.ItemText>Item 1</Select.ItemText>
              </Select.Item>
            </Select.Popup>
          </Select.Positioner>
        </Select.Portal>
      </Select.Root>
    ));

    await new Promise<void>(queueMicrotask);

    expect(popupElement).not.toBe(null);
    expect(popupElement!.style.getPropertyValue('transform')).toBe('translateX(10px)');
    expect(popupElement!.style.getPropertyValue('scale')).toBe('0.8');
    expect(popupElement!.style.getPropertyValue('translate')).toBe('1px 2px');
  });

  it.skipIf(isJSDOM)('keeps alignItemWithTrigger active at browser zoom', async () => {
    const docEl = document.documentElement;
    const previousZoom = docEl.style.zoom;

    try {
      docEl.style.zoom = '0.9';

      await render(() => (
        <div style={{ 'padding-top': '100px', 'padding-left': '10px' }}>
          <Select.Root open defaultValue="css-modules">
            <Select.Trigger data-testid="trigger" style={{ width: '108px', height: '30px' }}>
              <Select.Value />
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner data-testid="positioner">
                <Select.Popup data-testid="popup" style={{ 'max-height': 'none' }}>
                  <Select.Item value="css-modules">
                    <Select.ItemText>CSS Modules</Select.ItemText>
                  </Select.Item>
                  <Select.Item value="tailwind-v4">
                    <Select.ItemText>Tailwind v4</Select.ItemText>
                  </Select.Item>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </div>
      ));

      await waitFor(() => {
        expect(screen.getByTestId('positioner')).toHaveAttribute('data-side', 'none');
      });
    } finally {
      docEl.style.zoom = previousZoom;
    }
  });

  it.skipIf(isJSDOM)('aligns the selected item with the trigger inline start in ltr', async () => {
    await render(() => (
      <div
        dir="ltr"
        style={{
          'margin-left': '100px',
          'min-height': '600px',
          'padding-top': '96px',
        }}
      >
        <DirectionProvider direction="ltr">
          <Select.Root open defaultValue="with-longer-label">
            <Select.Trigger
              style={{
                width: '160px',
                display: 'flex',
                'justify-content': 'flex-start',
                'padding-inline-start': '12px',
                'padding-inline-end': '28px',
              }}
            >
              <Select.Value data-testid="value">With longer label</Select.Value>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner data-testid="positioner">
                <Select.Popup style={{ width: '180px', 'max-height': 'none' }}>
                  <Select.Item value="with-longer-label">
                    <Select.ItemText
                      data-testid="item-text"
                      style={{
                        'padding-inline-start': '24px',
                        'padding-inline-end': '8px',
                      }}
                    >
                      With longer label
                    </Select.ItemText>
                  </Select.Item>
                  <Select.Item value="other">
                    <Select.ItemText>Other option</Select.ItemText>
                  </Select.Item>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </DirectionProvider>
      </div>
    ));

    const positioner = screen.getByTestId('positioner');
    const value = screen.getByTestId('value');
    const itemText = screen.getByTestId('item-text');

    await waitFor(() => {
      expect(positioner).toHaveAttribute('data-side', 'none');
      expect(
        Math.abs(value.getBoundingClientRect().left - itemText.getBoundingClientRect().left),
      ).toBeLessThan(1);
    });
  });

  it.skipIf(isJSDOM)(
    'aligns the selected item with the trigger inline start in ltr when popup padding shifts the item text',
    async () => {
      await render(() => (
        <div
          dir="ltr"
          style={{
            'margin-left': '100px',
            'min-height': '600px',
            'padding-top': '96px',
          }}
        >
          <DirectionProvider direction="ltr">
            <Select.Root open defaultValue="with-longer-label">
              <Select.Trigger
                style={{
                  width: '160px',
                  display: 'flex',
                  'justify-content': 'flex-start',
                  'padding-inline-start': '12px',
                  'padding-inline-end': '28px',
                }}
              >
                <Select.Value data-testid="value">With longer label</Select.Value>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner data-testid="positioner">
                  <Select.Popup
                    style={{
                      width: '220px',
                      'max-height': 'none',
                      'box-sizing': 'border-box',
                      border: '4px solid transparent',
                      'padding-inline-start': '20px',
                      'padding-inline-end': '12px',
                    }}
                  >
                    <Select.Item value="with-longer-label">
                      <Select.ItemText
                        data-testid="item-text"
                        style={{
                          'padding-inline-start': '24px',
                          'padding-inline-end': '8px',
                        }}
                      >
                        With longer label
                      </Select.ItemText>
                    </Select.Item>
                    <Select.Item value="other">
                      <Select.ItemText>Other option</Select.ItemText>
                    </Select.Item>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </DirectionProvider>
        </div>
      ));

      const positioner = screen.getByTestId('positioner');
      const value = screen.getByTestId('value');
      const itemText = screen.getByTestId('item-text');

      await waitFor(() => {
        expect(positioner).toHaveAttribute('data-side', 'none');
        expect(
          Math.abs(value.getBoundingClientRect().left - itemText.getBoundingClientRect().left),
        ).toBeLessThan(1);
      });
    },
  );

  it.skipIf(isJSDOM)('aligns the selected item with the trigger inline end in rtl', async () => {
    await render(() => (
      <div
        dir="rtl"
        style={{
          'margin-left': '100px',
          'min-height': '600px',
          'padding-top': '96px',
        }}
      >
        <DirectionProvider direction="rtl">
          <Select.Root open defaultValue="with-longer-label">
            <Select.Trigger
              style={{
                width: '160px',
                display: 'flex',
                'justify-content': 'flex-end',
                'padding-inline-start': '28px',
                'padding-inline-end': '12px',
              }}
            >
              <Select.Value data-testid="value">With longer label</Select.Value>
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner data-testid="positioner">
                <Select.Popup style={{ width: '180px', 'max-height': 'none' }}>
                  <Select.Item value="with-longer-label">
                    <Select.ItemText
                      data-testid="item-text"
                      style={{
                        'padding-inline-start': '8px',
                        'padding-inline-end': '24px',
                      }}
                    >
                      With longer label
                    </Select.ItemText>
                  </Select.Item>
                  <Select.Item value="other">
                    <Select.ItemText>Other option</Select.ItemText>
                  </Select.Item>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        </DirectionProvider>
      </div>
    ));

    const positioner = screen.getByTestId('positioner');
    const value = screen.getByTestId('value');
    const itemText = screen.getByTestId('item-text');

    await waitFor(() => {
      expect(positioner).toHaveAttribute('data-side', 'none');
      expect(
        Math.abs(value.getBoundingClientRect().right - itemText.getBoundingClientRect().right),
      ).toBeLessThan(1);
    });
  });

  it.skipIf(isJSDOM)(
    'aligns the popup with the trigger inline end in rtl when no selected item text is available',
    async () => {
      await render(() => (
        <div
          dir="rtl"
          style={{
            width: '280px',
            'margin-left': '100px',
            'min-height': '600px',
            'padding-top': '96px',
          }}
        >
          <DirectionProvider direction="rtl">
            <Select.Root open>
              <Select.Trigger
                data-testid="trigger"
                style={{
                  width: '160px',
                  display: 'flex',
                  'justify-content': 'flex-end',
                  'padding-inline-start': '28px',
                  'padding-inline-end': '12px',
                }}
              >
                <Select.Value placeholder="اختر لهجة" />
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner data-testid="positioner">
                  <Select.Popup style={{ width: '180px', 'max-height': 'none' }}>
                    <Select.Item value="with-longer-label">With longer label</Select.Item>
                    <Select.Item value="other">Other option</Select.Item>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </DirectionProvider>
        </div>
      ));

      const trigger = screen.getByTestId('trigger');
      const positioner = screen.getByTestId('positioner');

      await waitFor(() => {
        expect(positioner).toHaveAttribute('data-side', 'none');
        expect(
          Math.abs(
            trigger.getBoundingClientRect().right - positioner.getBoundingClientRect().right,
          ),
        ).toBeLessThan(1);
      });
    },
  );

  it.skipIf(isJSDOM)('keeps item text aligned with the trigger after reopening', async () => {
    function getCenterY(rect: DOMRect) {
      return rect.top + rect.height / 2;
    }

    const itemStyle: JSX.CSSProperties = {
      padding: '8px 16px 8px 10px',
      'font-size': '14px',
      'line-height': '16px',
    };

    const { user } = await render(() => (
      <div style={{ 'margin-left': '100px', 'min-height': '600px', 'padding-top': '96px' }}>
        <Select.Root>
          <Select.Trigger
            data-testid="trigger"
            style={{
              'box-sizing': 'border-box',
              width: '176px',
              height: '40px',
              display: 'flex',
              'align-items': 'center',
              'justify-content': 'flex-start',
              'padding-inline-start': '14px',
            }}
          >
            <Select.Value data-testid="value" placeholder="Select produce" />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner data-testid="positioner">
              <Select.Popup style={{ width: '220px', 'max-height': 'none' }}>
                <Select.List style={{ 'padding-block': '4px', 'overflow-y': 'auto' }}>
                  <Select.Group>
                    <Select.GroupLabel
                      style={{
                        padding: '8px 16px 4px 30px',
                        'font-size': '11px',
                        'line-height': '16px',
                      }}
                    >
                      Fruits
                    </Select.GroupLabel>
                    <Select.Item value="apple" style={itemStyle}>
                      <Select.ItemText data-testid="first-item-text">Apple</Select.ItemText>
                    </Select.Item>
                    <Select.Item value="banana" style={itemStyle}>
                      <Select.ItemText data-testid="selected-item-text">Banana</Select.ItemText>
                    </Select.Item>
                  </Select.Group>
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      </div>
    ));

    const trigger = screen.getByTestId('trigger');

    async function expectItemAligned(testId: string) {
      const value = screen.getByTestId('value');
      const itemText = screen.getByTestId(testId);

      await waitFor(() => {
        expect(screen.getByTestId('positioner')).toHaveAttribute('data-side', 'none');
        expect(
          Math.abs(
            getCenterY(value.getBoundingClientRect()) -
              getCenterY(itemText.getBoundingClientRect()),
          ),
        ).toBeLessThan(1);
      });
    }

    await user.click(trigger);
    await expectItemAligned('first-item-text');

    await user.keyboard('{Escape}');
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));

    await user.click(trigger);
    await expectItemAligned('first-item-text');

    await user.click(screen.getByTestId('selected-item-text'));
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'));

    await user.click(trigger);
    await expectItemAligned('selected-item-text');
  });

  describe.skipIf(isJSDOM)('rtl alignment', () => {
    const RTL_FIXTURE_OPTIONS = [
      { value: 'first', label: 'الخيار الأول' },
      { value: 'selected', label: 'الخيار المحدد' },
      { value: 'third', label: 'الخيار الثالث' },
    ];

    const RTL_FIXTURE_CSS = `
      .rtlFixtureRoot {
        width: 240px;
        margin-left: 100px;
        padding-top: 96px;
        direction: rtl;
      }

      .rtlFixtureTrigger {
        box-sizing: border-box;
        display: flex;
        justify-content: flex-end;
        height: 2.5rem;
        width: 160px;
        padding-inline-start: 28px;
        padding-inline-end: 12px;
        font-size: 1rem;
        line-height: 1.5rem;
        direction: rtl;
      }

      .rtlFixturePositioner,
      .rtlFixturePopup,
      .rtlFixtureItem {
        direction: rtl;
      }

      .rtlFixturePopup {
        box-sizing: border-box;
        min-width: var(--anchor-width);
      }

      .rtlFixturePopup[data-side='none'] {
        min-width: calc(var(--anchor-width) + 1rem);
      }

      .rtlFixtureList {
        padding-block: 0.25rem;
        max-height: var(--available-height);
      }

      .rtlFixtureItem {
        box-sizing: border-box;
        padding-block: 0.5rem;
        padding-inline-start: 1rem;
        padding-inline-end: 0.625rem;
        display: grid;
        gap: 0.5rem;
        align-items: center;
        grid-template-columns: 0.75rem 1fr;
      }

      [data-side='none'] .rtlFixtureItem {
        padding-inline-start: 3rem;
      }

      .rtlFixtureIndicator {
        grid-column: 1;
      }

      .rtlFixtureText {
        grid-column: 2;
      }
    `;

    function RtlAlignmentSelect(props: {
      defaultValue: string;
      anchorRef?: RefObject<HTMLDivElement | null>;
      anchorStyle?: JSX.CSSProperties;
    }) {
      const [open, setOpen] = createSignal(false);

      return (
        <div
          dir="rtl"
          class="rtlFixtureRoot"
          ref={(node) => {
            if (props.anchorRef) {
              props.anchorRef.current = node;
            }
          }}
          style={props.anchorStyle}
        >
          <style>{RTL_FIXTURE_CSS}</style>
          <DirectionProvider direction="rtl">
            <Select.Root defaultValue={props.defaultValue} open={open()} onOpenChange={setOpen}>
              <Select.Trigger class="rtlFixtureTrigger">
                <Select.Value data-testid="value">
                  {(value) =>
                    RTL_FIXTURE_OPTIONS.find((option) => option.value === value)?.label ?? 'اختر'
                  }
                </Select.Value>
              </Select.Trigger>

              <Select.Portal>
                <Select.Positioner
                  anchor={props.anchorRef}
                  class="rtlFixturePositioner"
                  data-testid="positioner"
                  dir="rtl"
                  sideOffset={8}
                >
                  <Select.Popup class="rtlFixturePopup" dir="rtl">
                    <Select.List class="rtlFixtureList">
                      {RTL_FIXTURE_OPTIONS.map(({ label, value }) => (
                        <Select.Item value={value} class="rtlFixtureItem">
                          <Select.ItemIndicator class="rtlFixtureIndicator">✓</Select.ItemIndicator>
                          <Select.ItemText
                            class="rtlFixtureText"
                            data-testid={value === props.defaultValue ? 'item-text' : undefined}
                          >
                            {label}
                          </Select.ItemText>
                        </Select.Item>
                      ))}
                    </Select.List>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </DirectionProvider>
        </div>
      );
    }

    it('aligns the selected item with the trigger inline end on first open in the docs-style rtl layout', async () => {
      const { user } = await render(() => <RtlAlignmentSelect defaultValue="selected" />);

      await user.click(screen.getByRole('combobox'));

      const positioner = await screen.findByTestId('positioner');
      const value = screen.getByTestId('value');
      const itemText = screen.getByTestId('item-text');

      await waitFor(() => {
        expect(positioner).toHaveAttribute('data-side', 'none');
        expect(
          Math.abs(value.getBoundingClientRect().right - itemText.getBoundingClientRect().right),
        ).toBeLessThan(1);
      });
    });

    it('seeds anchor width from the custom anchor on first open', async () => {
      function AnchoredRtlAlignmentSelect() {
        const anchorRef = { current: null } as RefObject<HTMLDivElement | null | null>;

        return (
          <RtlAlignmentSelect
            defaultValue="selected"
            anchorRef={anchorRef}
            anchorStyle={{ width: '240px' }}
          />
        );
      }

      const { user } = await render(() => <AnchoredRtlAlignmentSelect />);

      await user.click(screen.getByRole('combobox'));

      const positioner = await screen.findByTestId('positioner');

      await waitFor(() => {
        expect(positioner).toHaveAttribute('data-side', 'none');
        expect(positioner.style.getPropertyValue('--anchor-width')).toBe('240px');
      });
    });
  });

  it.skipIf(isJSDOM)(
    'keeps scrolling the aligned list at browser zoom after the popup fills the available height',
    async () => {
      const docEl = document.documentElement;
      const previousZoom = docEl.style.zoom;
      const createRect = (left: number, top: number, width: number, height: number) => ({
        x: left,
        y: top,
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        toJSON: () => ({}),
      });

      try {
        docEl.style.zoom = '0.9';

        await render(() => (
          <div style={{ 'padding-top': '100px', 'padding-left': '10px' }}>
            <Select.Root open defaultValue="item-1">
              <Select.Trigger data-testid="trigger" style={{ width: '108px', height: '30px' }}>
                <Select.Value />
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner data-testid="positioner">
                  <Select.Popup data-testid="popup" style={{ 'max-height': '225.538px' }}>
                    <Select.List data-testid="list">
                      <Select.Item value="item-1">Item 1</Select.Item>
                      <Select.Item value="item-2">Item 2</Select.Item>
                    </Select.List>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
        ));

        const positioner = screen.getByTestId('positioner');
        const list = screen.getByTestId('list');

        await waitFor(() => {
          expect(positioner).toHaveAttribute('data-side', 'none');
        });

        // Port note: the alignment effect runs after asynchronous Floating UI positioning.
        await waitFor(() => expect(positioner.style.height).not.toBe(''));

        let scrollTop = 0;

        Object.defineProperty(positioner, 'getBoundingClientRect', {
          value: () => createRect(10, 0, 108, 202.984375),
          configurable: true,
        });
        Object.defineProperty(list, 'scrollTop', {
          configurable: true,
          get: () => scrollTop,
          set: (value: number) => {
            scrollTop = value;
          },
        });
        Object.defineProperty(list, 'scrollHeight', {
          value: 598,
          configurable: true,
        });
        Object.defineProperty(list, 'clientHeight', {
          value: 226,
          configurable: true,
        });

        positioner.style.height = '225.538px';
        positioner.style.bottom = '0px';

        list.scrollTop = 14;
        fireEvent.scroll(list);

        await waitFor(() => {
          expect(scrollTop).toBe(14);
          expect(positioner.style.height).toBe('226px');
        });
      } finally {
        docEl.style.zoom = previousZoom;
      }
    },
  );

  it.skipIf(isJSDOM)(
    'treats short popups as top-positioned when maxScrollTop is off by 1px',
    async () => {
      const docEl = document.documentElement;
      const clientHeightDescriptor = Object.getOwnPropertyDescriptor(docEl, 'clientHeight');
      const clientWidthDescriptor = Object.getOwnPropertyDescriptor(docEl, 'clientWidth');

      const restoreDescriptor = (
        target: object,
        property: 'clientHeight' | 'clientWidth',
        descriptor: PropertyDescriptor | undefined,
      ) => {
        if (descriptor) {
          Object.defineProperty(target, property, descriptor);
        } else {
          delete (target as Record<string, unknown>)[property];
        }
      };

      const createRect = (left: number, top: number, width: number, height: number) => ({
        x: left,
        y: top,
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        toJSON: () => ({}),
      });

      try {
        Object.defineProperty(docEl, 'clientHeight', { value: 646, configurable: true });
        Object.defineProperty(docEl, 'clientWidth', { value: 300, configurable: true });

        await render(() => (
          <Select.Root open defaultValue="1">
            <Select.Trigger
              data-testid="trigger"
              ref={(node) => {
                if (!node) {
                  return;
                }

                Object.defineProperty(node, 'offsetWidth', { value: 80, configurable: true });
                Object.defineProperty(node, 'offsetHeight', { value: 30, configurable: true });
                Object.defineProperty(node, 'getBoundingClientRect', {
                  value: () => createRect(10, 170.3793487548828, 80, 30),
                  configurable: true,
                });
              }}
            >
              Trigger
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner
                data-testid="positioner"
                ref={(node) => {
                  if (!node) {
                    return;
                  }

                  Object.defineProperty(node, 'getBoundingClientRect', {
                    value: () => createRect(10, 0, 108, 63.96739196777344),
                    configurable: true,
                  });
                }}
              >
                <Select.Popup
                  data-testid="popup"
                  ref={(node) => {
                    if (!node) {
                      return;
                    }

                    Object.defineProperty(node, 'scrollHeight', {
                      value: 64,
                      configurable: true,
                    });
                    Object.defineProperty(node, 'clientHeight', {
                      value: 63,
                      configurable: true,
                    });
                  }}
                >
                  <Select.Item value="1">Item 1</Select.Item>
                  <Select.Item value="2">Item 2</Select.Item>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        ));

        const positioner = screen.getByTestId('positioner');

        await waitFor(() => {
          expect(positioner).toHaveAttribute('data-side', 'none');
          expect(positioner.style.top).not.toBe('');
          expect(positioner.style.bottom).toBe('');
        });
      } finally {
        restoreDescriptor(docEl, 'clientHeight', clientHeightDescriptor);
        restoreDescriptor(docEl, 'clientWidth', clientWidthDescriptor);
      }
    },
  );

  it.skipIf(isJSDOM)(
    'keeps alignItemWithTrigger active when the aligned height is fractionally below minHeight',
    async () => {
      const docEl = document.documentElement;
      const clientHeightDescriptor = Object.getOwnPropertyDescriptor(docEl, 'clientHeight');
      const clientWidthDescriptor = Object.getOwnPropertyDescriptor(docEl, 'clientWidth');

      const restoreDescriptor = (
        target: object,
        property: 'clientHeight' | 'clientWidth',
        descriptor: PropertyDescriptor | undefined,
      ) => {
        if (descriptor) {
          Object.defineProperty(target, property, descriptor);
        } else {
          delete (target as Record<string, unknown>)[property];
        }
      };

      const createRect = (left: number, top: number, width: number, height: number) => ({
        x: left,
        y: top,
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        toJSON: () => ({}),
      });

      try {
        Object.defineProperty(docEl, 'clientHeight', { value: 646, configurable: true });
        Object.defineProperty(docEl, 'clientWidth', { value: 300, configurable: true });

        await render(() => (
          <Select.Root open defaultValue="1">
            <Select.Trigger
              data-testid="trigger"
              ref={(node) => {
                if (!node) {
                  return;
                }

                Object.defineProperty(node, 'offsetWidth', { value: 80, configurable: true });
                Object.defineProperty(node, 'offsetHeight', { value: 30, configurable: true });
                Object.defineProperty(node, 'getBoundingClientRect', {
                  value: () => createRect(10, 170.3793487548828, 80, 30),
                  configurable: true,
                });
              }}
            >
              Trigger
            </Select.Trigger>
            <Select.Portal>
              <Select.Positioner
                data-testid="positioner"
                ref={(node) => {
                  if (!node) {
                    return;
                  }

                  Object.defineProperty(node, 'getBoundingClientRect', {
                    value: () => createRect(10, 0, 108, 63.96739196777344),
                    configurable: true,
                  });
                }}
              >
                <Select.Popup
                  data-testid="popup"
                  style={{ 'min-height': '65px' }}
                  ref={(node) => {
                    if (!node) {
                      return;
                    }

                    Object.defineProperty(node, 'scrollHeight', {
                      value: 64,
                      configurable: true,
                    });
                    Object.defineProperty(node, 'clientHeight', {
                      value: 63,
                      configurable: true,
                    });
                  }}
                >
                  <Select.Item value="1">Item 1</Select.Item>
                  <Select.Item value="2">Item 2</Select.Item>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
        ));

        await waitFor(() => {
          expect(screen.getByTestId('positioner')).toHaveAttribute('data-side', 'none');
        });
      } finally {
        restoreDescriptor(docEl, 'clientHeight', clientHeightDescriptor);
        restoreDescriptor(docEl, 'clientWidth', clientWidthDescriptor);
      }
    },
  );

  it('does not resize the positioner when the list scrolls before the popup is placed', async () => {
    await render(() => (
      <Select.Root defaultValue="a">
        <Select.Trigger data-testid="trigger">
          <Select.Value />
        </Select.Trigger>
        <Select.Positioner data-testid="positioner">
          <Select.Popup>
            <Select.ScrollUpArrow keepMounted data-testid="up-arrow" />
            <Select.List
              data-testid="list"
              ref={(node) => {
                if (!node) {
                  return;
                }

                Object.defineProperty(node, 'scrollTop', { value: 100, configurable: true });
                Object.defineProperty(node, 'scrollHeight', { value: 400, configurable: true });
                Object.defineProperty(node, 'clientHeight', { value: 200, configurable: true });
              }}
            >
              <Select.Item value="a">a</Select.Item>
              <Select.Item value="b">b</Select.Item>
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Root>
    ));

    const positioner = screen.getByTestId('positioner');
    const geometryBefore = {
      height: positioner.style.height,
      top: positioner.style.top,
      bottom: positioner.style.bottom,
    };

    // A closed popup has never been measured, so a stray scroll must neither rewrite the
    // positioner geometry nor light up the scroll arrows.
    fireEvent.scroll(screen.getByTestId('list'));

    expect({
      height: positioner.style.height,
      top: positioner.style.top,
      bottom: positioner.style.bottom,
    }).toEqual(geometryBefore);
    expect(screen.getByTestId('up-arrow')).not.toHaveAttribute('data-visible');
  });

  describe.skipIf(isJSDOM)('aligned popup scroll resizing', () => {
    const docEl = document.documentElement;
    const restores: Array<() => void> = [];

    function stubProperty(target: object, property: string, value: unknown) {
      const descriptor = Object.getOwnPropertyDescriptor(target, property);
      Object.defineProperty(target, property, { value, configurable: true });
      restores.push(() => {
        if (descriptor) {
          Object.defineProperty(target, property, descriptor);
        } else {
          delete (target as Record<string, unknown>)[property];
        }
      });
    }

    function stubRect(node: HTMLElement, left: number, top: number, width: number, height: number) {
      stubProperty(node, 'getBoundingClientRect', () => ({
        x: left,
        y: top,
        left,
        top,
        width,
        height,
        right: left + width,
        bottom: top + height,
        toJSON: () => ({}),
      }));
      // Floating UI derives the element scale by comparing the rect against the offset box, so
      // both have to agree or the stubbed geometry reads back as if the page were zoomed.
      stubProperty(node, 'offsetWidth', width);
      stubProperty(node, 'offsetHeight', height);
    }

    afterEach(() => {
      while (restores.length > 0) {
        restores.pop()!();
      }
    });

    /**
     * Renders an item-aligned select whose viewport and element geometry are fully stubbed, so
     * the height-on-scroll behavior is reproducible instead of depending on the runner's window.
     */
    async function renderAligned(options: {
      viewportHeight: number;
      triggerTop: number;
      positionerHeight: number;
      listScrollHeight: number;
      listClientHeight: number;
      /** Vertical distance from the positioner top to the selected item's text. */
      selectedTextTop?: number;
      popupMaxHeight?: string;
      /** Use uncontrolled open state so the component can close itself. */
      uncontrolledOpen?: boolean;
    }) {
      const {
        viewportHeight,
        triggerTop,
        positionerHeight,
        listScrollHeight,
        listClientHeight,
        selectedTextTop,
        popupMaxHeight = 'none',
        uncontrolledOpen = false,
      } = options;

      stubProperty(docEl, 'clientHeight', viewportHeight);
      stubProperty(docEl, 'clientWidth', 400);

      let listScrollTop = 0;

      await render(() => (
        <Select.Root
          open={uncontrolledOpen ? undefined : true}
          defaultOpen={uncontrolledOpen}
          defaultValue="selected"
        >
          <Select.Trigger
            data-testid="trigger"
            ref={(node) => {
              if (node) {
                stubRect(node, 10, triggerTop, 80, 30);
              }
            }}
          >
            <Select.Value
              data-testid="value"
              ref={(node) => {
                if (node) {
                  stubRect(node, 10, triggerTop, 60, 30);
                }
              }}
            />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner
              data-testid="positioner"
              ref={(node) => {
                if (node) {
                  stubRect(node, 10, 0, 108, positionerHeight);
                }
              }}
            >
              <Select.Popup data-testid="popup" style={{ 'max-height': popupMaxHeight }}>
                <Select.List
                  data-testid="list"
                  ref={(node) => {
                    if (!node) {
                      return;
                    }

                    Object.defineProperty(node, 'scrollTop', {
                      configurable: true,
                      get: () => listScrollTop,
                      set: (value: number) => {
                        listScrollTop = value;
                      },
                    });
                    stubProperty(node, 'scrollHeight', listScrollHeight);
                    stubProperty(node, 'clientHeight', listClientHeight);
                  }}
                >
                  <Select.Item value="selected">
                    <Select.ItemText
                      data-testid="selected-text"
                      ref={(node) => {
                        if (node && selectedTextTop != null) {
                          stubRect(node, 10, selectedTextTop, 80, 30);
                        }
                      }}
                    >
                      Selected
                    </Select.ItemText>
                  </Select.Item>
                  <Select.Item value="other">
                    <Select.ItemText>Other</Select.ItemText>
                  </Select.Item>
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      const positioner = screen.getByTestId('positioner');
      const list = screen.getByTestId('list');

      await waitFor(() => {
        expect(positioner).toHaveAttribute('data-side', 'none');
      });

      return {
        positioner,
        list,
        getListScrollTop: () => listScrollTop,
        setListScrollTop: (value: number) => {
          listScrollTop = value;
        },
      };
    }

    it('anchors the popup to the viewport bottom when the selection sits near the list top', async () => {
      const { positioner } = await renderAligned({
        viewportHeight: 720,
        triggerTop: 300,
        positionerHeight: 200,
        listScrollHeight: 400,
        listClientHeight: 200,
      });

      await waitFor(() => {
        expect(positioner.style.bottom).toBe('0px');
      });
      expect(positioner.style.top).toBe('');
    });

    it('grows a bottom-anchored popup as the list is scrolled and re-pins it to the top', async () => {
      const { positioner, list, getListScrollTop, setListScrollTop } = await renderAligned({
        viewportHeight: 720,
        triggerTop: 300,
        positionerHeight: 200,
        listScrollHeight: 400,
        listClientHeight: 200,
      });

      await waitFor(() => {
        expect(positioner.style.bottom).toBe('0px');
      });

      setListScrollTop(100);
      fireEvent.scroll(list);

      // The scrolled distance is converted into extra popup height, and the list snaps back so
      // the newly revealed rows appear by growing rather than by scrolling.
      await waitFor(() => {
        expect(positioner.style.height).toBe('300px');
      });
      expect(getListScrollTop()).toBe(0);
    });

    it('consumes a sub-pixel overscroll into the popup height', async () => {
      const { positioner, list, getListScrollTop, setListScrollTop } = await renderAligned({
        viewportHeight: 720,
        triggerTop: 300,
        positionerHeight: 200,
        listScrollHeight: 400,
        listClientHeight: 200,
      });

      await waitFor(() => {
        expect(positioner.style.bottom).toBe('0px');
      });

      setListScrollTop(0.5);
      fireEvent.scroll(list);

      await waitFor(() => {
        expect(positioner.style.height).toBe('200.5px');
      });
      expect(getListScrollTop()).toBe(0);
    });

    it('leaves the popup height alone when the list is already at the anchored edge', async () => {
      const { positioner, list, setListScrollTop } = await renderAligned({
        viewportHeight: 720,
        triggerTop: 300,
        positionerHeight: 200,
        listScrollHeight: 400,
        listClientHeight: 200,
      });

      await waitFor(() => {
        expect(positioner.style.bottom).toBe('0px');
      });

      const heightBefore = positioner.style.height;

      setListScrollTop(0);
      fireEvent.scroll(list);

      await waitFor(() => {
        expect(positioner.style.height).toBe(heightBefore);
      });
    });

    it('grows a top-anchored popup upward and keeps the list pinned to the bottom', async () => {
      const { positioner, list, getListScrollTop, setListScrollTop } = await renderAligned({
        viewportHeight: 400,
        triggerTop: 200,
        positionerHeight: 200,
        listScrollHeight: 400,
        listClientHeight: 300,
        selectedTextTop: 300,
      });

      await waitFor(() => {
        expect(positioner.style.top).toBe('0px');
      });
      expect(positioner.style.bottom).toBe('');

      setListScrollTop(0);
      fireEvent.scroll(list);

      await waitFor(() => {
        expect(positioner.style.height).toBe('300px');
      });
      expect(getListScrollTop()).toBe(100);
    });

    it('stops growing a top-anchored popup once it fills the available height', async () => {
      const { positioner, list, setListScrollTop } = await renderAligned({
        viewportHeight: 400,
        triggerTop: 200,
        positionerHeight: 300,
        listScrollHeight: 400,
        listClientHeight: 300,
        selectedTextTop: 300,
      });

      await waitFor(() => {
        expect(positioner.style.top).toBe('0px');
      });

      setListScrollTop(0);
      fireEvent.scroll(list);

      // 300px of popup plus 100px of remaining scroll saturates the 380px of available height,
      // so it clamps instead of overshooting the viewport.
      await waitFor(() => {
        expect(positioner.style.height).toBe('380px');
      });

      // Once saturated, further scrolling must not keep resizing.
      setListScrollTop(50);
      fireEvent.scroll(list);

      await waitFor(() => {
        expect(positioner.style.height).toBe('380px');
      });
    });

    it('pins a top-anchored popup that already fills the viewport to the end of the list', async () => {
      const { positioner, list, getListScrollTop, setListScrollTop } = await renderAligned({
        viewportHeight: 400,
        triggerTop: 200,
        positionerHeight: 380,
        listScrollHeight: 400,
        listClientHeight: 300,
        selectedTextTop: 300,
      });

      // A popup at least as tall as the usable viewport is flush with its top edge.
      await waitFor(() => {
        expect(positioner.style.top).toBe('0px');
      });

      const heightBefore = positioner.style.height;

      setListScrollTop(100);
      fireEvent.scroll(list);

      await waitFor(() => {
        expect(getListScrollTop()).toBe(100);
      });
      expect(positioner.style.height).toBe(heightBefore);

      // Having reached its maximum, the popup stops taking over scrolling entirely: a later
      // sub-pixel scroll is left to the list instead of being snapped back to the edge.
      setListScrollTop(99.5);
      fireEvent.scroll(list);

      await waitFor(() => {
        expect(positioner.style.height).toBe(heightBefore);
      });
      expect(getListScrollTop()).toBe(99.5);
    });

    it('stops resizing once a max-height constrained popup is fully grown', async () => {
      const { positioner, list, setListScrollTop } = await renderAligned({
        viewportHeight: 720,
        triggerTop: 300,
        positionerHeight: 200,
        listScrollHeight: 400,
        listClientHeight: 200,
        popupMaxHeight: '100px',
      });

      await waitFor(() => {
        expect(positioner.style.bottom).toBe('0px');
      });

      const heightBefore = positioner.style.height;

      setListScrollTop(100);
      fireEvent.scroll(list);

      await waitFor(() => {
        expect(positioner.style.height).toBe(heightBefore);
      });
    });

    it('treats a zero max-height as unconstrained rather than collapsing the popup', async () => {
      const { positioner, list, setListScrollTop } = await renderAligned({
        viewportHeight: 720,
        triggerTop: 300,
        positionerHeight: 200,
        listScrollHeight: 400,
        listClientHeight: 200,
        popupMaxHeight: '0px',
      });

      await waitFor(() => {
        expect(positioner.style.bottom).toBe('0px');
      });

      setListScrollTop(100);
      fireEvent.scroll(list);

      // `max-height: 0` is treated as unset, matching the margin/min-height fallbacks, so the
      // popup still grows by the scrolled distance instead of clamping to nothing.
      await waitFor(() => {
        expect(positioner.style.height).toBe('300px');
      });
    });

    it('centers the transform origin when the positioner has no measurable height', async () => {
      const { positioner } = await renderAligned({
        viewportHeight: 720,
        triggerTop: 300,
        positionerHeight: 0,
        listScrollHeight: 400,
        listClientHeight: 200,
        selectedTextTop: 100,
      });

      await waitFor(() => {
        expect(positioner.style.bottom).toBe('0px');
      });

      expect(screen.getByTestId('popup').style.getPropertyValue('--transform-origin')).toBe(
        '50% 50%',
      );
    });

    it('never applies a non-positive height when the viewport collapses below the margins', async () => {
      const { positioner, list, setListScrollTop } = await renderAligned({
        viewportHeight: 720,
        triggerTop: 300,
        positionerHeight: 200,
        listScrollHeight: 400,
        listClientHeight: 200,
      });

      await waitFor(() => {
        expect(positioner.style.bottom).toBe('0px');
      });

      const heightBefore = positioner.style.height;

      // The viewport shrinks to less than the popup's own margins after placement.
      stubProperty(docEl, 'clientHeight', 20);

      setListScrollTop(100);
      fireEvent.scroll(list);

      await waitFor(() => {
        expect(positioner.style.height).toBe(heightBefore);
      });
    });

    it('ignores a pinch-zoomed visual viewport outside WebKit', async () => {
      const { visualViewport } = window;
      if (visualViewport) {
        stubProperty(visualViewport, 'scale', 1.5);
      }

      const { positioner } = await renderAligned({
        viewportHeight: 720,
        triggerTop: 300,
        positionerHeight: 200,
        listScrollHeight: 400,
        listClientHeight: 200,
      });

      // Only WebKit mispositions pinch-zoomed popups, so other engines keep item alignment.
      await waitFor(() => {
        expect(positioner).toHaveAttribute('data-side', 'none');
      });
    });

    it('ignores scroll events bubbling to the popup while a Select.List owns scrolling', async () => {
      const { positioner, list, setListScrollTop } = await renderAligned({
        viewportHeight: 720,
        triggerTop: 300,
        positionerHeight: 200,
        listScrollHeight: 400,
        listClientHeight: 200,
      });

      await waitFor(() => {
        expect(positioner.style.bottom).toBe('0px');
      });

      const heightBefore = positioner.style.height;

      // Give the popup its own (different) scroll geometry so handling it would be detectable.
      const popup = screen.getByTestId('popup');
      Object.defineProperty(popup, 'scrollTop', { value: 50, configurable: true });
      Object.defineProperty(popup, 'scrollHeight', { value: 400, configurable: true });
      Object.defineProperty(popup, 'clientHeight', { value: 200, configurable: true });

      setListScrollTop(100);
      // The list, not the popup, is the scroll container here. Handling the bubbled event on the
      // popup as well would resize using the wrong element's offsets.
      fireEvent.scroll(popup);

      await waitFor(() => {
        expect(positioner.style.height).toBe(heightBefore);
      });

      fireEvent.scroll(list);

      await waitFor(() => {
        expect(positioner.style.height).toBe('300px');
      });
    });

    it('grows the popup when it is itself the scroll container', async () => {
      stubProperty(docEl, 'clientHeight', 720);
      stubProperty(docEl, 'clientWidth', 400);

      let popupScrollTop = 0;

      await render(() => (
        <Select.Root open defaultValue="selected">
          <Select.Trigger
            data-testid="trigger"
            ref={(node) => {
              if (node) {
                stubRect(node, 10, 300, 80, 30);
              }
            }}
          >
            <Select.Value
              ref={(node) => {
                if (node) {
                  stubRect(node, 10, 300, 60, 30);
                }
              }}
            />
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner
              data-testid="positioner"
              ref={(node) => {
                if (node) {
                  stubRect(node, 10, 0, 108, 200);
                }
              }}
            >
              <Select.Popup
                data-testid="popup"
                style={{ 'max-height': 'none' }}
                ref={(node) => {
                  if (!node) {
                    return;
                  }

                  Object.defineProperty(node, 'scrollTop', {
                    configurable: true,
                    get: () => popupScrollTop,
                    set: (value: number) => {
                      popupScrollTop = value;
                    },
                  });
                  stubProperty(node, 'scrollHeight', 400);
                  stubProperty(node, 'clientHeight', 200);
                }}
              >
                <Select.Item value="selected">
                  <Select.ItemText>Selected</Select.ItemText>
                </Select.Item>
                <Select.Item value="other">
                  <Select.ItemText>Other</Select.ItemText>
                </Select.Item>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
      ));

      const positioner = screen.getByTestId('positioner');
      const popup = screen.getByTestId('popup');

      await waitFor(() => {
        expect(positioner.style.bottom).toBe('0px');
      });

      popupScrollTop = 100;
      fireEvent.scroll(popup);

      await waitFor(() => {
        expect(positioner.style.height).toBe('300px');
      });
      expect(popupScrollTop).toBe(0);
    });

    it('closes the aligned popup when the window is resized', async () => {
      const { positioner } = await renderAligned({
        viewportHeight: 720,
        triggerTop: 300,
        positionerHeight: 200,
        listScrollHeight: 400,
        listClientHeight: 200,
        uncontrolledOpen: true,
      });

      await waitFor(() => {
        expect(positioner.style.bottom).toBe('0px');
      });

      // The aligned geometry is measured once, so a resize invalidates it entirely.
      fireEvent(window, new UIEvent('resize'));

      await waitFor(() => {
        expect(screen.queryByRole('listbox')).toBe(null);
      });
    });
  });

  describe('prop: finalFocus', () => {
    it('should focus the trigger by default when closed', async () => {
      await render(() => (
        <div>
          <input />
          <Select.Root>
            <Select.Trigger data-testid="trigger">Open</Select.Trigger>
            <Select.Portal>
              <Select.Positioner>
                <Select.Popup>
                  <Select.Item value="1">Item 1</Select.Item>
                </Select.Popup>
              </Select.Positioner>
            </Select.Portal>
          </Select.Root>
          <input />
        </div>
      ));

      const trigger = screen.getByTestId('trigger');
      await act(async () => {
        trigger.click();
      });

      const item = screen.getByText('Item 1');
      await act(async () => {
        item.click();
      });

      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
    });

    it('should focus the element provided to the prop when closed', async () => {
      function TestComponent() {
        const inputRef = { current: null } as RefObject<HTMLInputElement | null | null>;
        return (
          <div>
            <input />
            <Select.Root>
              <Select.Trigger data-testid="trigger">Open</Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup finalFocus={inputRef}>
                    <Select.Item value="1">Item 1</Select.Item>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
            <input />
            <input
              data-testid="input-to-focus"
              ref={(node) => {
                inputRef.current = node;
              }}
            />
            <input />
          </div>
        );
      }

      await render(() => <TestComponent />);

      const trigger = screen.getByTestId('trigger');
      await act(async () => {
        trigger.click();
      });

      const item = screen.getByText('Item 1');
      await act(async () => {
        item.click();
      });

      const inputToFocus = screen.getByTestId('input-to-focus');

      await waitFor(() => {
        expect(inputToFocus).toHaveFocus();
      });
    });

    it('should focus the element provided to `finalFocus` as a function when closed', async () => {
      function TestComponent() {
        const ref = { current: null } as RefObject<HTMLInputElement | null>;
        const getRef = () => ref.current;
        return (
          <div>
            <Select.Root>
              <Select.Trigger data-testid="trigger">Open</Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup finalFocus={getRef}>
                    <Select.Item value="1">Item 1</Select.Item>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
            <input
              data-testid="input-to-focus"
              ref={(node) => {
                ref.current = node;
              }}
            />
          </div>
        );
      }

      await render(() => <TestComponent />);

      const trigger = screen.getByTestId('trigger');
      await act(async () => {
        trigger.click();
      });

      const item = screen.getByText('Item 1');
      await act(async () => {
        item.click();
      });

      await waitFor(() => {
        expect(screen.getByTestId('input-to-focus')).toHaveFocus();
      });
    });

    it('should not move focus when finalFocus is false', async () => {
      function TestComponent() {
        return (
          <div>
            <Select.Root>
              <Select.Trigger data-testid="trigger">Open</Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup finalFocus={false}>
                    <Select.Item value="1">Item 1</Select.Item>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
        );
      }

      await render(() => <TestComponent />);
      const trigger = screen.getByTestId('trigger');

      await act(async () => {
        trigger.click();
      });

      const item = screen.getByText('Item 1');
      await act(async () => {
        item.click();
      });

      await waitFor(() => {
        expect(trigger).not.toHaveFocus();
      });
    });

    it('should move focus to trigger when finalFocus returns true', async () => {
      function TestComponent() {
        return (
          <div>
            <Select.Root>
              <Select.Trigger data-testid="trigger">Open</Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup finalFocus={() => true}>
                    <Select.Item value="1">Item 1</Select.Item>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
        );
      }

      await render(() => <TestComponent />);
      const trigger = screen.getByTestId('trigger');

      await act(async () => {
        trigger.click();
      });

      const item = screen.getByText('Item 1');
      await act(async () => {
        item.click();
      });

      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
    });

    it('uses default behavior when finalFocus returns null', async () => {
      function TestComponent() {
        return (
          <div>
            <Select.Root>
              <Select.Trigger data-testid="trigger">Open</Select.Trigger>
              <Select.Portal>
                <Select.Positioner>
                  <Select.Popup finalFocus={() => null}>
                    <Select.Item value="1">Item 1</Select.Item>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </div>
        );
      }

      await render(() => <TestComponent />);
      const trigger = screen.getByTestId('trigger');

      await act(async () => {
        trigger.click();
      });

      const item = screen.getByText('Item 1');
      await act(async () => {
        item.click();
      });

      await waitFor(() => {
        expect(trigger).toHaveFocus();
      });
    });
  });
});
