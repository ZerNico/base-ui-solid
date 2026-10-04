import { vi, it, describe, expect } from 'vitest';
import { createSignal, flush, Show } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import {
  fireEvent as baseFireEvent,
  render,
  screen,
  waitFor,
  useTestInteractions,
} from '#test-utils';
import { useClick, useListNavigation } from '../index';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';

vi.mock('@base-ui-solid/utils/platform', async () => {
  const actual = await vi.importActual<typeof import('@base-ui-solid/utils/platform')>(
    '@base-ui-solid/utils/platform',
  );

  return {
    ...actual,
    platform: {
      ...actual.platform,
      engine: { ...actual.platform.engine, webkit: true },
    },
  };
});

// Port note: `@testing-library/react`'s `fireEvent` runs in `act`, which applies the updates
// before returning. Solid batches them until the next microtask, so this flushes.
const fireEvent = new Proxy(baseFireEvent, {
  get(target, key, receiver) {
    const value = Reflect.get(target, key, receiver);
    if (typeof value !== 'function') {
      return value;
    }
    return (...args: unknown[]) => {
      const result = value(...args);
      flush();
      return result;
    };
  },
});

function App() {
  const [open, setOpen] = createSignal(false, { ownedWrite: true });
  const listRef: RefObject<Array<HTMLElement | null>> = { current: [] };
  const [activeIndex, setActiveIndex] = createSignal<null | number>(null, { ownedWrite: true });
  const { refs, context } = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
  });
  const { getReferenceProps, getFloatingProps, getItemProps } = useTestInteractions([
    useClick(context.rootStore),
    useListNavigation(context.rootStore, {
      listRef,
      get activeIndex() {
        return activeIndex();
      },
      onNavigate: setActiveIndex,
    }),
  ]);

  return (
    <>
      <button {...getReferenceProps({ ref: refs.setReference })} />
      <Show when={open()}>
        <div role="menu" {...getFloatingProps({ ref: refs.setFloating })}>
          <ul>
            {['one', 'two', 'three'].map((string, index) => (
              // eslint-disable-next-line jsx-a11y/role-supports-aria-props
              <li
                data-testid={`item-${index}`}
                // Port note: Solid removes `false` attributes, React renders them.
                aria-selected={activeIndex() === index ? 'true' : 'false'}
                tabindex={-1}
                {...getItemProps({
                  ref(node: HTMLElement) {
                    listRef.current[index] = node;
                  },
                })}
              >
                {string}
              </li>
            ))}
          </ul>
        </div>
      </Show>
    </>
  );
}

describe('useListNavigation (WebKit)', () => {
  it('ignores stationary mousemove events fired when the list scrolls beneath the pointer', async () => {
    await render(() => <App />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByTestId('item-0')).toHaveFocus();
    });

    // WebKit fires a `mousemove` event with zero movement deltas on the item
    // that moves under the stationary pointer during a keyboard-driven scroll.
    fireEvent.mouseMove(screen.getByTestId('item-1'));
    expect(screen.getByTestId('item-0')).toHaveFocus();
    expect(screen.getByTestId('item-1')).toHaveAttribute('aria-selected', 'false');

    // An actual pointer movement still moves the highlight.
    fireEvent.mouseMove(screen.getByTestId('item-1'), { movementX: 10, movementY: 10 });
    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toHaveFocus();
    });
    expect(screen.getByTestId('item-1')).toHaveAttribute('aria-selected', 'true');
  });

  it('keeps keyboard modality when a stationary pointermove fires on the floating element', async () => {
    await render(() => <App />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByTestId('item-0')).toHaveFocus();
    });

    // The stationary sequence bubbles a `pointermove` through the floating
    // element before the item receives the `mousemove`.
    fireEvent.pointerMove(screen.getByRole('menu'), { pointerType: 'mouse' });
    fireEvent.mouseMove(screen.getByTestId('item-1'));
    expect(screen.getByTestId('item-0')).toHaveFocus();

    // Scrolling can also move the active item out from under the pointer. This
    // must not reset the keyboard highlight as though the pointer had left it.
    fireEvent.pointerLeave(screen.getByTestId('item-0'), {
      pointerType: 'mouse',
      relatedTarget: screen.getByRole('menu'),
    });
    expect(screen.getByTestId('item-0')).toHaveAttribute('aria-selected', 'true');
  });
});
