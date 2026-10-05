import { expect, vi, describe, beforeEach, it, afterEach } from 'vitest';
import type { CDPSession } from '@vitest/browser-playwright';
import { createSignal, flush, For, omit, onSettled, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { AlertDialog } from 'base-ui-solid/alert-dialog';
import { Dialog } from 'base-ui-solid/dialog';
import { Menu } from 'base-ui-solid/menu';
import { Select } from 'base-ui-solid/select';
import {
  createRenderer,
  fireEvent,
  flushMicrotasks,
  isJSDOM,
  popupConformanceTests,
  screen,
  wait,
  waitFor,
  refCallback,
} from '#test-utils';
import { NumberField } from 'base-ui-solid/number-field';
import { ScrollArea } from 'base-ui-solid/scroll-area';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { platform } from '@base-ui-solid/utils/platform';
import { useTimeout } from '@base-ui-solid/utils/useTimeout';
import { REASONS } from '../../internals/reasons';
import { useDialogRootContext } from './DialogRootContext';
import { DialogStore } from '../store/DialogStore';
import { DialogInteractions } from './useDialogRoot';

describe('<Dialog.Root />', () => {
  const { render } = createRenderer();

  beforeEach(() => {
    globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
  });

  popupConformanceTests({
    createComponent: (props) => (
      <Dialog.Root {...props.root}>
        <Dialog.Trigger {...props.trigger}>Open dialog</Dialog.Trigger>
        <Dialog.Portal {...props.portal}>
          <Dialog.Popup {...props.popup}>Dialog</Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    ),
    render,
    triggerMouseAction: 'click',
    expectedPopupRole: 'dialog',
  });

  it.skipIf(isJSDOM || !platform.engine.blink)(
    'ignores a native click whose pointerdown opened the dialog',
    async () => {
      const { cdp } = await import('vitest/browser');
      const openChangeSpy = vi.fn();
      const documentClicks: MouseEvent[] = [];

      function App() {
        const [open, setOpen] = createSignal(false);

        return (
          <>
            <button type="button" onPointerDown={() => setOpen(true)}>
              Open
            </button>
            <Dialog.Root
              open={open()}
              onOpenChange={(nextOpen, eventDetails) => {
                openChangeSpy(nextOpen, eventDetails.reason);
                setOpen(nextOpen);
              }}
            >
              <Dialog.Portal>
                <Dialog.Backdrop data-testid="backdrop" style={{ position: 'fixed', inset: 0 }} />
                <Dialog.Popup data-testid="popup">Dialog</Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
          </>
        );
      }

      await render(() => <App />);

      const openButton = screen.getByRole('button', { name: 'Open' });
      const frame = window.frameElement as HTMLIFrameElement | null;
      const frameRect = frame?.getBoundingClientRect();
      const buttonRect = openButton.getBoundingClientRect();
      const buttonCenter = {
        x:
          (frameRect?.left ?? 0) +
          (frame?.clientLeft ?? 0) +
          buttonRect.left +
          buttonRect.width / 2,
        y: (frameRect?.top ?? 0) + (frame?.clientTop ?? 0) + buttonRect.top + buttonRect.height / 2,
      };
      const session = cdp() as CDPSession;

      function recordClick(event: MouseEvent) {
        documentClicks.push(event);
      }

      document.addEventListener('click', recordClick, true);

      try {
        await session.send('Input.dispatchMouseEvent', {
          type: 'mouseMoved',
          ...buttonCenter,
        });
        await session.send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          ...buttonCenter,
          button: 'left',
          buttons: 1,
          clickCount: 1,
        });
        await flushMicrotasks();

        await waitFor(() => {
          expect(screen.queryByTestId('popup')).not.toBe(null);
        });

        await session.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          ...buttonCenter,
          button: 'left',
          buttons: 0,
          clickCount: 1,
        });
        await flushMicrotasks();

        // The browser synthesizes the gesture's click asynchronously after
        // the release; wait for it instead of sleeping a fixed amount.
        await waitFor(() => {
          expect(documentClicks.some((event) => event.isTrusted)).toBe(true);
        });

        const trustedClick = documentClicks.find((event) => event.isTrusted);
        expect(trustedClick?.target).not.toBe(openButton);
        // The click must land outside the popup subtree so it is evaluated as
        // an outside press; a click inside the popup would be ignored for a
        // different reason and stop covering the press-observed guard.
        expect(screen.getByTestId('popup').contains(trustedClick?.target as Node)).toBe(false);
        expect(screen.queryByTestId('popup')).not.toBe(null);
        expect(openChangeSpy).not.toHaveBeenCalledWith(false, REASONS.outsidePress);

        // The guard must only suppress the gesture that opened the dialog. A
        // fresh press observed while open still dismisses — without this the
        // suite would stay green if the press were never recorded for trusted
        // input at all.
        await session.send('Input.dispatchMouseEvent', {
          type: 'mousePressed',
          ...buttonCenter,
          button: 'left',
          buttons: 1,
          clickCount: 1,
        });
        await session.send('Input.dispatchMouseEvent', {
          type: 'mouseReleased',
          ...buttonCenter,
          button: 'left',
          buttons: 0,
          clickCount: 1,
        });
        await flushMicrotasks();

        await waitFor(() => {
          expect(screen.queryByTestId('popup')).toBe(null);
        });
        expect(openChangeSpy).toHaveBeenCalledWith(false, REASONS.outsidePress);
      } finally {
        document.removeEventListener('click', recordClick, true);
      }
    },
  );

  it('reports nested drawer counts before passive effects', async () => {
    const childStore = new DialogStore(
      {
        open: true,
        mounted: true,
        modal: false,
        disablePointerDismissal: false,
      },
      undefined,
      true,
    );
    const parentStore = new DialogStore(undefined, undefined, false);
    let mountPassiveEffectFlushed = false;
    let teardownPassiveEffectFlushed = false;
    let mountedBeforePassiveEffect: boolean | null = null;
    let unmountedBeforePassiveEffect: boolean | null = null;
    let phase: 'mount' | 'teardown' = 'mount';

    Object.assign(parentStore.context, {
      onNestedDialogOpen(dialogCount: number, drawerCount: number) {
        if (drawerCount > 0 && mountedBeforePassiveEffect === null) {
          mountedBeforePassiveEffect = !mountPassiveEffectFlushed;
        }
        if (
          phase === 'teardown' &&
          dialogCount === 0 &&
          drawerCount === 0 &&
          unmountedBeforePassiveEffect === null
        ) {
          unmountedBeforePassiveEffect = !teardownPassiveEffectFlushed;
        }
      },
    });

    // Port note: Solid has a single effect phase (`useIsoLayoutEffect` and `useEffect` are the
    // same), so React's passive effect is modeled with `onSettled`, which runs after it.
    function PassiveEffectBoundary() {
      useIsoLayoutEffect(
        () => () => {
          teardownPassiveEffectFlushed = false;
        },
        () => [],
      );

      onSettled(() => {
        mountPassiveEffectFlushed = true;
        return () => {
          teardownPassiveEffectFlushed = true;
        };
      });

      return null;
    }

    const { unmount } = await render(() => (
      <>
        <PassiveEffectBoundary />
        <DialogInteractions store={childStore} parentContext={parentStore.context} isDrawer />
      </>
    ));

    expect(mountedBeforePassiveEffect).toBe(true);

    phase = 'teardown';
    unmount();
    await flushMicrotasks();

    expect(unmountedBeforePassiveEffect).toBe(true);
  });

  it('keeps trigger ownership when another trigger mounts while open', async () => {
    function Test() {
      const [showSecondTrigger, setShowSecondTrigger] = createSignal(false);

      return (
        <Dialog.Root modal={false}>
          <Dialog.Trigger id="trigger-1">Trigger 1</Dialog.Trigger>
          {showSecondTrigger() && <Dialog.Trigger id="trigger-2">Trigger 2</Dialog.Trigger>}
          <Dialog.Portal>
            <Dialog.Popup>
              <button onClick={() => setShowSecondTrigger(true)}>Mount trigger 2</button>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      );
    }

    const { user } = await render(() => <Test />);
    const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });

    await user.click(trigger1);

    const popup = await screen.findByRole('dialog');
    const trigger1Controls = trigger1.getAttribute('aria-controls');

    expect(trigger1Controls).toBe(popup.getAttribute('id'));

    await user.click(screen.getByRole('button', { name: 'Mount trigger 2' }));

    const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
    expect(trigger1).toHaveAttribute('aria-expanded', 'true');
    expect(trigger1.getAttribute('aria-controls')).toBe(trigger1Controls);
    expect(trigger2).toHaveAttribute('aria-expanded', 'false');
    expect(trigger2).not.toHaveAttribute('aria-controls');
  });

  describe.for([
    { name: 'contained triggers', Component: ContainedTriggerDialog },
    { name: 'detached triggers', Component: DetachedTriggerDialog },
    { name: 'multiple detached triggers', Component: MultipleDetachedTriggersDialog },
  ])('when using $name', ({ Component: TestDialog }) => {
    it('rewires dismiss interactions after closing and reopening', async () => {
      const { user } = await render(() => <TestDialog rootProps={{ modal: false }} />);

      const trigger = screen.getByTestId('trigger');

      await user.click(trigger);
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBe(null);
      });

      await user.keyboard('[Escape]');
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBe(null);
      });

      await user.click(trigger);
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBe(null);
      });

      fireEvent.click(document.body);
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBe(null);
      });
    });

    it('ARIA attributes', async () => {
      // Port note: `children` is a getter so the parts are created inside `<Dialog.Popup>` (a
      // Solid JSX expression creates its components immediately, outside the dialog's context).
      await render(() => (
        <TestDialog
          rootProps={{ modal: false, open: true }}
          popupProps={{
            get children() {
              return (
                <>
                  <Dialog.Title>title text</Dialog.Title>
                  <Dialog.Description>description text</Dialog.Description>
                </>
              );
            },
          }}
          includeBackdrop
        />
      ));

      const popup = screen.queryByRole('dialog');
      expect(popup).not.toBe(null);

      expect(screen.getByText('title text').getAttribute('id')).toBe(
        popup?.getAttribute('aria-labelledby'),
      );
      expect(screen.getByText('description text').getAttribute('id')).toBe(
        popup?.getAttribute('aria-describedby'),
      );
    });

    it('keeps accessible names and descriptions in sync when label parts change', async () => {
      function DynamicLabels() {
        const [phase, setPhase] = createSignal(0);

        // Port note: React remounts the parts through `key`; a keyed `<For>` over the current
        // phase remounts them when it changes.
        return (
          <>
            <For each={phase() < 2 ? [phase()] : []}>
              {(value) => <Dialog.Title>Title {value + 1}</Dialog.Title>}
            </For>
            <For each={phase() < 2 ? [phase()] : []}>
              {(value) => <Dialog.Description>Description {value + 1}</Dialog.Description>}
            </For>
            <button onClick={() => setPhase((value) => value + 1)}>Change labels</button>
          </>
        );
      }

      // Port note: `children` is a getter (see 'ARIA attributes').
      const { user } = await render(() => (
        <TestDialog
          rootProps={{ modal: false, open: true }}
          popupProps={{
            get children() {
              return <DynamicLabels />;
            },
          }}
        />
      ));

      const popup = screen.getByRole('dialog');
      const firstTitleId = screen.getByText('Title 1').getAttribute('id');
      const firstDescriptionId = screen.getByText('Description 1').getAttribute('id');

      expect(popup.getAttribute('aria-labelledby')).toBe(firstTitleId);
      expect(popup.getAttribute('aria-describedby')).toBe(firstDescriptionId);

      await user.click(screen.getByRole('button', { name: 'Change labels' }));

      const secondTitleId = screen.getByText('Title 2').getAttribute('id');
      const secondDescriptionId = screen.getByText('Description 2').getAttribute('id');

      await waitFor(() => {
        expect(popup.getAttribute('aria-labelledby')).toBe(secondTitleId);
      });
      await waitFor(() => {
        expect(popup.getAttribute('aria-describedby')).toBe(secondDescriptionId);
      });
      expect(secondTitleId).not.toBe(firstTitleId);
      expect(secondDescriptionId).not.toBe(firstDescriptionId);

      await user.click(screen.getByRole('button', { name: 'Change labels' }));

      await waitFor(() => {
        expect(popup).not.toHaveAttribute('aria-labelledby');
      });
      await waitFor(() => {
        expect(popup).not.toHaveAttribute('aria-describedby');
      });
    });

    describe('prop: onOpenChange', () => {
      it('calls onOpenChange with the new open state', async () => {
        const handleOpenChange = vi.fn();

        const { user } = await render(() => (
          <TestDialog rootProps={{ onOpenChange: handleOpenChange }} />
        ));

        expect(handleOpenChange.mock.calls.length).toBe(0);

        const openButton = screen.getByText('Open');
        await user.click(openButton);

        expect(handleOpenChange.mock.calls.length).toBe(1);
        expect(handleOpenChange.mock.calls[0][0]).toBe(true);

        const closeButton = screen.getByText('Close');
        await user.click(closeButton);

        expect(handleOpenChange.mock.calls.length).toBe(2);
        expect(handleOpenChange.mock.calls[1][0]).toBe(false);
      });

      it('calls onOpenChange with the reason for change when clicked on trigger and close button', async () => {
        const handleOpenChange = vi.fn();

        const { user } = await render(() => (
          <TestDialog rootProps={{ onOpenChange: handleOpenChange }} />
        ));

        const openButton = screen.getByText('Open');
        await user.click(openButton);

        expect(handleOpenChange.mock.calls.length).toBe(1);
        expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.triggerPress);

        const closeButton = screen.getByText('Close');
        await user.click(closeButton);

        expect(handleOpenChange.mock.calls.length).toBe(2);
        expect(handleOpenChange.mock.calls[1][1].reason).toBe(REASONS.closePress);
      });

      it('reports no trigger when closing with an initial trigger id that is not mounted', async () => {
        const handleOpenChange = vi.fn();
        // Port note: `actionsRef` is a callback, `refCallback` stores the actions here.
        const actionsRef: RefObject<Dialog.Root.Actions | null> = { current: null };

        await render(() => (
          <Dialog.Root
            actionsRef={refCallback(actionsRef)}
            defaultOpen
            defaultTriggerId="missing-trigger"
            modal={false}
            onOpenChange={handleOpenChange}
          >
            <Dialog.Portal>
              <Dialog.Popup>Dialog</Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        ));

        actionsRef.current?.close();
        await flushMicrotasks();

        expect(handleOpenChange.mock.calls.length).toBe(1);
        expect(handleOpenChange.mock.calls[0][0]).toBe(false);
        expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.imperativeAction);
        expect(handleOpenChange.mock.calls[0][1].trigger).toBe(undefined);
      });

      it('calls onOpenChange with the reason for change when pressed Esc while the dialog is open', async () => {
        const handleOpenChange = vi.fn();

        const { user } = await render(() => (
          <TestDialog rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange }} />
        ));

        await user.keyboard('[Escape]');

        expect(handleOpenChange.mock.calls.length).toBe(1);
        expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.escapeKey);
      });

      it('calls onOpenChange with the reason for change when user clicks backdrop while the modal dialog is open', async () => {
        const handleOpenChange = vi.fn();

        const { user } = await render(() => (
          <TestDialog rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange }} />
        ));

        await user.click(screen.getByRole('presentation', { hidden: true }));

        expect(handleOpenChange.mock.calls.length).toBe(1);
        expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.outsidePress);
      });

      it('calls onOpenChange with the reason for change when user clicks outside while the non-modal dialog is open', async () => {
        const handleOpenChange = vi.fn();

        const { user } = await render(() => (
          <TestDialog
            rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange, modal: false }}
          />
        ));

        await user.click(document.body);

        expect(handleOpenChange.mock.calls.length).toBe(1);
        expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.outsidePress);
      });

      describe.skipIf(isJSDOM)('clicks on user backdrop', () => {
        it('detects clicks on user backdrop', async () => {
          const handleOpenChange = vi.fn();

          const { user } = await render(() => (
            <TestDialog
              rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange }}
              popupProps={{ style: { position: 'fixed', 'z-index': 10 } }}
              includeBackdrop
            />
          ));

          await user.click(screen.getByTestId('backdrop'));

          expect(handleOpenChange.mock.calls.length).toBe(1);
          expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.outsidePress);
        });

        it('does not change open state on non-main button clicks', async () => {
          const handleOpenChange = vi.fn();

          const { user } = await render(() => (
            <TestDialog
              rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange }}
              includeBackdrop
            />
          ));

          const backdrop = screen.getByTestId('backdrop');
          await user.pointer([{ target: backdrop }, { keys: '[MouseRight]', target: backdrop }]);

          expect(handleOpenChange.mock.calls.length).toBe(0);
        });
      });

      it('cancel() prevents opening while uncontrolled', async () => {
        const { user } = await render(() => (
          <TestDialog
            rootProps={{
              onOpenChange: (nextOpen, eventDetails) => {
                if (nextOpen) {
                  eventDetails.cancel();
                }
              },
            }}
          />
        ));

        const openButton = screen.getByText('Open');
        await user.click(openButton);
        await flushMicrotasks();

        expect(screen.queryByRole('dialog')).toBe(null);
      });

      it('emits a single internal openchange when closing on Escape', async () => {
        const handleInternalOpenChange = vi.fn();
        // Port note: `children` is a getter (see 'ARIA attributes').
        const { user } = await render(() => (
          <TestDialog
            rootProps={{ defaultOpen: true }}
            popupProps={{
              get children() {
                return (
                  <>
                    <DialogOpenChangeSpy onOpenChange={handleInternalOpenChange} />
                    <p>Dialog content</p>
                    <Dialog.Close>Close</Dialog.Close>
                  </>
                );
              },
            }}
          />
        ));

        await user.keyboard('[Escape]');
        await flushMicrotasks();

        expect(handleInternalOpenChange.mock.calls.length).toBe(1);
        expect(handleInternalOpenChange.mock.calls[0][0]).toMatchObject({
          open: false,
          reason: REASONS.escapeKey,
        });
      });

      it('does not emit internal openchange when an Escape close is canceled', async () => {
        const handleInternalOpenChange = vi.fn();
        // Port note: `children` is a getter (see 'ARIA attributes').
        const { user } = await render(() => (
          <TestDialog
            rootProps={{
              defaultOpen: true,
              onOpenChange: (nextOpen, eventDetails) => {
                if (!nextOpen) {
                  eventDetails.cancel();
                }
              },
            }}
            popupProps={{
              get children() {
                return (
                  <>
                    <DialogOpenChangeSpy onOpenChange={handleInternalOpenChange} />
                    <p>Dialog content</p>
                    <Dialog.Close>Close</Dialog.Close>
                  </>
                );
              },
            }}
          />
        ));

        await user.keyboard('[Escape]');
        await flushMicrotasks();

        expect(screen.queryByRole('dialog')).not.toBe(null);
        expect(handleInternalOpenChange.mock.calls.length).toBe(0);
      });
    });

    describe('prop: disablePointerDismissal', () => {
      (
        [
          [true, false],
          [false, true],
          [undefined, true],
        ] as const
      ).forEach(([disablePointerDismissal, expectDismissed]) => {
        it(`${expectDismissed ? 'closes' : 'does not close'} the dialog when clicking outside if disablePointerDismissal=${disablePointerDismissal}`, async () => {
          const handleOpenChange = vi.fn();

          await render(() => (
            <div data-testid="outside">
              <TestDialog
                rootProps={{
                  defaultOpen: true,
                  onOpenChange: handleOpenChange,
                  disablePointerDismissal,
                  modal: false,
                }}
              />
            </div>
          ));

          const outside = screen.getByTestId('outside');

          fireEvent.mouseDown(outside);
          fireEvent.click(outside);
          // Port note: `fireEvent` doesn't flush Solid's updates (React's `act` does).
          flush();
          expect(handleOpenChange.mock.calls.length === 1).toBe(expectDismissed);
          expect(screen.queryByRole('dialog') === null).toBe(expectDismissed);
        });
      });
    });

    describe('outside press event with backdrops', () => {
      it('uses intentional outside press with user backdrop (mouse): closes on click, not on mousedown', async () => {
        const handleOpenChange = vi.fn();

        await render(() => (
          <TestDialog
            rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange, modal: false }}
            includeBackdrop
          />
        ));

        const backdrop = screen.getByTestId('backdrop');

        fireEvent.mouseDown(backdrop);
        flush();
        expect(screen.queryByRole('dialog')).not.toBe(null);
        expect(handleOpenChange.mock.calls.length).toBe(0);

        fireEvent.click(backdrop);
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).toBe(null);
        });
        expect(handleOpenChange.mock.calls.length).toBe(1);
      });

      it('uses intentional outside press with internal backdrop (modal=true): closes on click, not on mousedown', async () => {
        const handleOpenChange = vi.fn();

        await render(() => (
          <TestDialog
            rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange, modal: true }}
          />
        ));

        const internalBackdrop = screen.getByRole('presentation', { hidden: true });

        fireEvent.mouseDown(internalBackdrop);
        flush();
        expect(screen.queryByRole('dialog')).not.toBe(null);
        expect(handleOpenChange.mock.calls.length).toBe(0);

        fireEvent.click(internalBackdrop);
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).toBe(null);
        });
        expect(handleOpenChange.mock.calls.length).toBe(1);
      });

      it('closing via intentional outside press with user backdrop (modal=true): works when portaled into a shadow DOM', async () => {
        const handleOpenChange = vi.fn();

        const container = document.body.appendChild(document.createElement('div'));
        const shadowRoot = container.attachShadow({ mode: 'open' });

        await render(() => (
          <TestDialog
            rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange, modal: true }}
            portalProps={{ container: shadowRoot }}
            includeBackdrop
          />
        ));

        const backdrop = shadowRoot.querySelector('[data-testid="backdrop"]') as HTMLElement;

        fireEvent.click(backdrop);
        await waitFor(() => {
          expect(shadowRoot.querySelector('[role="dialog"]')).toBe(null);
        });
        expect(handleOpenChange.mock.calls.length).toBe(1);
      });

      it('closing via outside press: works when clicking another element inside the same shadow root', async () => {
        const handleOpenChange = vi.fn();

        const host = document.body.appendChild(document.createElement('div'));
        const shadowRoot = host.attachShadow({ mode: 'open' });
        const container = document.createElement('div');
        shadowRoot.appendChild(container);

        try {
          await render(
            () => (
              <>
                <button data-testid="outside">Outside</button>
                <TestDialog
                  rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange, modal: false }}
                  portalProps={{ container: shadowRoot }}
                />
              </>
            ),
            { container },
          );

          const outsideButton = shadowRoot.querySelector('[data-testid="outside"]') as HTMLElement;

          fireEvent.click(outsideButton);

          await waitFor(() => {
            expect(shadowRoot.querySelector('[role="dialog"]')).toBe(null);
          });

          expect(handleOpenChange.mock.calls.length).toBe(1);
          expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.outsidePress);
        } finally {
          host.remove();
          await flushMicrotasks();
        }
      });

      it('closing via outside press: works when clicking outside the shadow root', async () => {
        const handleOpenChange = vi.fn();

        const host = document.body.appendChild(document.createElement('div'));
        const shadowRoot = host.attachShadow({ mode: 'open' });
        const container = document.createElement('div');
        shadowRoot.appendChild(container);

        try {
          await render(
            () => (
              <TestDialog
                rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange, modal: false }}
                portalProps={{ container: shadowRoot }}
              />
            ),
            { container },
          );

          fireEvent.click(document.body);

          await waitFor(() => {
            expect(shadowRoot.querySelector('[role="dialog"]')).toBe(null);
          });

          expect(handleOpenChange.mock.calls.length).toBe(1);
          expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.outsidePress);
        } finally {
          host.remove();
          await flushMicrotasks();
        }
      });

      it('closing via outside press: works for a modal dialog when clicking outside the shadow root', async () => {
        const handleOpenChange = vi.fn();

        const host = document.body.appendChild(document.createElement('div'));
        const shadowRoot = host.attachShadow({ mode: 'open' });
        const container = document.createElement('div');
        shadowRoot.appendChild(container);

        try {
          await render(
            () => (
              <TestDialog
                rootProps={{ defaultOpen: true, onOpenChange: handleOpenChange, modal: true }}
                portalProps={{ container: shadowRoot }}
              />
            ),
            { container },
          );

          fireEvent.click(document.body);

          await waitFor(() => {
            expect(shadowRoot.querySelector('[role="dialog"]')).toBe(null);
          });

          expect(handleOpenChange.mock.calls.length).toBe(1);
          expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.outsidePress);
        } finally {
          host.remove();
          await flushMicrotasks();
        }
      });
    });

    it.skipIf(isJSDOM)('waits for the exit transition to finish before unmounting', async () => {
      const css = `
    .dialog {
      opacity: 0;
      transition: opacity 200ms;
    }
    .dialog[data-open] {
      opacity: 1;
    }
  `;

      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      const notifyTransitionEnd = vi.fn();

      function TransitionTest(props: { open: boolean }) {
        return (
          <>
            {/* eslint-disable-next-line solid/no-innerhtml */}
            <style innerHTML={css} />
            <TestDialog
              rootProps={{ open: props.open, modal: false }}
              portalProps={{ keepMounted: true }}
              popupProps={{
                class: 'dialog',
                onTransitionEnd: notifyTransitionEnd,
                children: null,
              }}
            />
          </>
        );
      }

      // Port note: `setProps` is replaced by a signal.
      const [open, setOpen] = createSignal(true);
      await render(() => <TransitionTest open={open()} />);

      // Port note: let Chromium paint the initial open state before starting the CSS transition.
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => resolve());
        });
      });
      setOpen(false);
      await flushMicrotasks();
      expect(screen.queryByRole('dialog')).not.toBe(null);

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBe(null);
      });

      // Port note: animation.finished resolves before Chromium dispatches transitionend.
      await waitFor(() => {
        expect(notifyTransitionEnd.mock.calls.length).toBe(1);
      });
    });

    describe('prop: modal', () => {
      it('makes other interactive elements on the page inert when a modal dialog is open', async () => {
        await render(() => <TestDialog rootProps={{ defaultOpen: true, modal: true }} />);

        expect(screen.getByRole('presentation', { hidden: true })).not.toBe(null);
      });

      it('does not make other interactive elements on the page inert when a non-modal dialog is open', async () => {
        await render(() => <TestDialog rootProps={{ defaultOpen: true, modal: false }} />);

        expect(screen.queryByRole('presentation')).toBe(null);
      });

      it('should render an internal backdrop when `true`', async () => {
        const { user } = await render(() => (
          <div>
            <TestDialog rootProps={{ modal: true }} />
            <button>Outside</button>
          </div>
        ));

        const trigger = screen.getByTestId('trigger');

        await user.click(trigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBe(null);
        });

        const popup = screen.getByRole('dialog');

        // focus guard -> internal backdrop
        expect(popup.previousElementSibling?.previousElementSibling).toHaveAttribute(
          'role',
          'presentation',
        );
      });

      it('should not render an internal backdrop when `false`', async () => {
        const { user } = await render(() => (
          <div>
            <TestDialog rootProps={{ modal: false }} />
            <button>Outside</button>
          </div>
        ));

        const trigger = screen.getByTestId('trigger');

        await user.click(trigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBe(null);
        });

        const popup = screen.getByRole('dialog');

        // focus guard -> internal backdrop
        expect(popup.previousElementSibling?.previousElementSibling).toBe(null);
      });
    });

    it('does not dismiss previous modal dialog when clicking new modal dialog', async () => {
      function App() {
        const [openNested, setOpenNested] = createSignal(false);
        const [openNested2, setOpenNested2] = createSignal(false);

        // Port note: `children` is a getter (see 'ARIA attributes').
        return (
          <div>
            <TestDialog
              triggerProps={{ children: 'Open base' }}
              popupProps={{
                get children() {
                  return <button onClick={() => setOpenNested(true)}>Open nested 1</button>;
                },
              }}
            />
            <TestDialog
              rootProps={{ open: openNested(), onOpenChange: (open) => setOpenNested(open) }}
              popupProps={{
                get children() {
                  return <button onClick={() => setOpenNested2(true)}>Open nested 2</button>;
                },
              }}
            />
            <TestDialog
              rootProps={{ open: openNested2(), onOpenChange: (open) => setOpenNested2(open) }}
              popupProps={{ children: 'Final nested' }}
            />
          </div>
        );
      }

      const { user } = await render(() => <App />);

      const trigger = screen.getByRole('button', { name: 'Open base' });
      await user.click(trigger);

      const nestedButton1 = screen.getByRole('button', { name: 'Open nested 1' });
      await user.click(nestedButton1);

      const nestedButton2 = screen.getByRole('button', { name: 'Open nested 2' });
      await user.click(nestedButton2);

      const finalDialog = screen.getByText('Final nested');

      expect(finalDialog).not.toBe(null);
    });

    it('dismisses non-nested dialogs one by one', async () => {
      function App() {
        const [openNested, setOpenNested] = createSignal(false);
        const [openNested2, setOpenNested2] = createSignal(false);

        // Port note: `children` is a getter (see 'ARIA attributes').
        return (
          <div>
            <TestDialog
              triggerProps={{ children: 'Open base' }}
              popupProps={
                {
                  'data-testid': 'level-1',
                  get children() {
                    return <button onClick={() => setOpenNested(true)}>Open nested 1</button>;
                  },
                } as Dialog.Popup.Props
              }
            />
            <TestDialog
              rootProps={{ open: openNested(), onOpenChange: (open) => setOpenNested(open) }}
              popupProps={
                {
                  'data-testid': 'level-2',
                  get children() {
                    return <button onClick={() => setOpenNested2(true)}>Open nested 2</button>;
                  },
                } as Dialog.Popup.Props
              }
            />
            <TestDialog
              rootProps={{ open: openNested2(), onOpenChange: (open) => setOpenNested2(open) }}
              popupProps={
                { 'data-testid': 'level-3', children: 'Final nested' } as Dialog.Popup.Props
              }
            />
          </div>
        );
      }

      await render(() => <App />);

      // Port note: `fireEvent` doesn't flush Solid's updates (React's `act` does).
      const trigger = screen.getByRole('button', { name: 'Open base' });
      fireEvent.click(trigger);
      flush();

      const nestedButton1 = screen.getByRole('button', { name: 'Open nested 1' });
      fireEvent.click(nestedButton1);
      flush();

      const nestedButton2 = screen.getByRole('button', { name: 'Open nested 2' });
      fireEvent.click(nestedButton2);
      flush();

      const backdrops = Array.from(document.querySelectorAll('[role="presentation"]'));
      fireEvent.click(backdrops[backdrops.length - 1]);

      await waitFor(() => {
        expect(screen.queryByTestId('level-3')).toBe(null);
      });

      fireEvent.click(backdrops[backdrops.length - 2]);

      await waitFor(() => {
        expect(screen.queryByTestId('level-2')).toBe(null);
      });

      fireEvent.click(backdrops[backdrops.length - 3]);

      await waitFor(() => {
        expect(screen.queryByTestId('level-1')).toBe(null);
      });
    });

    describe.skipIf(isJSDOM)('nested popups', () => {
      it('should not dismiss the dialog when dismissing outside a nested modal menu', async () => {
        const { user } = await render(() => (
          <TestDialog
            popupProps={{
              get children() {
                return (
                  <Menu.Root>
                    <Menu.Trigger>Open menu</Menu.Trigger>
                    <Menu.Portal>
                      <Menu.Positioner data-testid="menu-positioner">
                        <Menu.Popup>
                          <Menu.Item>Item</Menu.Item>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.Root>
                );
              },
            }}
          />
        ));

        const dialogTrigger = screen.getByRole('button', { name: 'Open' });
        await user.click(dialogTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBe(null);
        });

        const menuTrigger = screen.getByRole('button', { name: 'Open menu' });

        await user.click(menuTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBe(null);
        });

        const menuPositioner = screen.getByTestId('menu-positioner');
        const menuInternalBackdrop = menuPositioner.previousElementSibling as HTMLElement;

        await user.click(menuInternalBackdrop);

        await waitFor(() => {
          expect(screen.queryByRole('menu')).toBe(null);
        });
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBe(null);
        });

        const dialogPopup = screen.getByTestId('dialog-popup');
        const dialogInternalBackdrop = dialogPopup.previousElementSibling
          ?.previousElementSibling as HTMLElement;

        await user.click(dialogInternalBackdrop);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).toBe(null);
        });
      });

      it('should not dismiss the dialog when dismissing outside a nested select popup', async () => {
        const { user } = await render(() => (
          <TestDialog
            popupProps={{
              get children() {
                return (
                  <Select.Root>
                    <Select.Trigger data-testid="select-trigger">Open select</Select.Trigger>
                    <Select.Portal>
                      <Select.Positioner data-testid="select-positioner">
                        <Select.Popup>
                          <Select.Item>Item</Select.Item>
                        </Select.Popup>
                      </Select.Positioner>
                    </Select.Portal>
                  </Select.Root>
                );
              },
            }}
          />
        ));

        const dialogTrigger = screen.getByRole('button', { name: 'Open' });
        await user.click(dialogTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBe(null);
        });

        const selectTrigger = screen.getByTestId('select-trigger');

        await user.click(selectTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('listbox')).not.toBe(null);
        });

        const selectPositioner = screen.getByTestId('select-positioner');
        const selectInternalBackdrop = selectPositioner.previousElementSibling as HTMLElement;

        await user.click(selectInternalBackdrop);

        await waitFor(() => {
          expect(screen.queryByRole('listbox')).toBe(null);
        });
        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBe(null);
        });

        const dialogPopup = screen.getByTestId('dialog-popup');
        const dialogInternalBackdrop = dialogPopup.previousElementSibling
          ?.previousElementSibling as HTMLElement;

        await user.click(dialogInternalBackdrop);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).toBe(null);
        });
      });

      it('should not close the parent menu when Escape is pressed in a nested dialog', async () => {
        const { user } = await render(() => (
          <Menu.Root>
            <Menu.Trigger>Open menu</Menu.Trigger>
            <Menu.Portal>
              <Menu.Positioner>
                <Menu.Popup>
                  <TestDialog
                    triggerProps={{
                      children: 'Open dialog',
                      render: (props) => (
                        <Menu.Item
                          {...(props as Menu.Item.Props)}
                          closeOnClick={false}
                          nativeButton
                          render="button"
                        />
                      ),
                    }}
                  />
                </Menu.Popup>
              </Menu.Positioner>
            </Menu.Portal>
          </Menu.Root>
        ));

        const menuTrigger = screen.getByRole('button', { name: 'Open menu' });
        await user.click(menuTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBe(null);
        });

        const dialogTrigger = screen.getByRole('menuitem', { name: 'Open dialog' });
        await user.click(dialogTrigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBe(null);
        });

        await user.keyboard('[Escape]');

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).toBe(null);
        });
        await waitFor(() => {
          expect(screen.queryByRole('menu')).not.toBe(null);
        });
      });
    });

    describe('prop: actionsRef', () => {
      it('unmounts the dialog when the `unmount` method is called', async () => {
        // Port note: `actionsRef` is a callback, `refCallback` stores the actions here.
        const actionsRef = {
          current: {
            unmount: vi.fn(),
            close: vi.fn(),
          },
        };

        const { user } = await render(() => (
          <TestDialog
            rootProps={{
              actionsRef: refCallback(actionsRef),
              onOpenChange: (open, details) => {
                details.preventUnmountOnClose();
              },
            }}
          />
        ));

        const trigger = screen.getByRole('button', { name: 'Open' });
        await user.click(trigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBe(null);
        });

        await user.click(trigger);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).not.toBe(null);
        });

        actionsRef.current.unmount();
        await flushMicrotasks();

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).toBe(null);
        });
      });
    });

    describe.skipIf(isJSDOM)('pointerdown removal', () => {
      it('moves focus to the popup when a focused child is removed on pointerdown and outside press still dismisses', async () => {
        function Test() {
          const [showButton, setShowButton] = createSignal(true);
          // Port note: `children` is a getter (see 'ARIA attributes').
          return (
            <TestDialog
              rootProps={{ defaultOpen: true, modal: 'trap-focus' }}
              popupProps={{
                get children() {
                  return (
                    <Show when={showButton()}>
                      <button data-testid="remove" onPointerDown={() => setShowButton(false)}>
                        Remove on pointer down
                      </button>
                    </Show>
                  );
                },
              }}
            />
          );
        }

        const { user } = await render(() => <Test />);

        const removeButton = screen.getByTestId('remove');
        await waitFor(() => {
          expect(removeButton).toHaveFocus();
        });
        fireEvent.pointerDown(removeButton);

        const popup = screen.getByTestId('dialog-popup');
        await waitFor(() => {
          expect(popup).toHaveFocus();
        });

        await user.click(document.body);

        await waitFor(() => {
          expect(screen.queryByRole('dialog')).toBe(null);
        });
      });

      it('dismisses on first outside click after NumberField scrub interaction (pointer lock path)', async () => {
        const originalRequestPointerLock = Element.prototype.requestPointerLock;
        const requestPointerLockSpy = vi.fn(() => Promise.resolve());

        try {
          Element.prototype.requestPointerLock =
            requestPointerLockSpy as typeof originalRequestPointerLock;

          // Port note: `children` is a getter (see 'ARIA attributes').
          await render(() => (
            <ContainedTriggerDialog
              rootProps={{ defaultOpen: true, modal: false }}
              popupProps={{
                get children() {
                  return (
                    <NumberField.Root defaultValue={100}>
                      <NumberField.ScrubArea data-testid="scrub-area">
                        <span>Amount</span>
                      </NumberField.ScrubArea>
                      <NumberField.Input aria-label="Amount" />
                    </NumberField.Root>
                  );
                },
              }}
            />
          ));

          const scrubArea = screen.getByTestId('scrub-area');

          fireEvent.pointerDown(scrubArea, { pointerType: 'mouse', button: 0 });
          fireEvent.mouseDown(scrubArea, { button: 0 });
          fireEvent.pointerUp(document.body, { pointerType: 'mouse', button: 0 });
          fireEvent.mouseUp(document.body, { button: 0 });
          await flushMicrotasks();

          // Port note: the pointer-lock synthetic click guard expires in a task.
          await wait(0);
          fireEvent.click(document.body);

          await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBe(null);
          });
          expect(requestPointerLockSpy.mock.calls.length).toBe(1);
        } finally {
          Element.prototype.requestPointerLock = originalRequestPointerLock;
        }
      });
    });

    describe.skipIf(isJSDOM)('prop: onOpenChangeComplete', () => {
      it('is called on close when there is no exit animation defined', async () => {
        const onOpenChangeComplete = vi.fn();

        function Test() {
          const [open, setOpen] = createSignal(true);
          return (
            <div>
              <button onClick={() => setOpen(false)}>Close externally</button>
              <TestDialog rootProps={{ open: open(), onOpenChangeComplete }} />
            </div>
          );
        }

        const { user } = await render(() => <Test />);

        const closeButton = screen.getByText('Close externally');
        await user.click(closeButton);

        await waitFor(() => {
          expect(screen.queryByTestId('dialog-popup')).toBe(null);
        });

        expect(onOpenChangeComplete.mock.calls[0][0]).toBe(true);
        expect(onOpenChangeComplete.mock.lastCall?.[0]).toBe(false);
      });

      it('is called on close when the exit animation finishes', async () => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

        const onOpenChangeComplete = vi.fn();

        function Test() {
          const style = `
        @keyframes test-anim {
          to {
            opacity: 0;
          }
        }

        .animation-test-indicator[data-ending-style] {
          animation: test-anim 1ms;
        }
      `;

          const [open, setOpen] = createSignal(true);

          return (
            <div>
              {/* eslint-disable-next-line solid/no-innerhtml */}
              <style innerHTML={style} />
              <button onClick={() => setOpen(false)}>Close externally</button>
              <TestDialog
                rootProps={{ open: open(), onOpenChangeComplete }}
                popupProps={{
                  class: 'animation-test-indicator',
                }}
              />
            </div>
          );
        }

        const { user } = await render(() => <Test />);

        expect(screen.getByTestId('dialog-popup')).not.toBe(null);

        // Wait for open animation to finish
        await waitFor(() => {
          expect(onOpenChangeComplete.mock.calls[0][0]).toBe(true);
        });

        const closeButton = screen.getByText('Close externally');
        await user.click(closeButton);

        await waitFor(() => {
          expect(screen.queryByTestId('dialog-popup')).toBe(null);
        });

        expect(onOpenChangeComplete.mock.lastCall?.[0]).toBe(false);
      });

      it('is called on open when there is no enter animation defined', async () => {
        const onOpenChangeComplete = vi.fn();

        function Test() {
          const [open, setOpen] = createSignal(false);
          return (
            <div>
              <button onClick={() => setOpen(true)}>Open externally</button>
              <TestDialog rootProps={{ open: open(), onOpenChangeComplete }} />
            </div>
          );
        }

        const { user } = await render(() => <Test />);

        const openButton = screen.getByText('Open externally');
        await user.click(openButton);

        await waitFor(() => {
          expect(screen.queryByTestId('dialog-popup')).not.toBe(null);
        });

        // Port note: React re-renders the popup during the opening commit and runs this completion
        // twice; Solid mounts the popup once and reports the same completed open once.
        expect(onOpenChangeComplete.mock.calls.length).toBe(1);
        expect(onOpenChangeComplete.mock.calls[0][0]).toBe(true);
      });

      it('is called on open when the enter animation finishes', async () => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

        const onOpenChangeComplete = vi.fn();

        function Test() {
          const style = `
          @keyframes test-anim {
            from {
              opacity: 0;
            }
          }

          .animation-test-indicator[data-starting-style] {
            animation: test-anim 1ms;
          }
        `;

          const [open, setOpen] = createSignal(false);

          return (
            <div>
              {/* eslint-disable-next-line solid/no-innerhtml */}
              <style innerHTML={style} />
              <button onClick={() => setOpen(true)}>Open externally</button>
              <TestDialog
                rootProps={{
                  open: open(),
                  onOpenChange: (nextOpen) => setOpen(nextOpen),
                  onOpenChangeComplete,
                }}
                popupProps={{
                  class: 'animation-test-indicator',
                }}
              />
            </div>
          );
        }

        const { user } = await render(() => <Test />);

        const openButton = screen.getByText('Open externally');
        await user.click(openButton);

        // Wait for open animation to finish
        await waitFor(() => {
          expect(onOpenChangeComplete.mock.calls[0][0]).toBe(true);
        });

        expect(screen.queryByTestId('dialog-popup')).not.toBe(null);
      });

      it('waits for a restarted enter animation to finish', async () => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

        const onOpenChangeComplete = vi.fn();

        function Test() {
          const style = `
            @keyframes test-enter-a {
              from {
                opacity: 0;
              }
            }

            @keyframes test-enter-b {
              from {
                opacity: 0;
              }
            }

            .animation-test-indicator.animation-a[data-open] {
              animation: test-enter-a 50ms linear;
            }

            .animation-test-indicator.animation-b[data-open] {
              animation: test-enter-b 50ms linear;
            }
          `;

          const [open, setOpen] = createSignal(false);
          const [variant, setVariant] = createSignal<'a' | 'b'>('a');

          return (
            <div>
              {/* eslint-disable-next-line solid/no-innerhtml */}
              <style innerHTML={style} />
              <button onClick={() => setOpen(true)}>Open externally</button>
              <button onClick={() => setVariant((v) => (v === 'a' ? 'b' : 'a'))}>
                Swap animation
              </button>
              <TestDialog
                rootProps={{
                  open: open(),
                  onOpenChange: (nextOpen) => setOpen(nextOpen),
                  onOpenChangeComplete,
                }}
                popupProps={{
                  class: `animation-test-indicator animation-${variant()}`,
                }}
              />
            </div>
          );
        }

        const { user } = await render(() => <Test />);

        const openButton = screen.getByText('Open externally');
        await user.click(openButton);

        const popup = screen.getByTestId('dialog-popup');
        await waitFor(() => {
          expect(popup.getAnimations().length).not.toBe(0);
        });

        const swapButton = screen.getByText('Swap animation');
        await user.click(swapButton);

        await flushMicrotasks();
        expect(onOpenChangeComplete.mock.calls.length).toBe(0);

        await waitFor(() => {
          expect(onOpenChangeComplete.mock.calls.length).toBe(1);
          expect(onOpenChangeComplete.mock.calls[0][0]).toBe(true);
        });
      });

      it('does not get called on open when dismissed during the enter animation', async () => {
        globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

        const onOpenChangeComplete = vi.fn();

        function Test() {
          const style = `
            .animation-test-indicator {
              opacity: 0;
              transition: opacity 200ms linear;
            }

            .animation-test-indicator[data-open] {
              opacity: 1;
            }

            .animation-test-indicator[data-open][data-starting-style] {
              opacity: 0;
            }

            .animation-test-indicator[data-ending-style] {
              opacity: 0;
            }
          `;

          const [open, setOpen] = createSignal(false);

          return (
            <div>
              {/* eslint-disable-next-line solid/no-innerhtml */}
              <style innerHTML={style} />
              <button onClick={() => setOpen(true)}>Open externally</button>
              <TestDialog
                rootProps={{
                  open: open(),
                  onOpenChange: (nextOpen) => setOpen(nextOpen),
                  onOpenChangeComplete,
                }}
                popupProps={{
                  class: 'animation-test-indicator',
                }}
              />
            </div>
          );
        }

        const { user } = await render(() => <Test />);

        const openButton = screen.getByText('Open externally');
        await user.click(openButton);

        await waitFor(() => {
          expect(screen.queryByTestId('dialog-popup')).not.toBe(null);
        });

        const popup = screen.getByTestId('dialog-popup');
        await waitFor(() => {
          const animations = popup.getAnimations();
          expect(animations.length).not.toBe(0);
          expect(animations.some((anim) => anim.playState !== 'finished')).toBe(true);
        });

        await user.click(document.body);

        await waitFor(() => {
          expect(screen.queryByTestId('dialog-popup')).toBe(null);
        });

        expect(onOpenChangeComplete.mock.calls.length).toBe(1);
        expect(onOpenChangeComplete.mock.calls[0][0]).toBe(false);
      });

      it('does not get called on mount when not open', async () => {
        const onOpenChangeComplete = vi.fn();

        await render(() => <TestDialog rootProps={{ onOpenChangeComplete }} />);

        expect(onOpenChangeComplete.mock.calls.length).toBe(0);
      });
    });
  });

  it('does not close on a right-button outside press', async () => {
    const handleOpenChange = vi.fn();

    await render(() => (
      <div>
        <button data-testid="outside">Outside</button>
        <Dialog.Root defaultOpen modal="trap-focus" onOpenChange={handleOpenChange}>
          <Dialog.Portal>
            <Dialog.Popup>Dialog</Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      </div>
    ));

    fireEvent.pointerDown(screen.getByTestId('outside'), {
      bubbles: true,
      button: 2,
      pointerType: 'mouse',
    });

    await flushMicrotasks();

    expect(screen.getByRole('dialog')).not.toBe(null);
    expect(handleOpenChange.mock.calls.length).toBe(0);
  });

  describe('closed shadow root', () => {
    let host: HTMLElement;
    let shadowRoot: ShadowRoot;
    let container: HTMLElement;

    beforeEach(() => {
      host = document.body.appendChild(document.createElement('div'));
      shadowRoot = host.attachShadow({ mode: 'closed' });
      container = shadowRoot.appendChild(document.createElement('div'));
    });

    afterEach(async () => {
      host.remove();
      await flushMicrotasks();
    });

    async function query(testId: string) {
      const selector = `[data-testid="${testId}"]`;
      return waitFor(() => {
        const element = shadowRoot.querySelector(selector) ?? document.querySelector(selector);
        expect(element).not.toBe(null);
        return element as HTMLElement;
      });
    }

    async function click(testId: string) {
      const element = await query(testId);
      // For trusted input, the browser flushes Solid's microtask-scheduled update before
      // the press reaches the shadow host. Synthetic dispatch would defer it.
      // Port note: React's `flushSync` (and the `IS_REACT_ACT_ENVIRONMENT` toggle) → Solid's `flush`.
      const flushUpdates = () => flush();
      shadowRoot.addEventListener('click', flushUpdates);
      try {
        element.click();
      } finally {
        shadowRoot.removeEventListener('click', flushUpdates);
      }
      await flushMicrotasks();
    }

    type PortalContainer = 'shadow root' | 'body' | undefined;

    const resolveContainer = (target: PortalContainer) =>
      target && { 'shadow root': shadowRoot, body: document.body }[target];

    const nestedKinds = [
      {
        name: 'modal dialog',
        modal: true,
        render: (portalContainer: ShadowRoot | HTMLElement | undefined) => (
          <Dialog.Root>
            <Dialog.Trigger data-testid="open-nested">Open nested</Dialog.Trigger>
            <Dialog.Portal container={portalContainer}>
              <Dialog.Backdrop />
              <Dialog.Popup data-testid="nested">
                <Dialog.Close data-testid="close-nested">Close</Dialog.Close>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        ),
      },
      {
        name: 'non-modal dialog',
        modal: false,
        render: (portalContainer: ShadowRoot | HTMLElement | undefined) => (
          <Dialog.Root modal={false}>
            <Dialog.Trigger data-testid="open-nested">Open nested</Dialog.Trigger>
            <Dialog.Portal container={portalContainer}>
              <Dialog.Popup data-testid="nested">
                <Dialog.Close data-testid="close-nested">Close</Dialog.Close>
              </Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        ),
      },
      {
        name: 'alert dialog',
        modal: true,
        render: (portalContainer: ShadowRoot | HTMLElement | undefined) => (
          <AlertDialog.Root>
            <AlertDialog.Trigger data-testid="open-nested">Open nested</AlertDialog.Trigger>
            <AlertDialog.Portal container={portalContainer}>
              <AlertDialog.Backdrop />
              <AlertDialog.Popup data-testid="nested">
                <AlertDialog.Close data-testid="close-nested">Close</AlertDialog.Close>
              </AlertDialog.Popup>
            </AlertDialog.Portal>
          </AlertDialog.Root>
        ),
      },
    ];

    // `undefined` means the portal's default: the parent portal's node, else the body.
    const portalSetups: Array<{ outer: PortalContainer; nested: PortalContainer }> = [
      { outer: 'shadow root', nested: undefined },
      { outer: 'shadow root', nested: 'shadow root' },
      { outer: 'shadow root', nested: 'body' },
      { outer: undefined, nested: undefined },
      { outer: undefined, nested: 'shadow root' },
    ];

    describe.for(nestedKinds)('nested $name', (nestedKind) => {
      it.for(portalSetups)(
        'keeps the parent open on close (outer: $outer, nested: $nested)',
        async ({ outer, nested }) => {
          const handleOpenChange = vi.fn();

          await render(
            () => (
              <Dialog.Root defaultOpen modal={nestedKind.modal} onOpenChange={handleOpenChange}>
                <Dialog.Portal container={resolveContainer(outer)}>
                  {nestedKind.modal && <Dialog.Backdrop />}
                  <Dialog.Popup data-testid="outer">
                    {nestedKind.render(resolveContainer(nested))}
                  </Dialog.Popup>
                </Dialog.Portal>
              </Dialog.Root>
            ),
            { container },
          );

          await click('open-nested');
          await query('nested');

          await click('close-nested');

          expect(await query('outer')).not.toBe(null);
          expect(shadowRoot.querySelector('[data-testid="nested"]')).toBe(null);
          expect(document.querySelector('[data-testid="nested"]')).toBe(null);
          expect(handleOpenChange).not.toHaveBeenCalled();
        },
      );
    });

    it('still dismisses on a press outside the popup', async () => {
      const handleOpenChange = vi.fn();

      await render(
        () => (
          <>
            <div data-testid="outside">Outside</div>
            <Dialog.Root defaultOpen modal={false} onOpenChange={handleOpenChange}>
              <Dialog.Portal container={shadowRoot}>
                <Dialog.Popup data-testid="outer" />
              </Dialog.Portal>
            </Dialog.Root>
          </>
        ),
        { container },
      );

      await query('outer');
      await click('outside');

      expect(shadowRoot.querySelector('[data-testid="outer"]')).toBe(null);
      expect(handleOpenChange.mock.calls.length).toBe(1);
      expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.outsidePress);
    });
  });

  describe.skipIf(isJSDOM)('touch outside press', () => {
    function createTouch(
      target: EventTarget,
      point: { clientX: number; clientY: number },
      identifier = 1,
    ) {
      return new Touch({ identifier, target, ...point });
    }

    // Simulates a finger tapping outside the dialog: a `touchstart`, a small
    // (~6px) `touchmove` that marks the press as a dismiss without crossing the
    // 10px threshold that would dismiss during the move itself, and a `touchend`
    // whose lifted point is reported in `changedTouches` (`touches` is empty),
    // mirroring real browsers.
    function tapOutside(element: HTMLElement) {
      const start = { clientX: 50, clientY: 50 };
      const end = { clientX: 50, clientY: 56 };

      fireEvent.touchStart(element, {
        bubbles: true,
        touches: [createTouch(element, start)],
      });

      fireEvent.touchMove(element, {
        bubbles: true,
        touches: [createTouch(element, end)],
      });

      fireEvent.touchEnd(element, {
        bubbles: true,
        changedTouches: [createTouch(element, end)],
      });
    }

    async function expectClosesOnTouchTapOutside(modal: false | 'trap-focus') {
      const handleOpenChange = vi.fn();

      await render(() => (
        <div>
          <button data-testid="outside">Outside</button>
          <Dialog.Root defaultOpen modal={modal} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
              <Dialog.Popup>Dialog</Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      ));

      expect(screen.queryByRole('dialog')).not.toBe(null);

      tapOutside(screen.getByTestId('outside'));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBe(null);
      });
      expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.outsidePress);
    }

    it('closes a non-modal dialog without a backdrop', async () => {
      await expectClosesOnTouchTapOutside(false);
    });

    it('closes a trap-focus dialog without a backdrop', async () => {
      await expectClosesOnTouchTapOutside('trap-focus');
    });

    it('does not close when another touch is still active on touchend', async () => {
      const handleOpenChange = vi.fn();

      await render(() => (
        <div>
          <button data-testid="outside">Outside</button>
          <Dialog.Root defaultOpen modal={false} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
              <Dialog.Popup>Dialog</Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      ));

      const outside = screen.getByTestId('outside');
      const touch1Start = createTouch(outside, { clientX: 50, clientY: 50 });
      const touch2Start = createTouch(outside, { clientX: 70, clientY: 70 });
      const touch1End = createTouch(outside, { clientX: 50, clientY: 56 });

      fireEvent.touchStart(outside, {
        bubbles: true,
        touches: [touch1Start, touch2Start],
      });

      fireEvent.touchMove(outside, {
        bubbles: true,
        touches: [touch1End, touch2Start],
      });

      fireEvent.touchEnd(outside, {
        bubbles: true,
        changedTouches: [touch1End],
        touches: [touch2Start],
      });

      await flushMicrotasks();

      expect(screen.queryByRole('dialog')).not.toBe(null);
      expect(handleOpenChange.mock.calls.length).toBe(0);
    });

    it('does not close when two touches are lifted simultaneously on touchend', async () => {
      const handleOpenChange = vi.fn();

      await render(() => (
        <div>
          <button data-testid="outside">Outside</button>
          <Dialog.Root defaultOpen modal={false} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
              <Dialog.Popup>Dialog</Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      ));

      const outside = screen.getByTestId('outside');
      const touch1Start = createTouch(outside, { clientX: 50, clientY: 50 });
      const touch2Start = createTouch(outside, { clientX: 70, clientY: 70 });
      const touch1End = createTouch(outside, { clientX: 50, clientY: 56 });
      const touch2End = createTouch(outside, { clientX: 70, clientY: 76 });

      fireEvent.touchStart(outside, {
        bubbles: true,
        touches: [touch1Start, touch2Start],
      });

      fireEvent.touchMove(outside, {
        bubbles: true,
        touches: [touch1End, touch2End],
      });

      fireEvent.touchEnd(outside, {
        bubbles: true,
        changedTouches: [touch1End, touch2End],
        touches: [],
      });

      await flushMicrotasks();

      expect(screen.queryByRole('dialog')).not.toBe(null);
      expect(handleOpenChange.mock.calls.length).toBe(0);
    });

    it('does not close when multiple touches move past the drag dismissal threshold', async () => {
      const handleOpenChange = vi.fn();

      await render(() => (
        <div>
          <button data-testid="outside">Outside</button>
          <Dialog.Root defaultOpen modal={false} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
              <Dialog.Popup>Dialog</Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      ));

      const outside = screen.getByTestId('outside');
      const touch1Start = createTouch(outside, { clientX: 50, clientY: 50 });
      const touch2Start = createTouch(outside, { clientX: 70, clientY: 70 }, 2);
      const touch1Move = createTouch(outside, { clientX: 50, clientY: 70 });
      const touch2Move = createTouch(outside, { clientX: 70, clientY: 90 }, 2);

      fireEvent.touchStart(outside, {
        bubbles: true,
        touches: [touch1Start, touch2Start],
      });

      fireEvent.touchMove(outside, {
        bubbles: true,
        touches: [touch1Move, touch2Move],
      });

      await flushMicrotasks();

      expect(screen.queryByRole('dialog')).not.toBe(null);
      expect(handleOpenChange.mock.calls.length).toBe(0);
    });

    it('closes as soon as a single touch moves past the drag dismissal threshold', async () => {
      const handleOpenChange = vi.fn();

      await render(() => (
        <div>
          <button data-testid="outside">Outside</button>
          <Dialog.Root defaultOpen modal={false} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
              <Dialog.Popup>Dialog</Dialog.Popup>
            </Dialog.Portal>
          </Dialog.Root>
        </div>
      ));

      const outside = screen.getByTestId('outside');
      const touchStart = createTouch(outside, { clientX: 50, clientY: 50 });
      const touchMove = createTouch(outside, { clientX: 50, clientY: 70 });

      fireEvent.touchStart(outside, {
        bubbles: true,
        touches: [touchStart],
      });

      fireEvent.touchMove(outside, {
        bubbles: true,
        touches: [touchMove],
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBe(null);
      });
      expect(handleOpenChange.mock.calls.length).toBe(1);
      expect(handleOpenChange.mock.calls[0][1].reason).toBe(REASONS.outsidePress);
    });
  });

  describe('external scroll lock handoff', () => {
    afterEach(() => {
      document.documentElement.removeAttribute('style');
      document.body.removeAttribute('style');
      document.body.removeAttribute('data-scroll-locked');
    });

    // Each entry reproduces a real third-party locker's exact DOM mechanism. Their cleanup is
    // deferred past our own deferred lock, which is what an exit animation does in practice.
    describe.skipIf(isJSDOM)('when a third-party overlay is still unlocking', () => {
      describe.for([
        {
          name: 'react-remove-scroll, via an attribute and a stylesheet',
          lock: () => {
            const style = document.createElement('style');
            style.textContent = 'body[data-scroll-locked]{overflow:hidden!important;}';
            document.head.appendChild(style);
            document.body.setAttribute('data-scroll-locked', '1');
            return () => {
              style.remove();
              document.body.removeAttribute('data-scroll-locked');
            };
          },
        },
        {
          name: 'silk-hq, via the <body> overflow shorthand',
          lock: () => {
            document.body.style.setProperty('overflow', 'hidden');
            return () => document.body.style.removeProperty('overflow');
          },
        },
        {
          name: 'Ariakit, via <html> overflow longhands',
          lock: () => {
            const { style } = document.documentElement;
            style.setProperty('scrollbar-gutter', 'stable');
            style.setProperty('overflow-x', 'hidden');
            style.setProperty('overflow-y', 'hidden');
            return () => {
              style.removeProperty('scrollbar-gutter');
              style.removeProperty('overflow-x');
              style.removeProperty('overflow-y');
            };
          },
        },
      ])('$name', ({ lock }) => {
        it('keeps the page locked until it takes over, and unlocks on close', async () => {
          function App() {
            const [open, setOpen] = createSignal(false);
            const timeout = useTimeout();

            return (
              <>
                <button
                  onClick={() => {
                    timeout.start(200, lock());
                    setOpen(true);
                  }}
                >
                  Open dialog
                </button>
                <Dialog.Root open={open()} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
                  <Dialog.Portal>
                    <Dialog.Popup>
                      <Dialog.Close>Close dialog</Dialog.Close>
                    </Dialog.Popup>
                  </Dialog.Portal>
                </Dialog.Root>
              </>
            );
          }

          await render(() => <App />);
          expect(`initial: ${isPageLocked()}`).toBe('initial: false');

          fireEvent.click(screen.getByRole('button', { name: 'Open dialog' }));
          await waitFor(() => {
            expect(screen.queryByRole('dialog')).not.toBe(null);
          });

          // Spans the external unlock at 200ms: there must be no gap where the page scrolls.
          for (const at of [0, 120, 260, 400]) {
            // eslint-disable-next-line no-await-in-loop
            await wait(at === 0 ? 0 : 140);
            flush();
            expect(`t${at}: ${isPageLocked()}`).toBe(`t${at}: true`);
          }

          fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
          await waitFor(() => {
            expect(screen.queryByRole('dialog')).toBe(null);
          });
          await waitFor(() => {
            expect(`after close: ${isPageLocked()}`).toBe('after close: false');
          });
        });
      });
    });

    it('locks immediately when an external <body> lock cannot affect the page', async () => {
      // <html> owns the viewport scroll, so `overflow: hidden` on <body> leaves the page
      // scrollable and must not be mistaken for an effective lock.
      document.documentElement.style.overflowY = 'scroll';
      document.body.style.overflowY = 'hidden';

      await render(() => (
        <Dialog.Root defaultOpen>
          <Dialog.Portal>
            <Dialog.Popup>
              <Dialog.Close>Close dialog</Dialog.Close>
            </Dialog.Popup>
          </Dialog.Portal>
        </Dialog.Root>
      ));

      // Flush the scroll locker's deferred lock, scheduled on a 0ms timeout.
      await wait(0);
      flush();

      expect(hasOwnScrollLock(document)).toBe(true);

      fireEvent.click(screen.getByRole('button', { name: 'Close dialog' }));
      await waitFor(() => {
        expect(hasOwnScrollLock(document)).toBe(false);
      });
    });
  });

  it.skipIf(isJSDOM)(
    'returns focus to the menu trigger when a detached dialog trigger unmounts',
    async () => {
      function MenuDialog() {
        const dialogHandle = Dialog.createHandle();

        return (
          <>
            <Menu.Root>
              <Menu.Trigger>Open menu</Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner>
                  <Menu.Popup>
                    <Menu.Item
                      render={(props) => (
                        <Dialog.Trigger
                          {...(props as Dialog.Trigger.Props)}
                          handle={dialogHandle}
                        />
                      )}
                      nativeButton
                    >
                      Open dialog
                    </Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>

            <Dialog.Root handle={dialogHandle}>
              <Dialog.Portal>
                <Dialog.Popup>Dialog content</Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>
          </>
        );
      }

      const { user } = await render(() => <MenuDialog />);

      const menuTrigger = screen.getByRole('button', { name: 'Open menu' });
      await user.click(menuTrigger);

      const menu = await screen.findByRole('menu');
      await waitFor(() => {
        expect(menu).toHaveFocus();
      });

      const dialogTrigger = await screen.findByRole('menuitem', { name: 'Open dialog' });
      await user.click(dialogTrigger);

      await waitFor(() => {
        expect(screen.queryByRole('menu')).toBe(null);
        expect(screen.queryByRole('dialog')).not.toBe(null);
      });

      await user.keyboard('[Escape]');

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).toBe(null);
      });
      await waitFor(() => {
        expect(menuTrigger).toHaveFocus();
      });
    },
  );

  it.skipIf(isJSDOM)(
    'keeps focus trapped when dialog content contains a non-scrollable scroll area',
    async () => {
      // Port note: `children` is a getter (see 'ARIA attributes').
      const { user } = await render(() => (
        <div>
          <button data-testid="outside-before">Outside before</button>
          <ContainedTriggerDialog
            rootProps={{ defaultOpen: true, modal: 'trap-focus' }}
            popupProps={{
              get children() {
                return (
                  <ScrollArea.Root style={{ width: '200px', height: '200px' }}>
                    <ScrollArea.Viewport
                      data-testid="viewport"
                      style={{ width: '100%', height: '100%' }}
                    >
                      <div style={{ width: '100px', height: '100px' }}>Non-scrollable content</div>
                    </ScrollArea.Viewport>
                  </ScrollArea.Root>
                );
              },
            }}
            omitTrigger
          />
          <button data-testid="outside-after">Outside after</button>
        </div>
      ));

      const popup = screen.getByRole('dialog');
      const outsideBefore = screen.getByTestId('outside-before');
      const outsideAfter = screen.getByTestId('outside-after');

      await waitFor(() => {
        expect(popup.contains(document.activeElement)).toBe(true);
      });

      await user.keyboard('[Tab]');
      expect(popup.contains(document.activeElement)).toBe(true);

      await user.keyboard('[Tab]');
      expect(popup.contains(document.activeElement)).toBe(true);

      await user.keyboard('[ShiftLeft>][Tab][/ShiftLeft]');
      expect(popup.contains(document.activeElement)).toBe(true);

      expect(outsideBefore).not.toHaveFocus();
      expect(outsideAfter).not.toHaveFocus();
    },
  );

  it.skipIf(isJSDOM)(
    'returns focus into the dialog when a close confirmation opened by an outside press closes',
    async () => {
      function App() {
        const [open, setOpen] = createSignal(false);
        const [confirmationOpen, setConfirmationOpen] = createSignal(false);
        const [value, setValue] = createSignal('');

        return (
          <Dialog.Root
            open={open()}
            onOpenChange={(nextOpen, eventDetails) => {
              if (!nextOpen && value()) {
                eventDetails.cancel();
                setConfirmationOpen(true);
                return;
              }
              setOpen(nextOpen);
            }}
          >
            <Dialog.Trigger data-testid="trigger">Tweet</Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Backdrop data-testid="backdrop" />
              <Dialog.Popup>
                <textarea
                  data-testid="textarea"
                  value={value()}
                  onInput={(event) => setValue(event.currentTarget.value)}
                />
              </Dialog.Popup>
            </Dialog.Portal>
            <AlertDialog.Root
              open={confirmationOpen()}
              onOpenChange={(nextOpen) => setConfirmationOpen(nextOpen)}
            >
              <AlertDialog.Portal>
                <AlertDialog.Popup>
                  <AlertDialog.Close data-testid="go-back">Go back</AlertDialog.Close>
                </AlertDialog.Popup>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </Dialog.Root>
        );
      }

      const { user } = await render(() => <App />);

      await user.click(screen.getByTestId('trigger'));
      await screen.findByRole('dialog');

      const textarea = screen.getByTestId('textarea');
      await user.click(textarea);
      await user.keyboard('x');
      expect(textarea).toHaveFocus();

      // Pressing the backdrop moves focus to the body before the close is
      // canceled and the confirmation dialog opens.
      await user.click(screen.getByTestId('backdrop'));

      const goBack = await screen.findByTestId('go-back');
      await waitFor(() => {
        expect(goBack).toHaveFocus();
      });

      await user.keyboard('[Enter]');

      await waitFor(() => {
        expect(screen.queryByTestId('go-back')).toBe(null);
      });
      await waitFor(() => {
        expect(textarea).toHaveFocus();
      });
    },
  );

  it.skipIf(isJSDOM)(
    'does not leak a non-modal popup field into an unrelated dialog return focus',
    async () => {
      function App() {
        const [confirmationOpen, setConfirmationOpen] = createSignal(false);

        return (
          <>
            {/* Clicking this non-focusable surface blurs the field to the body and
                opens the confirmation while the body is focused. */}
            <div
              data-testid="surface"
              onClick={() => setConfirmationOpen(true)}
              style={{ width: '100px', height: '100px' }}
            >
              surface
            </div>

            {/* A non-modal dialog held open (controlled, no `onOpenChange`). Its field
                blurs to the body on the outside press, but because it is non-modal it
                must not feed the shared focus stack. */}
            <Dialog.Root open modal={false}>
              <Dialog.Portal>
                <Dialog.Popup>
                  <textarea data-testid="nonmodal-field" />
                </Dialog.Popup>
              </Dialog.Portal>
            </Dialog.Root>

            <AlertDialog.Root
              open={confirmationOpen()}
              onOpenChange={(nextOpen) => setConfirmationOpen(nextOpen)}
            >
              <AlertDialog.Portal>
                <AlertDialog.Popup>
                  <AlertDialog.Close data-testid="go-back">Go back</AlertDialog.Close>
                </AlertDialog.Popup>
              </AlertDialog.Portal>
            </AlertDialog.Root>
          </>
        );
      }

      const { user } = await render(() => <App />);

      const field = screen.getByTestId('nonmodal-field');
      await user.click(field);
      expect(field).toHaveFocus();

      // Blur the field to the body and open the confirmation while it is focused.
      await user.click(screen.getByTestId('surface'));

      const goBack = await screen.findByTestId('go-back');
      await waitFor(() => {
        expect(goBack).toHaveFocus();
      });

      await user.keyboard('[Enter]');

      await waitFor(() => {
        expect(screen.queryByTestId('go-back')).toBe(null);
      });

      // The modal gate keeps the non-modal field out of the shared stack, so the
      // confirmation must not restore focus into the unrelated dialog.
      await flushMicrotasks();
      expect(field).not.toHaveFocus();
    },
  );
});

