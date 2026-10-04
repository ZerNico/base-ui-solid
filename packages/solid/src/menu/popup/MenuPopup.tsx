import { createMemo, omit, untrack, useContext } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { InteractionType } from '@base-ui-solid/utils/useEnhancedClickHandler';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { FloatingFocusManager, useHoverFloatingInteraction } from '../../floating-ui-solid';
import type { FloatingFocusManagerProps } from '../../floating-ui-solid/components/FloatingFocusManager';
import { useMenuRootContext } from '../root/MenuRootContext';
import type { MenuRoot } from '../root/MenuRoot';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useRenderElement } from '../../internals/useRenderElement';
import type { BaseUIComponentProps } from '../../internals/types';
import type { Side, Align } from '../../internals/useAnchorPositioning';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import { popupTransitionStateMapping } from '../../utils/popupStateMapping';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useToolbarRootContext } from '../../toolbar/root/ToolbarRootContext';
import { COMPOSITE_KEYS } from '../../internals/composite/composite';
import { getDisabledMountTransitionStyles } from '../../internals/getDisabledMountTransitionStyles';
import { useMenuSubmenuRootContext } from '../submenu-root/MenuSubmenuRootContext';
import { useRenderedId } from '../../internals/resolveRenderedId';
import { resolvePopupLabel } from '../../internals/resolvePopupLabel';
import { MenuFilterImplContext, useMenuFilterImpl } from '../filter-root/MenuFilterContext';
import type { MenuFilterParentHandoff } from '../filter-root/MenuFilterContext';

type PopupLabelProps = Parameters<typeof resolvePopupLabel>[0];

interface MenuPopupPlainProps extends MenuPopup.Props {
  /** A filter root's own initial focus target; the plain default focuses the popup or its list. */
  initialFocus?: FloatingFocusManagerProps['initialFocus'] | undefined;
}

