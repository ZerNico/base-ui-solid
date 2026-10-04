import { test, expect, vi } from 'vitest';
import { createMemo, createSignal, flush, onCleanup, Show, untrack } from 'solid-js';
import { flushMicrotasks, fireEvent, render, screen, useTestInteractions } from '#test-utils';
import type { Coords } from '../dom';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { PopupTriggerMap } from '../../utils/popups';
import { FloatingRootStore } from '../components/FloatingRootStore';
import { useClientPoint } from '../index';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';

function expectLocation({ x, y }: Coords) {
  expect(Number(screen.getByTestId('x')?.textContent)).toBe(x);
  expect(Number(screen.getByTestId('y')?.textContent)).toBe(y);
  expect(Number(screen.getByTestId('width')?.textContent)).toBe(0);
  expect(Number(screen.getByTestId('height')?.textContent)).toBe(0);
}

function expectRect({ x, y, width, height }: DOMRectInit) {
  expect(Number(screen.getByTestId('x')?.textContent)).toBe(x);
  expect(Number(screen.getByTestId('y')?.textContent)).toBe(y);
  expect(Number(screen.getByTestId('width')?.textContent)).toBe(width);
  expect(Number(screen.getByTestId('height')?.textContent)).toBe(height);
}

function createRootStore(referenceElement: HTMLElement) {
  return new FloatingRootStore({
    open: false,
    transitionStatus: undefined,
    referenceElement,
    floatingElement: document.createElement('div'),
    triggerElements: new PopupTriggerMap(),
    floatingId: undefined,
    syncOnly: false,
    nested: false,
    onOpenChange: vi.fn(),
  });
}

function App(props: {
  enabled?: boolean;
  axis?: 'both' | 'x' | 'y';
  useTriggerProps?: boolean;
  openWithFocusEvent?: boolean;
}) {
  const [isOpen, setIsOpen] = createSignal(false);
  const { refs, elements, context } = useFloating({
    get open() {
      return isOpen();
    },
    onOpenChange: setIsOpen,
  });
  const clientPoint = useClientPoint(context.rootStore, {
    get enabled() {
      return props.enabled ?? true;
    },
    get axis() {
      return props.axis;
    },
  });
  const { getReferenceProps, getTriggerProps, getFloatingProps } = useTestInteractions([
    clientPoint,
  ]);

  // Port note: upstream reads the rect while rendering, so it's read again on every render
  // (e.g. when opening). The memo re-reads it when the reference or the open state changes.
  const rect = createMemo(() => {
    isOpen();
    return elements.reference?.getBoundingClientRect();
  });
  const referenceProps = () =>
    untrack(() => props.useTriggerProps) ? getTriggerProps() : getReferenceProps();

  function handleButtonClick() {
    if (!props.openWithFocusEvent) {
      setIsOpen((v) => !v);
      return;
    }

    context.rootStore.setOpen(
      true,
      createChangeEventDetails(
        REASONS.triggerFocus,
        new FocusEvent('focus'),
        refs.domReference.current as HTMLElement,
      ),
    );
  }

  return (
    <>
      <div
        data-testid="reference"
        ref={refs.setReference}
        {...referenceProps()}
        style={{ width: '0px', height: '0px', 'pointer-events': 'none' }}
      >
        Reference
      </div>
      <Show when={isOpen()}>
        {(_open) => {
          // Port note: Solid doesn't call refs with `null` when the element is removed, unlike
          // React.
          onCleanup(() => refs.setFloating(null));
          return (
            <div
              data-testid="floating"
              ref={refs.setFloating}
              {...getFloatingProps()}
              style={{ 'pointer-events': 'none' }}
            >
              Floating
            </div>
          );
        }}
      </Show>
      <button onClick={handleButtonClick} />
      <span data-testid="x">{rect()?.x}</span>
      <span data-testid="y">{rect()?.y}</span>
      <span data-testid="width">{rect()?.width}</span>
      <span data-testid="height">{rect()?.height}</span>
    </>
  );
}

function ClientPointStoreTest(props: { store: FloatingRootStore; enabled?: boolean }) {
  useClientPoint(
    untrack(() => props.store),
    {
      get enabled() {
        return props.enabled ?? true;
      },
    },
  );
  return null;
}

