import { children, createMemo, merge, omit, createContext, useContext, onCleanup } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useMergedRefs } from '@base-ui-solid/utils/useMergedRefs';
import { MenuRootContext } from '../root/MenuRootContext';
import type { HTMLProps } from '../../internals/types';
import type { MenuFilterPopup } from './MenuFilterPopup';
import type { MenuFilterGroup, MenuFilterRadioGroup } from './MenuFilterGroup';
import type { MenuFilterList } from './MenuFilterList';
import type { MenuParent } from '../root/MenuRoot';
import type { MenuStore } from '../store/MenuStore';

const filterChildren = new WeakMap<object, () => JSX.Element>();

/**
 * Port note: read lazily like Solid props (pass the component props or an object with getters).
 */
export interface MenuFilterItemParams {
  label?: string | undefined;
  children?: JSX.Element | undefined;
  render?: unknown;
}
/**
 * Port note: `visible` is an accessor.
 */
export interface MenuFilterItemResult {
  /** Whether the item matches the query. A hidden item renders nothing. */
  visible: Accessor<boolean>;
  /** Registers the element with the filter. */
  ref: ((element: HTMLElement | null) => void) | null;
  /** Props the filter needs on the element, merged under the consumer's. */
  props?: HTMLProps | undefined;
}
/**
 * The filter implementation that a filterable root hands to the parts below it. Only the roots
 * `Menu.FilterProvider` renders import it, so a plain menu never bundles it. Parts whose whole
 * structure differs are swapped as components; parts that only register with the filter call an
 * injected hook, so a menu that never renders them doesn't bundle a second implementation.
 */
export interface MenuFilterImpl {
  Popup: typeof MenuFilterPopup;
  List: typeof MenuFilterList;
  Group: typeof MenuFilterGroup;
  RadioGroup: typeof MenuFilterRadioGroup;
  /** Registers an item with the filter and reports whether it matches the query. */
  useItem: (params: MenuFilterItemParams) => MenuFilterItemResult;
  /** Like `useItem` for a submenu trigger, which is an item of the parent list. */
  useSubmenuTrigger: (params: MenuFilterItemParams) => MenuFilterItemResult;
  /**
   * Hands focus and the highlight back to a filterable parent when a plain submenu closes.
   * Port note: `open` is an accessor.
   */
  useParentHandoff: (
    store: MenuStore<unknown>,
    parent: MenuParent,
    open: Accessor<boolean>,
    virtualFocus: boolean,
  ) => MenuFilterParentHandoff;
}
export interface MenuFilterParentHandoff {
  /** The filterable parent's input, which the closing submenu returns focus to. */
  parentVirtualFocusRef: RefObject<HTMLElement | null> | undefined;
  handleFocus: (() => void) | undefined;
}
/** Static below a filter root: the implementation never changes, so subscribers never re-render. */
export const MenuFilterImplContext = createContext<MenuFilterImpl | null>(null);
export type MenuFilterPartScope =
  /** The part belongs to the nearest root. */
  | 'root'
  /** The part is an item of the parent list but renders inside its own submenu root. */
  | 'submenu-trigger';
/**
 * The filter implementation when the menu this part belongs to is filterable, otherwise `null`.
 * `virtualFocus` marks a filter root; a plain `Menu.Root` never sets it. The result is fixed for
 * a mounted part: a filter root can't appear above it without remounting it.
 */
export function useMenuFilterImpl(scope: MenuFilterPartScope = 'root'): MenuFilterImpl | null {
  const impl = useContext(MenuFilterImplContext);
  const root = useContext(MenuRootContext) ?? undefined;
  if (impl === null || root === undefined) {
    return null;
  }
  const filterable =
    scope === 'submenu-trigger' ? root.virtualFocus || root.parentVirtualFocus : root.virtualFocus;
  return filterable ? impl : null;
}
/**
 * Throws unless the menu this part renders in is filterable, naming the part and the provider.
 */
