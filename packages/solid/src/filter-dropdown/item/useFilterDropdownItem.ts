import { createSignal, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useStore } from '@base-ui-solid/utils/store';
import { useFilterDropdownItemContext } from '../root/FilterDropdownRootContext';
import type { FilterDropdownItemContext } from '../root/FilterDropdownRootContext';
import { useFilterDropdownGroupContext } from '../group/FilterDropdownGroupContext';
import { DETACHED_OWNER, selectors } from '../store';
/** Text of the rendered children, for when the element is filtered out and has no DOM node. */
function childrenText(children: JSX.Element): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(childrenText).join('');
  }
  // Port note: Solid children may be DOM nodes or lazy JSX getters, rather than React elements.
  if (typeof children === 'function') {
    return childrenText((children as () => JSX.Element)());
  }
  if (typeof Node !== 'undefined' && children instanceof Node) {
    return children.textContent ?? '';
  }
  return '';
}
export interface UseFilterDropdownItemParameters {
  /**
   * A text representation of the item used for filtering. Falls back to the rendered text.
   */
  label?: string | undefined;
  /**
   * Keeps the nearest group visible while this filtered-out item must remain mounted.
   */
  retainGroup?: boolean | undefined;
  /**
   * The item's children, watched so a changed params.label re-registers against the active query.
   */
  children?: JSX.Element | undefined;
  /**
   * The item's `render` prop, watched like `children` since its element can carry the text.
   */
  render?: unknown;
  /**
   * The dropdown that owns this item, when it isn't the nearest one. A filterable submenu's
   * trigger sits inside its own submenu's root but belongs to the enclosing list.
   */
  context?: FilterDropdownItemContext | null | undefined;
}
export interface UseFilterDropdownItemReturnValue {
  /**
   * Whether the item matches the current query and should render.
   */
  visible: Accessor<boolean>;
  /**
   * Ref for the rendered element, used to read its text when no `params.label` is given.
   */
  ref: RefObject<HTMLElement | null>;
}
/**
 * Registers an item with the enclosing filter root and reports whether the query keeps it.
 *
 * The item renders once before it is registered so its rendered text can be read and cached: a
 * popup can open with a query that already excludes the item, and a hidden item has no text left
 * to match against.
 *
 * @internal
 */
export function useFilterDropdownItem(
  params: UseFilterDropdownItemParameters,
): UseFilterDropdownItemReturnValue {
  // Port note: params are read lazily, like Solid props.
  const context = untrack(() => params.context);
  const nearestContext = useFilterDropdownItemContext(context !== undefined);
  const groupContext = useFilterDropdownGroupContext();
  const owner = context === undefined ? nearestContext : context;
  const { registerItem, store } = owner ?? DETACHED_OWNER;
  const registerGroupItem = groupContext?.registerItem;
  const itemId = Symbol('filter-dropdown-item');
  const [hasRendered, setHasRendered] = createSignal(false, { ownedWrite: true });
  let element: HTMLElement | null = null;
  const ref: RefObject<HTMLElement | null> = {
    get current() {
      return element;
    },
    set current(next) {
      element = next;
      if (next) {
        setHasRendered(true);
      }
    },
  };
  const registeredTextRef = { current: undefined } as RefObject<string | undefined>;
  const matched = useStore(store, selectors.isItemVisible, itemId);
  // An initial item is visible before registration (`visibleItemIds` is null), so start
  // registered and skip the mount re-render. A late item under an active filter starts
  // unregistered and renders once so its DOM text can be captured.
  const [registered, setRegistered] = createSignal(untrack(matched));
  // Read through refs so `register` stays stable while the children change identity.
  const childrenRef = {
    get current() {
      return params.children;
    },
  };

  // What the children last read as, to tell whether they changed while the item rendered no text.
  const childrenTextRef = { current: undefined } as RefObject<string | undefined>;
  const resolveText = () => {
    if (params.label != null) {
      return params.label;
    }
    // An item without children can carry its text in its `render` element instead.
    const fromChildren = childrenText(childrenRef.current);
    const previousChildrenText = childrenTextRef.current;
    childrenTextRef.current = fromChildren;
    if (ref.current !== null) {
      return ref.current.textContent ?? '';
    }
    // A filtered-out item has no DOM node left. Its children are only a stand-in for the text it
    // renders, which can differ (a translation component, for example), so the cached text wins
    // unless the children changed.
    if (registeredTextRef.current !== undefined && fromChildren === previousChildrenText) {
      return registeredTextRef.current;
    }
    return fromChildren;
  };
  const register = (resolvedText?: string) => {
    const text = resolvedText ?? resolveText();
    if (text) {
      registeredTextRef.current = text;
    }
    return registerItem(itemId, {
      getText() {
        // A mounted item reports what it renders now, even nothing, since a descendant can change
        // its text without the item re-rendering. A filtered-out item falls back to the cached
        // text.
        if (params.label == null && ref.current) {
          registeredTextRef.current = ref.current.textContent ?? '';
        }
        return registeredTextRef.current;
      },
    });
  };
  useIsoLayoutEffect(
    () =>
      untrack(() => {
        const unregister = register();
        setRegistered(true);
        return unregister;
      }),
    () => [params.label, register],
  );
  useIsoLayoutEffect(
    () => registerGroupItem?.(itemId, params.retainGroup ?? false),
    () => [registerGroupItem, itemId, params.retainGroup],
  );
  // Re-register when the item's text changes, so the active query runs again.
  useIsoLayoutEffect(
    () =>
      untrack(() => {
        const text = resolveText();
        if (text !== registeredTextRef.current) {
          registeredTextRef.current = text;
          void register(text);
        }
      }),
    () => [
      register,
      resolveText,
      hasRendered() ? params.children : undefined,
      params.render,
      params.label,
    ],
  );
  return { visible: () => !registered() || matched(), ref };
}
