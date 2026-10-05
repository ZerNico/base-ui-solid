import { useMergedRefs } from '@base-ui-solid/utils/useMergedRefs';
import { createMemo, omit, Show, untrack } from 'solid-js';
import { isElementDisabled } from '@base-ui-solid/utils/isElementDisabled';
import { warn } from '@base-ui-solid/utils/warn';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { platform } from '@base-ui-solid/utils/platform';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { getTarget } from '@base-ui-solid/utils/shadowDom';
import { useMenuFilterItem, stabilizeFilterChildren } from '../filter-root/MenuFilterContext';
import { safePolygon, useClick, useHoverReferenceInteraction } from '../../floating-ui-solid';
import type { BaseUIComponentProps, HTMLProps, NonNativeButtonProps } from '../../internals/types';
import { useMenuRootContext } from '../root/MenuRootContext';
import { useBaseUiId } from '../../internals/useBaseUiId';
import { triggerOpenStateMapping } from '../../utils/popupStateMapping';
import { useCompositeListItem } from '../../internals/composite/list/useCompositeListItem';
import { useMenuItem } from '../item/useMenuItem';
import { useRenderElement } from '../../internals/useRenderElement';
import { useMenuPositionerContext } from '../positioner/MenuPositionerContext';
import { useTriggerRegistration } from '../../utils/popups';
import { useMenuSubmenuRootContext } from '../submenu-root/MenuSubmenuRootContext';
import { REASONS } from '../../internals/reasons';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';

const VOICE_OVER_EXPANDED_PROPS = { 'aria-expanded': undefined };

