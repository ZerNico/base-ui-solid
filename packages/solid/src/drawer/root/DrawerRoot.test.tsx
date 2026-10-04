import {
  act,
  createRenderer,
  fireEvent,
  firePointer,
  flushMicrotasks,
  isJSDOM,
  screen,
  waitFor,
  waitSingleFrame,
} from '#test-utils';
import { useIsoLayoutEffect as useTestLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { JSX } from '@solidjs/web';
import {
  Drawer,
  DrawerCloseDataAttributes,
  DrawerTriggerDataAttributes,
} from 'base-ui-solid/drawer';
import { createSignal, omit, untrack } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REASONS } from '../../internals/reasons';
import { useDrawerProviderContext } from '../provider/DrawerProviderContext';
import { useDrawerRootContext } from './DrawerRootContext';

const useIdMockState = vi.hoisted(() => ({ returnUndefined: false }));
vi.mock('@base-ui-solid/utils/useId', async () => {
  const actual = await vi.importActual<typeof import('@base-ui-solid/utils/useId')>(
    '@base-ui-solid/utils/useId',
  );
  return {
    ...actual,
    useId(...args: Parameters<typeof actual.useId>) {
      const id = actual.useId(...args);
      return useIdMockState.returnUndefined ? undefined : id;
    },
  };
});
vi.mock('@base-ui-solid/utils/platform', async () => {
  const actual = await vi.importActual<typeof import('@base-ui-solid/utils/platform')>(
    '@base-ui-solid/utils/platform',
  );
  return {
    ...actual,
    platform: {
      ...actual.platform,
      os: { ...actual.platform.os, android: true },
    },
  };
});
function TestCase(fixtureProps: { onOpenChange: (open: boolean) => void }) {
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  return (
    <Drawer.Root
      open={open()}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        fixtureProps.onOpenChange(nextOpen);
      }}
      swipeDirection="right"
    >
      <Drawer.Portal>
        <Drawer.Viewport data-testid="viewport">
          <Drawer.Popup data-testid="popup">Drawer</Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
async function simulateTimedRightSwipe(
  element: HTMLElement,
  startX: number,
  endX: number,
  startTime: number,
  moveTime: number,
  endTime: number,
) {
  await simulateTimedSwipe(element, [
    { type: 'down', x: startX, y: 100, time: startTime },
    { type: 'move', x: startX + 1, y: 100, time: moveTime },
    { type: 'move', x: endX, y: 100, time: endTime - 1 },
    { type: 'up', x: endX, y: 100, time: endTime },
  ]);
}
async function simulateTimedDownSwipe(
  element: HTMLElement,
  startY: number,
  endY: number,
  startTime: number,
  moveTime: number,
  endTime: number,
  settleTime?: number,
) {
  const resolvedSettleTime =
    typeof settleTime === 'number' && Number.isFinite(settleTime) ? settleTime : null;
  await simulateTimedSwipe(element, [
    { type: 'down', x: 100, y: startY, time: startTime },
    { type: 'move', x: 100, y: startY + 1, time: moveTime },
    ...(resolvedSettleTime !== null
      ? ([{ type: 'move', x: 100, y: endY - 1, time: resolvedSettleTime }] as TimedSwipeStep[])
      : []),
    { type: 'move', x: 100, y: endY, time: endTime - 1 },
    { type: 'up', x: 100, y: endY, time: endTime },
  ]);
}
type TimedSwipeStep = {
  type: 'down' | 'move' | 'up';
  x: number;
  y: number;
  time: number;
};
async function simulateTimedSwipe(element: HTMLElement, steps: TimedSwipeStep[]) {
  // Every step carries its own `timeStamp`, so the gesture's timeline no longer depends on the
  // wall clock and no `vi.setSystemTime` bookkeeping is needed alongside it.
  for (const step of steps) {
    const init = {
      pointerId: 1,
      pointerType: 'mouse',
      clientX: step.x,
      clientY: step.y,
      timeStamp: step.time,
    };
    if (step.type === 'down') {
      firePointer.down(element, { ...init, button: 0, buttons: 1 });
    } else if (step.type === 'move') {
      firePointer.move(element, { ...init, buttons: 1 });
    } else {
      firePointer.up(element, { ...init, button: 0, buttons: 0 });
    }
    // eslint-disable-next-line no-await-in-loop
    await flushMicrotasks();
  }
}
function mockResizeObserver() {
  const original = globalThis.ResizeObserver;
  if (typeof original === 'function') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as typeof ResizeObserver;
  }
  return () => {
    if (typeof original === 'function') {
      globalThis.ResizeObserver = original;
    }
  };
}
/**
 * Sets up `elementFromPoint` and `ResizeObserver` mocks for swipe-dismiss tests.
 * Returns a cleanup function that restores originals.
 */
