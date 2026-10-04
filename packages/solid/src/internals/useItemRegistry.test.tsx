import { expect, describe, it } from 'vitest';
import { createSignal, flush, For } from 'solid-js';
import { createRenderer } from '#test-utils';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useItemRegistry } from './useItemRegistry';

describe('useItemRegistry', () => {
  const { render } = createRenderer();

  it('publishes one immutable snapshot for all registrations in a commit', async () => {
    const snapshots: ReadonlyMap<string, string>[] = [];

    function Item(props: { id: string; registerItem: (id: string, value: string) => () => void }) {
      useIsoLayoutEffect(
        ([id, registerItem]) => registerItem(id, id),
        () => [props.id, props.registerItem],
      );
      return null;
    }

    function App(props: { items: string[] }) {
      const { items: registeredItems, registerItem } = useItemRegistry<string, string>();
      // Port note: App renders once in Solid; a snapshot is recorded each time a new one is
      // published (upstream records one per render).
      useIsoLayoutEffect(
        ([snapshot]) => {
          snapshots.push(snapshot);
        },
        () => [registeredItems()],
      );

      return (
        <For each={props.items}>{(item) => <Item id={item} registerItem={registerItem} />}</For>
      );
    }

    const [items, setItems] = createSignal(['a', 'b', 'c']);
    await render(() => <App items={items()} />);

    expect(snapshots.map((snapshot) => Array.from(snapshot.keys()))).toEqual([[], ['a', 'b', 'c']]);

    setItems(['b', 'd']);
    flush();

    expect(Array.from(snapshots.at(-1)?.keys() ?? [])).toEqual(['b', 'd']);
    expect(Array.from(snapshots[1].keys())).toEqual(['a', 'b', 'c']);
  });

  // React-only: StrictMode (double-invoked effects).
  it.skip('publishes every registration under StrictMode double effects', () => {});

  it('publishes an empty snapshot once the last item unregisters', async () => {
    const snapshots: ReadonlyMap<string, string>[] = [];

    function Item(props: { id: string; registerItem: (id: string, value: string) => () => void }) {
      useIsoLayoutEffect(
        ([id, registerItem]) => registerItem(id, id),
        () => [props.id, props.registerItem],
      );
      return null;
    }

    function App(props: { items: string[] }) {
      const { items: registeredItems, registerItem } = useItemRegistry<string, string>();
      // Port note: see above.
      useIsoLayoutEffect(
        ([snapshot]) => {
          snapshots.push(snapshot);
        },
        () => [registeredItems()],
      );

      return (
        <For each={props.items}>{(item) => <Item id={item} registerItem={registerItem} />}</For>
      );
    }

    const [items, setItems] = createSignal(['a', 'b']);
    await render(() => <App items={items()} />);
    expect(Array.from(snapshots[snapshots.length - 1].keys())).toEqual(['a', 'b']);

    setItems([]);
    flush();

    expect(Array.from(snapshots[snapshots.length - 1].keys())).toEqual([]);
  });
});
