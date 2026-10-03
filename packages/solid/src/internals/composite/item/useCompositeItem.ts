import { untrack } from 'solid-js';
import { useCompositeRootContext } from '../root/CompositeRootContext';
import { useCompositeListItem } from '../list/useCompositeListItem';
import type { UseCompositeListItemParameters } from '../list/useCompositeListItem';

export interface UseCompositeItemParameters<Metadata> extends Pick<
  UseCompositeListItemParameters<Metadata>,
  'metadata'
> {}

export function useCompositeItem<Metadata>(params: UseCompositeItemParameters<Metadata> = {}) {
  const { highlightItemOnHover, highlightedIndex, onHighlightedIndexChange } =
    useCompositeRootContext();
  const { ref, index } = useCompositeListItem(params);

  const isHighlighted = () => highlightedIndex() === index();

  let itemElement: HTMLElement | null = null;
  const compositeRef = (element: HTMLElement | null) => {
    ref(element);
    itemElement = element;
  };

  // Accessor: read it inside `useRenderElement`'s `props` accessor.
  const compositeProps = () => ({
    tabindex: isHighlighted() ? 0 : -1,
    // Port note: React's `onFocus` bubbles (it listens to `focusin`), Solid's doesn't.
    onFocusIn() {
      onHighlightedIndexChange(untrack(index));
    },
    onMouseMove() {
      const item = itemElement;
      if (!untrack(highlightItemOnHover) || !item) {
        return;
      }

      const disabled = item.hasAttribute('disabled') || item.ariaDisabled === 'true';
      if (!untrack(isHighlighted) && !disabled) {
        item.focus();
      }
    },
  });

  return {
    compositeProps,
    compositeRef,
    index,
  };
}