function setupSwipeTestEnv() {
  const originalElementFromPoint = document.elementFromPoint;
  const restoreResizeObserver = mockResizeObserver();
  return {
    /** Call after rendering to point `elementFromPoint` at the given element. */
    pointAt(element: Element) {
      document.elementFromPoint = () => element;
    },
    cleanup() {
      document.elementFromPoint = originalElementFromPoint;
      restoreResizeObserver();
    },
  };
}
function SnapPointResetCase() {
  const snapPoints = ['100px', '300px', 1];
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  const [snapPoint, setSnapPoint] = createSignal<Drawer.Root.SnapPoint | null>(snapPoints[2], {
    ownedWrite: true,
  });
  return (
    <div>
      <div data-testid="active-snap">{String(snapPoint())}</div>
      <Drawer.Root
        open={open()}
        onOpenChange={setOpen}
        snapPoints={snapPoints}
        snapPoint={snapPoint()}
        onSnapPointChange={setSnapPoint}
      >
        <Drawer.Portal>
          <Drawer.Viewport data-testid="viewport">
            <Drawer.Popup data-testid="popup">
              Drawer
              <Drawer.Close data-testid="close">Close</Drawer.Close>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
function ActiveSnapPointDisplay() {
  const drawerActiveSnapPoint = useDrawerRootContext();
  return <div data-testid="active-snap">{String(drawerActiveSnapPoint.activeSnapPoint())}</div>;
}
function DefaultSnapPointResetCase() {
  const snapPoints = ['100px', '300px', 1];
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  return (
    <Drawer.Root
      defaultSnapPoint={snapPoints[1]}
      open={open()}
      onOpenChange={setOpen}
      snapPoints={snapPoints}
    >
      <ActiveSnapPointDisplay />
      <Drawer.Portal>
        <Drawer.Viewport data-testid="viewport">
          <Drawer.Popup data-testid="popup">
            Drawer
            <Drawer.Close data-testid="close">Close</Drawer.Close>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
function SnapPointChangeDetailsCase(fixtureProps: {
  onSnapPointChange: (
    snapPoint: Drawer.Root.SnapPoint | null,
    eventDetails: Drawer.Root.SnapPointChangeEventDetails,
  ) => void;
}) {
  const snapPoints = ['100px', '300px', 1];
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  const [snapPoint, setSnapPoint] = createSignal<Drawer.Root.SnapPoint | null>(snapPoints[2], {
    ownedWrite: true,
  });
  return (
    <Drawer.Root
      open={open()}
      onOpenChange={setOpen}
      snapPoints={snapPoints}
      snapPoint={snapPoint()}
      onSnapPointChange={(nextSnapPoint, eventDetails) => {
        setSnapPoint(nextSnapPoint);
        fixtureProps.onSnapPointChange(nextSnapPoint, eventDetails);
      }}
    >
      <Drawer.Portal>
        <Drawer.Viewport data-testid="viewport">
          <Drawer.Popup data-testid="popup">
            Drawer
            <Drawer.Close data-testid="close">Close</Drawer.Close>
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
function CanceledCloseSnapPointResetCase() {
  const snapPoints = ['100px', '300px', 1];
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  const [snapPoint, setSnapPoint] = createSignal<Drawer.Root.SnapPoint | null>(snapPoints[2], {
    ownedWrite: true,
  });
  return (
    <div>
      <div data-testid="active-snap">{String(snapPoint())}</div>
      <Drawer.Root
        open={open()}
        onOpenChange={(nextOpen, eventDetails) => {
          if (!nextOpen) {
            eventDetails.cancel();
          } else {
            setOpen(nextOpen);
          }
        }}
        snapPoints={snapPoints}
        snapPoint={snapPoint()}
        onSnapPointChange={setSnapPoint}
      >
        <Drawer.Portal>
          <Drawer.Viewport data-testid="viewport">
            <Drawer.Popup data-testid="popup">
              Drawer
              <Drawer.Close data-testid="close">Close</Drawer.Close>
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
function ControlledAlwaysOpenCase(fixtureProps: {
  onOpenChange?: (open: boolean, eventDetails: Drawer.Root.ChangeEventDetails) => void;
}) {
  return (
    <Drawer.Root open onOpenChange={fixtureProps.onOpenChange} swipeDirection="down">
      <Drawer.Portal>
        <Drawer.Backdrop data-testid="backdrop" />
        <Drawer.Viewport data-testid="viewport" style={{ height: '300px' }}>
          <Drawer.Popup data-testid="popup" style={{ height: '200px' }}>
            Drawer
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
function ControlledSwipeCloseSnapPointCase() {
  const snapPoints = ['100px', '300px', 1];
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  // Start at '300px' (non-default) so we can distinguish correct reset to
  // the default ('100px') from incorrect restoration to the pre-swipe value.
  const [snapPoint, setSnapPoint] = createSignal<Drawer.Root.SnapPoint | null>(snapPoints[1], {
    ownedWrite: true,
  });
  return (
    <div>
      <div data-testid="active-snap">{String(snapPoint())}</div>
      <Drawer.Root
        open={open()}
        onOpenChange={setOpen}
        snapPoints={snapPoints}
        snapPoint={snapPoint()}
        onSnapPointChange={setSnapPoint}
        swipeDirection="down"
      >
        <Drawer.Portal>
          <Drawer.Backdrop data-testid="backdrop" />
          <Drawer.Viewport data-testid="viewport" style={{ height: '600px' }}>
            <Drawer.Popup data-testid="popup" style={{ height: '600px' }}>
              Drawer
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
function CanceledSwipeCloseCase() {
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  return (
    <Drawer.Root
      open={open()}
      onOpenChange={(nextOpen, eventDetails) => {
        if (!nextOpen && eventDetails.reason === REASONS.swipe) {
          eventDetails.cancel();
          return;
        }
        setOpen(nextOpen);
      }}
      swipeDirection="down"
    >
      <Drawer.Portal>
        <Drawer.Backdrop data-testid="backdrop" />
        <Drawer.Viewport data-testid="viewport" style={{ height: '300px' }}>
          <Drawer.Popup data-testid="popup" style={{ height: '200px' }}>
            Drawer
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
function CanceledSwipeCloseSnapPointCase() {
  const snapPoints = ['100px', '300px', 1];
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  const [snapPoint, setSnapPoint] = createSignal<Drawer.Root.SnapPoint | null>(snapPoints[0], {
    ownedWrite: true,
  });
  return (
    <div>
      <div data-testid="active-snap">{String(snapPoint())}</div>
      <Drawer.Root
        open={open()}
        onOpenChange={(nextOpen, eventDetails) => {
          if (!nextOpen && eventDetails.reason === REASONS.swipe) {
            eventDetails.cancel();
            return;
          }
          setOpen(nextOpen);
        }}
        snapPoints={snapPoints}
        snapPoint={snapPoint()}
        onSnapPointChange={setSnapPoint}
        swipeDirection="down"
      >
        <Drawer.Portal>
          <Drawer.Backdrop data-testid="backdrop" />
          <Drawer.Viewport data-testid="viewport" style={{ height: '600px' }}>
            <Drawer.Popup data-testid="popup" style={{ height: '600px' }}>
              Drawer
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
function SnapPointOvershootCase() {
  return (
    <Drawer.Root open defaultSnapPoint={1} snapPoints={['100px', 1]} swipeDirection="down">
      <Drawer.Portal>
        <Drawer.Viewport data-testid="viewport" style={{ height: '400px' }}>
          <Drawer.Popup data-testid="popup" style={{ height: '400px' }}>
            Drawer
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
function SnapPointSwipeCase(fixtureProps: { onOpenChange: (open: boolean) => void }) {
  const snapPoints = ['100px', '300px', 1];
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  const [snapPoint, setSnapPoint] = createSignal<Drawer.Root.SnapPoint | null>(snapPoints[0], {
    ownedWrite: true,
  });
  return (
    <div>
      <div data-testid="active-snap">{String(snapPoint())}</div>
      <Drawer.Root
        open={open()}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          fixtureProps.onOpenChange(nextOpen);
        }}
        snapPoints={snapPoints}
        snapPoint={snapPoint()}
        onSnapPointChange={setSnapPoint}
        swipeDirection="down"
      >
        <Drawer.Portal>
          <Drawer.Viewport data-testid="viewport" style={{ height: '600px' }}>
            <Drawer.Popup data-testid="popup" style={{ height: '600px' }}>
              Drawer
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
function SnapPointSequentialSkipCase() {
  const snapPoints = ['100px', '300px', 1];
  const [snapPoint, setSnapPoint] = createSignal<Drawer.Root.SnapPoint | null>(snapPoints[0], {
    ownedWrite: true,
  });
  return (
    <div>
      <div data-testid="active-snap">{String(snapPoint())}</div>
      <Drawer.Root
        open
        snapPoints={snapPoints}
        snapPoint={snapPoint()}
        onSnapPointChange={setSnapPoint}
        swipeDirection="down"
        snapToSequentialPoints
      >
        <Drawer.Portal>
          <Drawer.Viewport data-testid="viewport" style={{ height: '600px' }}>
            <Drawer.Popup data-testid="popup" style={{ height: '600px' }}>
              Drawer
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
function SnapPointGestureCase(fixtureProps: {
  initialSnapPoint: Drawer.Root.SnapPoint | null;
  keepMounted?: boolean;
  rejectClose?: boolean;
  snapToSequentialPoints?: boolean;
  swipeDirection?: Drawer.Root.Props['swipeDirection'];
}) {
  const snapPoints = ['100px', '300px', 1];
  const [snapPoint, setSnapPoint] = createSignal<Drawer.Root.SnapPoint | null>(
    // Port note: the initial state is sampled once, as with React useState.
    untrack(() => fixtureProps.initialSnapPoint),
    { ownedWrite: true },
  );
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  return (
    <div>
      <output data-testid="active-snap">{String(snapPoint())}</output>
      <Drawer.Root
        open={open()}
        onOpenChange={(nextOpen) => {
          if (!(fixtureProps.rejectClose ?? false)) {
            setOpen(nextOpen);
          }
        }}
        snapPoints={snapPoints}
        snapPoint={snapPoint()}
        onSnapPointChange={setSnapPoint}
        snapToSequentialPoints={fixtureProps.snapToSequentialPoints ?? false}
        swipeDirection={fixtureProps.swipeDirection ?? 'down'}
      >
        <Drawer.Portal keepMounted={fixtureProps.keepMounted ?? false}>
          <Drawer.Backdrop data-testid="backdrop" />
          <Drawer.Viewport data-testid="viewport" style={{ height: '600px' }}>
            <Drawer.Popup data-testid="popup" style={{ height: '600px' }}>
              Drawer
            </Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}
function SnapPointContextControls() {
  const drawerActiveSnapPointsetActiveSnapPoint = useDrawerRootContext();
  return (
    <>
      <output data-testid="context-active-snap-point">
        {String(drawerActiveSnapPointsetActiveSnapPoint.activeSnapPoint())}
      </output>
      <button onClick={() => drawerActiveSnapPointsetActiveSnapPoint.setActiveSnapPoint('100px')}>
        Set canceled snap point
      </button>
      <button onClick={() => drawerActiveSnapPointsetActiveSnapPoint.setActiveSnapPoint(999)}>
        Set invalid snap point
      </button>
    </>
  );
}
function NestedSwipeProgressProbe() {
  const drawerNestedSwipeProgressStore = useDrawerRootContext();
  // Port note: Solid subscribes to the external progress store through a signal.
  const progressStore = drawerNestedSwipeProgressStore.nestedSwipeProgressStore;
  const [progress, setProgress] = createSignal(progressStore.getSnapshot(), { ownedWrite: true });
  usePassiveEffect(
    () => progressStore.subscribe(() => setProgress(progressStore.getSnapshot())),
    () => [],
  );
  return <output data-testid="nested-swipe-progress">{progress()}</output>;
}
function NestedSwipeProgressSubscriber(fixtureProps: { onChange: () => void }) {
  const drawerNestedSwipeProgressStore = useDrawerRootContext();
  usePassiveEffect(
    () => drawerNestedSwipeProgressStore.nestedSwipeProgressStore.subscribe(fixtureProps.onChange),
    () => [drawerNestedSwipeProgressStore.nestedSwipeProgressStore, fixtureProps.onChange],
  );
  return null;
}
function NestedSwipeProgressControls() {
  const drawerOnNestedSwipeProgressChange = useDrawerRootContext();
  return (
    <>
      <button onClick={() => drawerOnNestedSwipeProgressChange.onNestedSwipeProgressChange(0.5)}>
        Set nested progress
      </button>
      <button
        onClick={() => drawerOnNestedSwipeProgressChange.onNestedSwipeProgressChange(Number.NaN)}
      >
        Set invalid nested progress
      </button>
    </>
  );
}
function MissingRootContextConsumer() {
  useDrawerRootContext();
  return null;
}
describe('<Drawer.Root />', () => {
  const { render } = createRenderer();
  it('exposes the attributes rendered by borrowed trigger and close parts', async () => {
    const { user } = await render((overrides) => (
      <Drawer.Root modal={false} {...overrides()}>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Trigger disabled>Disabled</Drawer.Trigger>
        <Drawer.Close disabled>Close</Drawer.Close>
      </Drawer.Root>
    ));
    const disabledTrigger = screen.getByRole('button', { name: 'Disabled' });
    expect(disabledTrigger).toHaveAttribute(DrawerTriggerDataAttributes.disabled);
    const closeButton = screen.getByRole('button', { name: 'Close' });
    expect(closeButton).toHaveAttribute(DrawerCloseDataAttributes.disabled);
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute(DrawerTriggerDataAttributes.popupOpen);
  });
  it.skipIf(isJSDOM)('uses a size-based swipe threshold', async () => {
    const handleOpenChange = vi.fn();
    await render((overrides) => <TestCase onOpenChange={handleOpenChange} {...overrides()} />);
    await flushMicrotasks();
    const viewport = screen.getByTestId('viewport');
    const popup = screen.getByTestId('popup');
    popup.style.width = '200px';
    await flushMicrotasks();
    const originalElementFromPoint = document.elementFromPoint;
    document.elementFromPoint = () => popup;
    try {
      const startTime = 1000;
      const moveTime = 1100;
      const endTime = 1600;
      await simulateTimedRightSwipe(viewport, 100, 190, startTime, moveTime, endTime);
      expect(handleOpenChange).not.toHaveBeenCalled();
      await simulateTimedRightSwipe(
        viewport,
        100,
        220,
        startTime + 1000,
        moveTime + 1000,
        endTime + 1000,
      );
      expect(handleOpenChange).toHaveBeenCalledWith(false);
    } finally {
      document.elementFromPoint = originalElementFromPoint;
    }
  });
  it('supports detached triggers with handles', async () => {
    const handle = Drawer.createHandle<number>();
    await render((overrides) => (
      <div {...overrides()}>
        <Drawer.Trigger handle={handle} payload={1}>
          Trigger 1
        </Drawer.Trigger>
        <Drawer.Trigger handle={handle} payload={2}>
          Trigger 2
        </Drawer.Trigger>
        <Drawer.Root handle={handle}>
          {({ payload }: { payload: number | undefined }) => (
            <Drawer.Portal>
              <Drawer.Viewport>
                <Drawer.Popup>
                  <span data-testid="payload">{payload}</span>
                  <Drawer.Close>Close</Drawer.Close>
                </Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>
          )}
        </Drawer.Root>
      </div>
    ));
    await flushMicrotasks();
    expect(screen.queryByTestId('payload')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Trigger 1' }));
    await flushMicrotasks();
    expect(screen.getByTestId('payload').textContent).toBe('1');
    fireEvent.click(screen.getByText('Close'));
    await flushMicrotasks();
    expect(screen.queryByTestId('payload')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Trigger 2' }));
    await flushMicrotasks();
    expect(screen.getByTestId('payload').textContent).toBe('2');
  });
  it('supports imperative actions with handles', async () => {
    const handle = Drawer.createHandle<number>();
    await render((overrides) => (
      <div {...overrides()}>
        <Drawer.Trigger handle={handle} id="trigger-1" payload={1}>
          Trigger 1
        </Drawer.Trigger>
        <Drawer.Trigger handle={handle} id="trigger-2" payload={2}>
          Trigger 2
        </Drawer.Trigger>
        <Drawer.Root handle={handle}>
          {({ payload }: { payload: number | undefined }) => (
            <Drawer.Portal>
              <Drawer.Viewport>
                <Drawer.Popup data-testid="content">{payload}</Drawer.Popup>
              </Drawer.Viewport>
            </Drawer.Portal>
          )}
        </Drawer.Root>
      </div>
    ));
    const trigger1 = screen.getByRole('button', { name: 'Trigger 1' });
    const trigger2 = screen.getByRole('button', { name: 'Trigger 2' });
    expect(screen.queryByRole('dialog')).toBe(null);
    await act(() => handle.open('trigger-2'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBe(null);
    });
    expect(screen.getByTestId('content').textContent).toBe('2');
    expect(trigger2).toHaveAttribute('aria-expanded', 'true');
    expect(trigger2.getAttribute('aria-controls')).toBe(
      screen.getByRole('dialog').getAttribute('id'),
    );
    expect(trigger1).toHaveAttribute('aria-expanded', 'false');
    await act(() => handle.close());
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBe(null);
    });
    expect(trigger2).toHaveAttribute('aria-expanded', 'false');
    await act(() => handle.openWithPayload(8));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBe(null);
    });
    expect(screen.getByTestId('content').textContent).toBe('8');
    expect(trigger1).toHaveAttribute('aria-expanded', 'false');
    expect(trigger2).toHaveAttribute('aria-expanded', 'false');
  });
  it('attaches fresh root state when a handle-backed root remounts', async () => {
    const handle = Drawer.createHandle<number>();
    function App() {
      const [mounted, setMounted] = createSignal(true, { ownedWrite: true });
      return (
        <>
          <Drawer.Trigger handle={handle} id="trigger" payload={1}>
            Trigger
          </Drawer.Trigger>
          {!mounted() && (
            <button type="button" onClick={() => setMounted(true)}>
              Remount root
            </button>
          )}
          {mounted() && (
            <Drawer.Root handle={handle}>
              {({ payload }: { payload: number | undefined }) => (
                <>
                  <span data-testid="payload">{payload ?? 'No payload'}</span>
                  <Drawer.Portal>
                    <Drawer.Viewport>
                      <Drawer.Popup>
                        Drawer content
                        <button type="button" onClick={() => setMounted(false)}>
                          Unmount root
                        </button>
                      </Drawer.Popup>
                    </Drawer.Viewport>
                  </Drawer.Portal>
                </>
              )}
            </Drawer.Root>
          )}
        </>
      );
    }
    const { user } = await render((overrides) => <App {...overrides()} />);
    const trigger = screen.getByRole('button', { name: 'Trigger' });
    expect(screen.getByTestId('payload').textContent).toBe('No payload');
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByText('Drawer content')).toBeVisible();
    });
    expect(screen.getByTestId('payload').textContent).toBe('1');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger.getAttribute('aria-controls')).toBe(
      screen.getByRole('dialog').getAttribute('id'),
    );
    await user.click(screen.getByRole('button', { name: 'Unmount root' }));
    expect(handle.isOpen).toBe(false);
    expect(screen.queryByText('Drawer content')).toBe(null);
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    handle.openWithPayload(8);
    handle.open('trigger');
    handle.close();
    const detachedWarnings = consoleWarn.mock.calls.filter(
      ([message]) =>
        typeof message === 'string' && message.includes('no root using this handle is mounted'),
    );
    consoleWarn.mockRestore();
    expect(handle.isOpen).toBe(false);
    expect(detachedWarnings).toHaveLength(3);
    await user.click(screen.getByRole('button', { name: 'Remount root' }));
    expect(screen.getByTestId('payload').textContent).toBe('No payload');
    expect(screen.queryByText('Drawer content')).toBe(null);
    await waitFor(() => {
      expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
    expect(trigger).not.toHaveAttribute('aria-controls');
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByText('Drawer content')).toBeVisible();
    });
    expect(screen.getByTestId('payload').textContent).toBe('1');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(trigger.getAttribute('aria-controls')).toBe(
      screen.getByRole('dialog').getAttribute('id'),
    );
  });
  it('synchronizes trigger aria-controls with the popup id', async () => {
    const { user } = await render((overrides) => (
      <Drawer.Root {...overrides()}>
        <Drawer.Trigger>Open</Drawer.Trigger>
        <Drawer.Portal>
          <Drawer.Viewport>
            <Drawer.Popup data-testid="popup">Drawer</Drawer.Popup>
          </Drawer.Viewport>
        </Drawer.Portal>
      </Drawer.Root>
    ));
    const trigger = screen.getByRole('button', { name: 'Open' });
    await user.click(trigger);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).not.toBe(null);
    });
    const popup = screen.getByTestId('popup');
    expect(trigger.getAttribute('aria-controls')).toBe(popup.getAttribute('id'));
  });
  it('resets the active snap point when closing', async () => {
    await render((overrides) => <SnapPointResetCase {...overrides()} />);
    await flushMicrotasks();
    const closeButton = screen.getByTestId('close');
    fireEvent.click(closeButton);
    await flushMicrotasks();
    expect(screen.getByTestId('active-snap').textContent).toBe('100px');
  });
  it('resets to the default snap point when provided', async () => {
    await render((overrides) => <DefaultSnapPointResetCase {...overrides()} />);
    await flushMicrotasks();
    expect(screen.getByTestId('active-snap').textContent).toBe('300px');
    const closeButton = screen.getByTestId('close');
    fireEvent.click(closeButton);
    await flushMicrotasks();
    expect(screen.getByTestId('active-snap').textContent).toBe('300px');
  });
  it('provides event details when snap point changes', async () => {
    const handleSnapPointChange = vi.fn();
    await render((overrides) => (
      <SnapPointChangeDetailsCase onSnapPointChange={handleSnapPointChange} {...overrides()} />
    ));
    await flushMicrotasks();
    const closeButton = screen.getByTestId('close');
    fireEvent.click(closeButton);
    await flushMicrotasks();
    expect(handleSnapPointChange).toHaveBeenCalled();
    const [, eventDetails] = handleSnapPointChange.mock.calls[0];
    expect(eventDetails.reason).toBe(REASONS.closePress);
  });
  it('does not reset snap point when a close is canceled', async () => {
    await render((overrides) => <CanceledCloseSnapPointResetCase {...overrides()} />);
    await flushMicrotasks();
    expect(screen.getByTestId('active-snap').textContent).toBe('1');
    fireEvent.click(screen.getByTestId('close'));
    await flushMicrotasks();
    expect(screen.getByTestId('active-snap').textContent).toBe('1');
  });
  it('honors canceled snap point changes and falls back from invalid uncontrolled values', async () => {
    const handleSnapPointChange = vi.fn(
      (
        nextSnapPoint: Drawer.Root.SnapPoint | null,
        eventDetails: Drawer.Root.SnapPointChangeEventDetails,
      ) => {
        if (nextSnapPoint === '100px') {
          eventDetails.cancel();
        }
      },
    );
    const { user } = await render((overrides) => (
      <Drawer.Root
        defaultSnapPoint="300px"
        onSnapPointChange={handleSnapPointChange}
        snapPoints={['100px', '300px']}
        {...overrides()}
      >
        <SnapPointContextControls />
      </Drawer.Root>
    ));
    expect(screen.getByTestId('context-active-snap-point').textContent).toBe('300px');
    await user.click(screen.getByRole('button', { name: 'Set canceled snap point' }));
    expect(screen.getByTestId('context-active-snap-point').textContent).toBe('300px');
    await user.click(screen.getByRole('button', { name: 'Set invalid snap point' }));
    expect(screen.getByTestId('context-active-snap-point').textContent).toBe('300px');
    expect(handleSnapPointChange).toHaveBeenLastCalledWith(
      999,
      expect.objectContaining({ reason: REASONS.none }),
    );
  });
  it('normalizes invalid nested swipe progress without notifying for duplicate values', async () => {
    const handleProgressChange = vi.fn();
    const { user } = await render((overrides) => (
      <Drawer.Root {...overrides()}>
        <NestedSwipeProgressProbe />
        <NestedSwipeProgressSubscriber onChange={handleProgressChange} />
        <Drawer.Root>
          <NestedSwipeProgressControls />
        </Drawer.Root>
      </Drawer.Root>
    ));
    await user.click(screen.getByRole('button', { name: 'Set nested progress' }));
    expect(screen.getByTestId('nested-swipe-progress').textContent).toBe('0.5');
    expect(handleProgressChange).toHaveBeenCalledTimes(1);
    handleProgressChange.mockClear();
    await user.click(screen.getByRole('button', { name: 'Set nested progress' }));
    expect(screen.getByTestId('nested-swipe-progress').textContent).toBe('0.5');
    expect(handleProgressChange).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Set invalid nested progress' }));
    expect(screen.getByTestId('nested-swipe-progress').textContent).toBe('0');
    expect(handleProgressChange).toHaveBeenCalledTimes(1);
  });
  it('throws a descriptive error when the root context is missing', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        render((overrides) => <MissingRootContextConsumer {...overrides()} />),
      ).rejects.toThrow(
        'Base UI: DrawerRootContext is missing. Drawer parts must be placed within <Drawer.Root>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
  it.each([
    {
      label: 'a controlled drawer',
      rootProps: { open: true },
      strict: false,
      withoutUseId: false,
    },
    {
      label: 'a default-open drawer in Strict Mode',
      rootProps: { defaultOpen: true },
      strict: true,
      withoutUseId: false,
    },
    {
      label: 'the React 17 id fallback',
      rootProps: { defaultOpen: true },
      strict: true,
      withoutUseId: true,
    },
  ])(
    'reports and unregisters $label before passive effects',
    async ({ rootProps, strict, withoutUseId }) => {
      let mountPassiveEffectFlushed = false;
      let teardownPassiveEffectFlushed = false;
      let mountedBeforePassiveEffect: boolean | null = null;
      let unmountedBeforePassiveEffect: boolean | null = null;
      let phase: 'mount' | 'teardown' = 'mount';
      const patchedContexts = new WeakSet<object>();
      function PassiveEffectBoundary() {
        usePassiveEffect(
          () => {
            mountPassiveEffectFlushed = true;
            return () => {
              if (phase === 'teardown') {
                teardownPassiveEffectFlushed = true;
              }
            };
          },
          () => [],
        );
        return null;
      }
      function ProviderMethodProbe() {
        const providerContext = useDrawerProviderContext();
        if (providerContext && !patchedContexts.has(providerContext)) {
          patchedContexts.add(providerContext);
          const { setDrawerOpen, removeDrawer } = providerContext;
          providerContext.setDrawerOpen = (...args) => {
            if (mountedBeforePassiveEffect === null) {
              mountedBeforePassiveEffect = !mountPassiveEffectFlushed;
            }
            setDrawerOpen(...args);
          };
          providerContext.removeDrawer = (...args) => {
            if (phase === 'teardown' && unmountedBeforePassiveEffect === null) {
              unmountedBeforePassiveEffect = !teardownPassiveEffectFlushed;
            }
            removeDrawer(...args);
          };
        }
        return null;
      }
      function TestCase(fixtureProps: { showDrawer: boolean }) {
        const content = (
          <Drawer.Provider>
            {fixtureProps.showDrawer && <PassiveEffectBoundary />}
            {fixtureProps.showDrawer && <ProviderMethodProbe />}
            {fixtureProps.showDrawer && <Drawer.Root modal={false} {...rootProps} />}
            <Drawer.IndentBackground data-testid="background" />
          </Drawer.Provider>
        );
        return <>{strict ? <StrictMode>{content}</StrictMode> : content}</>;
      }
      useIdMockState.returnUndefined = withoutUseId;
      try {
        const { setProps } = await render((overrides) => <TestCase showDrawer {...overrides()} />);
        expect(mountedBeforePassiveEffect).toBe(true);
        expect(screen.getByTestId('background')).toHaveAttribute('data-active', '');
        phase = 'teardown';
        await setProps({ showDrawer: false });
        expect(unmountedBeforePassiveEffect).toBe(true);
        expect(screen.getByTestId('background')).toHaveAttribute('data-inactive', '');
      } finally {
        useIdMockState.returnUndefined = false;
      }
    },
  );
  it.skipIf(isJSDOM)('clears swipe-dismiss styles when swipe close is canceled', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => <CanceledSwipeCloseCase {...overrides()} />);
      await flushMicrotasks();
      const viewport = screen.getByTestId('viewport');
      const popup = screen.getByTestId('popup');
      const backdrop = screen.getByTestId('backdrop');
      Object.defineProperty(popup, 'offsetHeight', { value: 200, configurable: true });
      env.pointAt(popup);
      await simulateTimedDownSwipe(viewport, 100, 250, 1000, 1010, 1040);
      expect(popup).not.toHaveAttribute('data-swipe-dismiss');
      expect(backdrop).not.toHaveAttribute('data-swipe-dismiss');
      expect(popup).not.toHaveAttribute('data-ending-style');
      expect(backdrop).not.toHaveAttribute('data-swiping');
      expect(popup).toHaveAttribute('data-open', '');
      expect(popup.style.getPropertyValue('--drawer-swipe-movement-y')).toBe('0px');
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)(
    'does not dismiss a controlled drawer via swipe when open is always true',
    async () => {
      const handleOpenChange = vi.fn();
      const env = setupSwipeTestEnv();
      try {
        await render((overrides) => (
          <ControlledAlwaysOpenCase onOpenChange={handleOpenChange} {...overrides()} />
        ));
        await flushMicrotasks();
        const viewport = screen.getByTestId('viewport');
        const popup = screen.getByTestId('popup');
        const backdrop = screen.getByTestId('backdrop');
        Object.defineProperty(popup, 'offsetHeight', { value: 200, configurable: true });
        env.pointAt(popup);
        await simulateTimedDownSwipe(viewport, 100, 250, 1000, 1010, 1040);
        // onOpenChange should still be called so the parent knows about the dismiss intent
        expect(handleOpenChange).toHaveBeenCalledWith(false, expect.anything());
        // The controlled reopen happens in rAF outside fireEvent's implicit act scope.
        // Wrap the frame wait in act to avoid React act warnings.
        await act(async () => {
          await waitSingleFrame();
        });
        // The drawer should remain open without data-swipe-dismiss
        expect(popup).not.toHaveAttribute('data-swipe-dismiss');
        expect(backdrop).not.toHaveAttribute('data-swipe-dismiss');
        expect(popup).not.toHaveAttribute('data-ending-style');
        expect(popup).toHaveAttribute('data-open', '');
      } finally {
        env.cleanup();
      }
    },
  );
  it.skipIf(isJSDOM)(
    'does not restore snap point when a controlled swipe close is accepted by the parent',
    async () => {
      const env = setupSwipeTestEnv();
      try {
        await render((overrides) => <ControlledSwipeCloseSnapPointCase {...overrides()} />);
        await flushMicrotasks();
        const viewport = screen.getByTestId('viewport');
        const popup = screen.getByTestId('popup');
        env.pointAt(popup);
        await simulateTimedDownSwipe(viewport, 100, 260, 1000, 1010, 1040);
        expect(screen.getByTestId('active-snap').textContent).toBe('100px');
      } finally {
        env.cleanup();
      }
    },
  );
  it.skipIf(isJSDOM)(
    'restores snap point and swipe offsets when swipe close is canceled',
    async () => {
      const env = setupSwipeTestEnv();
      try {
        await render((overrides) => <CanceledSwipeCloseSnapPointCase {...overrides()} />);
        await flushMicrotasks();
        const viewport = screen.getByTestId('viewport');
        const popup = screen.getByTestId('popup');
        env.pointAt(popup);
        await simulateTimedDownSwipe(viewport, 100, 260, 1000, 1010, 1040);
        expect(screen.getByTestId('active-snap').textContent).toBe('100px');
        expect(popup).toHaveAttribute('data-open', '');
        expect(popup).not.toHaveAttribute('data-swipe-dismiss');
        expect(popup).not.toHaveAttribute('data-ending-style');
        expect(popup.style.getPropertyValue('--drawer-swipe-movement-y')).toBe('0px');
      } finally {
        env.cleanup();
      }
    },
  );
  it.skipIf(isJSDOM)(
    'damps active snap point overshoot after the swipe direction is established',
    async () => {
      const env = setupSwipeTestEnv();
      try {
        await render((overrides) => <SnapPointOvershootCase {...overrides()} />);
        const viewport = screen.getByTestId('viewport');
        const popup = screen.getByTestId('popup');
        env.pointAt(popup);
        fireEvent.pointerDown(viewport, {
          button: 0,
          buttons: 1,
          pointerId: 1,
          clientX: 100,
          clientY: 200,
          bubbles: true,
          pointerType: 'mouse',
        });
        await flushMicrotasks();
        fireEvent.pointerMove(viewport, {
          buttons: 1,
          pointerId: 1,
          clientX: 100,
          clientY: 200,
          bubbles: true,
          pointerType: 'mouse',
        });
        await flushMicrotasks();
        fireEvent.pointerMove(viewport, {
          buttons: 1,
          pointerId: 1,
          clientX: 100,
          clientY: 100,
          bubbles: true,
          pointerType: 'mouse',
        });
        await flushMicrotasks();
        fireEvent.pointerMove(viewport, {
          buttons: 1,
          pointerId: 1,
          clientX: 100,
          clientY: 50,
          bubbles: true,
          pointerType: 'mouse',
        });
        await flushMicrotasks();
        expect(popup.style.transform).toBe('');
        expect(
          Number.parseFloat(popup.style.getPropertyValue('--drawer-swipe-movement-y')),
        ).toBeCloseTo(-Math.sqrt(150));
      } finally {
        env.cleanup();
      }
    },
  );
  it.skipIf(isJSDOM)(
    'allows dragging past a snap point when snapToSequentialPoints is enabled',
    async () => {
      const env = setupSwipeTestEnv();
      try {
        await render((overrides) => <SnapPointSequentialSkipCase {...overrides()} />);
        await flushMicrotasks();
        const viewport = screen.getByTestId('viewport');
        const popup = screen.getByTestId('popup');
        env.pointAt(popup);
        const startTime = 1000;
        const moveTime = 1010;
        const endTime = 1040;
        await simulateTimedDownSwipe(viewport, 500, 50, startTime, moveTime, endTime);
        expect(screen.getByTestId('active-snap').textContent).toBe('1');
      } finally {
        env.cleanup();
      }
    },
  );
  it.skipIf(isJSDOM).each([false, true])(
    'advances on a short flick with a trailing stationary sample: %s',
    async (phantom) => {
      const env = setupSwipeTestEnv();
      try {
        await render((overrides) => <SnapPointSequentialSkipCase {...overrides()} />);
        const viewport = screen.getByTestId('viewport');
        env.pointAt(screen.getByTestId('popup'));
        await simulateTimedSwipe(viewport, [
          { type: 'down', x: 100, y: 500, time: 992 },
          { type: 'move', x: 100, y: 500, time: 1000 },
          { type: 'move', x: 100, y: 488, time: 1016 },
          { type: 'move', x: 100, y: 476, time: 1032 },
          { type: 'move', x: 100, y: 464, time: 1048 },
          ...(phantom ? [{ type: 'move' as const, x: 100, y: 463.5, time: 1064 }] : []),
          { type: 'up', x: 100, y: phantom ? 463.5 : 464, time: phantom ? 1072 : 1056 },
        ]);
        expect(screen.getByTestId('active-snap').textContent).toBe('300px');
      } finally {
        env.cleanup();
      }
    },
  );
  it.skipIf(isJSDOM)(
    'stays on the current snap point after repeated stationary samples',
    async () => {
      const env = setupSwipeTestEnv();
      try {
        await render((overrides) => <SnapPointSequentialSkipCase {...overrides()} />);
        const viewport = screen.getByTestId('viewport');
        env.pointAt(screen.getByTestId('popup'));
        await simulateTimedSwipe(viewport, [
          { type: 'down', x: 100, y: 500, time: 992 },
          { type: 'move', x: 100, y: 500, time: 1000 },
          { type: 'move', x: 100, y: 460, time: 1016 },
          { type: 'move', x: 100, y: 460, time: 1032 },
          { type: 'move', x: 100, y: 460, time: 1048 },
          { type: 'move', x: 100, y: 460, time: 1064 },
          { type: 'up', x: 100, y: 460, time: 1072 },
        ]);
        expect(screen.getByTestId('active-snap').textContent).toBe('100px');
      } finally {
        env.cleanup();
      }
    },
  );
  it.skipIf(isJSDOM)(
    'advances to the next snap point on fast flicks when snapToSequentialPoints is enabled',
    async () => {
      const env = setupSwipeTestEnv();
      try {
        await render((overrides) => <SnapPointSequentialSkipCase {...overrides()} />);
        await flushMicrotasks();
        const viewport = screen.getByTestId('viewport');
        const popup = screen.getByTestId('popup');
        env.pointAt(popup);
        const startTime = 2000;
        const moveTime = 2010;
        const endTime = 2050;
        await simulateTimedDownSwipe(viewport, 500, 460, startTime, moveTime, endTime);
        expect(screen.getByTestId('active-snap').textContent).toBe('300px');
      } finally {
        env.cleanup();
      }
    },
  );
  it.skipIf(isJSDOM)('keeps the drawer open on low-velocity swipes near a snap point', async () => {
    const handleOpenChange = vi.fn();
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointSwipeCase onOpenChange={handleOpenChange} {...overrides()} />
      ));
      await flushMicrotasks();
      const viewport = screen.getByTestId('viewport');
      const popup = screen.getByTestId('popup');
      env.pointAt(popup);
      const startTime = 1000;
      const moveTime = 1005;
      const settleTime = 1015;
      const endTime = 1035;
      await simulateTimedDownSwipe(viewport, 100, 120, startTime, moveTime, endTime, settleTime);
      expect(handleOpenChange).not.toHaveBeenCalledWith(false);
      expect(screen.getByTestId('active-snap').textContent).toBe('100px');
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)(
    'keeps the drawer open when the release velocity reverses during an upward swipe',
    async () => {
      const handleOpenChange = vi.fn();
      const env = setupSwipeTestEnv();
      try {
        await render((overrides) => (
          <SnapPointSwipeCase onOpenChange={handleOpenChange} {...overrides()} />
        ));
        await flushMicrotasks();
        const viewport = screen.getByTestId('viewport');
        const popup = screen.getByTestId('popup');
        env.pointAt(popup);
        const startTime = 1000;
        const nudgeTime = 1003;
        const peakTime = 1010;
        const reversalTime = 1015;
        const endTime = 1025;
        await simulateTimedSwipe(viewport, [
          { type: 'down', x: 100, y: 300, time: startTime },
          { type: 'move', x: 100, y: 299, time: nudgeTime },
          { type: 'move', x: 100, y: 120, time: peakTime },
          { type: 'move', x: 100, y: 140, time: reversalTime },
          { type: 'up', x: 100, y: 140, time: endTime },
        ]);
        expect(handleOpenChange).not.toHaveBeenCalledWith(false);
      } finally {
        env.cleanup();
      }
    },
  );
  it.skipIf(isJSDOM)('chooses the nearest sequential snap point on a slow drag', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointGestureCase initialSnapPoint="100px" snapToSequentialPoints {...overrides()} />
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 500, time: 1000 },
        { type: 'move', x: 100, y: 499, time: 1010 },
        { type: 'move', x: 100, y: 350, time: 2010 },
        { type: 'up', x: 100, y: 350, time: 2011 },
      ]);
      expect(screen.getByTestId('active-snap').textContent).toBe('300px');
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)('advances a sequential snap point toward dismissal', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointGestureCase initialSnapPoint={1} snapToSequentialPoints {...overrides()} />
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 100, time: 1000 },
        { type: 'move', x: 100, y: 101, time: 1010 },
        { type: 'move', x: 100, y: 140, time: 1020 },
        { type: 'up', x: 100, y: 140, time: 1021 },
      ]);
      expect(screen.getByTestId('active-snap').textContent).toBe('300px');
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)('dismisses past the final sequential snap point', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointGestureCase initialSnapPoint="100px" snapToSequentialPoints {...overrides()} />
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 100, time: 1000 },
        { type: 'move', x: 100, y: 101, time: 1010 },
        { type: 'move', x: 100, y: 160, time: 1020 },
        { type: 'up', x: 100, y: 160, time: 1021 },
      ]);
      expect(screen.queryByTestId('popup')).toBe(null);
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)('dismisses when a slow snap-point drag ends closer to closed', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointGestureCase initialSnapPoint="100px" snapToSequentialPoints {...overrides()} />
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 100, time: 1000 },
        { type: 'move', x: 100, y: 101, time: 1010 },
        { type: 'move', x: 100, y: 180, time: 2010 },
        { type: 'up', x: 100, y: 180, time: 2011 },
      ]);
      expect(screen.queryByTestId('popup')).toBe(null);
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)('dismisses from upward snap points using upward velocity', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointGestureCase initialSnapPoint="100px" swipeDirection="up" {...overrides()} />
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 500, time: 1000 },
        { type: 'move', x: 100, y: 499, time: 1010 },
        { type: 'move', x: 100, y: 420, time: 1020 },
        { type: 'up', x: 100, y: 420, time: 1021 },
      ]);
      expect(screen.queryByTestId('popup')).toBe(null);
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)('opens from a controlled null snap point', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointGestureCase initialSnapPoint={null} {...overrides()} />
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 100, time: 1000 },
        { type: 'move', x: 100, y: 99, time: 1010 },
        { type: 'move', x: 100, y: 60, time: 1020 },
        { type: 'up', x: 100, y: 60, time: 1021 },
      ]);
      expect(screen.getByTestId('active-snap').textContent).toBe('1');
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)('dismisses from a controlled null snap point', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointGestureCase initialSnapPoint={null} {...overrides()} />
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 100, time: 1000 },
        { type: 'move', x: 100, y: 101, time: 1010 },
        { type: 'move', x: 100, y: 160, time: 1020 },
        { type: 'up', x: 100, y: 160, time: 1021 },
      ]);
      expect(screen.queryByTestId('popup')).toBe(null);
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)('keeps the first sequential snap point on a fast opening flick', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointGestureCase initialSnapPoint={1} snapToSequentialPoints {...overrides()} />
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 100, time: 1000 },
        { type: 'move', x: 100, y: 99, time: 1010 },
        { type: 'move', x: 100, y: 40, time: 1020 },
        { type: 'up', x: 100, y: 40, time: 1021 },
      ]);
      expect(screen.getByTestId('active-snap').textContent).toBe('1');
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)('keeps the current snap point after a sub-threshold drag', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointGestureCase initialSnapPoint="300px" {...overrides()} />
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 100, time: 1000 },
        { type: 'move', x: 100, y: 101, time: 1010 },
        { type: 'move', x: 100, y: 105, time: 2010 },
        { type: 'up', x: 100, y: 105, time: 2011 },
      ]);
      expect(screen.getByTestId('active-snap').textContent).toBe('300px');
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)('dismisses a non-sequential snap point when closed is nearest', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointGestureCase initialSnapPoint="100px" {...overrides()} />
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 100, time: 1000 },
        { type: 'move', x: 100, y: 101, time: 1010 },
        { type: 'move', x: 100, y: 180, time: 2010 },
        { type: 'up', x: 100, y: 180, time: 2011 },
      ]);
      expect(screen.queryByTestId('popup')).toBe(null);
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)('finishes a controlled accepted dismissal while kept mounted', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <SnapPointGestureCase
          initialSnapPoint="100px"
          keepMounted
          snapToSequentialPoints
          {...overrides()}
        />
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 100, time: 1000 },
        { type: 'move', x: 100, y: 101, time: 1010 },
        { type: 'move', x: 100, y: 160, time: 1020 },
        { type: 'up', x: 100, y: 160, time: 1021 },
      ]);
      await act(async () => {
        await waitSingleFrame();
      });
      expect(screen.getByTestId('popup')).toHaveAttribute('data-closed', '');
    } finally {
      env.cleanup();
    }
  });
  it.skipIf(isJSDOM)(
    'restores a snap point when a controlled parent rejects dismissal',
    async () => {
      const env = setupSwipeTestEnv();
      try {
        await render((overrides) => (
          <SnapPointGestureCase
            initialSnapPoint="100px"
            rejectClose
            snapToSequentialPoints
            {...overrides()}
          />
        ));
        const viewport = screen.getByTestId('viewport');
        env.pointAt(screen.getByTestId('popup'));
        await simulateTimedSwipe(viewport, [
          { type: 'down', x: 100, y: 100, time: 1000 },
          { type: 'move', x: 100, y: 101, time: 1010 },
          { type: 'move', x: 100, y: 160, time: 1020 },
          { type: 'up', x: 100, y: 160, time: 1021 },
        ]);
        await act(async () => {
          await waitSingleFrame();
        });
        expect(screen.getByTestId('active-snap').textContent).toBe('100px');
        expect(screen.getByTestId('popup')).toHaveAttribute('data-open', '');
      } finally {
        env.cleanup();
      }
    },
  );
  it.skipIf(isJSDOM)('closes an uncontrolled drawer after a slow long drag', async () => {
    const env = setupSwipeTestEnv();
    try {
      await render((overrides) => (
        <Drawer.Root defaultOpen swipeDirection="down" {...overrides()}>
          <Drawer.Portal>
            <Drawer.Viewport data-testid="viewport">
              <Drawer.Popup data-testid="popup" style={{ height: '200px' }}>
                Drawer
              </Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.Root>
      ));
      const viewport = screen.getByTestId('viewport');
      env.pointAt(screen.getByTestId('popup'));
      await simulateTimedSwipe(viewport, [
        { type: 'down', x: 100, y: 100, time: 1000 },
        { type: 'move', x: 100, y: 101, time: 1010 },
        { type: 'move', x: 100, y: 250, time: 2010 },
        { type: 'up', x: 100, y: 250, time: 2011 },
      ]);
      expect(screen.queryByTestId('popup')).toBe(null);
    } finally {
      env.cleanup();
    }
  });
  describe('CloseWatcher', () => {
    class CloseWatcherStub extends EventTarget {
      static instances: CloseWatcherStub[] = [];
      active = true;
      constructor() {
        super();
        CloseWatcherStub.instances.push(this);
      }
      destroy() {
        this.active = false;
      }
      // Mirrors the browser: `cancel` fires first and can only be prevented while the page has
      // history-action activation; otherwise the watcher is destroyed before `close` fires.
      requestClose(cancelable: boolean) {
        if (!this.active) {
          return;
        }
        const cancelEvent = new Event('cancel', { cancelable });
        this.dispatchEvent(cancelEvent);
        if (cancelEvent.defaultPrevented) {
          return;
        }
        this.destroy();
        this.dispatchEvent(new Event('close'));
      }
    }
    const win = window as Window & {
      CloseWatcher?: unknown | undefined;
    };
    const originalCloseWatcher = win.CloseWatcher;
    beforeEach(() => {
      CloseWatcherStub.instances = [];
      win.CloseWatcher = CloseWatcherStub;
    });
    afterEach(() => {
      win.CloseWatcher = originalCloseWatcher;
    });
    function TestDrawer(
      fixtureProps: Omit<Drawer.Root.Props, 'children'> & {
        children?: JSX.Element;
      },
    ) {
      return (
        <Drawer.Root {...omit(fixtureProps, 'children')}>
          <Drawer.Portal>
            <Drawer.Viewport>
              <Drawer.Popup>{fixtureProps.children ?? 'Drawer'}</Drawer.Popup>
            </Drawer.Viewport>
          </Drawer.Portal>
        </Drawer.Root>
      );
    }
    function currentWatcher() {
      return CloseWatcherStub.instances[CloseWatcherStub.instances.length - 1];
    }
    async function requestClose(cancelable = true) {
      await act(async () => {
        currentWatcher().requestClose(cancelable);
      });
    }
    it('closes when the watcher requests a close', async () => {
      const handleOpenChange = vi.fn();
      await render((overrides) => (
        <TestDrawer defaultOpen onOpenChange={handleOpenChange} {...overrides()} />
      ));
      await requestClose();
      expect(handleOpenChange).toHaveBeenCalledExactlyOnceWith(
        false,
        expect.objectContaining({ reason: REASONS.closeWatcher }),
      );
      expect(screen.queryByRole('dialog')).toBe(null);
      expect(currentWatcher().active).toBe(false);
    });
    it('keeps the same watcher active when a cancelable close request is canceled', async () => {
      let shouldCancel = true;
      const handleOpenChange = vi.fn(
        (drawerOpen: boolean, details: Drawer.Root.ChangeEventDetails) => {
          if (shouldCancel) {
            details.cancel();
          }
        },
      );
      await render((overrides) => (
        <TestDrawer defaultOpen onOpenChange={handleOpenChange} {...overrides()} />
      ));
      const watcher = currentWatcher();
      const instanceCount = CloseWatcherStub.instances.length;
      await requestClose();
      expect(handleOpenChange).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('dialog')).not.toBe(null);
      expect(CloseWatcherStub.instances).toHaveLength(instanceCount);
      expect(watcher.active).toBe(true);
      shouldCancel = false;
      await requestClose();
      expect(handleOpenChange).toHaveBeenCalledTimes(2);
      expect(screen.queryByRole('dialog')).toBe(null);
      expect(watcher.active).toBe(false);
    });
    it('closes on a close request that cannot be prevented even if onOpenChange cancels it', async () => {
      const handleOpenChange = vi.fn(
        (drawerOpen: boolean, details: Drawer.Root.ChangeEventDetails) => {
          details.cancel();
        },
      );
      await render((overrides) => (
        <TestDrawer defaultOpen onOpenChange={handleOpenChange} {...overrides()} />
      ));
      await requestClose(false);
      expect(handleOpenChange).toHaveBeenCalledTimes(1);
      const details = handleOpenChange.mock.calls[0][1];
      expect(details.event.cancelable).toBe(false);
      expect(details.isCanceled).toBe(false);
      expect(screen.queryByRole('dialog')).toBe(null);
      expect(currentWatcher().active).toBe(false);
    });
    it.each([false, true])(
      'steps through content on back presses until one cannot be prevented (controlled: %s)',
      async (controlled) => {
        function SteppedDrawer() {
          const [open, setOpen] = createSignal(true, { ownedWrite: true });
          const [step, setStep] = createSignal(2, { ownedWrite: true });
          return (
            <TestDrawer
              defaultOpen
              open={controlled ? open() : undefined}
              onOpenChange={(nextOpen, details) => {
                if (step() > 0 && details.event.cancelable) {
                  details.cancel();
                  setStep(step() - 1);
                  return;
                }
                setOpen(nextOpen);
              }}
            >
              step {step()}
            </TestDrawer>
          );
        }
        await render((overrides) => <SteppedDrawer {...overrides()} />);
        const watcher = currentWatcher();
        const instanceCount = CloseWatcherStub.instances.length;
        await requestClose();
        expect(screen.getByRole('dialog')).toHaveTextContent('step 1');
        expect(CloseWatcherStub.instances).toHaveLength(instanceCount);
        expect(watcher.active).toBe(true);
        await requestClose(false);
        expect(screen.queryByRole('dialog')).toBe(null);
        expect(watcher.active).toBe(false);
      },
    );
    it('destroys the watcher on unmount', async () => {
      const handleOpenChange = vi.fn(
        (drawerOpen: boolean, details: Drawer.Root.ChangeEventDetails) => {
          details.cancel();
        },
      );
      const { unmount } = await render((overrides) => (
        <TestDrawer defaultOpen onOpenChange={handleOpenChange} {...overrides()} />
      ));
      const watcher = currentWatcher();
      await requestClose();
      expect(watcher.active).toBe(true);
      unmount();
      expect(watcher.active).toBe(false);
    });
  });
});
// Port note: Solid has no StrictMode; React-only tests are marked below.
function StrictMode(props: { children?: JSX.Element }) {
  return props.children;
}

// Port note: React's passive phase runs after layout effects. Solid has one effect phase,
// so tests model the passive boundary in a microtask, including its cleanup.
function usePassiveEffect(effect: () => void | (() => void), deps: () => readonly unknown[]) {
  useTestLayoutEffect(() => {
    let cleanup: void | (() => void);
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) {
        cleanup = untrack(effect);
      }
    });
    return () => {
      disposed = true;
      if (cleanup) {
        queueMicrotask(cleanup);
      }
    };
  }, deps);
}
