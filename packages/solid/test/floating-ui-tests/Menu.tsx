import { createContext, createMemo, createSignal, omit, Show, useContext } from 'solid-js';
import type { Setter } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useMergedRefsN } from '@base-ui-solid/utils/useMergedRefs';
import { useTestInteractions } from '#test-utils';
import { useBaseUiId } from '../../src/internals/useBaseUiId';
import { CompositeList } from '../../src/internals/composite/list/CompositeList';
import { useCompositeListItem } from '../../src/internals/composite/list/useCompositeListItem';
import { getEmptyRootContext } from '../../src/floating-ui-solid/utils/getEmptyRootContext';
import type { ElementProps } from '../../src/floating-ui-solid/types';
import {
  autoUpdate,
  flip,
  FloatingFocusManager,
  FloatingNode,
  FloatingPortal,
  FloatingTree,
  offset,
  safePolygon,
  shift,
  useClick,
  useDismiss,
  useFloatingNodeId,
  useFloatingParentNodeId,
  useFloatingTree,
  useListNavigation,
  useTypeahead,
  useFocus,
} from '../../src/floating-ui-solid';
import { useFloating } from './useFloating';
import { useHover } from './useHover';
import { gridNavigation } from '../../src/floating-ui-solid/hooks/gridNavigation';
import { GRID_COLUMN_COUNT, renderGridRows } from './renderGridRows';
import styles from './Menu.module.css';

/**
 * Port note: `activeIndex`, `allowHover` and `isOpen` are getters.
 */
type MenuContextType = {
  getItemProps: ReturnType<typeof useTestInteractions>['getItemProps'];
  activeIndex: number | null;
  setActiveIndex: Setter<number | null>;
  setHasFocusInside: Setter<boolean>;
  allowHover: boolean;
  isOpen: boolean;
  setIsOpen: Setter<boolean>;
  parent: MenuContextType | null;
};

const MenuContext = createContext<MenuContextType>({
  getItemProps: () => ({}),
  activeIndex: null,
  setActiveIndex: (() => {}) as Setter<number | null>,
  setHasFocusInside: (() => {}) as Setter<boolean>,
  allowHover: true,
  isOpen: false,
  setIsOpen: (() => {}) as Setter<boolean>,
  parent: null,
});

/**
 * Port note: React's `onFocus` bubbles, so it's `onFocusIn` here. The handlers are typed as plain
 * functions so that the components can call them.
 */
type HandlerProps = {
  onClick?: ((event: MouseEvent) => void) | undefined;
  onFocusIn?: ((event: FocusEvent) => void) | undefined;
  onMouseEnter?: ((event: MouseEvent) => void) | undefined;
};

type ButtonProps = Omit<JSX.ButtonHTMLAttributes<HTMLButtonElement>, keyof HandlerProps> &
  HandlerProps;

interface MenuProps {
  label: string;
  nested?: boolean;
  children?: JSX.Element;
  keepMounted?: boolean;
  orientation?: 'vertical' | 'horizontal' | 'both';
  grid?: boolean;
  openOnFocus?: boolean;
}

