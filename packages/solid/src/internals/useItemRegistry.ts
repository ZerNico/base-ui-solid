import { createMemo, createSignal } from 'solid-js';
import type { Accessor } from 'solid-js';

type RegisterItem<Key, Item> = (key: Key, item: Item) => () => void;

/**
 * Collects item registrations into one immutable snapshot per React commit.
 * Also returns the live registry for reads that must include the registrations of the current
 * commit before its snapshot is published.
 *
 * Port note: `items` is an accessor. Solid batches signal writes until the next flush, so every
 * registration made before it is published in one snapshot without upstream's
 * `isUpdateScheduledRef` latch (which only coalesces React state updates).
 */
export function useItemRegistry<Key, Item>(): ItemRegistry<Key, Item> {
  const itemRegistry = new Map<Key, Item>();

  // Item effects can run without their parent rendering. Bump the version so every registration
  // is included in the next snapshot.
  const [registryVersion, setRegistryVersion] = createSignal(0, { ownedWrite: true });

  function scheduleRegistryUpdate() {
    setRegistryVersion((version) => version + 1);
  }

  function registerItem(key: Key, item: Item) {
    itemRegistry.set(key, item);
    scheduleRegistryUpdate();

    return () => {
      itemRegistry.delete(key);
      scheduleRegistryUpdate();
    };
  }

  // The mutable registry is stable. Its version explicitly controls when to publish a copy.
  const registeredItems = createMemo(() => {
    registryVersion();
    return new Map(itemRegistry) as ReadonlyMap<Key, Item>;
  });

  return { items: registeredItems, registerItem, liveItems: itemRegistry };
}

export interface ItemRegistry<Key, Item> {
  /** The snapshot published after the latest commit's registrations. */
  items: Accessor<ReadonlyMap<Key, Item>>;
  registerItem: RegisterItem<Key, Item>;
  /** The registry itself, including registrations whose snapshot hasn't been published yet. */
  liveItems: ReadonlyMap<Key, Item>;
}
