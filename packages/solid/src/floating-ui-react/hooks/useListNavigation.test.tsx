import { vi, it, describe, expect } from 'vitest';
import { createMemo, createSignal, flush, merge, omit, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import userEvent from '@testing-library/user-event';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import {
  fireEvent as baseFireEvent,
  flushMicrotasks,
  render,
  screen,
  waitFor,
  isJSDOM,
  useTestInteractions,
} from '#test-utils';
import type { HTMLProps } from '../../internals/types';
import { useClick, useDismiss, useListNavigation } from '../index';
import type { HighlightItemTarget } from './useListNavigation';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';
import { gridNavigation } from './gridNavigation';
import type { UseListNavigationProps } from '../types';
import { Main as ComplexGrid } from '../../../test/floating-ui-tests/ComplexGrid';
import { Main as Grid } from '../../../test/floating-ui-tests/Grid';
import { Main as EmojiPicker } from '../../../test/floating-ui-tests/EmojiPicker';
import { Main as ListboxFocus } from '../../../test/floating-ui-tests/ListboxFocus';
import { Main as NestedMenu } from '../../../test/floating-ui-tests/Menu';
import { HorizontalMenu } from '../../../test/floating-ui-tests/MenuOrientation';

/* eslint-disable testing-library/no-unnecessary-act */

// Port note: `@testing-library/react`'s `fireEvent` runs in `act`, which applies the
// updates before returning. Solid batches them until the next microtask, so these flush.
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

// Port note: counterpart of React's `act`: run the action, then apply Solid's batched updates
// (after the promise settles for async actions).
function act(callback: () => unknown): any {
  const result = callback();
  if (result instanceof Promise) {
    return result.then(() => flushMicrotasks());
  }
  flush();
  return undefined;
}

// Port note: Solid's JSX types only accept `'true'`/`'false'` for boolean ARIA attributes.
function ariaBoolean(value: boolean | undefined) {
  if (value === undefined) {
    return undefined;
  }
  return value ? 'true' : 'false';
}

function App(
  inProps: Omit<Partial<UseListNavigationProps>, 'listRef'> & {
    disableFirstItem?: boolean;
    hideFirstItem?: boolean;
    firstItemStyle?: JSX.CSSProperties;
  } = {},
) {
  const props = omit(inProps, 'disableFirstItem', 'hideFirstItem', 'firstItemStyle');
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
    useListNavigation(
      context.rootStore,
      merge(props, {
        listRef,
        get activeIndex() {
          return activeIndex();
        },
        onNavigate(index: number | null) {
          setActiveIndex(index);
          props.onNavigate?.(index, undefined);
        },
      }),
    ),
  ]);

  return (
    <>
      <button {...getReferenceProps({ ref: refs.setReference })} />
      <Show when={open()}>
        <div role="menu" {...getFloatingProps({ ref: refs.setFloating })}>
          <ul>
            {['one', 'two', 'three'].map((string, index) => {
              let style: JSX.CSSProperties | undefined;

              if (index === 0) {
                style = inProps.hideFirstItem ? { display: 'none' } : inProps.firstItemStyle;
              }

              return (
                // eslint-disable-next-line
                <li
                  data-testid={`item-${index}`}
                  // Port note: Solid removes `false` attributes, React renders them.
                  aria-selected={activeIndex() === index ? 'true' : 'false'}
                  style={style}
                  tabindex={-1}
                  aria-disabled={ariaBoolean(
                    (inProps.disableFirstItem && index === 0) ||
                      (typeof props.disabledIndices === 'function'
                        ? props.disabledIndices?.(index)
                        : props.disabledIndices?.includes(index)),
                  )}
                  {...getItemProps({
                    ref(node: HTMLElement) {
                      listRef.current[index] = node;
                    },
                  })}
                >
                  {string}
                </li>
              );
            })}
          </ul>
        </div>
      </Show>
    </>
  );
}

