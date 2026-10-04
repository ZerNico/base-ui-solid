import { vi, expect, beforeEach, describe, it } from 'vitest';
import { createSignal, flush, Show, untrack } from 'solid-js';
import userEvent from '@testing-library/user-event';
import type { RefObject } from '@base-ui-solid/utils/refObject';

import { render, screen, useTestInteractions } from '#test-utils';
import { useClick, useTypeahead } from '../index';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';
import type { UseTypeaheadProps } from './useTypeahead';
import type { HTMLProps } from '../../internals/types';

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

// Port note: counterpart of React's `act`: run the action, then apply Solid's batched updates.
function act(callback: () => unknown) {
  callback();
  flush();
}

interface MatchSpyProps {
  onMatch?: ((index: number) => void) | undefined;
}

/**
 * Port note: `props` is read lazily, and the returned `activeIndex` and `open` are getters.
 */
const useImpl = (
  props: MatchSpyProps &
    Pick<UseTypeaheadProps, 'onTyping'> & {
      list?: Array<string>;
      open?: boolean;
      onOpenChange?: (open: boolean) => void;
      addUseClick?: boolean;
    },
) => {
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  const [activeIndex, setActiveIndex] = createSignal<null | number>(null, { ownedWrite: true });
  const { refs, context } = useFloating({
    get open() {
      return props.open ?? open();
    },
    onOpenChange: (nextOpen) => (props.onOpenChange ?? setOpen)(nextOpen),
  });
  const listRef: RefObject<Array<string | null>> = {
    current: untrack(() => props.list) ?? ['one', 'two', 'three'],
  };
  const typeahead = useTypeahead(context.rootStore, {
    listRef,
    get activeIndex() {
      return activeIndex();
    },
    onMatch(index) {
      setActiveIndex(index);
      props.onMatch?.(index);
    },
    get onTyping() {
      return props.onTyping;
    },
  });
  const click = useClick(context.rootStore, {
    get enabled() {
      return props.addUseClick ?? false;
    },
  });

  const { getReferenceProps, getFloatingProps } = useTestInteractions([typeahead, click]);

  return {
    get activeIndex() {
      return activeIndex();
    },
    get open() {
      return open();
    },
    getReferenceProps: (userProps?: HTMLProps<Element>) =>
      getReferenceProps({
        role: 'combobox',
        ...userProps,
        ref: refs.setReference,
      }),
    getFloatingProps: () =>
      getFloatingProps({
        role: 'listbox',
        ref: refs.setFloating,
      }),
  };
};

function Combobox(
  props: MatchSpyProps &
    Pick<UseTypeaheadProps, 'onTyping'> & {
      list?: Array<string>;
      open?: boolean;
    },
) {
  const { getReferenceProps, getFloatingProps } = useImpl(props);
  return (
    <>
      <input {...getReferenceProps()} />
      <div {...getFloatingProps()} />
    </>
  );
}