// The viewport takes its overflow from <html>, falling back to <body> when <html> doesn't
// establish its own scroll container. Whichever one propagates decides if the user can scroll.
function isPageLocked() {
  const html = document.documentElement;
  const { overflow, overflowX, overflowY } = getComputedStyle(html);
  const htmlScrolls = /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX);
  return /hidden|clip/.test(getComputedStyle(htmlScrolls ? html : document.body).overflowY);
}

// When <html> is the viewport scroller, Base UI hides its overflow to lock the page. An external
// <body> lock never touches <html>, so this distinguishes a lock Base UI applied itself from one
// it is still waiting to take over.
function hasOwnScrollLock(doc: Document) {
  return doc.documentElement.style.overflowX === 'hidden';
}

function DialogOpenChangeSpy(props: {
  onOpenChange: (details: { open: boolean; reason: string | null | undefined }) => void;
}) {
  const store = useDialogRootContext();
  const floatingRootContext = store.useState('floatingRootContext');

  useEffect(
    ([floatingRootContextValue, onOpenChange]) => {
      function handleOpenChange(details: { open: boolean; reason: string | null | undefined }) {
        onOpenChange(details);
      }

      floatingRootContextValue.context.events.on('openchange', handleOpenChange);
      return () => {
        floatingRootContextValue.context.events.off('openchange', handleOpenChange);
      };
    },
    () => [floatingRootContext(), props.onOpenChange],
  );

  return null;
}