test('updates position from trigger props', async () => {
  await render(() => <App useTriggerProps />);

  await flushMicrotasks();

  fireEvent(
    screen.getByTestId('reference'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 400,
      clientY: 200,
    }),
  );

  await flushMicrotasks();

  expectLocation({ x: 400, y: 200 });
});

test('uses trigger element when dom reference is missing', async () => {
  await render(() => <App axis="x" />);

  const reference = screen.getByTestId('reference');
  reference.getBoundingClientRect = () => ({
    x: 10,
    y: 50,
    width: 0,
    height: 0,
    top: 50,
    left: 10,
    right: 10,
    bottom: 50,
    toJSON: () => {},
  });

  await flushMicrotasks();

  fireEvent.mouseMove(reference, {
    clientX: 200,
    clientY: 300,
  });

  await flushMicrotasks();

  expectLocation({ x: 200, y: 50 });
});

test('renders at mouse event coords', async () => {
  await render(() => <App />);

  await flushMicrotasks();

  fireEvent(
    screen.getByTestId('reference'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 500,
      clientY: 500,
    }),
  );

  await flushMicrotasks();

  expectLocation({ x: 500, y: 500 });

  fireEvent(
    screen.getByTestId('reference'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 1000,
      clientY: 1000,
    }),
  );

  await flushMicrotasks();

  expectLocation({ x: 1000, y: 1000 });

  // Window listener isn't registered unless the floating element is open.
  fireEvent(
    window,
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 700,
      clientY: 700,
    }),
  );

  await flushMicrotasks();

  expectLocation({ x: 1000, y: 1000 });

  fireEvent.click(screen.getByRole('button'));
  await flushMicrotasks();

  fireEvent(
    screen.getByTestId('reference'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 700,
      clientY: 700,
    }),
  );
  await flushMicrotasks();

  expectLocation({ x: 700, y: 700 });

  fireEvent(
    document.body,
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 0,
      clientY: 0,
    }),
  );
  await flushMicrotasks();

  expectLocation({ x: 0, y: 0 });
});

test('cleans up window listener when closing or disabling', async () => {
  const [enabled, setEnabled] = createSignal(true);
  await render(() => <App enabled={enabled()} />);

  fireEvent.click(screen.getByRole('button'));
  flush();

  fireEvent(
    screen.getByTestId('reference'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 500,
      clientY: 500,
    }),
  );
  await flushMicrotasks();

  fireEvent.click(screen.getByRole('button'));
  flush();

  fireEvent(
    document.body,
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 0,
      clientY: 0,
    }),
  );
  await flushMicrotasks();

  expectLocation({ x: 500, y: 500 });

  fireEvent.click(screen.getByRole('button'));
  flush();

  fireEvent(
    document.body,
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 500,
      clientY: 500,
    }),
  );
  await flushMicrotasks();

  expectLocation({ x: 500, y: 500 });

  setEnabled(false);
  flush();

  fireEvent(
    document.body,
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 0,
      clientY: 0,
    }),
  );
  await flushMicrotasks();

  expectRect({ x: 0, y: 0, width: 0, height: 0 });
});

test('clears virtual references on unmount without retaining a stale DOM reference', async () => {
  const reference = document.createElement('button');
  const store = createRootStore(reference);
  const virtualReference = {
    getBoundingClientRect: () => reference.getBoundingClientRect(),
  };

  store.set('positionReference', virtualReference);

  const [enabled, setEnabled] = createSignal(true);
  const { unmount } = await render(() => (
    <ClientPointStoreTest store={store} enabled={enabled()} />
  ));

  setEnabled(false);
  flush();
  await flushMicrotasks();

  expect(store.state.positionReference).toBe(reference);

  store.set('positionReference', virtualReference);
  unmount();

  expect(store.state.positionReference).toBe(null);
});

test('axis x', async () => {
  await render(() => <App axis="x" />);

  fireEvent.click(screen.getByRole('button'));
  flush();

  fireEvent(
    screen.getByTestId('reference'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 500,
      clientY: 500,
    }),
  );
  await flushMicrotasks();

  expectLocation({ x: 500, y: 0 });
});

test('axis y', async () => {
  await render(() => <App axis="y" />);

  fireEvent.click(screen.getByRole('button'));
  flush();

  fireEvent(
    screen.getByTestId('reference'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 500,
      clientY: 500,
    }),
  );
  await flushMicrotasks();

  expectLocation({ x: 0, y: 500 });
});