export function MenuPopupPlain(componentProps: MenuPopupPlainProps) {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
    'finalFocus',
    'id',
    'initialFocus',
  );

  const { store, defaultFloatingId, setRenderedFloatingId, virtualFocus } = useMenuRootContext();
  const rootContext = useMenuRootContext();
  const inheritedSubmenuRootContext = useMenuSubmenuRootContext();
  const positionerContext = useMenuPositionerContext();
  const insideToolbar = useToolbarRootContext(true) != null;

  const open = store.useState('open');
  const transitionStatus = store.useState('transitionStatus');
  const popupProps = store.useState('popupProps');
  const mounted = store.useState('mounted');
  const instantType = store.useState('instantType');
  const activeTriggerElement = store.useState('activeTriggerElement');
  const parent = store.useState('parent');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  const rootId = store.useState('rootId');
  const floatingContext = store.useState('floatingRootContext');
  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const closeDelay = store.useState('closeDelay');
  const hoverEnabled = store.useState('hoverEnabled');
  const disabled = store.useState('disabled');
  const openMethod = store.useState('openMethod');
  const activeTriggerId = store.useState('activeTriggerId');
  const listElement = store.useState('listElement');
  const popupElement = store.useState('popupElement');

  const [id, registerIdRef] = useRenderedId(
    componentProps,
    () => defaultFloatingId,
    setRenderedFloatingId,
  );

  const ariaLabelledBy = () => {
    // Port note: a Solid render callback is opaque until its element mounts. Honor its label
    // after the DOM attributes commit, just as upstream honors a render element's props.
    if (componentProps.render && popupElement()?.hasAttribute('aria-label')) {
      return componentProps['aria-labelledby'];
    }
    return resolvePopupLabel(
      componentProps as PopupLabelProps,
      activeTriggerElement(),
      activeTriggerId(),
    );
  };

  // A dialog's menu can render under a submenu provider; only the actual submenu inherits it.
  const submenuRootContext = () =>
    parent().type === 'menu' ? inheritedSubmenuRootContext : undefined;
  const isContextMenu = () => parent().type === 'context-menu';

  const initialFocus = (): FloatingFocusManagerProps['initialFocus'] => {
    const initialFocusProp = componentProps.initialFocus;
    const listElementValue = listElement();
    const parentType = parent().type;
    if (initialFocusProp === undefined && listElementValue && parentType !== 'menu') {
      return () => {
        // A keyboard or screen reader open highlights an item, which list navigation focuses.
        if (store.state.activeIndex !== null) {
          return false;
        }
        // The list holds the `menu` role, so a pointer open lands focus on it rather than on the
        // presentational popup.
        return listElementValue;
      };
    }
    return initialFocusProp ?? parentType !== 'menu';
  };

  useOpenChangeComplete({
    open,
    ref: () => store.context.popupRef.current,
    onComplete() {
      if (untrack(open)) {
        store.context.onOpenChangeComplete?.(true);
      }
    },
  });

  useEffect(
    ([floatingTreeRootValue]) => {
      function handleClose(event: {
        domEvent: Event | undefined;
        reason: MenuRoot.ChangeEventReason;
      }) {
        store.setOpen(false, createChangeEventDetails(event.reason, event.domEvent));
      }

      floatingTreeRootValue.events.on('close', handleClose);

      return () => {
        floatingTreeRootValue.events.off('close', handleClose);
      };
    },
    () => [floatingTreeRoot()] as const,
  );

  useHoverFloatingInteraction(untrack(floatingContext), {
    get enabled() {
      return hoverEnabled() && !disabled() && !isContextMenu() && parent().type !== 'menubar';
    },
    get closeDelay() {
      return closeDelay();
    },
  });

  const setPopupElement = store.useStateSetter('popupElement');

  // Only a menu under a filter root bundles the handoff to a filterable parent. Whether one is
  // above is fixed for a mounted popup.
  const useParentHandoff =
    useContext(MenuFilterImplContext)?.useParentHandoff ?? useNoParentHandoff;
  const { parentVirtualFocusRef, handleFocus } = useParentHandoff(
    store,
    untrack(parent),
    open,
    virtualFocus,
  );

  const state = createMemo<MenuPopupState>(() => ({
    transitionStatus: transitionStatus(),
    side: positionerContext.side,
    align: positionerContext.align,
    open: open(),
    nested: parent().type === 'menu',
    instant: instantType(),
  }));

  const returnFocus = () => {
    let value = parent().type === undefined || isContextMenu();
    if (
      activeTriggerElement() ||
      // Port note: Solid observes the cleared active trigger before popup disposal. The
      // still-registered submenu trigger remains its default return-focus target.
      (parent().type === 'menu' && store.context.triggerElements.size > 0) ||
      (parent().type === 'menubar' && lastOpenChangeReason() !== REASONS.outsidePress)
    ) {
      value = true;
    }
    return value;
  };

  // Internal defaults rather than consumer targets, so focus that already moved is respected.
  const dynamicReturnFocus = () => submenuRootContext()?.getReturnElement ?? parentVirtualFocusRef;

  return (
    <FloatingFocusManager
      context={untrack(floatingContext)}
      openInteractionType={openMethod()}
      modal={isContextMenu()}
      disabled={!mounted()}
      returnFocus={
        (componentProps.finalFocus as FloatingFocusManagerProps['returnFocus']) ??
        dynamicReturnFocus() ??
        returnFocus()
      }
      explicitReturnFocus={
        componentProps.finalFocus === undefined && dynamicReturnFocus() ? false : undefined
      }
      initialFocus={initialFocus()}
      restoreFocus
      getInsideElements={
        parent().type === undefined
          ? () => [store.context.beforeTriggerFocusGuardRef.current]
          : undefined
      }
      externalTree={parent().type !== 'menubar' ? floatingTreeRoot() : undefined}
      previousFocusableElement={activeTriggerElement() as HTMLElement | null}
      nextFocusableElement={
        parent().type === undefined ? store.context.triggerFocusTargetRef : undefined
      }
      beforeContentFocusGuardRef={store.context.beforeContentFocusGuardRef}
    >
      {/* Port note: rendered here so the children are created under the focus manager. */}
      {useRenderElement('div', componentProps, {
        state,
        ref: [
          (element: HTMLElement | null) => {
            store.context.popupRef.current = element;
          },
          setPopupElement,
          registerIdRef,
        ],
        stateAttributesMapping: popupTransitionStateMapping,
        props: () => [
          popupProps(),
          {
            id: id(),
            // A rendered `Menu.List` carries the `menu` semantics instead.
            ...(listElement()
              ? { role: 'presentation' }
              : {
                  role: 'menu',
                  // `menu` is implicitly vertical, so only the non-default value needs to be
                  // rendered.
                  'aria-orientation':
                    rootContext.orientation === 'horizontal' ? 'horizontal' : undefined,
                  'aria-labelledby': ariaLabelledBy(),
                }),
            onKeyDown(event: KeyboardEvent) {
              submenuRootContext()?.onPopupKeyDown?.(event);
              if (insideToolbar && COMPOSITE_KEYS.has(event.key)) {
                event.stopPropagation();
              }
            },
            // Port note: React's `onFocus` bubbles, so it's `onFocusIn` here.
            onFocusIn: handleFocus,
          },
          getDisabledMountTransitionStyles(transitionStatus()),
          elementProps,
          { 'data-rootownerid': rootId() } as Record<string, string | undefined>,
        ],
      })}
    </FloatingFocusManager>
  );
}

const NO_PARENT_HANDOFF: MenuFilterParentHandoff = {
  parentVirtualFocusRef: undefined,
  handleFocus: undefined,
};

function useNoParentHandoff() {
  return NO_PARENT_HANDOFF;
}

/**
 * A container for the menu items.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui.com/react/components/menu)
 */
export function MenuPopup(props: MenuPopup.Props) {
  const Popup = useMenuFilterImpl()?.Popup ?? MenuPopupPlain;
  return <Popup {...props} />;
}

export interface MenuPopupProps extends BaseUIComponentProps<'div', MenuPopupState> {
  children?: JSX.Element | undefined;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Determines the element to focus when the menu is closed.
   *
   * - `false`: Do not move focus.
   * - `true`: Move focus based on the default behavior (trigger or previously focused element).
   * - `RefObject`: Move focus to the ref element.
   * - `function`: Called with the interaction type (`mouse`, `touch`, `pen`, or `keyboard`).
   *   Return an element to focus, `true` to use the default behavior, or `false`/`undefined` to do nothing.
   */
  finalFocus?:
    | boolean
    | RefObject<HTMLElement | null>
    | ((closeType: InteractionType) => boolean | HTMLElement | null | void)
    | undefined;
}

export interface MenuPopupState {
  /**
   * The transition status of the component.
   */
  transitionStatus: TransitionStatus;
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
  /**
   * Whether the component is nested.
   */
  nested: boolean;
  /**
   * Whether transitions should be skipped.
   */
  instant: 'dismiss' | 'click' | 'group' | 'trigger-change' | undefined;
}

export namespace MenuPopup {
  export type Props = MenuPopupProps;
  export type State = MenuPopupState;
}
