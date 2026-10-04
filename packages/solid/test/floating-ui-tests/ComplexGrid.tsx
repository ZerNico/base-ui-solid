// Port note: the lists mirror upstream's `.map()` one to one.
/* eslint-disable solid/prefer-for */
import { createSignal, Show } from 'solid-js';
import { useTestInteractions } from '#test-utils';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import {
  FloatingFocusManager,
  useClick,
  useDismiss,
  useListNavigation,
} from '../../src/floating-ui-react';
import { useFloating } from './useFloating';
import styles from './ComplexGrid.module.css';
import { gridNavigationWithColumns } from './gridNavigationWithColumns';

const grid = gridNavigationWithColumns(7);

interface Props {
  orientation?: 'horizontal' | 'both';
  loopFocus?: boolean;
  rtl?: boolean;
}

/*
 * Grid diagram for reference:
 * Disabled indices marked with ()
 */

/** @internal */
export function Main(props: Props) {
  const orientation = () => props.orientation ?? 'horizontal';
  const loopFocus = () => props.loopFocus ?? false;
  const rtl = () => props.rtl ?? false;
  const [open, setOpen] = createSignal(false, { ownedWrite: true });
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null, { ownedWrite: true });

  const listRef: RefObject<Array<HTMLElement | null>> = { current: [] };

  // Port note: `floatingStyles` is a getter, so the return value isn't destructured.
  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
    placement: 'bottom-start',
  });
  const { refs, context } = floating;

  const disabledIndices = [0, 1, 2, 3, 4, 5, 6, 9, 14, 23, 35];

  const { getReferenceProps, getFloatingProps, getItemProps } = useTestInteractions([
    useClick(context.rootStore),
    useListNavigation(context.rootStore, {
      listRef,
      get activeIndex() {
        return activeIndex();
      },
      onNavigate: setActiveIndex,
      get orientation() {
        return orientation();
      },
      get loopFocus() {
        return loopFocus();
      },
      get rtl() {
        return rtl();
      },
      openOnArrowKeyDown: false,
      disabledIndices,
      grid,
    }),
    useDismiss(context.rootStore),
  ]);

  return (
    <>
      <h1>Complex Grid</h1>
      <div class={styles.Container}>
        <button ref={refs.setReference} type="button" {...getReferenceProps()}>
          Reference
        </button>
        <Show when={open()}>
          <FloatingFocusManager context={context.rootStore}>
            <div
              ref={refs.setFloating}
              data-testid="floating"
              class={styles.Grid}
              style={{
                ...floating.floatingStyles,
                display: 'grid',
                'grid-template-columns': '100px 100px 100px 100px 100px 100px 100px',
                'z-index': 999,
              }}
              {...getFloatingProps()}
            >
              {[...Array(37)].map((_, index) => (
                <button
                  type="button"
                  role="option"
                  // Port note: Solid removes `false` attributes, React renders them.
                  aria-selected={activeIndex() === index ? 'true' : 'false'}
                  tabindex={activeIndex() === index ? 0 : -1}
                  disabled={disabledIndices.includes(index)}
                  ref={(node) => {
                    listRef.current[index] = node;
                  }}
                  class={styles.Item}
                  {...getItemProps()}
                >
                  Item {index}
                </button>
              ))}
            </div>
          </FloatingFocusManager>
        </Show>
      </div>
    </>
  );
}
