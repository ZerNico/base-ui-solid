import { merge, omit, createContext, useContext } from 'solid-js';
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
        '<Menu.FilterProvider>. See https://base-ui.com/react/components/menu#filtering',
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
      return props.children;
    },
    get render() {
      return props.render;
    },
  });
  const ref = useMergedRefs<HTMLElement>(forwardedRef, () => item.ref);
  return { visible: item.visible, ref, props: item.props };
}

/** Port note: Solid creates JSX children when read. Share the first rendered subtree with the
 * filter's text reader instead of instantiating a second child component from an effect. */
export function stabilizeFilterChildren<P extends { children?: JSX.Element | undefined }>(
  props: P,
): P {
  let content: JSX.Element;
  let resolved = false;
  return merge(omit(props, 'children'), {
    get children() {
      if (!resolved) {
        content = props.children;
        resolved =
          content != null &&
          typeof content !== 'string' &&
          typeof content !== 'number' &&
          typeof content !== 'boolean';
      }
      return resolved ? content : props.children;
    },
  }) as P;
}