function ComboboxWithElementsRef(
  props: MatchSpyProps & {
    list?: Array<string>;
    hiddenIndices?: Array<number>;
  },
) {
  const [activeIndex, setActiveIndex] = createSignal<null | number>(null, { ownedWrite: true });
  const [open, setOpen] = createSignal(true, { ownedWrite: true });
  const { refs, context } = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
  });
  const listRef: RefObject<Array<string | null>> = {
    current: untrack(() => props.list) ?? ['apple', 'apricot', 'banana'],
  };
  const elementsRef: RefObject<Array<HTMLElement | null>> = { current: [] };
  const typeahead = useTypeahead(context.rootStore, {
    listRef,
    elementsRef,
    get activeIndex() {
      return activeIndex();
    },
    onMatch(index) {
      setActiveIndex(index);
      props.onMatch?.(index);
    },
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useTestInteractions([typeahead]);

  return (
    <>
      <input {...getReferenceProps({ role: 'combobox', ref: refs.setReference })} />
      <Show when={open()}>
        <div {...getFloatingProps({ role: 'listbox', ref: refs.setFloating })}>
          {(listRef.current as string[]).map((value, index) => (
            <div
              role="option"
              // Port note: Solid removes `false` attributes, React renders them.
              aria-selected={activeIndex() === index ? 'true' : 'false'}
              style={props.hiddenIndices?.includes(index) ? { display: 'none' } : undefined}
              {...getItemProps({
                ref(node) {
                  elementsRef.current[index] = node;
                },
              })}
            >
              {value}
            </div>
          ))}
        </div>
      </Show>
    </>
  );
}

describe('useTypeahead', () => {
  it('passes the matching keydown event to onMatch', async () => {
    const onMatch = vi.fn();

    function App() {
      const { refs, context } = useFloating({ open: true });
      const listRef = { current: ['one', 'two', 'three'] };
      const typeahead = useTypeahead(context.rootStore, { listRef, activeIndex: null, onMatch });
      const { getReferenceProps } = useTestInteractions([typeahead]);
      return <input {...getReferenceProps({ role: 'combobox', ref: refs.setReference })} />;
    }

    await render(() => <App />);

    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.keyboard('t');

    expect(onMatch).toHaveBeenCalledTimes(1);
    expect(onMatch.mock.lastCall?.[0]).toBe(1);
    expect(onMatch.mock.lastCall?.[1].type).toBe('keydown');
    expect(onMatch.mock.lastCall?.[1].key).toBe('t');
  });

  it('rapidly focuses list items when they start with the same letter', async () => {
    const spy = vi.fn();
    await render(() => <Combobox onMatch={spy} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('t');
    expect(spy).toHaveBeenCalledWith(1);

    await userEvent.keyboard('t');
    expect(spy).toHaveBeenCalledWith(2);

    await userEvent.keyboard('t');
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('bails out of rapid focus of first letter if the list contains a string that starts with two of the same letter', async () => {
    const spy = vi.fn();
    await render(() => <Combobox onMatch={spy} list={['apple', 'aaron', 'apricot']} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('a');
    expect(spy).toHaveBeenCalledWith(0);

    await userEvent.keyboard('a');
    expect(spy).toHaveBeenCalledWith(0);
  });

  // React-only: the `strict: true` row renders in `React.StrictMode`.
  it.each([false])(
    'starts from the current activeIndex and correctly loops (strict: %s)',
    async () => {
      const spy = vi.fn();
      await render(() => (
        <Combobox onMatch={spy} list={['Toy Story 2', 'Toy Story 3', 'Toy Story 4']} />
      ));

      await userEvent.click(screen.getByRole('combobox'));

      await userEvent.keyboard('t');
      await userEvent.keyboard('o');
      await userEvent.keyboard('y');
      expect(spy).toHaveBeenCalledWith(0);

      spy.mockReset();

      await userEvent.keyboard('t');
      await userEvent.keyboard('o');
      await userEvent.keyboard('y');
      expect(spy).not.toHaveBeenCalled();

      vi.advanceTimersByTime(750);

      await userEvent.keyboard('t');
      await userEvent.keyboard('o');
      await userEvent.keyboard('y');
      expect(spy).toHaveBeenCalledWith(1);

      vi.advanceTimersByTime(750);

      await userEvent.keyboard('t');
      await userEvent.keyboard('o');
      await userEvent.keyboard('y');
      expect(spy).toHaveBeenCalledWith(2);

      vi.advanceTimersByTime(750);

      await userEvent.keyboard('t');
      await userEvent.keyboard('o');
      await userEvent.keyboard('y');
      expect(spy).toHaveBeenCalledWith(0);
    },
  );

  // React-only: StrictMode.
  it.skip('starts from the current activeIndex and correctly loops (strict: true)', () => {});

  it('capslock characters continue to match', async () => {
    const spy = vi.fn();
    await render(() => <Combobox onMatch={spy} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('{CapsLock}t');
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('does not depend on locale-sensitive lowercasing', async () => {
    const toLocaleLowerCase = String.prototype.toLocaleLowerCase;
    const toLocaleLowerCaseSpy = vi
      .spyOn(String.prototype, 'toLocaleLowerCase')
      .mockImplementation(function lowerWithTurkishLocale(this: string) {
        return toLocaleLowerCase.call(this, 'tr');
      });

    try {
      const spy = vi.fn();
      await render(() => <Combobox onMatch={spy} list={['Istanbul']} />);

      await userEvent.click(screen.getByRole('combobox'));

      await userEvent.keyboard('i');
      expect(spy).toHaveBeenCalledWith(0);
    } finally {
      toLocaleLowerCaseSpy.mockRestore();
    }
  });

  function App1(props: MatchSpyProps & { list: Array<string> }) {
    const impl = useImpl(props);
    const { getReferenceProps, getFloatingProps } = impl;
    let inputRef: HTMLInputElement | null = null;

    return (
      <>
        <div
          {...getReferenceProps({
            onClick: () => inputRef?.focus(),
          })}
        >
          <input
            ref={(node) => {
              inputRef = node;
            }}
            readonly
          />
        </div>
        <Show when={impl.open}>
          <div {...getFloatingProps()}>
            {props.list.map((value, i) => (
              <div
                role="option"
                tabindex={i === impl.activeIndex ? 0 : -1}
                // Port note: Solid removes `false` attributes, React renders them.
                aria-selected={i === impl.activeIndex ? 'true' : 'false'}
              >
                {value}
              </div>
            ))}
          </div>
        </Show>
      </>
    );
  }

  it('matches when focus is within reference', async () => {
    const spy = vi.fn();
    await render(() => <App1 onMatch={spy} list={['one', 'two', 'three']} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('t');
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('matches when focus is within floating', async () => {
    const spy = vi.fn();
    await render(() => <App1 onMatch={spy} list={['one', 'two', 'three']} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('t');
    const option = await screen.findByRole('option', { selected: true });
    expect(option.textContent).toBe('two');
    option.focus();
    expect(option).toHaveFocus();

    await userEvent.keyboard('h');
    expect((await screen.findByRole('option', { selected: true })).textContent).toBe('three');
  });

  it('onTyping is called with typing activity', async () => {
    const spy = vi.fn();
    await render(() => <Combobox onTyping={spy} list={['one', 'two', 'three']} />);

    act(() => screen.getByRole('combobox').focus());

    await userEvent.keyboard('t');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(true);

    vi.advanceTimersByTime(750);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith(false);
  });

  it('onTyping is called when the popup closes without moving focus', async () => {
    const spy = vi.fn();
    // Port note: `rerender` with new props is a signal update.
    const [open, setOpen] = createSignal(true);
    const rerender = (nextOpen: boolean) => {
      setOpen(nextOpen);
      flush();
    };
    await render(() => <Combobox open={open()} onTyping={spy} />);

    expect(spy).not.toHaveBeenCalled();

    act(() => screen.getByRole('combobox').focus());
    await userEvent.keyboard('t');
    expect(spy.mock.calls).toEqual([[true]]);

    rerender(false);
    expect(spy.mock.calls).toEqual([[true], [false]]);

    vi.advanceTimersByTime(750);
    expect(spy.mock.calls).toEqual([[true], [false]]);

    rerender(true);
    expect(spy.mock.calls).toEqual([[true], [false]]);
  });

  it('skips hidden items when matching with elementsRef', async () => {
    const spy = vi.fn();
    await render(() => <ComboboxWithElementsRef onMatch={spy} hiddenIndices={[0]} />);

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('a');
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('does not let hidden double-letter items block rapid cycling with elementsRef', async () => {
    const spy = vi.fn();
    await render(() => (
      <ComboboxWithElementsRef
        onMatch={spy}
        list={['aaron', 'apple', 'avocado']}
        hiddenIndices={[0]}
      />
    ));

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('a');
    expect(spy).toHaveBeenLastCalledWith(1);

    await userEvent.keyboard('a');
    expect(spy).toHaveBeenLastCalledWith(2);
  });

  it('skips visibility:hidden items when matching with elementsRef', async () => {
    const spy = vi.fn();
    await render(() => <ComboboxWithElementsRef onMatch={spy} />);

    const apple = screen.getByRole('option', { name: 'apple' });

    apple.style.visibility = 'hidden';

    await userEvent.click(screen.getByRole('combobox'));

    await userEvent.keyboard('a');
    expect(spy).toHaveBeenCalledWith(1);
  });
});