function VirtualizedGridRows(props: {
  totalItems?: number;
  initialActiveIndex?: number;
  loopFocus?: boolean;
  disabledIndices?: UseListNavigationProps['disabledIndices'];
  hiddenIndices?: number[];
}) {
  const totalItems = () => props.totalItems ?? 100;
  const COLUMNS = 5;
  const VISIBLE_ROWS = 3;

  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  const [activeIndex, setActiveIndex] = createSignal<number | null>(props.initialActiveIndex ?? 0, {
    ownedWrite: true,
  });
  const listRef: RefObject<Array<HTMLElement | null>> = { current: [] };

  const { refs, context } = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useTestInteractions([
    useListNavigation(context.rootStore, {
      listRef,
      get activeIndex() {
        return activeIndex();
      },
      onNavigate: setActiveIndex,
      virtual: true,
      get loopFocus() {
        return props.loopFocus ?? true;
      },
      orientation: 'horizontal',
      get disabledIndices() {
        return props.disabledIndices;
      },
      grid: gridNavigation,
    }),
  ]);

  useEffect(
    ([totalItemsValue]) => {
      listRef.current.length = totalItemsValue;
    },
    () => [totalItems()],
  );

  return (
    <>
      <input
        data-testid="virtual-grid-reference"
        {...getReferenceProps({ ref: refs.setReference })}
      />
      <Show when={open()}>
        <div
          role="grid"
          data-testid="virtual-grid-floating"
          {...getFloatingProps({ ref: refs.setFloating })}
        >
          {Array.from({ length: VISIBLE_ROWS }, (_row, rowIndex) => (
            <div role="row">
              {Array.from({ length: COLUMNS }, (_column, columnIndex) => {
                const itemIndex = rowIndex * COLUMNS + columnIndex;
                if (itemIndex >= totalItems()) {
                  return null;
                }

                return (
                  <button
                    type="button"
                    role="gridcell"
                    style={
                      props.hiddenIndices?.includes(itemIndex) ? { display: 'none' } : undefined
                    }
                    data-active={activeIndex() === itemIndex ? '' : undefined}
                    {...getItemProps({
                      ref(node: HTMLElement | null) {
                        listRef.current[itemIndex] = node;
                      },
                    })}
                  >
                    {itemIndex}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </Show>
      <span data-testid="virtual-grid-active-index" data-active-index={activeIndex() ?? ''} />
    </>
  );
}

describe('useListNavigation', () => {
  it('does not add role-dependent aria-orientation', async () => {
    await render(() => <App orientation="horizontal" />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowRight' });
    await waitFor(() => {
      expect(screen.getByTestId('item-0')).toHaveFocus();
    });

    expect(screen.getByRole('menu')).not.toHaveAttribute('aria-orientation');
  });

  it('opens on ArrowDown and focuses first item', async () => {
    await render(() => <App />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('item-0')).toHaveFocus();
    });
  });

  it('opens on ArrowUp and focuses last item', async () => {
    await render(() => <App />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowUp' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('item-2')).toHaveFocus();
    });
  });

  it('navigates down on ArrowDown', async () => {
    await render(() => <App />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('item-0')).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByTestId('item-2')).toHaveFocus();
    });

    // Reached the end of the list.
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByTestId('item-2')).toHaveFocus();
    });
  });

  it('navigates up on ArrowUp', async () => {
    await render(() => <App />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowUp' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('item-2')).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByTestId('item-0')).toHaveFocus();
    });

    // Reached the end of the list.
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByTestId('item-0')).toHaveFocus();
    });
  });

  it('skips disabled item on initial navigation', async () => {
    await render(() => <App disableFirstItem loopFocus disabledIndices={[]} />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
    await waitFor(() => {
      expect(screen.getByTestId('item-2')).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByTestId('item-0')).toHaveFocus();
    });
  });

  it('skips items hidden with CSS in navigation', async () => {
    await render(() => <App hideFirstItem loopFocus disabledIndices={[]} />);

    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByTestId('item-2')).toHaveFocus();
    });
  });

  it('skips visibility:hidden items in navigation', async () => {
    await render(() => (
      <App firstItemStyle={{ visibility: 'hidden' }} loopFocus disabledIndices={[]} />
    ));

    fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toHaveFocus();
    });

    fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
    await waitFor(() => {
      expect(screen.getByTestId('item-2')).toHaveFocus();
    });
  });

  it('resets indexRef to -1 upon close', async () => {
    const data = ['a', 'ab', 'abc', 'abcd'];

    function Autocomplete() {
      const [open, setOpen] = createSignal(false, { ownedWrite: true });
      const [inputValue, setInputValue] = createSignal('', { ownedWrite: true });
      const [activeIndex, setActiveIndex] = createSignal<number | null>(null, {
        ownedWrite: true,
      });

      const listRef: RefObject<Array<HTMLElement | null>> = { current: [] };

      // Port note: `x`, `y` and `strategy` are getters, so the return value isn't destructured.
      const floating = useFloating({
        get open() {
          return open();
        },
        onOpenChange: setOpen,
      });
      const { context, refs } = floating;

      const { getReferenceProps, getFloatingProps, getItemProps } = useTestInteractions([
        useDismiss(context.rootStore),
        useListNavigation(context.rootStore, {
          listRef,
          get activeIndex() {
            return activeIndex();
          },
          onNavigate: setActiveIndex,
          virtual: true,
          loopFocus: true,
        }),
      ]);

      // Port note: React's `onChange` on text inputs is `onInput`.
      function onInput(event: InputEvent) {
        const value = (event.target as HTMLInputElement).value;
        setInputValue(value);

        if (value) {
          setActiveIndex(null);
          setOpen(true);
        } else {
          setOpen(false);
        }
      }

      const items = createMemo(() =>
        data.filter((item) => item.toLowerCase().startsWith(inputValue().toLowerCase())),
      );

      return (
        <>
          <input
            {...getReferenceProps({
              ref: refs.setReference,
              onInput,
              value: inputValue(),
              placeholder: 'Enter fruit',
              'aria-autocomplete': 'list',
            } as HTMLProps<Element>)}
            data-testid="reference"
          />
          <Show when={open()}>
            <div
              {...getFloatingProps({
                ref: refs.setFloating,
                style: {
                  position: floating.strategy,
                  left: floating.x != null ? `${floating.x}px` : '',
                  top: floating.y != null ? `${floating.y}px` : '',
                  background: '#eee',
                  color: 'black',
                  'overflow-y': 'auto',
                },
              })}
              data-testid="floating"
            >
              <ul>
                {items().map((item, index) => (
                  <li
                    {...getItemProps({
                      ref(node: HTMLElement) {
                        listRef.current[index] = node;
                      },
                      onClick() {
                        setInputValue(item);
                        setOpen(false);
                        (refs.domReference.current as HTMLElement | null)?.focus();
                      },
                    })}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Show>
          <div data-testid="active-index">{activeIndex()}</div>
        </>
      );
    }

    await render(() => <Autocomplete />);

    await act(async () => screen.getByTestId('reference').focus());
    await userEvent.keyboard('a');

    expect(screen.getByTestId('floating')).toBeInTheDocument();
    expect(screen.getByTestId('active-index').textContent).toBe('');

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');

    expect(screen.getByTestId('active-index').textContent).toBe('2');

    await userEvent.keyboard('{Escape}');

    expect(screen.getByTestId('active-index').textContent).toBe('');

    await userEvent.keyboard('{Backspace}');
    await userEvent.keyboard('a');

    expect(screen.getByTestId('floating')).toBeInTheDocument();
    expect(screen.getByTestId('active-index').textContent).toBe('');

    await userEvent.keyboard('{ArrowDown}');

    expect(screen.getByTestId('active-index').textContent).toBe('0');
  });

  describe('prop: loopFocus', () => {
    it('ArrowDown looping', async () => {
      await render(() => <App loopFocus />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      await waitFor(() => {
        expect(screen.getByTestId('item-1')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      await waitFor(() => {
        expect(screen.getByTestId('item-2')).toHaveFocus();
      });

      // Reached the end of the list and loops.
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toHaveFocus();
      });
    });

    it('ArrowUp looping', async () => {
      await render(() => <App loopFocus />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowUp' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('item-2')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
      await waitFor(() => {
        expect(screen.getByTestId('item-1')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toHaveFocus();
      });

      // Reached the end of the list and loops.
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
      await waitFor(() => {
        expect(screen.getByTestId('item-2')).toHaveFocus();
      });
    });
  });

  describe('prop: orientation', () => {
    it('navigates down on ArrowRight', async () => {
      await render(() => <App orientation="horizontal" />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowRight' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByTestId('item-1')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByTestId('item-2')).toHaveFocus();
      });

      // Reached the end of the list.
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByTestId('item-2')).toHaveFocus();
      });
    });

    it('navigates up on ArrowLeft', async () => {
      await render(() => <App orientation="horizontal" />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowLeft' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('item-2')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(screen.getByTestId('item-1')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toHaveFocus();
      });

      // Reached the end of the list.
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toHaveFocus();
      });
    });
  });

  describe('prop: rtl', () => {
    it('navigates down on ArrowLeft', async () => {
      await render(() => <App rtl orientation="horizontal" />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowLeft' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(screen.getByTestId('item-1')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(screen.getByTestId('item-2')).toHaveFocus();
      });

      // Reached the end of the list.
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowLeft' });
      await waitFor(() => {
        expect(screen.getByTestId('item-2')).toHaveFocus();
      });
    });

    it('navigates up on ArrowRight', async () => {
      await render(() => <App rtl orientation="horizontal" />);

      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowRight' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('item-2')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByTestId('item-1')).toHaveFocus();
      });

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toHaveFocus();
      });

      // Reached the end of the list.
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowRight' });
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toHaveFocus();
      });
    });
  });

  describe('prop: focusItemOnOpen', () => {
    it('focuses the first item on click when true', async () => {
      await render(() => <App focusItemOnOpen />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toHaveFocus();
      });
    });

    it('does not focus the first item on click when false', async () => {
      await render(() => <App focusItemOnOpen={false} />);
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).not.toHaveFocus();
      });
    });
  });

  describe('prop: selectedIndex', () => {
    it('scrolls the selected item into view on open', async ({ onTestFinished }) => {
      const requestAnimationFrame = vi
        .spyOn(window, 'requestAnimationFrame')
        .mockImplementation(() => 0);
      const scrollIntoView = vi.fn();
      const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
      HTMLElement.prototype.scrollIntoView = scrollIntoView;

      onTestFinished(() => {
        requestAnimationFrame.mockRestore();
        HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
      });

      await render(() => <App selectedIndex={0} />);
      fireEvent.click(screen.getByRole('button'));
      await flushMicrotasks();
      expect(requestAnimationFrame).toHaveBeenCalled();
      // Run the timer
      requestAnimationFrame.mock.calls.forEach((call) => call[0](0));
      expect(scrollIntoView).toHaveBeenCalled();
    });
  });

  describe('allowEscape + virtual', () => {
    it('when true', async () => {
      await render(() => <App allowEscape virtual loopFocus />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      expect(screen.getByTestId('item-0').getAttribute('aria-selected')).toBe('true');
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowUp' });
      expect(screen.getByTestId('item-0').getAttribute('aria-selected')).toBe('false');
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      expect(screen.getByTestId('item-0').getAttribute('aria-selected')).toBe('true');
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      expect(screen.getByTestId('item-1').getAttribute('aria-selected')).toBe('true');
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      expect(screen.getByTestId('item-2').getAttribute('aria-selected')).toBe('true');
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      expect(screen.getByTestId('item-2').getAttribute('aria-selected')).toBe('false');
      await flushMicrotasks();
    });

    it('when false', async () => {
      await render(() => <App allowEscape={false} virtual loopFocus />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      expect(screen.getByTestId('item-0').getAttribute('aria-selected')).toBe('true');
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      expect(screen.getByTestId('item-1').getAttribute('aria-selected')).toBe('true');
      await flushMicrotasks();
    });

    it('true - onNavigate is called with `null` when escaped', async () => {
      const spy = vi.fn();
      await render(() => <App allowEscape virtual loopFocus onNavigate={spy} />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowUp' });
      expect(spy).toHaveBeenCalledTimes(2);
      expect(spy.mock.calls.some((args) => args[0] === null)).toBe(true);
      await flushMicrotasks();
    });
  });

  describe('reference focus', () => {
    it('clears ordinary item focus when the open reference receives focus', async () => {
      await render(() => <App />);
      const reference = screen.getByRole('button');

      fireEvent.keyDown(reference, { key: 'ArrowDown' });
      await waitFor(() => {
        expect(screen.getByTestId('item-0')).toHaveFocus();
      });

      await act(async () => {
        reference.focus();
      });

      expect(screen.getByTestId('item-0')).toHaveAttribute('aria-selected', 'false');
    });
  });

  describe('highlightItem', () => {
    interface HighlightItemActions {
      highlightItem: (target: HighlightItemTarget) => void;
    }

    function HighlightItemApp(
      props: Omit<Partial<UseListNavigationProps>, 'listRef'> & {
        items?: string[];
        actionsRef: RefObject<HighlightItemActions | null>;
      },
    ) {
      const items = () => props.items ?? ['one', 'two', 'three'];
      const listProps = omit(props, 'items', 'actionsRef');
      const [open, setOpen] = createSignal(true, { ownedWrite: true });
      const listRef: RefObject<Array<HTMLElement | null>> = { current: [] };
      const [activeIndex, setActiveIndex] = createSignal<null | number>(null, {
        ownedWrite: true,
      });
      const { refs, context } = useFloating({
        get open() {
          return open();
        },
        onOpenChange: setOpen,
      });
      const listNavigation = useListNavigation(
        context.rootStore,
        merge(listProps, {
          listRef,
          get activeIndex() {
            return activeIndex();
          },
          onNavigate(
            index: number | null,
            event: Event | undefined,
            source?: 'imperative' | undefined,
          ) {
            setActiveIndex(index);
            listProps.onNavigate?.(index, event, source);
          },
        }),
      );
      const { getReferenceProps, getFloatingProps, getItemProps } = useTestInteractions([
        listNavigation,
      ]);

      // Port note: `useImperativeHandle` sets the ref once; `highlightItem` is stable.
      props.actionsRef.current = { highlightItem: listNavigation.highlightItem };

      return (
        <>
          <button {...getReferenceProps({ ref: refs.setReference })} />
          <Show when={open()}>
            <div role="menu" {...getFloatingProps({ ref: refs.setFloating })}>
              <ul>
                {items().map((string, index) => (
                  // eslint-disable-next-line
                  <li
                    data-testid={`item-${index}`}
                    // Port note: Solid removes `false` attributes, React renders them.
                    aria-selected={activeIndex() === index ? 'true' : 'false'}
                    tabindex={-1}
                    aria-disabled={ariaBoolean(
                      Array.isArray(listProps.disabledIndices) &&
                        listProps.disabledIndices.includes(index),
                    )}
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

    it('passes the imperative source only for imperative navigation', async () => {
      const onNavigate = vi.fn();
      const actionsRef: RefObject<HighlightItemActions | null> = { current: null };
      await render(() => <HighlightItemApp actionsRef={actionsRef} onNavigate={onNavigate} />);

      act(() => actionsRef.current!.highlightItem('next'));
      expect(onNavigate).toHaveBeenLastCalledWith(0, undefined, 'imperative');

      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowDown' });
      expect(onNavigate).toHaveBeenLastCalledWith(1, expect.anything(), undefined);
      await flushMicrotasks();
    });

    it('does nothing while disabled', async () => {
      const onNavigate = vi.fn();
      const actionsRef: RefObject<HighlightItemActions | null> = { current: null };
      await render(() => (
        <HighlightItemApp actionsRef={actionsRef} onNavigate={onNavigate} enabled={false} />
      ));

      act(() => actionsRef.current!.highlightItem('first'));
      expect(onNavigate).not.toHaveBeenCalled();
      await flushMicrotasks();
    });

    it('does nothing on an empty list', async () => {
      const onNavigate = vi.fn();
      const actionsRef: RefObject<HighlightItemActions | null> = { current: null };
      await render(() => (
        <HighlightItemApp actionsRef={actionsRef} onNavigate={onNavigate} items={[]} />
      ));

      act(() => {
        actionsRef.current!.highlightItem('first');
        actionsRef.current!.highlightItem('last');
        actionsRef.current!.highlightItem('next');
        actionsRef.current!.highlightItem('previous');
      });
      expect(onNavigate).not.toHaveBeenCalled();
      await flushMicrotasks();
    });

    it('does nothing when every item is disabled', async () => {
      const onNavigate = vi.fn();
      const actionsRef: RefObject<HighlightItemActions | null> = { current: null };
      await render(() => (
        <HighlightItemApp
          actionsRef={actionsRef}
          onNavigate={onNavigate}
          disabledIndices={[0, 1, 2]}
        />
      ));

      act(() => {
        actionsRef.current!.highlightItem('first');
        actionsRef.current!.highlightItem('next');
      });
      expect(onNavigate).not.toHaveBeenCalled();
      await flushMicrotasks();
    });

    it('stays on the only item of a single-item list when looping', async () => {
      const onNavigate = vi.fn();
      const actionsRef: RefObject<HighlightItemActions | null> = { current: null };
      await render(() => (
        <HighlightItemApp
          actionsRef={actionsRef}
          onNavigate={onNavigate}
          items={['one']}
          loopFocus
        />
      ));

      act(() => actionsRef.current!.highlightItem('next'));
      expect(onNavigate).toHaveBeenLastCalledWith(0, undefined, 'imperative');

      act(() => actionsRef.current!.highlightItem('next'));
      expect(onNavigate).toHaveBeenLastCalledWith(0, undefined, 'imperative');

      act(() => actionsRef.current!.highlightItem('previous'));
      expect(onNavigate).toHaveBeenLastCalledWith(0, undefined, 'imperative');
      await flushMicrotasks();
    });
  });

  describe('prop: openOnArrowKeyDown', () => {
    it('opens on ArrowDown when true', async () => {
      await render(() => <App openOnArrowKeyDown />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await flushMicrotasks();
    });

    it('opens on ArrowUp when true', async () => {
      await render(() => <App openOnArrowKeyDown />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowUp' });
      expect(screen.getByRole('menu')).toBeInTheDocument();
      await flushMicrotasks();
    });

    // Port note: `render` is async in the port.
    it('does not open on ArrowDown when false', async () => {
      await render(() => <App openOnArrowKeyDown={false} />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    it('does not open on ArrowUp when false', async () => {
      await render(() => <App openOnArrowKeyDown={false} />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowUp' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });
  });

  describe('prop: disabledIndices', () => {
    it('indices are skipped in focus order', async () => {
      await render(() => <App disabledIndices={[0]} />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'ArrowDown' });
      await waitFor(() => {
        expect(screen.getByTestId('item-1')).toHaveFocus();
      });
      fireEvent.keyDown(screen.getByRole('menu'), { key: 'ArrowUp' });
      await waitFor(() => {
        expect(screen.getByTestId('item-1')).toHaveFocus();
      });
    });
  });

  describe('prop: focusItemOnHover', () => {
    it.skipIf(isJSDOM)(
      'cancels pending item focus when the pointer leaves before focus lands',
      async () => {
        const frameCallbacks = new Map<number, FrameRequestCallback>();
        let frameId = 0;
        const requestAnimationFrameSpy = vi
          .spyOn(window, 'requestAnimationFrame')
          .mockImplementation((callback) => {
            frameId += 1;
            frameCallbacks.set(frameId, callback);
            return frameId;
          });
        const cancelAnimationFrameSpy = vi
          .spyOn(window, 'cancelAnimationFrame')
          .mockImplementation((id) => {
            frameCallbacks.delete(id);
          });
        const spy = vi.fn();

        try {
          await render(() => <App focusItemOnOpen onNavigate={(index) => spy(index)} />);

          fireEvent.click(screen.getByRole('button'));
          await flushMicrotasks();

          const menu = screen.getByRole('menu');
          const item = screen.getByTestId('item-0');

          expect(item).toHaveAttribute('aria-selected', 'true');
          expect(item).not.toHaveFocus();

          fireEvent.pointerLeave(item, {
            pointerType: 'mouse',
            relatedTarget: document.body,
          });

          act(() => {
            const callbacks = Array.from(frameCallbacks.values());
            frameCallbacks.clear();
            callbacks.forEach((callback) => callback(performance.now()));
          });

          expect(item).not.toHaveFocus();
          expect(menu).not.toHaveFocus();
          await waitFor(() => {
            expect(item).toHaveAttribute('aria-selected', 'false');
          });
          expect(spy).toHaveBeenLastCalledWith(null);
        } finally {
          requestAnimationFrameSpy.mockRestore();
          cancelAnimationFrameSpy.mockRestore();
        }
      },
    );

    it('true - focuses item on hover and syncs the active index', async () => {
      const spy = vi.fn();
      await render(() => <App onNavigate={spy} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.mouseMove(screen.getByTestId('item-1'), { movementX: 10, movementY: 10 });
      expect(screen.getByTestId('item-1')).toHaveFocus();
      fireEvent.pointerLeave(screen.getByTestId('item-1'));
      expect(screen.getByRole('menu')).toHaveFocus();
      expect(spy.mock.calls.some((args) => args[0] === 1)).toBe(true);
      await flushMicrotasks();
    });

    it('true - syncs an item on hover when activeIndex is null but selectedIndex matches', async () => {
      const spy = vi.fn();
      await render(() => (
        <App focusItemOnOpen={false} selectedIndex={1} onNavigate={(index) => spy(index)} />
      ));

      fireEvent.click(screen.getByRole('button'));
      fireEvent.mouseMove(screen.getByTestId('item-1'), { movementX: 10, movementY: 10 });

      expect(screen.getByTestId('item-1')).toHaveFocus();
      expect(spy).toHaveBeenCalledWith(1);
      await flushMicrotasks();
    });

    it('false - does not focus item on hover and does not sync the active index', async () => {
      const spy = vi.fn();
      await render(() => <App onNavigate={spy} focusItemOnOpen={false} focusItemOnHover={false} />);
      fireEvent.click(screen.getByRole('button'));
      fireEvent.mouseMove(screen.getByTestId('item-1'), { movementX: 10, movementY: 10 });
      expect(screen.getByTestId('item-1')).not.toHaveFocus();
      expect(spy).toHaveBeenCalledTimes(0);
      await flushMicrotasks();
    });

    it('clears the active item when the pointer leaves a clipped container while still within the item bounds', async () => {
      const spy = vi.fn();
      await render(() => <App onNavigate={spy} />);

      fireEvent.click(screen.getByRole('button'));

      const menu = screen.getByRole('menu');
      const item = screen.getByTestId('item-1');

      menu.style.overflow = 'auto';
      menu.style.maxHeight = '40px';

      vi.spyOn(menu, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        right: 100,
        bottom: 40,
        left: 0,
        width: 100,
        height: 40,
        toJSON() {
          return {};
        },
      });

      vi.spyOn(item, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        right: 100,
        bottom: 80,
        left: 0,
        width: 100,
        height: 80,
        toJSON() {
          return {};
        },
      });

      fireEvent.mouseMove(item, { movementX: 10, movementY: 10 });

      await waitFor(() => {
        expect(item).toHaveFocus();
      });

      await act(async () => {
        fireEvent.pointerLeave(item, {
          clientX: 50,
          clientY: 60,
          pointerType: 'mouse',
          relatedTarget: document.body,
        });
      });

      await waitFor(() => {
        expect(item).toHaveAttribute('aria-selected', 'false');
      });
      expect(spy.mock.calls.at(-1)?.[0]).toBe(null);
    });
  });

  describe('grid navigation', () => {
    it('ArrowDown focuses first item', async () => {
      await render(() => <Grid />);

      fireEvent.click(screen.getByRole('button'));
      expect(screen.getByRole('menu')).toBeInTheDocument();
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      await waitFor(() => {
        expect(screen.getAllByRole('option')[8]).toHaveFocus();
      });
    });

    it('focuses first non-disabled item in grid', async () => {
      await render(() => <Grid />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getAllByRole('option')[8]).toHaveFocus();
      });
    });

    it('focuses next item using ArrowRight key, skipping disabled items', async () => {
      await render(() => <Grid />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      fireEvent.click(screen.getByRole('button'));
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      expect(screen.getAllByRole('option')[9]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      expect(screen.getAllByRole('option')[11]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      expect(screen.getAllByRole('option')[14]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      expect(screen.getAllByRole('option')[16]).toHaveFocus();
      await flushMicrotasks();
    });

    it('focuses previous item using ArrowLeft key, skipping disabled items', async () => {
      await render(() => <Grid />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      fireEvent.click(screen.getByRole('button'));

      act(() => screen.getAllByRole('option')[47].focus());

      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowLeft' });
      expect(screen.getAllByRole('option')[46]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowLeft' });
      expect(screen.getAllByRole('option')[44]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowLeft' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowLeft' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowLeft' });
      expect(screen.getAllByRole('option')[41]).toHaveFocus();
      await flushMicrotasks();
    });

    it('skips row and remains on same column when pressing ArrowDown', async () => {
      await render(() => <Grid />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      fireEvent.click(screen.getByRole('button'));
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      expect(screen.getAllByRole('option')[13]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      expect(screen.getAllByRole('option')[18]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      expect(screen.getAllByRole('option')[23]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      expect(screen.getAllByRole('option')[28]).toHaveFocus();
      await flushMicrotasks();
    });

    it('skips row and remains on same column when pressing ArrowUp', async () => {
      await render(() => <Grid />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      fireEvent.click(screen.getByRole('button'));

      act(() => screen.getAllByRole('option')[47].focus());

      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });
      expect(screen.getAllByRole('option')[42]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });
      expect(screen.getAllByRole('option')[37]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });
      expect(screen.getAllByRole('option')[32]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });
      expect(screen.getAllByRole('option')[27]).toHaveFocus();
      await flushMicrotasks();
    });

    it('loops on the same column with ArrowDown', async () => {
      await render(() => <Grid loopFocus />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      fireEvent.click(screen.getByRole('button'));

      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });

      expect(screen.getAllByRole('option')[8]).toHaveFocus();
      await flushMicrotasks();
    });

    it('loops on the same column with ArrowUp', async () => {
      await render(() => <Grid loopFocus />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      fireEvent.click(screen.getByRole('button'));

      act(() => screen.getAllByRole('option')[43].focus());

      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowUp' });

      expect(screen.getAllByRole('option')[43]).toHaveFocus();
      await flushMicrotasks();
    });

    it('does not leave row with "both" orientation while looping', async () => {
      await render(() => <Grid orientation="both" loopFocus />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      fireEvent.click(screen.getByRole('button'));

      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      expect(screen.getAllByRole('option')[9]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      expect(screen.getAllByRole('option')[8]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowLeft' });
      expect(screen.getAllByRole('option')[9]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowLeft' });
      expect(screen.getAllByRole('option')[8]).toHaveFocus();

      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
      expect(screen.getAllByRole('option')[13]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      expect(screen.getAllByRole('option')[14]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      expect(screen.getAllByRole('option')[11]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowLeft' });
      expect(screen.getAllByRole('option')[14]).toHaveFocus();
      await flushMicrotasks();
    });

    it('looping works on last row', async () => {
      await render(() => <Grid orientation="both" loopFocus />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      fireEvent.click(screen.getByRole('button'));

      act(() => screen.getAllByRole('option')[46].focus());

      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      expect(screen.getAllByRole('option')[47]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowRight' });
      expect(screen.getAllByRole('option')[46]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowLeft' });
      expect(screen.getAllByRole('option')[47]).toHaveFocus();
      fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowLeft' });
      expect(screen.getAllByRole('option')[46]).toHaveFocus();
      await flushMicrotasks();
    });

    it('wraps ArrowUp to the last row in the full list for virtualized rows', async () => {
      await render(() => <VirtualizedGridRows />);

      const reference = screen.getByTestId('virtual-grid-reference');
      await act(async () => {
        reference.focus();
      });

      await userEvent.keyboard('{ArrowUp}');

      await waitFor(() => {
        expect(screen.getByTestId('virtual-grid-active-index')).toHaveAttribute(
          'data-active-index',
          '95',
        );
      });
    });

    it('clamps ArrowUp to the last item in a partial last row for virtualized rows', async () => {
      await render(() => <VirtualizedGridRows totalItems={98} initialActiveIndex={4} />);

      const reference = screen.getByTestId('virtual-grid-reference');
      await act(async () => {
        reference.focus();
      });

      await userEvent.keyboard('{ArrowUp}');

      await waitFor(() => {
        expect(screen.getByTestId('virtual-grid-active-index')).toHaveAttribute(
          'data-active-index',
          '97',
        );
      });
    });

    it('clamps ArrowDown into a partial last row for virtualized rows', async () => {
      await render(() => <VirtualizedGridRows totalItems={98} initialActiveIndex={93} />);

      const reference = screen.getByTestId('virtual-grid-reference');
      await act(async () => {
        reference.focus();
      });

      await userEvent.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(screen.getByTestId('virtual-grid-active-index')).toHaveAttribute(
          'data-active-index',
          '97',
        );
      });
    });

    it('does not wrap ArrowUp when loopFocus is false for virtualized rows', async () => {
      await render(() => (
        <VirtualizedGridRows totalItems={98} initialActiveIndex={4} loopFocus={false} />
      ));

      const reference = screen.getByTestId('virtual-grid-reference');
      await act(async () => {
        reference.focus();
      });

      await userEvent.keyboard('{ArrowUp}');

      await waitFor(() => {
        expect(screen.getByTestId('virtual-grid-active-index')).toHaveAttribute(
          'data-active-index',
          '4',
        );
      });
    });

    it('still clamps ArrowDown into a partial last row when loopFocus is false', async () => {
      await render(() => (
        <VirtualizedGridRows totalItems={98} initialActiveIndex={93} loopFocus={false} />
      ));

      const reference = screen.getByTestId('virtual-grid-reference');
      await act(async () => {
        reference.focus();
      });

      await userEvent.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(screen.getByTestId('virtual-grid-active-index')).toHaveAttribute(
          'data-active-index',
          '97',
        );
      });
    });

    it('falls back left in a partial last row when the preferred candidate is disabled', async () => {
      await render(() => (
        <VirtualizedGridRows totalItems={98} initialActiveIndex={93} disabledIndices={[97]} />
      ));

      const reference = screen.getByTestId('virtual-grid-reference');
      await act(async () => {
        reference.focus();
      });

      await userEvent.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(screen.getByTestId('virtual-grid-active-index')).toHaveAttribute(
          'data-active-index',
          '96',
        );
      });
    });

    it('falls back left when the preferred candidate is hidden', async () => {
      await render(() => <VirtualizedGridRows initialActiveIndex={9} hiddenIndices={[14]} />);

      const reference = screen.getByTestId('virtual-grid-reference');
      await act(async () => {
        reference.focus();
      });

      await userEvent.keyboard('{ArrowDown}');

      await waitFor(() => {
        expect(screen.getByTestId('virtual-grid-active-index')).toHaveAttribute(
          'data-active-index',
          '13',
        );
      });
    });
  });

  describe('grid navigation in a multi-column grid with disabled items', () => {
    it('focuses first non-disabled item in grid', async () => {
      await render(() => <ComplexGrid />);
      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
      fireEvent.click(screen.getByRole('button'));
      await waitFor(() => {
        expect(screen.getAllByRole('option')[7]).toHaveFocus();
      });
    });

    describe.each([
      { rtl: false, arrowToStart: 'ArrowLeft', arrowToEnd: 'ArrowRight' },
      { rtl: true, arrowToStart: 'ArrowRight', arrowToEnd: 'ArrowLeft' },
    ])('with rtl $rtl', ({ rtl, arrowToStart, arrowToEnd }) => {
      it(`focuses next item using ${arrowToEnd} key, skipping disabled items`, async () => {
        await render(() => <ComplexGrid rtl={rtl} />);
        fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
        fireEvent.click(screen.getByRole('button'));
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        expect(screen.getAllByRole('option')[8]).toHaveFocus();
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        expect(screen.getAllByRole('option')[10]).toHaveFocus();
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        expect(screen.getAllByRole('option')[13]).toHaveFocus();
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        expect(screen.getAllByRole('option')[15]).toHaveFocus();
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        expect(screen.getAllByRole('option')[20]).toHaveFocus();
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        expect(screen.getAllByRole('option')[24]).toHaveFocus();
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        expect(screen.getAllByRole('option')[34]).toHaveFocus();
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        expect(screen.getAllByRole('option')[36]).toHaveFocus();
        await flushMicrotasks();
      });

      it(`focuses previous item using ${arrowToStart} key, skipping disabled items`, async () => {
        await render(() => <ComplexGrid rtl={rtl} />);
        fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
        fireEvent.click(screen.getByRole('button'));

        act(() => screen.getAllByRole('option')[36].focus());

        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        await waitFor(() => {
          expect(screen.getAllByRole('option')[34]).toHaveFocus();
        });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        await waitFor(() => {
          expect(screen.getAllByRole('option')[28]).toHaveFocus();
        });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        await waitFor(() => {
          expect(screen.getAllByRole('option')[20]).toHaveFocus();
        });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToStart });
        await waitFor(() => {
          expect(screen.getAllByRole('option')[7]).toHaveFocus();
        });
      });

      it('looping works on last row', async () => {
        await render(() => <ComplexGrid rtl={rtl} orientation="both" loopFocus />);
        fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' });
        fireEvent.click(screen.getByRole('button'));

        act(() => screen.getAllByRole('option')[36].focus());

        fireEvent.keyDown(screen.getByTestId('floating'), { key: arrowToEnd });
        expect(screen.getAllByRole('option')[36]).toHaveFocus();
        await flushMicrotasks();
      });
    });
  });

  it('grid navigation with changing list items', async () => {
    await render(() => <EmojiPicker />);

    fireEvent.click(screen.getByRole('button'));

    await flushMicrotasks();

    const input = screen.getByRole('textbox');
    const activeIndicator = screen.getByTestId('emoji-picker-active-index');
    await waitFor(() => {
      expect(input).toHaveFocus();
    });

    await userEvent.keyboard('appl');
    const initialActiveIndex = activeIndicator.getAttribute('data-active-index');
    await userEvent.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(activeIndicator.getAttribute('data-active-index')).not.toBe(initialActiveIndex);
    });

    await userEvent.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(activeIndicator.getAttribute('data-active-index')).not.toBe(initialActiveIndex);
    });

    expect(activeIndicator.getAttribute('data-active-index')).not.toBeNull();
  });

  it('grid navigation with disabled list items', async () => {
    const { unmount } = await render(() => <EmojiPicker />);

    fireEvent.click(screen.getByRole('button'));

    await flushMicrotasks();

    const input = screen.getByRole('textbox');
    const activeIndicator = screen.getByTestId('emoji-picker-active-index');
    await waitFor(() => {
      expect(input).toHaveFocus();
    });

    await userEvent.keyboard('o');
    const initialActiveIndex = activeIndicator.getAttribute('data-active-index');
    await userEvent.keyboard('{ArrowDown}');

    expect(screen.getByLabelText('orange')).not.toHaveAttribute('data-active');
    await waitFor(() => {
      expect(activeIndicator.getAttribute('data-active-index')).not.toBe(initialActiveIndex);
    });

    await userEvent.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(activeIndicator.getAttribute('data-active-index')).not.toBe(initialActiveIndex);
    });

    expect(activeIndicator.getAttribute('data-active-index')).not.toBeNull();

    unmount();

    await render(() => <EmojiPicker />);

    fireEvent.click(screen.getByRole('button'));

    await flushMicrotasks();

    const nextInput = screen.getByRole('textbox');
    const nextActiveIndicator = screen.getByTestId('emoji-picker-active-index');
    await waitFor(() => {
      expect(nextInput).toHaveFocus();
    });

    const nextInitialActiveIndex = nextActiveIndicator.getAttribute('data-active-index');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowRight}');
    await userEvent.keyboard('{ArrowUp}');

    await waitFor(() => {
      expect(nextActiveIndicator.getAttribute('data-active-index')).not.toBe(
        nextInitialActiveIndex,
      );
    });
    expect(screen.getByLabelText('cherry')).toHaveAttribute('data-active');
  });

  it('selectedIndex changing does not steal focus', async () => {
    await render(() => <ListboxFocus />);

    // TODO: This feels like a bug. It's the animation frame callback from `enqueueFocus` sometimes
    // kicking in after the click instead before, which causes flakeyness in this test as the wrong
    // element will be focused.
    await waitFor(() => {
      expect(document.activeElement).toHaveRole('option');
    });

    await userEvent.click(screen.getByTestId('reference'));

    await waitFor(() => {
      expect(screen.getByTestId('reference')).toHaveFocus();
    });
  });

  // In JSDOM it will not focus the first item, but will in the browser
  it.skipIf(!isJSDOM)('focus management in nested lists', async () => {
    await render(() => <NestedMenu />);
    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowRight}');

    expect(screen.getByText('Text')).toHaveFocus();
  });

  // In JSDOM it will not focus the first item, but will in the browser
  it.skipIf(!isJSDOM)('keyboard navigation in nested menus lists', async () => {
    await render(() => <NestedMenu />);

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
    await flushMicrotasks();
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowRight}'); // opens first submenu
    await flushMicrotasks();

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowRight}'); // opens second submenu
    await flushMicrotasks();

    expect(screen.getByText('.png')).toHaveFocus();

    // it navigation with orientation = 'both'
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByText('.jpg')).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByText('.gif')).toHaveFocus();

    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByText('.svg')).toHaveFocus();

    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getByText('.png')).toHaveFocus();

    // escape closes the submenu
    await userEvent.keyboard('{Escape}');
    expect(screen.getByText('Image')).toHaveFocus();
  });

  // In JSDOM it will not focus the first item, but will in the browser
  it.skipIf(!isJSDOM)(
    'keyboard navigation in nested menus with different orientation',
    async () => {
      await render(() => <HorizontalMenu />);

      await userEvent.click(screen.getByRole('button', { name: 'Edit' }));
      await act(async () => {});
      await userEvent.keyboard('{ArrowRight}');
      await userEvent.keyboard('{ArrowRight}');
      await userEvent.keyboard('{ArrowRight}');
      await userEvent.keyboard('{ArrowDown}'); // opens the Copy as submenu
      await act(async () => {});

      await userEvent.keyboard('{ArrowRight}');
      await userEvent.keyboard('{ArrowDown}'); // opens the Share submenu
      await act(async () => {});

      expect(screen.getByText('Mail')).toHaveFocus();

      await userEvent.keyboard('{ArrowLeft}');
      expect(screen.getByText('Copy as')).toHaveFocus();
    },
  );

  it('Home or End key press is ignored for typeable combobox reference', async () => {
    function App() {
      const [open, setOpen] = createSignal(false, { ownedWrite: true });
      const listRef: RefObject<Array<HTMLElement | null>> = { current: [] };
      const [activeIndex, setActiveIndex] = createSignal<null | number>(null, {
        ownedWrite: true,
      });
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
        /* eslint-disable jsx-a11y/role-has-required-aria-props */
        <>
          <input role="combobox" ref={refs.setReference} {...getReferenceProps()} />
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

    await render(() => <App />);

    await act(async () => {
      screen.getByRole('combobox').focus();
    });

    await userEvent.keyboard('{ArrowDown}');

    await waitFor(() => {
      expect(screen.getByTestId('item-0')).toHaveFocus();
    });

    await userEvent.keyboard('{End}');

    expect(screen.getByTestId('item-0')).toHaveFocus();

    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{Home}');

    await waitFor(() => {
      expect(screen.getByTestId('item-1')).toHaveFocus();
    });
  });
});