/** @internal */
export function MenuComponent(componentProps: MenuProps & ButtonProps) {
  const props = omit(
    componentProps,
    'children',
    'label',
    'keepMounted',
    'grid',
    'orientation',
    'openOnFocus',
    'ref',
  );
  const keepMounted = () => componentProps.keepMounted ?? false;
  const openOnFocus = () => componentProps.openOnFocus ?? false;
  const grid = () => componentProps.grid;

  const [isOpen, setIsOpen] = createSignal(false, { ownedWrite: true });
  const [activeIndex, setActiveIndex] = createSignal<number | null>(null, { ownedWrite: true });
  const [allowHover, setAllowHover] = createSignal(false, { ownedWrite: true });
  const [hasFocusInside, setHasFocusInside] = createSignal(false, { ownedWrite: true });

  const elementsRef: RefObject<Array<HTMLButtonElement | null>> = { current: [] };
  const labelsRef: RefObject<Array<string | null>> = { current: [] };

  const tree = useFloatingTree();
  const nodeId = useFloatingNodeId();
  const parentId = useFloatingParentNodeId();
  const isNested = parentId != null;
  const orientation = () => componentProps.orientation ?? (grid() ? 'both' : 'vertical');

  const parent = useContext(MenuContext);
  const item = useCompositeListItem();
  const triggerId = useBaseUiId();

  // Port note: `floatingStyles` is a getter, so the return value isn't destructured.
  const floating = useFloating({
    nodeId,
    get open() {
      return isOpen();
    },
    onOpenChange: setIsOpen,
    placement: isNested ? 'right-start' : 'bottom-start',
    middleware: [
      offset({ mainAxis: isNested ? 0 : 4, alignmentAxis: isNested ? -4 : 0 }),
      flip(),
      shift(),
    ],
    whileElementsMounted: autoUpdate,
  });
  const { refs, context } = floating;
  const fallbackContext = getEmptyRootContext();
  const hoverContext = () => (isNested && allowHover() ? context : fallbackContext);

  // Port note: hooks run once in Solid, so the hover hook is recreated when its context changes.
  const hoverForContext = createMemo(() =>
    useHover(hoverContext(), {
      delay: { open: 75 },
      handleClose: safePolygon({ blockPointerEvents: true }),
    }),
  );
  const hover: ElementProps = {
    get reference() {
      return hoverForContext().reference;
    },
    get floating() {
      return hoverForContext().floating;
    },
  };
  const click = useClick(context.rootStore, {
    event: 'mousedown',
    get toggle() {
      return !isNested || !allowHover();
    },
    ignoreMouse: isNested,
  });
  const focus = useFocus(context.rootStore, {
    get enabled() {
      return openOnFocus();
    },
  });
  const dismiss = useDismiss(context.rootStore, { bubbles: true });
  const listNavigation = useListNavigation(context.rootStore, {
    listRef: elementsRef,
    get activeIndex() {
      return activeIndex();
    },
    nested: isNested,
    onNavigate: setActiveIndex,
    get orientation() {
      return orientation();
    },
    get grid() {
      return grid() ? gridNavigation : undefined;
    },
  });
  const typeahead = useTypeahead(context.rootStore, {
    listRef: labelsRef,
    get onMatch() {
      return isOpen() ? setActiveIndex : undefined;
    },
    get activeIndex() {
      return activeIndex();
    },
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useTestInteractions([
    hover,
    click,
    dismiss,
    focus,
    listNavigation,
    typeahead,
  ]);

  // Event emitter allows you to communicate across tree components.
  // This effect closes all menus when an item gets clicked anywhere
  // in the tree.
  useEffect(
    ([treeValue, nodeIdValue, parentIdValue]) => {
      if (!treeValue) {
        return undefined;
      }

      function handleTreeClick() {
        setIsOpen(false);
      }

      function onSubMenuOpen(event: { nodeId: string; parentId: string }) {
        if (event.nodeId !== nodeIdValue && event.parentId === parentIdValue) {
          setIsOpen(false);
        }
      }

      treeValue.events.on('click', handleTreeClick);
      treeValue.events.on('menuopen', onSubMenuOpen);

      return () => {
        treeValue.events.off('click', handleTreeClick);
        treeValue.events.off('menuopen', onSubMenuOpen);
      };
    },
    () => [tree, nodeId, parentId],
  );

  useEffect(
    ([treeValue, isOpenValue, nodeIdValue, parentIdValue]) => {
      if (isOpenValue && treeValue) {
        treeValue.events.emit('menuopen', { parentId: parentIdValue, nodeId: nodeIdValue });
      }
    },
    () => [tree, isOpen(), nodeId, parentId],
  );

  // Determine if "hover" logic can run based on the modality of input. This
  // prevents unwanted focus synchronization as menus open and close with
  // keyboard navigation and the cursor is resting on the menu.
  useEffect(
    () => {
      function onPointerMove({ pointerType }: PointerEvent) {
        if (pointerType !== 'touch') {
          setAllowHover(true);
        }
      }

      function onKeyDown() {
        setAllowHover(false);
      }

      window.addEventListener('pointermove', onPointerMove, {
        once: true,
        capture: true,
      });
      window.addEventListener('keydown', onKeyDown, true);
      return () => {
        window.removeEventListener('pointermove', onPointerMove, {
          capture: true,
        });
        window.removeEventListener('keydown', onKeyDown, true);
      };
    },
    () => [allowHover()],
  );

  const menuContextValue: MenuContextType = {
    get activeIndex() {
      return activeIndex();
    },
    setActiveIndex,
    getItemProps,
    setHasFocusInside,
    get allowHover() {
      return allowHover();
    },
    get isOpen() {
      return isOpen();
    },
    setIsOpen,
    parent,
  };

  return (
    <FloatingNode id={nodeId}>
      <button
        type="button"
        ref={useMergedRefsN<HTMLButtonElement>(() => [
          refs.setReference,
          item.ref,
          componentProps.ref as any,
        ])}
        id={triggerId}
        aria-haspopup="menu"
        // Port note: Solid removes `false` attributes, React renders them.
        aria-expanded={isOpen() ? 'true' : 'false'}
        aria-controls={isOpen() ? context.floatingId : undefined}
        data-open={isOpen() ? '' : undefined}
        // eslint-disable-next-line no-nested-ternary
        tabindex={!isNested ? props.tabindex : parent.activeIndex === item.index() ? 0 : -1}
        // Port note: Solid's class array replaces `clsx`.
        class={[
          props.class || styles.Trigger,
          {
            [styles.TriggerNested]: isNested,
            [styles.TriggerNestedOpenNoFocus]: isOpen() && isNested && !hasFocusInside(),
            [styles.TriggerNestedOpenHasFocus]: isNested && isOpen() && hasFocusInside(),
            [styles.TriggerRootOpen]: !isNested && isOpen(),
          },
        ]}
        {...getReferenceProps(
          parent.getItemProps({
            ...(props as any),
            onFocusIn(event: FocusEvent) {
              props.onFocusIn?.(event);
              setHasFocusInside(false);
              parent.setHasFocusInside(true);
            },
            onMouseEnter(event: MouseEvent) {
              props.onMouseEnter?.(event);
              if (parent.allowHover && parent.isOpen) {
                parent.setActiveIndex(item.index());
              }
            },
          }),
        )}
      >
        {componentProps.label}
        {isNested && (
          <span aria-hidden="true" class={styles.Icon}>
            Icon
          </span>
        )}
      </button>
      <MenuContext value={menuContextValue}>
        <CompositeList elementsRef={elementsRef} labelsRef={labelsRef}>
          <Show when={keepMounted() || isOpen()}>
            <FloatingPortal>
              <FloatingFocusManager
                context={context.rootStore}
                modal={false}
                initialFocus={!isNested}
                returnFocus={!isNested}
              >
                <div
                  ref={refs.setFloating}
                  id={context.floatingId}
                  role="menu"
                  aria-labelledby={triggerId}
                  class={[
                    styles.Panel,
                    {
                      [styles.PanelFlex]: !grid(),
                    },
                    {
                      [styles.PanelGrid]: grid(),
                    },
                  ]}
                  style={{
                    ...floating.floatingStyles,
                    '--cols': String(GRID_COLUMN_COUNT),
                    // eslint-disable-next-line no-nested-ternary
                    visibility: !keepMounted() ? undefined : isOpen() ? 'visible' : 'hidden',
                  }}
                  aria-hidden={isOpen() ? 'false' : 'true'}
                  {...getFloatingProps()}
                >
                  {renderGridRows(componentProps.children, grid())}
                </div>
              </FloatingFocusManager>
            </FloatingPortal>
          </Show>
        </CompositeList>
      </MenuContext>
    </FloatingNode>
  );
}

interface MenuItemProps {
  label: string;
  disabled?: boolean;
}

/** @internal */
export function MenuItem(componentProps: MenuItemProps & ButtonProps) {
  const props = omit(componentProps, 'label', 'disabled', 'ref');
  const menu = useContext(MenuContext);
  const item = useCompositeListItem({
    label: () => (componentProps.disabled ? null : componentProps.label),
  });
  const tree = useFloatingTree();
  const isActive = () => item.index() === menu.activeIndex;

  return (
    <button
      {...props}
      ref={useMergedRefsN<HTMLButtonElement>(() => [item.ref, componentProps.ref as any])}
      type="button"
      role="menuitem"
      disabled={componentProps.disabled}
      tabindex={isActive() ? 0 : -1}
      // Port note: Solid's class array replaces `clsx`.
      class={[styles.Item, { [styles.ItemDisabled]: componentProps.disabled }]}
      {...menu.getItemProps({
        active: isActive(),
        onClick(event: MouseEvent) {
          props.onClick?.(event);
          tree?.events.emit('click');
        },
        onFocusIn(event: FocusEvent) {
          props.onFocusIn?.(event);
          menu.setHasFocusInside(true);
        },
        onMouseEnter(event: MouseEvent) {
          props.onMouseEnter?.(event);
          if (menu.allowHover && menu.isOpen) {
            menu.setActiveIndex(item.index());
          }
        },
        onKeyDown(event: KeyboardEvent) {
          function closeParents(parent: MenuContextType | null) {
            parent?.setIsOpen(false);
            if (parent?.parent) {
              closeParents(parent.parent);
            }
          }

          if (
            event.key === 'ArrowRight' &&
            // If the root reference is in a menubar, close parents
            tree?.nodesRef.current[0].context?.elements.domReference?.closest('[role="menubar"]')
          ) {
            closeParents(menu.parent);
          }
        },
      })}
    >
      {componentProps.label}
    </button>
  );
}

/** @internal */
export function Menu(props: MenuProps & ButtonProps) {
  const parentId = useFloatingParentNodeId();

  // Port note: the parent node id comes from context, so the branch is decided once.
  // eslint-disable-next-line solid/components-return-once
  return parentId === null ? (
    <FloatingTree>
      <MenuComponent {...props} />
    </FloatingTree>
  ) : (
    <MenuComponent {...props} />
  );
}

/** @internal */
export function Main() {
  /* eslint-disable no-console */
  return (
    <>
      <h1 class={styles.Heading}>Menu</h1>
      <div class={styles.Container}>
        <Menu label="Edit">
          <MenuItem label="Undo" onClick={() => console.log('Undo')} />
          <MenuItem label="Redo" />
          <MenuItem label="Cut" disabled />
          <Menu label="Copy as" keepMounted>
            <MenuItem label="Text" />
            <MenuItem label="Video" />
            <Menu label="Image" keepMounted grid orientation="horizontal">
              <MenuItem label=".png" />
              <MenuItem label=".jpg" />
              <MenuItem label=".svg" />
              <MenuItem label=".gif" />
            </Menu>
            <MenuItem label="Audio" />
          </Menu>
          <Menu label="Share">
            <MenuItem label="Mail" />
            <MenuItem label="Instagram" />
          </Menu>
        </Menu>
      </div>
    </>
  );
}