export function useMenuFilterPart(part: string) {
  if (useMenuFilterImpl() === null) {
    throw new Error(
      `Base UI: <Menu.${part}> must be placed in a menu wrapped in <Menu.FilterProvider>. ` +
        'It reads the filter query and the matching items from the provider, which a plain menu ' +
        'does not have. Wrap the <Menu.Root> or <Menu.SubmenuRoot> it belongs to in ' +
        '<Menu.FilterProvider>. See https://base-ui-solid.pages.dev/solid/components/menu#filtering',
    );
  }
}
const UNFILTERED: MenuFilterItemResult = { visible: () => true, ref: null };
function useUnfilteredItem(): MenuFilterItemResult {
  return UNFILTERED;
}
/**
 * Registers an item part with the filter of the menu it belongs to. A plain menu's items are
 * always visible.
 *
 * Port note: `props` is read lazily; `forwardedRef` is an accessor.
 */
export function useMenuFilterItem(
  props: MenuFilterItemParams,
  forwardedRef: Accessor<any>,
  scope: MenuFilterPartScope = 'root',
): MenuFilterItemResult {
  const impl = useMenuFilterImpl(scope);
  const useItem =
    (scope === 'submenu-trigger' ? impl?.useSubmenuTrigger : impl?.useItem) ?? useUnfilteredItem;
  const item = useItem({
    get label() {
      return props.label;
    },
    get children() {
      const readChildren = filterChildren.get(props);
      return readChildren ? readChildren() : props.children;
    },
    get render() {
      return props.render;
    },
  });
  const ref = useMergedRefs<HTMLElement>(forwardedRef, () => item.ref);
  return { visible: item.visible, ref, props: item.props };
}

function textOfChildren(content: JSX.Element): string {
  if (typeof content === 'string' || typeof content === 'number') {
    return String(content);
  }
  if (Array.isArray(content)) {
    return content.map(textOfChildren).join('');
  }
  if (typeof content === 'function') {
    return textOfChildren((content as () => JSX.Element)());
  }
  if (typeof Node !== 'undefined' && content instanceof Node) {
    return content.textContent ?? '';
  }
  return '';
}

function isTextChildren(content: JSX.Element): boolean {
  return (
    content == null ||
    (typeof content !== 'object' && typeof content !== 'function') ||
    (Array.isArray(content) && content.every(isTextChildren))
  );
}

/** Port note: materialize children reactively under the rendered item's owner and context.
 * Disposal clears the memo, so showing an item again creates fresh child bindings. The filter
 * retains only text while a nonprimitive subtree is absent, never its disposed DOM nodes. */
export function stabilizeFilterChildren<P extends { children?: JSX.Element | undefined }>(
  props: P,
): P {
  let rawContent: Accessor<JSX.Element> | undefined;
  let content: Accessor<JSX.Element> | undefined;
  let text = '';
  let textOnly = true;
  const stabilized = merge(omit(props, 'children'), {
    get children() {
      if (!content) {
        rawContent = createMemo(() => props.children);
        content = children(rawContent);
        onCleanup(() => {
          if (content) {
            const previous = content();
            text = textOfChildren(previous);
            textOnly = isTextChildren(rawContent?.());
          }
          content = undefined;
          rawContent = undefined;
        });
      }
      // Return the accessor rather than its value: the reader (the element's children insert)
      // then resolves it in a nested computation. Reading the value would subscribe the reader
      // to the resolved subtree, so a part inside it that mounts or unmounts (a checkbox item's
      // indicator) would re-run the reader and dispose the subtree it owns, leaving its nodes
      // frozen in the DOM.
      return content as unknown as JSX.Element;
    },
  }) as P;
  filterChildren.set(stabilized, () => {
    if (content) {
      const current = content();
      // Read primitive props directly as well: a filter subscription must outlive the
      // rendered subtree's memo to notice replacements while that subtree is hidden.
      return isTextChildren(rawContent?.()) ? props.children : current;
    }
    // Primitive children can still change while hidden without creating a child component
    // outside its provider. Component children use the separately registered rendered text.
    return textOnly ? props.children : text;
  });
  return stabilized;
}