function MenuSubmenuTriggerPlain(
  componentProps: MenuSubmenuTrigger.Props & { filterProps?: HTMLProps | undefined },
) {
  const forwardedRef = useMergedRefs<HTMLElement>(
    () => componentProps.ref as any,
    () => null,
  );
  const elementProps = omit(
    componentProps,
    'ref',
    'render',
    'class',
    'style',
    'label',
    'id',
    'nativeButton',
    'openOnHover',
    'delay',
    'closeDelay',
    'disabled',
    'filterProps',
  );

  const openOnHover = () => componentProps.openOnHover ?? true;
  const delay = () => componentProps.delay ?? 100;
  const closeDelay = () => componentProps.closeDelay ?? 0;

  const context = useMenuRootContext(true);
  if (context?.parent.type !== 'menu') {
    throw new Error('Base UI: <Menu.SubmenuTrigger> must be placed in <Menu.SubmenuRoot>.');
  }

  const menuPositionerContext = useMenuPositionerContext(true);
  const submenuRootContext = useMenuSubmenuRootContext();

  const { store } = context;
  const parentMenuStore = context.parent.store;

  const listItem = useCompositeListItem({ guess: true, label: () => componentProps.label });
  const generatedId = useBaseUiId();
  const thisTriggerId = () => componentProps.id ?? generatedId;

  const open = store.useState('open');
  const focusReturnedThroughGuardRef = { current: false };
  const positionerElement = store.useState('positionerElement');
  const floatingRootContext = store.useState('floatingRootContext');
  const floatingTreeRoot = store.useState('floatingTreeRoot');
  const popupId = store.useState('triggerPopupId', thisTriggerId);

  const baseRegisterTrigger = useTriggerRegistration(thisTriggerId, store);

  // Stable, so the merged ref on the rendered element keeps its identity for the trigger's whole
  // lifetime; the latest `closeDelay` is read when it runs.
  const registerTrigger = (element: Element | null) => {
    baseRegisterTrigger(element);

    const activeTriggerElement = store.select('activeTriggerElement');
    if (
      element !== null &&
      store.select('open') &&
      (activeTriggerElement === element || store.select('activeTriggerId') == null)
    ) {
      store.update({
        activeTriggerId: untrack(thisTriggerId) ?? null,
        activeTriggerElement: element,
        closeDelay: untrack(closeDelay),
      });
    }
  };

  const triggerElementRef: RefObject<HTMLElement | null> = { current: null };

  const handleTriggerElementRef = (el: HTMLElement | null) => {
    triggerElementRef.current = el;
    store.set('activeTriggerElement', el);
  };

  // A stable ref does not re-fire when the id changes, so register the rendered element here
  // instead.
  useIsoLayoutEffect(
    () => {
      registerTrigger(triggerElementRef.current);
      return () => registerTrigger(null);
    },
    () => [thisTriggerId()] as const,
  );

  useIsoLayoutEffect(
    ([openValue, positionerElementValue]) => {
      if (!openValue || !positionerElementValue) {
        return undefined;
      }

      function handleGuardFocusOut(event: FocusEvent) {
        if (getTarget(event) === store.context.beforeContentFocusGuardRef.current) {
          focusReturnedThroughGuardRef.current = event.relatedTarget === triggerElementRef.current;
        }
      }

      // Observe focus leaving the guard inside its positioner. When the portal is in a shadow root,
      // the trigger's focus event can report the shadow host as `relatedTarget`, not the guard.
      positionerElementValue.addEventListener('focusout', handleGuardFocusOut, true);
      return () => {
        focusReturnedThroughGuardRef.current = false;
        positionerElementValue.removeEventListener('focusout', handleGuardFocusOut, true);
      };
    },
    () => [open(), positionerElement()] as const,
  );

  store.useSyncedValue('closeDelay', closeDelay);

  const rootDisabled = store.useState('disabled');
  const parentDisabled = parentMenuStore.useState('disabled');

  const disabled = () => (componentProps.disabled ?? false) || rootDisabled() || parentDisabled();

  if (IS_DEV) {
    // Port note: upstream checks after every render; this checks whenever `disabled` changes.
    // React's `captureOwnerStack` has no Solid counterpart, so no owner stack is appended.
    useEffect(
      ([disabledValue]) => {
        const element = triggerElementRef.current;
        if (element && isElementDisabled(element) && !disabledValue) {
          warn(
            'A disabled element was detected on <Menu.SubmenuTrigger>. To properly disable the trigger, use the `disabled` prop on the component instead of setting it on the rendered element.',
          );
        }
      },
      () => [disabled()] as const,
    );
  }

  const itemProps = parentMenuStore.useState('itemProps');
  const highlighted = parentMenuStore.useState('isActive', listItem.index);

  const itemMetadata = {
    type: 'submenu-trigger' as const,
    setActive(event: MouseEvent) {
      if (parentMenuStore.select('highlightItemOnHover')) {
        parentMenuStore.setActiveIndex(untrack(listItem.index), REASONS.pointer, event);
      }
    },
  };

  const { getItemProps, itemRef } = useMenuItem({
    closeOnClick: () => false,
    disabled,
    highlighted,
    id: thisTriggerId,
    store,
    typingRef: parentMenuStore.context.typingRef,
    nativeButton: () => componentProps.nativeButton ?? false,
    itemMetadata,
    nodeId: () => menuPositionerContext?.context.nodeId,
  });

  const hoverEnabled = store.useState('hoverEnabled');

  const hoverProps = useHoverReferenceInteraction(untrack(floatingRootContext), {
    get enabled() {
      return hoverEnabled() && openOnHover() && !disabled();
    },
    handleClose: safePolygon({ blockPointerEvents: true }),
    mouseOnly: true,
    move: true,
    get restMs() {
      return delay();
    },
    get delay() {
      return { open: delay(), close: closeDelay() };
    },
    get shouldOpen() {
      return delay() > 0 ? () => parentMenuStore.select('allowMouseEnter') : undefined;
    },
    triggerElementRef,
    externalTree: untrack(floatingTreeRoot),
    isClosing: () => store.select('transitionStatus') === 'ending',
    // Chrome can drop the trigger's `mouseleave` during a fast pointer sweep,
    // leaving a stale submenu open (see #5152) — cancel from `mouseout` too.
    guardStaleOpen: true,
  });

  const click = useClick(untrack(floatingRootContext), {
    get enabled() {
      return !disabled();
    },
    event: 'mousedown',
    // Without toggling, TalkBack users cannot close the submenu to reach the next parent menu
    // item: moving the virtual cursor outside does not close it, and moving forward again
    // re-enters the still-open submenu. Keep toggling enabled so activating its trigger closes it.
    // Toggling applies to touch and keyboard activation. In hover mode, mouse presses are
    // ignored and the first activation after hover-opening keeps the submenu open.
    toggle: true,
    get ignoreMouse() {
      return openOnHover();
    },
    get stickIfOpen() {
      return openOnHover();
    },
  });

  const localInteractionProps = () => (click.reference as HTMLProps) ?? EMPTY_OBJECT;

  const triggerProps = store.useState('triggerProps', true);
  // Port note: upstream deletes `id` from the store's props object in place; this omits it from
  // a copy.
  const rootTriggerProps = createMemo(() => {
    const { id, ...rest } = triggerProps();
    return rest;
  });

  const state = createMemo<MenuSubmenuTriggerState>(() => ({
    disabled: disabled(),
    highlighted: highlighted(),
    open: open(),
  }));

  const openMethod = store.useState('openMethod');
  const lastOpenChangeReason = store.useState('lastOpenChangeReason');
  // Arrow keys open the submenu through list navigation without dispatching a click, so
  // `openMethod` stays null there; Enter and Space do dispatch one and report `keyboard`.
  const openedByKeyboard = () =>
    lastOpenChangeReason() === REASONS.listNavigation || openMethod() === 'keyboard';
  const shouldOmitExpanded = () => open() && openedByKeyboard() && platform.screenReader.voiceOver;
  const submenuKeyDownProps = submenuRootContext?.onTriggerKeyDown
    ? { onKeyDown: submenuRootContext.onTriggerKeyDown }
    : undefined;

  return useRenderElement('div', componentProps, {
    state,
    stateAttributesMapping: triggerOpenStateMapping,
    props: () => [
      localInteractionProps(),
      hoverProps(),
      rootTriggerProps(),
      // MenuFilterSubmenuRoot overrides the generic trigger handler because entry and exit
      // depend on both the parent and child menu orientations.
      submenuKeyDownProps,
      itemProps(),
      // Opening a submenu changes the trigger's expanded state while the trigger still holds
      // focus, and VoiceOver announces that state change instead of the submenu item that focus
      // moves to a moment later, so the first item is never announced. Dropping the state while
      // the submenu is open avoids the announcement without claiming the submenu is collapsed;
      // `aria-haspopup` still conveys that the item opens a submenu.
      shouldOmitExpanded() ? VOICE_OVER_EXPANDED_PROPS : undefined,
      {
        'aria-controls': popupId(),
        // A virtually focused parent keeps real focus on its input, so the trigger must stay out
        // of the tab order.
        tabindex: context.parentVirtualFocus || !(open() || highlighted()) ? -1 : 0,
        // Port note: React's `onFocus`/`onBlur` bubble, so they're `onFocusIn`/`onFocusOut` here.
        onFocusIn(event: FocusEvent) {
          // Close when focus returns through the submenu's guard to its trigger. This also lets
          // screen reader users move past the trigger in the parent menu. Direct focus from a
          // submenu item, such as on hover, leaves the submenu open.
          if (store.select('open') && focusReturnedThroughGuardRef.current) {
            focusReturnedThroughGuardRef.current = false;
            store.setOpen(false, createChangeEventDetails(REASONS.focusOut, event));
          }
        },
        onFocusOut() {
          if (untrack(highlighted)) {
            parentMenuStore.setActiveIndex(null, REASONS.none);
          }
        },
      },
      componentProps.filterProps,
      elementProps,
      // `getItemProps` stays last so `useButton` keeps gating consumer handlers while disabled.
      getItemProps,
    ],
    ref: [listItem.ref, itemRef, registerTrigger, handleTriggerElementRef, forwardedRef],
  });
}

