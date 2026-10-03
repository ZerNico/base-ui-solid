import { createMemo, createSignal, omit, onCleanup, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useId } from '@base-ui-solid/utils/useId';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useTestInteractions } from '#test-utils';
import type { Placement } from '../../src/floating-ui-react/types';
import {
  arrow,
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  useClick,
  useDismiss,
  useListNavigation,
} from '../../src/floating-ui-react';
import { useFloating } from './useFloating';
import { Button } from './Button';
import styles from './EmojiPicker.module.css';
import { gridNavigationWithColumns } from './gridNavigationWithColumns';

const grid = gridNavigationWithColumns(3);

const emojis = [
  {
    name: 'apple',
    emoji: '🍎',
  },
  {
    name: 'orange',
    emoji: '🍊',
  },
  {
    name: 'watermelon',
    emoji: '🍉',
  },
  {
    name: 'strawberry',
    emoji: '🍓',
  },
  {
    name: 'pear',
    emoji: '🍐',
  },
  {
    name: 'banana',
    emoji: '🍌',
  },
  {
    name: 'pineapple',
    emoji: '🍍',
  },
  {
    name: 'cherry',
    emoji: '🍒',
  },
  {
    name: 'peach',
    emoji: '🍑',
  },
];

type OptionProps = JSX.HTMLAttributes<HTMLButtonElement> & {
  name: string;
  active: boolean;
  selected: boolean;
  children: JSX.Element;
};

/** @internal */
function Option(componentProps: OptionProps) {
  const props = omit(componentProps, 'name', 'active', 'selected', 'children');
  const id = useId();
  // Port note: Solid's class object replaces `clsx`, and the `ref` is forwarded with the props.
  return (
    <button
      {...props}
      id={id}
      role="option"
      class={{
        [styles.Option]: true,
        [styles.OptionSelected]: componentProps.selected && !componentProps.active,
        [styles.OptionActive]: componentProps.active,
        [styles.OptionDisabled]: componentProps.name === 'orange',
      }}
      // Port note: Solid removes `false` attributes, React renders them.
      aria-selected={componentProps.selected ? 'true' : 'false'}
      disabled={componentProps.name === 'orange'}
      aria-label={componentProps.name}
      tabindex={-1}
      data-active={componentProps.active ? '' : undefined}
      type="button"
    >
      {componentProps.children}
    </button>
  );
}

