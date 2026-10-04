import { onSettled, createSignal, For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Combobox } from 'base-ui-solid/combobox';
import { useVirtualizer } from '../useVirtualizer';

export default function ExampleVirtualizedCombobox() {
  const [open, setOpen] = createSignal(false);
  const virtualizerRef = { current: null } as { current: Virtualizer | null };

  return (
    <Combobox.Root
      virtualized
      items={virtualizedItems}
      open={open()}
      onOpenChange={setOpen}
      itemToStringLabel={getItemLabel}
      onItemHighlighted={(item, { reason, index }) => {
        const virtualizer = virtualizerRef.current;

        if (!item || !virtualizer) {
          return;
        }

        const isStart = index === 0;
        const isEnd = index === virtualizer.options.count - 1;
        // `imperative-action` can jump anywhere in the list, so it always needs a scroll:
        // unlike the arrow keys it can target an item that is not currently rendered.
        const shouldScroll =
          reason === 'none' ||
          reason === 'imperative-action' ||
          (reason === 'keyboard' && (isStart || isEnd));

        if (shouldScroll) {
          queueMicrotask(() => {
            virtualizer.scrollToIndex(index, { align: isEnd ? 'start' : 'end' });
          });
        }
      }}
    >
      <label class="flex flex-col gap-1 text-sm leading-5 font-bold text-neutral-950 dark:text-white">
        Search 10,000 items
        <Combobox.Input class="h-8 w-64 border border-neutral-950 bg-white dark:bg-neutral-950 px-2 text-sm any-pointer-coarse:text-base font-normal text-neutral-950 focus:outline-2 focus:-outline-offset-1 focus:outline-neutral-950 dark:focus:outline-white dark:border-white dark:text-white" />
      </label>

      <Combobox.Portal>
        <Combobox.Positioner class="outline-none" sideOffset={4}>
          <Combobox.Popup class="w-[var(--anchor-width)] max-w-[var(--available-width)] border border-neutral-950 bg-white text-neutral-950 shadow-[0.25rem_0.25rem_0_rgb(0_0_0_/_12%)] dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none">
            <Combobox.Empty>
              <div class="py-3 px-2 text-sm leading-4 text-neutral-500 dark:text-neutral-400">
                No items found.
              </div>
            </Combobox.Empty>
            <Combobox.List class="p-0">
              <VirtualizedList open={open()} virtualizerRef={virtualizerRef} />
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function VirtualizedList(props: {
  open: boolean;
  virtualizerRef: { current: Virtualizer | null };
}) {
  const filteredItems = Combobox.useFilteredItems<VirtualizedItem>();

  const scrollElementRef = { current: null } as { current: HTMLDivElement | null };

  const virtualizer = useVirtualizer({
    get enabled() {
      return props.open;
    },
    get count() {
      return filteredItems().length;
    },
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => 32,
    overscan: 20,
    paddingStart: 4,
    paddingEnd: 4,
    scrollPaddingEnd: 4,
    scrollPaddingStart: 4,
  });

  onSettled(() => {
    props.virtualizerRef.current = virtualizer;
    return () => {
      props.virtualizerRef.current = null;
    };
  });

  const handleScrollElementRef = (element: HTMLDivElement | null) => {
    scrollElementRef.current = element;
    if (element) {
      virtualizer.measure();
    }
  };

  const totalSize = () => virtualizer.getTotalSize();

  return (
    <div
      role="presentation"
      ref={handleScrollElementRef}
      class="h-[min(22.5rem,var(--total-size))] max-h-[var(--available-height)] overflow-auto overscroll-contain scroll-py-1"
      style={{ '--total-size': `${totalSize()}px` } as JSX.CSSProperties}
    >
      <div role="presentation" class="relative w-full" style={{ height: `${totalSize()}px` }}>
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
                class="grid cursor-default grid-cols-[1rem_1fr] items-center gap-2 p-2 text-sm leading-4 outline-none select-none data-highlighted:relative data-highlighted:z-0 data-highlighted:text-white data-highlighted:before:absolute data-highlighted:before:inset-0 data-highlighted:before:z-[-1] data-highlighted:before:bg-neutral-950 dark:data-highlighted:text-neutral-950 dark:data-highlighted:before:bg-white"
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
                <Combobox.ItemIndicator class="col-start-1">
                  <CheckIcon />
                </Combobox.ItemIndicator>
                <span class="col-start-2">{item.name}</span>
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