type TestDialogProps = {
  rootProps?: Omit<Dialog.Root.Props, 'children'>;
  triggerProps?: Dialog.Trigger.Props;
  portalProps?: Dialog.Portal.Props;
  popupProps?: Dialog.Popup.Props;
  omitTrigger?: boolean;
  includeBackdrop?: boolean;
  triggerWrapper?: (trigger: JSX.Element) => JSX.Element;
};

// Port note: props are read lazily (no destructuring), and `children` is split off with `omit`.
// `popupProps.children` may be a getter, so it's only read inside `<Dialog.Popup>`.
function ContainedTriggerDialog(props: TestDialogProps) {
  const triggerWrapper = (trigger: JSX.Element) =>
    props.triggerWrapper ? props.triggerWrapper(trigger) : trigger;

  return (
    <Dialog.Root {...props.rootProps}>
      {!props.omitTrigger
        ? triggerWrapper(
            <Dialog.Trigger data-testid="trigger" {...omit(props.triggerProps ?? {}, 'children')}>
              {props.triggerProps?.children ?? 'Open'}
            </Dialog.Trigger>,
          )
        : null}
      <Dialog.Portal {...omit(props.portalProps ?? {}, 'children')}>
        {props.portalProps?.children ?? (
          <>
            {props.includeBackdrop ? (
              <Dialog.Backdrop
                data-testid="backdrop"
                style={{ position: 'fixed', 'z-index': 10, inset: 0 }}
              />
            ) : null}
            <Dialog.Popup
              data-testid="dialog-popup"
              style={{ position: 'fixed', 'z-index': 10 }}
              {...omit(props.popupProps ?? {}, 'children')}
            >
              {props.popupProps?.children ?? (
                <>
                  <p>Dialog content</p>
                  <Dialog.Close>Close</Dialog.Close>
                </>
              )}
            </Dialog.Popup>
          </>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function DetachedTriggerDialog(props: Omit<TestDialogProps, 'omitTrigger'>) {
  const triggerWrapper = (trigger: JSX.Element) =>
    props.triggerWrapper ? props.triggerWrapper(trigger) : trigger;
  const dialogHandle = Dialog.createHandle();

  return (
    <>
      {triggerWrapper(
        <Dialog.Trigger
          data-testid="trigger"
          {...omit(props.triggerProps ?? {}, 'children')}
          handle={dialogHandle}
        >
          {props.triggerProps?.children ?? 'Open'}
        </Dialog.Trigger>,
      )}
      <ContainedTriggerDialog
        {...props}
        rootProps={{ ...props.rootProps, handle: dialogHandle }}
        omitTrigger
      />
    </>
  );
}

function MultipleDetachedTriggersDialog(props: Omit<TestDialogProps, 'omitTrigger'>) {
  const triggerWrapper = (trigger: JSX.Element) =>
    props.triggerWrapper ? props.triggerWrapper(trigger) : trigger;
  const dialogHandle = Dialog.createHandle();

  return (
    <>
      {triggerWrapper(
        <Dialog.Trigger
          data-testid="trigger"
          {...omit(props.triggerProps ?? {}, 'children')}
          handle={dialogHandle}
        >
          {props.triggerProps?.children ?? 'Open'}
        </Dialog.Trigger>,
      )}
      <Dialog.Trigger data-testid="trigger-2" handle={dialogHandle}>
        Open another
      </Dialog.Trigger>
      <ContainedTriggerDialog
        {...props}
        rootProps={{ ...props.rootProps, handle: dialogHandle }}
        omitTrigger
      />
    </>
  );
}
