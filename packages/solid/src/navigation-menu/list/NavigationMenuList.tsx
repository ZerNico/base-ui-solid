import { createMemo, omit, untrack } from 'solid-js';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { useDismiss, useHoverFloatingInteraction } from '../../floating-ui-solid';
import type { ElementProps } from '../../floating-ui-solid';
import { closest, getTarget } from '../../floating-ui-solid/utils';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { CompositeRoot } from '../../internals/composite/root/CompositeRoot';
import {
  useNavigationMenuRootContext,
  useNavigationMenuTreeContext,
} from '../root/NavigationMenuRootContext';
import { NAVIGATION_MENU_TRIGGER_IDENTIFIER } from '../utils/constants';
import { NavigationMenuDismissContext } from './NavigationMenuDismissContext';
import { getEmptyRootContext } from '../../floating-ui-solid/utils/getEmptyRootContext';
import { useRenderElement } from '../../internals/useRenderElement';

/**
 * Contains a list of navigation menu items.
 * Renders a `<ul>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui-solid.pages.dev/solid/components/navigation-menu)
 */
export function NavigationMenuList(componentProps: NavigationMenuList.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style');

  const nodeId = useNavigationMenuTreeContext();

  const {
    orientation,
    open,
    floatingRootContext,
    positionerElement,
    value,
    closeDelay,
    viewportElement,
    nested,
  } = useNavigationMenuRootContext();

  const fallbackContext = getEmptyRootContext();
  const context = createMemo(() => floatingRootContext() || fallbackContext);
  const interactionsEnabled = () => positionerElement() != null || value() == null;
  const hoverInteractionsEnabled = () =>
    positionerElement() != null || viewportElement() != null || value() == null;

  // Port note: the interaction hooks bind to the store they receive. Upstream re-renders them with
  // the active trigger's store, so here they're set up again (owned by the memo) whenever the
  // store changes.
  const dismiss = createMemo(() => {
    const currentContext = context();
    return untrack(() => {
      useHoverFloatingInteraction(currentContext, {
        get enabled() {
          return Boolean(floatingRootContext()) && hoverInteractionsEnabled();
        },
        get closeDelay() {
          return closeDelay();
        },
        nodeId,
      });

      return useDismiss(currentContext, {
        get enabled() {
          return interactionsEnabled();
        },
        outsidePressEvent: 'intentional',
        outsidePress(event) {
          const target = getTarget(event) as HTMLElement | null;
          const closestNavigationMenuTrigger = closest(
            target,
            `[${NAVIGATION_MENU_TRIGGER_IDENTIFIER}]`,
          );
          return closestNavigationMenuTrigger === null;
        },
      });
    });
  });

  const dismissProps = (): ElementProps | undefined =>
    floatingRootContext() ? dismiss() : undefined;

  const state = createMemo<NavigationMenuListState>(() => ({
    open: open(),
  }));

  // `stopEventPropagation` won't stop the propagation if the end of the list is reached,
  // but we want to block it in this case.
  // When nested, skip this handler so arrow keys can reach the parent CompositeRoot.
  const defaultProps: HTMLProps = nested
    ? EMPTY_OBJECT
    : {
        onKeyDown(event: KeyboardEvent) {
          const shouldStop =
            (orientation() === 'horizontal' &&
              (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) ||
            (orientation() === 'vertical' &&
              (event.key === 'ArrowUp' || event.key === 'ArrowDown'));

          if (shouldStop) {
            event.stopPropagation();
          }
        },
      };

  const props = () => [dismissProps()?.floating || EMPTY_OBJECT, defaultProps, elementProps];

  // When nested, skip the CompositeRoot wrapper so that triggers can participate
  // in the parent Content's composite navigation context. The key propagation
  // guard is already omitted through `defaultProps` above.
  // Port note: whether the menu is nested never changes, so the branch is decided once.
  return (
    <NavigationMenuDismissContext value={dismissProps}>
      {nested ? (
        useRenderElement('ul', componentProps, {
          state,
          props,
          enabled: nested,
        })
      ) : (
        <CompositeRoot
          render={componentProps.render}
          class={componentProps.class}
          style={componentProps.style}
          state={state()}
          props={props()}
          loopFocus={false}
          orientation={orientation()}
          tag="ul"
        />
      )}
    </NavigationMenuDismissContext>
  );
}

export interface NavigationMenuListState {
  /**
   * If `true`, the popup is open.
   */
  open: boolean;
}

export interface NavigationMenuListProps extends BaseUIComponentProps<
  'ul',
  NavigationMenuListState
> {}

export namespace NavigationMenuList {
  export type State = NavigationMenuListState;
  export type Props = NavigationMenuListProps;
}