/**
 * A menu item that opens a submenu.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Menu](https://base-ui-solid.pages.dev/solid/components/menu)
 */
export function MenuSubmenuTrigger(incomingProps: MenuSubmenuTrigger.Props) {
  const props = stabilizeFilterChildren(incomingProps);
  const filterItem = useMenuFilterItem(props, () => props.ref, 'submenu-trigger');

  // Port note: upstream merges the filter's props under the consumer's
  // (`mergeProps(filterItem.props, props)`); they're passed separately and merged at the same
  // position, right before the consumer's props.
  return (
    <Show when={filterItem.visible()}>
      <MenuSubmenuTriggerPlain
        {...props}
        filterProps={filterItem.props}
        ref={(node) => filterItem.ref?.(node)}
      />
    </Show>
  );
}

export interface MenuSubmenuTriggerState {
  /**
   * Whether the component should ignore user interaction.
   */
  disabled: boolean;
  /**
   * Whether the item is highlighted.
   */
  highlighted: boolean;
  /**
   * Whether the menu is currently open.
   */
  open: boolean;
}

export interface MenuSubmenuTriggerProps
  extends NonNativeButtonProps, BaseUIComponentProps<'div', MenuSubmenuTriggerState> {
  onClick?: BaseUIComponentProps<'div', MenuSubmenuTriggerState>['onClick'] | undefined;
  /**
   * Overrides the text used for keyboard text navigation and filtering.
   * Falls back to the rendered text when not provided.
   */
  label?: string | undefined;
  /**
   * @ignore
   */
  id?: string | undefined;
  /**
   * Whether the component should ignore user interaction.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * How long to wait before the menu may be opened on hover. Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 100
   */
  delay?: number | undefined;
  /**
   * How long to wait before closing the menu that was opened on hover.
   * Specified in milliseconds.
   *
   * Requires the `openOnHover` prop.
   * @default 0
   */
  closeDelay?: number | undefined;
  /**
   * Whether the menu should also open when the trigger is hovered.
   * @default true
   */
  openOnHover?: boolean | undefined;
}

export namespace MenuSubmenuTrigger {
  export type Props = MenuSubmenuTriggerProps;
  export type State = MenuSubmenuTriggerState;
}
