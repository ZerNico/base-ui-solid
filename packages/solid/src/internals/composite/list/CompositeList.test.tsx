import { expect, vi, describe, it } from 'vitest';
import { For, Show, createMemo, createSignal, flush, untrack } from 'solid-js';
import { Portal } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { render, screen, waitFor, flushMicrotasks } from '#test-utils';
import { CompositeList } from './CompositeList';
import { useCompositeListItem } from './useCompositeListItem';

describe('<CompositeList />', () => {
  describe('prop: elementsRef', () => {
    function Item(props: { label?: string; index?: number }) {
      const { ref, index } = useCompositeListItem({ index: () => props.index });
      return (
        <div ref={ref} data-testid={props.label} data-index={props.label ? index() : undefined}>
          {props.label}
        </div>
      );
    }

    it('cleans up refs on unmount', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const labelsRef = {
        current: [] as Array<string | null>,
      };
      const { unmount } = await render(() => (
        <CompositeList elementsRef={elementsRef} labelsRef={labelsRef}>
          <Item />
          <Item />
          <Item />
        </CompositeList>
      ));

      expect(elementsRef.current).toHaveLength(3);
      expect(labelsRef.current).toHaveLength(3);

      unmount();
      expect(elementsRef.current).toHaveLength(0);
      expect(labelsRef.current).toHaveLength(0);
    });

    it('keeps refs populated for items whose guessed index is already correct', async () => {
      function GuessedItem(props: { label: string }) {
        const { ref } = useCompositeListItem({ guess: true, label: () => props.label });
        return (
          <div ref={ref} data-testid={props.label}>
            {props.label}
          </div>
        );
      }

      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const labelsRef = {
        current: [] as Array<string | null>,
      };

      await render(() => (
        <CompositeList elementsRef={elementsRef} labelsRef={labelsRef}>
          <GuessedItem label="a" />
          <GuessedItem label="b" />
          <GuessedItem label="c" />
        </CompositeList>
      ));

      await waitFor(() => {
        expect(elementsRef.current[0]).toBe(screen.getByTestId('a'));
      });
      expect(elementsRef.current[1]).toBe(screen.getByTestId('b'));
      expect(elementsRef.current[2]).toBe(screen.getByTestId('c'));
      expect(labelsRef.current).toEqual(['a', 'b', 'c']);
    });

    it('only publishes maps that are aligned with the element registry', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const snapshots: Array<{
        elements: Array<HTMLElement | null>;
        mapElements: Element[];
      }> = [];
      const [items, setItems] = createSignal(['a', 'b', 'c']);

      await render(() => (
        <CompositeList
          elementsRef={elementsRef}
          onMapChange={(map) => {
            snapshots.push({
              elements: [...elementsRef.current],
              mapElements: Array.from(map.keys()),
            });
          }}
        >
          <For each={items()}>{(item) => <Item label={item} />}</For>
        </CompositeList>
      ));

      expect(snapshots).toHaveLength(1);

      setItems(['a', 'b', 'c', 'd']);
      flush();

      expect(snapshots).toHaveLength(2);
      snapshots.forEach((snapshot) => {
        expect(snapshot.elements).toEqual(snapshot.mapElements);
      });
    });

    it('registers explicitly indexed items in their index-addressed slots', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const onMapChange = vi.fn();

      await render(() => (
        <CompositeList elementsRef={elementsRef} onMapChange={onMapChange}>
          <Item label="two" index={2} />
          <Item label="zero" index={0} />
          <Item label="one" index={1} />
        </CompositeList>
      ));

      const map = onMapChange.mock.lastCall?.[0] as Map<Element, { index: number }>;
      expect(Array.from(map.values(), (metadata) => metadata.index)).toEqual([0, 1, 2]);
      expect(elementsRef.current).toEqual([
        screen.getByTestId('zero'),
        screen.getByTestId('one'),
        screen.getByTestId('two'),
      ]);
    });

    it('reserves explicit slots when assigning automatic indexes', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };

      await render(() => (
        <CompositeList elementsRef={elementsRef}>
          <Item label="automatic one" />
          <Item label="explicit zero" index={0} />
          <Item label="automatic two" />
        </CompositeList>
      ));

      expect(elementsRef.current).toEqual([
        screen.getByTestId('explicit zero'),
        screen.getByTestId('automatic one'),
        screen.getByTestId('automatic two'),
      ]);
      expect(screen.getByTestId('automatic one')).toHaveAttribute('data-index', '1');
      expect(screen.getByTestId('automatic two')).toHaveAttribute('data-index', '2');
    });

    it('does not consume an index guess for an explicitly indexed item', async () => {
      const baselineElementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };

      function GuessedItem(props: { label: string; index?: number }) {
        const { ref, index } = useCompositeListItem({ guess: true, index: () => props.index });
        const initialIndex = untrack(index);
        return <div ref={ref} data-testid={props.label} data-initial-index={initialIndex} />;
      }

      await render(() => (
        <>
          <CompositeList elementsRef={baselineElementsRef}>
            <GuessedItem label="baseline automatic" />
          </CompositeList>
          <CompositeList elementsRef={elementsRef}>
            <GuessedItem label="explicit" index={1} />
            <GuessedItem label="automatic" />
          </CompositeList>
        </>
      ));

      expect(screen.getByTestId('automatic').dataset.initialIndex).toBe(
        screen.getByTestId('baseline automatic').dataset.initialIndex,
      );
      expect(elementsRef.current[0]).toBe(screen.getByTestId('automatic'));
      expect(elementsRef.current[1]).toBe(screen.getByTestId('explicit'));
    });

    it('syncs replacement refs without publishing an unchanged map', async () => {
      const firstElementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const secondElementsRef = {
        current: [null, null] as Array<HTMLElement | null>,
      };
      const firstLabelsRef = {
        current: [] as Array<string | null>,
      };
      const secondLabelsRef = {
        current: [null, null] as Array<string | null>,
      };
      const onMapChange = vi.fn();

      function UnstableRefItem() {
        const internalRef: RefObject<HTMLElement | null> = { current: null };
        const { ref } = useCompositeListItem({ label: () => 'item' });

        return (
          <div
            ref={[
              ref,
              (node: HTMLElement) => {
                internalRef.current = node;
              },
            ]}
            data-testid="item"
          />
        );
      }

      function App() {
        const [useSecondRef, setUseSecondRef] = createSignal(false);
        return (
          <CompositeList
            elementsRef={useSecondRef() ? secondElementsRef : firstElementsRef}
            labelsRef={useSecondRef() ? secondLabelsRef : firstLabelsRef}
            onMapChange={onMapChange}
          >
            <button type="button" onClick={() => setUseSecondRef(true)}>
              Replace ref
            </button>
            <UnstableRefItem />
          </CompositeList>
        );
      }

      const { user } = await render(() => <App />);
      const item = screen.getByTestId('item');
      expect(firstElementsRef.current).toEqual([item]);
      expect(firstLabelsRef.current).toEqual(['item']);
      onMapChange.mockClear();

      await user.click(screen.getByRole('button', { name: 'Replace ref' }));
      flush();

      expect(firstElementsRef.current).toEqual([]);
      expect(firstLabelsRef.current).toEqual([]);
      expect(secondElementsRef.current).toEqual([item]);
      expect(secondLabelsRef.current).toEqual(['item']);
      expect(onMapChange).not.toHaveBeenCalled();
    });

    it('registers a replacement render target', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };

      function SwitchingItem() {
        const [useButton, setUseButton] = createSignal(false);
        const { ref } = useCompositeListItem();

        return (
          <>
            <button type="button" onClick={() => setUseButton(true)}>
              Replace target
            </button>
            <Show
              when={useButton()}
              fallback={
                <div ref={ref} data-testid="item">
                  item
                </div>
              }
            >
              <button ref={ref} data-testid="item" type="button">
                item
              </button>
            </Show>
          </>
        );
      }

      const { user } = await render(() => (
        <CompositeList elementsRef={elementsRef}>
          <SwitchingItem />
        </CompositeList>
      ));
      const initialItem = screen.getByTestId('item');

      await user.click(screen.getByRole('button', { name: 'Replace target' }));
      flush();

      const replacementItem = screen.getByTestId('item');
      expect(replacementItem).not.toBe(initialItem);
      expect(initialItem.isConnected).toBe(false);
      expect(elementsRef.current).toEqual([replacementItem]);
    });

    it('does not register negative explicit indexes', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };

      await render(() => (
        <CompositeList elementsRef={elementsRef}>
          <Item label="item" index={-1} />
        </CompositeList>
      ));

      expect(elementsRef.current).toHaveLength(0);
      expect(Object.hasOwn(elementsRef.current, '-1')).toBe(false);
    });

    it('updates refs when an item mounts from a nested state update', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };

      function DeepSection() {
        const [showItem, setShowItem] = createSignal(false);
        return (
          <>
            <button type="button" onClick={() => setShowItem(true)}>
              Add item
            </button>
            <Show when={showItem()}>
              <Item label="nested" />
            </Show>
          </>
        );
      }

      const { user } = await render(() => (
        <CompositeList elementsRef={elementsRef}>
          <Item label="first" />
          <DeepSection />
          <Item label="last" />
        </CompositeList>
      ));

      await user.click(screen.getByRole('button', { name: 'Add item' }));
      flush();

      expect(elementsRef.current).toEqual([
        screen.getByTestId('first'),
        screen.getByTestId('nested'),
        screen.getByTestId('last'),
      ]);
    });

    it('updates refs when an item unmounts from a nested state update', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const onMapChange = vi.fn();

      function DeepSection() {
        const [showItem, setShowItem] = createSignal(true);
        return (
          <>
            <button type="button" onClick={() => setShowItem(false)}>
              Remove item
            </button>
            <Show when={showItem()}>
              <Item label="nested" />
            </Show>
          </>
        );
      }

      const { user } = await render(() => (
        <CompositeList elementsRef={elementsRef} onMapChange={onMapChange}>
          <Item label="first" />
          <DeepSection />
          <Item label="last" />
        </CompositeList>
      ));

      expect(elementsRef.current).toHaveLength(3);

      await user.click(screen.getByRole('button', { name: 'Remove item' }));
      flush();

      expect(elementsRef.current).toEqual([
        screen.getByTestId('first'),
        screen.getByTestId('last'),
      ]);
      const map = onMapChange.mock.lastCall?.[0] as Map<Element, unknown>;
      expect(Array.from(map.keys())).toEqual([
        screen.getByTestId('first'),
        screen.getByTestId('last'),
      ]);
      expect(screen.getByTestId('last')).toHaveAttribute('data-index', '1');
    });

    it('keeps syncing refs after replacing items under Strict Mode', async () => {
      // Port note: Solid has no Strict Mode, so this covers replacing the items and an item then
      // hiding itself without the list updating.
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      let hideItem: () => void = () => {};

      function HideableItem(props: { label: string }) {
        const [hidden, setHidden] = createSignal(false);
        hideItem = () => setHidden(true);
        return (
          <Show when={!hidden()}>
            <Item label={props.label} />
          </Show>
        );
      }

      function App() {
        const [labels, setLabels] = createSignal(['a', 'b']);
        return (
          <>
            <button type="button" onClick={() => setLabels(['c', 'd'])}>
              Replace
            </button>
            <CompositeList elementsRef={elementsRef}>
              <For each={labels()}>{(label) => <HideableItem label={label} />}</For>
            </CompositeList>
          </>
        );
      }

      // The list re-renders while new items mount, then Strict Mode replays their refs.
      const { user } = await render(() => <App />);

      await user.click(screen.getByRole('button', { name: 'Replace' }));
      flush();

      expect(elementsRef.current).toEqual([screen.getByTestId('c'), screen.getByTestId('d')]);

      // The item hides itself without re-rendering the list.
      hideItem();
      flush();

      expect(elementsRef.current).toEqual([screen.getByTestId('c')]);
    });

    it('assigns correct guessed indexes during the first render', async () => {
      const renderCounts: Record<string, number> = { a: 0, b: 0, c: 0 };
      const initialIndexes: Record<string, number> = {};

      function GuessedItem(props: { label: string }) {
        const { ref, index } = useCompositeListItem({ guess: true });
        const label = untrack(() => props.label);
        renderCounts[label] += 1;
        if (!(label in initialIndexes)) {
          initialIndexes[label] = untrack(index);
        }
        return <div ref={ref} data-testid={props.label} data-index={index()} />;
      }

      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };

      await render(() => (
        <CompositeList elementsRef={elementsRef}>
          <GuessedItem label="a" />
          <GuessedItem label="b" />
          <GuessedItem label="c" />
        </CompositeList>
      ));

      expect(initialIndexes).toEqual({ a: 0, b: 1, c: 2 });
      expect(renderCounts).toEqual({ a: 1, b: 1, c: 1 });
      expect(elementsRef.current).toEqual([
        screen.getByTestId('a'),
        screen.getByTestId('b'),
        screen.getByTestId('c'),
      ]);
    });

    it('re-registers an item when its explicit index changes or is removed', async () => {
      const refCalls: Array<HTMLElement | null> = [];
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };

      function TrackedItem(props: { index?: number }) {
        const { ref, index } = useCompositeListItem({ guess: true, index: () => props.index });
        const trackingRef = (node: HTMLElement | null) => {
          refCalls.push(node);
          ref(node);
        };
        return <div ref={trackingRef} data-testid="tracked" data-index={index()} />;
      }

      const [itemIndex, setItemIndex] = createSignal<number | undefined>(0);

      await render(() => (
        <CompositeList elementsRef={elementsRef}>
          <TrackedItem index={itemIndex()} />
        </CompositeList>
      ));
      const tracked = screen.getByTestId('tracked');
      expect(refCalls).toEqual([tracked]);
      expect(elementsRef.current[0]).toBe(tracked);

      // Port note: upstream recreates the callback ref when the registration changes, so React
      // cycles it (`[tracked, null, tracked]`). Solid calls refs once and the item re-registers
      // its node from an effect instead, so the ref is never detached.
      setItemIndex(2);
      flush();

      expect(refCalls).toEqual([tracked]);
      expect(screen.getByTestId('tracked')).toHaveAttribute('data-index', '2');
      expect(Object.hasOwn(elementsRef.current, 0)).toBe(false);
      expect(elementsRef.current[2]).toBe(tracked);

      setItemIndex(undefined);
      flush();

      await waitFor(() => {
        expect(screen.getByTestId('tracked')).toHaveAttribute('data-index', '0');
      });
      expect(refCalls).toEqual([tracked]);
      expect(elementsRef.current).toEqual([tracked]);
    });

    it('resolves an automatic index when the equivalent explicit index is removed', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const [itemIndex, setItemIndex] = createSignal<number | undefined>(0);

      await render(() => (
        <CompositeList elementsRef={elementsRef}>
          <Item label="indexed" index={itemIndex()} />
        </CompositeList>
      ));
      setItemIndex(undefined);
      flush();

      await waitFor(() => {
        expect(screen.getByTestId('indexed')).toHaveAttribute('data-index', '0');
      });
    });

    it('does not detach item refs when an index shifts', async () => {
      const refCalls: Array<HTMLElement | null> = [];

      function TrackedItem() {
        const { ref, index } = useCompositeListItem();
        const trackingRef = (node: HTMLElement | null) => {
          refCalls.push(node);
          ref(node);
        };
        return <div ref={trackingRef} data-testid="tracked" data-index={index()} />;
      }

      const [items, setItems] = createSignal(['tracked']);

      function App() {
        const elementsRef = { current: [] as Array<HTMLElement | null> };
        return (
          <CompositeList elementsRef={elementsRef}>
            <For each={items()}>
              {(item) => (item === 'tracked' ? <TrackedItem /> : <Item label={item} />)}
            </For>
          </CompositeList>
        );
      }

      await render(() => <App />);
      const tracked = screen.getByTestId('tracked');
      expect(refCalls).toEqual([tracked]);

      setItems(['before', 'tracked']);
      flush();
      await waitFor(() => {
        expect(screen.getByTestId('tracked')).toHaveAttribute('data-index', '1');
      });
      expect(refCalls).toEqual([tracked]);
    });

    it('excludes items detached outside React from the registry', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const onMapChange = vi.fn();
      const [extra, setExtra] = createSignal(false);

      await render(() => (
        <CompositeList elementsRef={elementsRef} onMapChange={onMapChange}>
          <div>
            <Item label="a" />
            <Item label="b" />
            <Item label="c" />
          </div>
          <Show when={extra()}>
            <Item label="d" />
          </Show>
        </CompositeList>
      ));

      // Detaching a registered item outside Solid never disposes it, so it stays registered
      // while disconnected. `compareDocumentPosition` is meaningless for it, and leaving it in
      // would scramble the order of every other item.
      const detached = screen.getByTestId('b');
      detached.remove();

      setExtra(true);
      flush();

      expect(elementsRef.current).toEqual([
        screen.getByTestId('a'),
        screen.getByTestId('c'),
        screen.getByTestId('d'),
      ]);
      const map = onMapChange.mock.lastCall?.[0] as Map<Element, unknown>;
      expect(Array.from(map.keys())).toEqual([
        screen.getByTestId('a'),
        screen.getByTestId('c'),
        screen.getByTestId('d'),
      ]);
    });

    it('skips detached items while verifying order after a move', async () => {
      function App() {
        const elementsRef = { current: [] as Array<HTMLElement | null> };
        return (
          <CompositeList elementsRef={elementsRef}>
            <div data-testid="list">
              <Item label="a" />
              <Item label="b" />
              <Item label="c" />
            </div>
          </CompositeList>
        );
      }

      await render(() => <App />);

      const list = screen.getByTestId('list');
      const a = screen.getByTestId('a');
      const c = screen.getByTestId('c');

      // One batch that both detaches a registered item and moves another. The move makes the
      // observer verify order, and the verification walks the detached item, which no longer
      // has a meaningful document position.
      screen.getByTestId('b').remove();
      list.insertBefore(c, a);

      await waitFor(() => {
        expect(screen.getByTestId('c')).toHaveAttribute('data-index', '0');
      });
      expect(screen.getByTestId('a')).toHaveAttribute('data-index', '1');
    });

    it('updates the registry when a mounted item stops rendering an element', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };

      function VanishingItem() {
        // Starts with no element at all, so the item registers nothing until it renders one.
        const [hidden, setHidden] = createSignal(true);
        const { ref, index } = useCompositeListItem({
          label: () => (hidden() ? 'hidden' : 'shown'),
        });
        return (
          <>
            <button type="button" onClick={() => setHidden((value) => !value)}>
              Toggle element
            </button>
            <Show when={!hidden()}>
              <div ref={ref} data-testid="vanishing" data-index={index()}>
                vanishing
              </div>
            </Show>
          </>
        );
      }

      const { user } = await render(() => (
        <CompositeList elementsRef={elementsRef}>
          <VanishingItem />
          <Item label="tail" />
        </CompositeList>
      ));

      expect(elementsRef.current).toEqual([screen.getByTestId('tail')]);

      await user.click(screen.getByRole('button', { name: 'Toggle element' }));
      flush();
      expect(elementsRef.current).toHaveLength(2);

      // The item stays mounted and subscribed while its element detaches, so the next
      // publication reaches a subscriber whose node is gone.
      await user.click(screen.getByRole('button', { name: 'Toggle element' }));
      flush();

      expect(elementsRef.current).toEqual([screen.getByTestId('tail')]);
      expect(screen.getByTestId('tail')).toHaveAttribute('data-index', '0');
    });

    it('updates indexes when a leaf item moves outside React', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };

      await render(() => (
        <CompositeList elementsRef={elementsRef}>
          <div data-testid="container">
            <Item label="a" />
            <Item label="b" />
            <Item label="c" />
          </div>
        </CompositeList>
      ));

      expect(screen.getByTestId('a')).toHaveAttribute('data-index', '0');

      const container = screen.getByTestId('container');
      container.appendChild(screen.getByTestId('a'));

      await waitFor(() => {
        expect(screen.getByTestId('a')).toHaveAttribute('data-index', '2');
      });
      expect(screen.getByTestId('b')).toHaveAttribute('data-index', '0');
      expect(screen.getByTestId('c')).toHaveAttribute('data-index', '1');
      expect(elementsRef.current).toEqual([
        screen.getByTestId('b'),
        screen.getByTestId('c'),
        screen.getByTestId('a'),
      ]);
    });

    it('observes each shared mutation root once', async () => {
      const observe = vi.spyOn(MutationObserver.prototype, 'observe');
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };

      await render(() => (
        <CompositeList elementsRef={elementsRef}>
          <div data-testid="list">
            <Item label="a" />
            <Item label="b" />
            <Item label="c" />
          </div>
        </CompositeList>
      ));

      const observedRoots = observe.mock.calls.map(([root]) => root);
      observe.mockRestore();
      expect(observedRoots).toEqual([screen.getByTestId('list')]);
    });

    it('updates indexes when keyed groups reorder', async () => {
      function App() {
        const [reordered, setReordered] = createSignal(false);
        const elementsRef = { current: [] as Array<HTMLElement | null> };
        const labelsRef = { current: [] as Array<string | null> };
        const groups = () => (reordered() ? ['b', 'a'] : ['a', 'b']);

        return (
          <CompositeList elementsRef={elementsRef} labelsRef={labelsRef}>
            <button type="button" onClick={() => setReordered(true)}>
              Reorder
            </button>
            <div>
              <For each={groups()}>
                {(group) => (
                  <section>
                    <Item label={group} />
                  </section>
                )}
              </For>
            </div>
          </CompositeList>
        );
      }

      const { user } = await render(() => <App />);

      expect(screen.getByTestId('a')).toHaveAttribute('data-index', '0');
      expect(screen.getByTestId('b')).toHaveAttribute('data-index', '1');

      await user.click(screen.getByRole('button', { name: 'Reorder' }));

      await waitFor(() => {
        expect(screen.getByTestId('b')).toHaveAttribute('data-index', '0');
      });
      expect(screen.getByTestId('a')).toHaveAttribute('data-index', '1');
    });

    it('observes reorders after the list grows from one item', async () => {
      const [items, setItems] = createSignal(['a']);

      function App() {
        const elementsRef = { current: [] as Array<HTMLElement | null> };
        return (
          <CompositeList elementsRef={elementsRef}>
            <For each={items()}>{(item) => <Item label={item} />}</For>
          </CompositeList>
        );
      }

      await render(() => <App />);
      setItems(['a', 'b']);
      await flushMicrotasks();
      setItems(['b', 'a']);
      await flushMicrotasks();

      await waitFor(() => {
        expect(screen.getByTestId('b')).toHaveAttribute('data-index', '0');
      });
      expect(screen.getByTestId('a')).toHaveAttribute('data-index', '1');
    });

    it('updates indexes when grouped items reorder alongside unrelated mutations', async () => {
      function App() {
        const elementsRef = { current: [] as Array<HTMLElement | null> };
        const labelsRef = { current: [] as Array<string | null> };

        return (
          <CompositeList elementsRef={elementsRef} labelsRef={labelsRef}>
            <div data-testid="list">
              <section data-testid="group-a">
                <Item label="a" />
              </section>
              <section data-testid="group-b">
                <Item label="b" />
              </section>
            </div>
          </CompositeList>
        );
      }

      await render(() => <App />);

      expect(screen.getByTestId('a')).toHaveAttribute('data-index', '0');
      expect(screen.getByTestId('b')).toHaveAttribute('data-index', '1');

      const list = screen.getByTestId('list');
      const groupA = screen.getByTestId('group-a');
      const groupB = screen.getByTestId('group-b');
      const badge = list.ownerDocument.createElement('span');
      badge.setAttribute('data-testid', 'badge');

      list.insertBefore(groupB, groupA);
      list.appendChild(badge);

      await waitFor(() => {
        expect(screen.getByTestId('b')).toHaveAttribute('data-index', '0');
      });
      expect(screen.getByTestId('a')).toHaveAttribute('data-index', '1');
      expect(screen.getByTestId('badge')).toBeInTheDocument();
    });

    it('ignores mutations for unrelated leaf nodes', async () => {
      function App(props: { onMapChange: (map: Map<Element, unknown>) => void }) {
        const elementsRef = { current: [] as Array<HTMLElement | null> };
        const labelsRef = { current: [] as Array<string | null> };

        return (
          <CompositeList
            elementsRef={elementsRef}
            labelsRef={labelsRef}
            onMapChange={props.onMapChange}
          >
            <button type="button" onClick={() => screen.getByTestId('badge').remove()}>
              Remove badge
            </button>
            <div data-testid="list">
              <Item label="a" />
              <span data-testid="badge" />
              <Item label="b" />
            </div>
          </CompositeList>
        );
      }

      const onMapChange = vi.fn();
      const { user } = await render(() => <App onMapChange={onMapChange} />);

      await waitFor(() => {
        expect(screen.getByTestId('b')).toHaveAttribute('data-index', '1');
      });
      onMapChange.mockClear();

      await user.click(screen.getByRole('button', { name: 'Remove badge' }));

      await waitFor(() => {
        expect(screen.queryByTestId('badge')).toBe(null);
      });
      expect(onMapChange).not.toHaveBeenCalled();
    });

    it('registers items that sit across a shadow boundary', async () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const shadowContainer = document.createElement('div');
      host.attachShadow({ mode: 'open' }).appendChild(shadowContainer);

      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };

      try {
        // No ancestor can `contain` both items, so the pair has no common root to observe.
        // Registration still has to hold.
        const { unmount } = await render(() => (
          <CompositeList elementsRef={elementsRef}>
            <Item label="light" />
            <Portal mount={shadowContainer}>
              <Item label="shadow" />
            </Portal>
          </CompositeList>
        ));

        const shadowItem = shadowContainer.querySelector('[data-testid="shadow"]');
        expect(shadowItem).not.toBe(null);
        expect(elementsRef.current).toHaveLength(2);
        expect(elementsRef.current).toContain(screen.getByTestId('light'));
        expect(elementsRef.current).toContain(shadowItem);

        unmount();
        expect(elementsRef.current).toHaveLength(0);
      } finally {
        host.remove();
      }
    });
  });

  describe('prop: labelsRef', () => {
    function LabelledItem(props: {
      testId: string;
      label?: string | null;
      text?: string;
      useTextRef?: boolean;
    }) {
      const textRef: RefObject<HTMLElement | null> = { current: null };
      const useTextRef = untrack(() => props.useTextRef);
      const { ref } = useCompositeListItem({
        label: () => props.label,
        textRef: useTextRef ? textRef : undefined,
      });
      return (
        <div ref={ref} data-testid={props.testId}>
          <span
            ref={
              useTextRef
                ? (node: HTMLElement) => {
                    textRef.current = node;
                  }
                : undefined
            }
          >
            {props.text}
          </span>
          {props.useTextRef ? '-ignored' : ''}
        </div>
      );
    }

    it('resolves each label source', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const labelsRef = {
        current: [] as Array<string | null>,
      };

      await render(() => (
        <CompositeList elementsRef={elementsRef} labelsRef={labelsRef}>
          <LabelledItem testId="explicit" label="explicit label" text="ignored" />
          {/* An explicit `null` means "no label", and must not fall back to the text. */}
          <LabelledItem testId="null-label" label={null} text="not a label" />
          <LabelledItem testId="text-ref" useTextRef text="from text ref" />
          <LabelledItem testId="element-text" text="from element" />
        </CompositeList>
      ));

      expect(labelsRef.current).toEqual(['explicit label', null, 'from text ref', 'from element']);
    });

    it('drops label slots for items that unmount', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const labelsRef = {
        current: [] as Array<string | null>,
      };
      const [items, setItems] = createSignal(['a', 'b', 'c']);

      await render(() => (
        <CompositeList elementsRef={elementsRef} labelsRef={labelsRef}>
          <For each={items()}>{(item) => <LabelledItem testId={item} label={item} />}</For>
        </CompositeList>
      ));
      expect(labelsRef.current).toEqual(['a', 'b', 'c']);

      setItems(['a']);
      flush();
      expect(labelsRef.current).toEqual(['a']);
    });

    it('updates the label of a mounted item', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const labelsRef = {
        current: [] as Array<string | null>,
      };
      const [label, setLabel] = createSignal('before');

      await render(() => (
        <CompositeList elementsRef={elementsRef} labelsRef={labelsRef}>
          <LabelledItem testId="item" label={label()} />
        </CompositeList>
      ));
      expect(labelsRef.current).toEqual(['before']);

      setLabel('after');
      flush();

      expect(labelsRef.current).toEqual(['after']);
    });
  });

  describe('prop: onMapChange', () => {
    it('publishes item metadata alongside the index', async () => {
      const elementsRef = {
        current: [] as Array<HTMLElement | null>,
      };
      const onMapChange = vi.fn();

      function MetadataItem(props: { testId: string; kind: string }) {
        const metadata = createMemo(() => ({ kind: props.kind }));
        const { ref } = useCompositeListItem({ metadata });
        return <div ref={ref} data-testid={props.testId} />;
      }

      await render(() => (
        <CompositeList elementsRef={elementsRef} onMapChange={onMapChange}>
          <MetadataItem testId="first" kind="alpha" />
          <MetadataItem testId="second" kind="beta" />
        </CompositeList>
      ));

      const map = onMapChange.mock.lastCall?.[0] as Map<Element, { kind: string; index: number }>;
      expect(map.get(screen.getByTestId('first'))).toEqual({ kind: 'alpha', index: 0 });
      expect(map.get(screen.getByTestId('second'))).toEqual({ kind: 'beta', index: 1 });
    });
  });

  describe('Suspense integration', () => {
    // React-only: relies on React Suspense re-suspending already-committed children by throwing
    // promises, which hides and re-shows them. Solid's <Loading> keeps rendered content visible.
    it.skip('does not publish an empty registry when an outer boundary repeatedly suspends', () => {});
  });

  describe('server-side rendering', () => {
    // React-only: renderToString + hydration under Strict Mode.
    it.skip('hydrates a server-rendered list without a mismatch under Strict Mode', () => {});
  });

  describe('without a parent list', () => {
    it('renders an item that is not wrapped in a list', async () => {
      function OrphanItem() {
        const { ref, index } = useCompositeListItem();
        return <div ref={ref} data-testid="orphan" data-index={index()} />;
      }

      const { unmount } = await render(() => <OrphanItem />);

      // The default context no-ops keep a stray item inert rather than throwing.
      expect(screen.getByTestId('orphan')).toBeInTheDocument();
      expect(screen.getByTestId('orphan')).toHaveAttribute('data-index', '-1');
      expect(() => unmount()).not.toThrow();
    });
  });
});
