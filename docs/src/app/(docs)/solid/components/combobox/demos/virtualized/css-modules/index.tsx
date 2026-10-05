import { onSettled, For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Combobox } from 'base-ui-solid/combobox';
import { useVirtualizer } from '../useVirtualizer';
import styles from './index.module.css';

export default function ExampleVirtualizedCombobox() {
  let virtualizer: Virtualizer | null = null;

  return (
    <Combobox.Root
      virtualized
      items={virtualizedItems}
      itemToStringLabel={getItemLabel}
      onItemHighlighted={(item, { reason, index }) => {
        const instance = virtualizer;

        if (!item || !instance) {
          return;
        }

        const isStart = index === 0;
        const isEnd = index === instance.options.count - 1;
        // `imperative-action` can jump anywhere in the list, so it always needs a scroll:
        // unlike the arrow keys it can target an item that is not currently rendered.
        const shouldScroll =
          reason === 'none' ||
          reason === 'imperative-action' ||
          (reason === 'keyboard' && (isStart || isEnd));

        if (shouldScroll) {
          queueMicrotask(() => {
            instance.scrollToIndex(index, { align: isEnd ? 'start' : 'end' });
          });
        }
      }}
    >
      <label class={styles.Label}>
        Search 10,000 items
        <Combobox.Input class={styles.Input} />
      </label>

      <Combobox.Portal>
        <Combobox.Positioner class={styles.Positioner} sideOffset={4}>
          <Combobox.Popup class={styles.Popup}>
            <Combobox.Empty>
              <div class={styles.Empty}>No items found.</div>
            </Combobox.Empty>
            <Combobox.List class={styles.List}>
              <VirtualizedList
                onVirtualizer={(nextVirtualizer) => {
                  virtualizer = nextVirtualizer;
                }}
              />
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function VirtualizedList(props: { onVirtualizer: (virtualizer: Virtualizer | null) => void }) {
  const filteredItems = Combobox.useFilteredItems<VirtualizedItem>();

  let scrollElement: HTMLDivElement | null = null;

  const virtualizer = useVirtualizer({
    get count() {
      return filteredItems().length;
    },
    getScrollElement: () => scrollElement,
    estimateSize: () => 32,
    overscan: 20,
    paddingStart: 4,
    paddingEnd: 4,
    scrollPaddingEnd: 4,
    scrollPaddingStart: 4,
  });

  onSettled(() => {
    props.onVirtualizer(virtualizer);
    return () => {
      props.onVirtualizer(null);
    };
  });

  const handleScrollElementRef = (element: HTMLDivElement | null) => {
    scrollElement = element;
    if (element) {
      virtualizer.measure();
    }
  };

  const totalSize = () => virtualizer.getTotalSize();

  return (
    <div
      role="presentation"
      ref={handleScrollElementRef}
      class={styles.Scroller}
      style={{ '--total-size': `${totalSize()}px` } as JSX.CSSProperties}
    >
      <div
        role="presentation"
        class={styles.VirtualizedPlaceholder}
        style={{ height: `${totalSize()}px` }}
      >
        <For each={virtualizer.getVirtualItems()}>
          {(virtualItem) => {
            const item = filteredItems()[virtualItem.index];
            if (!item) {
              return null;
            }

            return (
              <Combobox.Item
                index={virtualItem.index}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                value={item}
                class={styles.Item}
                aria-setsize={filteredItems().length}
                aria-posinset={virtualItem.index + 1}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`,
                }}
              >
                <Combobox.ItemIndicator class={styles.ItemIndicator}>
                  <CheckIcon />
                </Combobox.ItemIndicator>
                <span class={styles.ItemText}>{item.name}</span>
              </Combobox.Item>
            );
          }}
        </For>
      </div>
    </div>
  );
}

function CheckIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}

interface VirtualizedItem {
  id: string;
  name: string;
}

function getItemLabel(item: VirtualizedItem | null) {
  return item ? item.name : '';
}

const virtualizedItems: VirtualizedItem[] = Array.from({ length: 10000 }, (_, index) => {
  const id = String(index + 1);
  const indexLabel = id.padStart(4, '0');
  return { id, name: `Item ${indexLabel}` };
});

type Virtualizer = ReturnType<typeof useVirtualizer<HTMLDivElement, Element>>;