test.for([
  {
    axis: 'x',
    atCursor: { x: 500, y: 20, width: 0, height: 40 },
    afterReferenceMoves: { x: 550, y: 70, width: 0, height: 40 },
  },
  {
    axis: 'y',
    atCursor: { x: 10, y: 500, width: 30, height: 0 },
    afterReferenceMoves: { x: 60, y: 550, width: 30, height: 0 },
  },
] as const)(
  'keeps the reference size on the untracked axis when tracking $axis',
  async ({ axis, atCursor, afterReferenceMoves }) => {
    await render(() => <App axis={axis} />);

    const reference = screen.getByTestId('reference');
    let referenceRect = { x: 10, y: 20, width: 30, height: 40 };

    reference.getBoundingClientRect = () => {
      const { x, y, width, height } = referenceRect;
      return {
        x,
        y,
        width,
        height,
        top: y,
        right: x + width,
        bottom: y + height,
        left: x,
        toJSON: () => {},
      };
    };

    fireEvent(
      reference,
      new MouseEvent('mousemove', {
        bubbles: true,
        clientX: 500,
        clientY: 500,
      }),
    );
    await flushMicrotasks();

    expectRect(atCursor);

    // Opening re-reads the same virtual element as an auto-update. The open wasn't a hover,
    // so the cursor point keeps its offset from the reference instead of snapping back.
    referenceRect = { x: 60, y: 70, width: 30, height: 40 };

    fireEvent.click(screen.getByRole('button'));
    await flushMicrotasks();

    expectRect(afterReferenceMoves);
  },
);

test('removes window listener when cursor lands on floating element', async () => {
  await render(() => <App />);

  fireEvent.click(screen.getByRole('button'));
  flush();

  fireEvent(
    screen.getByTestId('reference'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 500,
      clientY: 500,
    }),
  );
  flush();

  fireEvent(
    screen.getByTestId('floating'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 500,
      clientY: 500,
    }),
  );
  flush();

  await flushMicrotasks();

  fireEvent(
    document.body,
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 0,
      clientY: 0,
    }),
  );
  flush();

  expectLocation({ x: 500, y: 500 });
});

test('reattaches window listener after cursor returns from floating element to reference', async () => {
  await render(() => <App />);

  fireEvent.click(screen.getByRole('button'));
  flush();

  fireEvent(
    screen.getByTestId('reference'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 500,
      clientY: 500,
    }),
  );
  flush();

  fireEvent(
    screen.getByTestId('floating'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 500,
      clientY: 500,
    }),
  );
  flush();

  await flushMicrotasks();

  fireEvent(
    document.body,
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 0,
      clientY: 0,
    }),
  );
  flush();

  expectLocation({ x: 500, y: 500 });

  fireEvent(
    screen.getByTestId('reference'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 600,
      clientY: 700,
    }),
  );
  await flushMicrotasks();

  // Reapply deterministic coordinates after the effect attaches the window listener.
  // A real browser cursor can emit an unrelated move while the effect is flushing.
  fireEvent(
    screen.getByTestId('reference'),
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 600,
      clientY: 700,
    }),
  );
  flush();

  expectLocation({ x: 600, y: 700 });

  fireEvent(
    document.body,
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 100,
      clientY: 200,
    }),
  );

  await flushMicrotasks();
  expectLocation({ x: 100, y: 200 });
});

test('restores the DOM reference when opened by a non-mouse event', async () => {
  await render(() => <App openWithFocusEvent />);

  const reference = screen.getByTestId('reference');

  reference.getBoundingClientRect = () => ({
    x: 10,
    y: 20,
    width: 30,
    height: 40,
    top: 20,
    right: 40,
    bottom: 60,
    left: 10,
    toJSON: () => {},
  });

  fireEvent(
    reference,
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 500,
      clientY: 500,
    }),
  );
  await flushMicrotasks();

  expectLocation({ x: 500, y: 500 });

  fireEvent.click(screen.getByRole('button'));
  await flushMicrotasks();

  expectRect({ x: 10, y: 20, width: 30, height: 40 });

  fireEvent(
    document.body,
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 100,
      clientY: 200,
    }),
  );
  flush();

  fireEvent(
    reference,
    new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 300,
      clientY: 400,
    }),
  );
  await flushMicrotasks();

  expectRect({ x: 10, y: 20, width: 30, height: 40 });
});
