import { createSignal, flush } from 'solid-js';
import { it, expect } from 'vitest';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import {
  render,
  screen,
  fireEvent,
  flushMicrotasks,
  useTestInteractions,
  waitFor,
} from '#test-utils';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';
import { useListNavigation } from './useListNavigation';

// Port note: replace the ref object under a single hook owner, unlike upstream's mutable list tests.
it('navigates and focuses the replacement list ref', async () => {
  const first: RefObject<Array<HTMLElement | null>> = { current: [] };
  const second: RefObject<Array<HTMLElement | null>> = { current: [] };
  const [list, setList] = createSignal(first);
  function App() {
    const [activeIndex, setActiveIndex] = createSignal<number | null>(0);
    const { refs, context } = useFloating({ open: true });
    const { getFloatingProps } = useTestInteractions([
      useListNavigation(context.rootStore, {
        get listRef() {
          return list();
        },
        get activeIndex() {
          return activeIndex();
        },
        onNavigate: setActiveIndex,
        focusItemOnOpen: false,
      }),
    ]);
    return (
      <div data-testid="floating" {...getFloatingProps({ ref: refs.setFloating })}>
        <button
          ref={(node) => {
            first.current[0] = node;
          }}
        >
          old zero
        </button>
        <button
          ref={(node) => {
            first.current[1] = node;
          }}
        >
          old one
        </button>
        <button
          ref={(node) => {
            second.current[0] = node;
          }}
        >
          new zero
        </button>
        <button
          ref={(node) => {
            second.current[1] = node;
          }}
        >
          new one
        </button>
      </div>
    );
  }
  await render(() => <App />);
  await waitFor(() => expect(first.current[0]).toHaveFocus());
  setList(second);
  flush();
  await flushMicrotasks();
  await waitFor(() => expect(second.current[0]).toHaveFocus());
  fireEvent.keyDown(screen.getByTestId('floating'), { key: 'ArrowDown' });
  flush();
  await waitFor(() => expect(second.current[1]).toHaveFocus());
  expect(first.current[1]).not.toHaveFocus();
});