/** @internal */
export function Main() {
  const [open, setOpen] = createSignal(false, { ownedWrite: true });
  const [search, setSearch] = createSignal('', { ownedWrite: true });
  const [selectedEmoji, setSelectedEmoji] = createSignal<string | null>(null, {
    ownedWrite: true,
  });
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null, { ownedWrite: true });
  const [placement, setPlacement] = createSignal<Placement | null>(null, { ownedWrite: true });

  const arrowRef: RefObject<Element | null> = { current: null };

  const listRef: RefObject<Array<HTMLElement | null>> = { current: [] };

  const noResultsId = useId();

  // Port note: `floatingStyles` and `placement` are getters, so the return value isn't
  // destructured.
  const floating = useFloating({
    get placement() {
      return placement() ?? 'bottom-start';
    },
    get open() {
      return open();
    },
    onOpenChange: setOpen,
    // We don't want flipping to occur while searching, as the floating element
    // will resize and cause disorientation.
    get middleware() {
      return [
        offset(8),
        ...(placement() ? [] : [flip()]),
        arrow({
          element: arrowRef,
          padding: 20,
        }),
      ];
    },
    whileElementsMounted: autoUpdate,
  });
  const { refs, context } = floating;

  // Handles opening the floating element via the Choose Emoji button.
  const menuRoleProps = {
    get reference() {
      return {
        'aria-haspopup': 'menu' as const,
        'aria-expanded': open() ? ('true' as const) : ('false' as const),
        'aria-controls': open() ? context.floatingId : undefined,
      };
    },
    get floating() {
      return {
        id: context.floatingId,
        role: 'menu' as const,
      };
    },
  };

  const { getReferenceProps, getFloatingProps } = useTestInteractions([
    useClick(context.rootStore),
    useDismiss(context.rootStore),
    menuRoleProps,
  ]);

  // Handles the list navigation where the reference is the inner input, not
  // the button that opens the floating element.
  const {
    getReferenceProps: getInputProps,
    getFloatingProps: getListFloatingProps,
    getItemProps,
  } = useTestInteractions([
    useListNavigation(context.rootStore, {
      listRef,
      get onNavigate() {
        return open() ? setActiveIndex : undefined;
      },
      get activeIndex() {
        return activeIndex();
      },
      orientation: 'horizontal',
      loopFocus: true,
      focusItemOnOpen: false,
      virtual: true,
      allowEscape: true,
      grid,
    }),
  ]);

  useEffect(
    ([openValue, resultantPlacement]) => {
      if (openValue) {
        setPlacement(resultantPlacement);
      } else {
        setSearch('');
        setActiveIndex(null);
        setPlacement(null);
      }
    },
    () => [open(), floating.placement],
  );

  const handleEmojiClick = () => {
    const index = activeIndex();
    if (index !== null) {
      // eslint-disable-next-line
      setSelectedEmoji(filteredEmojis()[index].emoji);
      setOpen(false);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleEmojiClick();
    }
  };

  // Port note: React's `onChange` on text inputs is `onInput`.
  const handleInputChange = (event: InputEvent) => {
    setActiveIndex(null);
    setSearch((event.target as HTMLInputElement).value);
  };

  const filteredEmojis = createMemo(() =>
    emojis.filter(({ name }) => name.toLocaleLowerCase().includes(search().toLocaleLowerCase())),
  );

  return (
    <>
      <h1 class={styles.Heading}>Emoji Picker</h1>
      <div class={styles.Container}>
        <div class="text-center">
          <Button
            ref={refs.setReference}
            class={styles.Trigger}
            aria-label="Choose emoji"
            aria-describedby="emoji-label"
            data-open={open() ? '' : undefined}
            {...getReferenceProps()}
          >
            ☻
          </Button>
          <br />
          <Show when={selectedEmoji()}>
            <span id="emoji-label">
              <span
                style={{ 'font-size': '30px' }}
                aria-label={emojis.find(({ emoji }) => emoji === selectedEmoji())?.name}
              >
                {selectedEmoji()}
              </span>{' '}
              selected
            </span>
          </Show>
          <FloatingPortal>
            <Show when={open()}>
              <FloatingFocusManager context={context.rootStore} modal={false}>
                <div
                  ref={refs.setFloating}
                  class={styles.Floating}
                  style={floating.floatingStyles}
                  {...getFloatingProps(getListFloatingProps())}
                >
                  <span class={styles.Label}>Emoji Picker</span>
                  <input
                    class={styles.Input}
                    placeholder="Search emoji"
                    value={search()}
                    aria-controls={filteredEmojis().length === 0 ? noResultsId : undefined}
                    {...getInputProps({
                      onInput: handleInputChange,
                      onKeyDown: handleKeyDown,
                    })}
                  />
                  {/* Port note: upstream remounts the region on each search with `key`. */}
                  <Show when={filteredEmojis().length === 0}>
                    <p id={noResultsId} role="region" aria-atomic="true" aria-live="assertive">
                      No results.
                    </p>
                  </Show>
                  <Show when={filteredEmojis().length > 0}>
                    <div class={styles.Listbox} role="listbox">
                      {filteredEmojis().map(({ name, emoji }, index) => {
                        // Port note: React calls the ref with `null` when the item unmounts. The
                        // list's previous items are disposed after the new ones are rendered, so
                        // only the item's own entry is cleared.
                        let itemNode: HTMLElement | null = null;
                        onCleanup(() => {
                          if (listRef.current[index] === itemNode) {
                            listRef.current[index] = null;
                          }
                        });
                        return (
                          <Option
                            name={name}
                            ref={(node: HTMLButtonElement) => {
                              itemNode = node;
                              listRef.current[index] = node;
                            }}
                            selected={selectedEmoji() === emoji}
                            active={activeIndex() === index}
                            {...getItemProps({
                              onClick: handleEmojiClick,
                            })}
                          >
                            {emoji}
                          </Option>
                        );
                      })}
                    </div>
                  </Show>
                  <span
                    data-testid="emoji-picker-active-index"
                    data-active-index={activeIndex() ?? ''}
                    style={{ display: 'none' }}
                  />
                </div>
              </FloatingFocusManager>
            </Show>
          </FloatingPortal>
        </div>
      </div>
    </>
  );
}
