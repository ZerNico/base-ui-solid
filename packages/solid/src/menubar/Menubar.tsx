import { createMemo, createSignal, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import {
  FloatingNode,
  FloatingTree,
  useFloatingNodeId,
  useFloatingTree,
} from '../floating-ui-solid';
import type { MenuRoot } from '../menu/root/MenuRoot';
import type { BaseUIComponentProps } from '../internals/types';
import { MenubarContext, useMenubarContext } from './MenubarContext';
import { CompositeRoot } from '../internals/composite/root/CompositeRoot';
import { useBaseUiId } from '../internals/useBaseUiId';
import type { MenuOpenEventDetails } from '../menu/utils/types';
import type { StateAttributesMapping } from '../internals/getStateAttributesProps';
import * as MenubarDataAttributes from './MenubarDataAttributes';
import { REASONS } from '../internals/reasons';
// Port note: mutable containers replace React refs.
const refObject = <T,>(current: T): RefObject<T> => ({ current });

const menubarStateAttributesMapping: StateAttributesMapping<MenubarState> = {
  hasSubmenuOpen(value) {
    return value ? { [MenubarDataAttributes.hasSubmenuOpen]: '' } : null;
  },
};

/**
 * The container for menus.
 *
 * Documentation: [Base UI Menubar](https://base-ui.com/react/components/menubar)
 */
export function Menubar(props: Menubar.Props) {
  const elementProps = omit(
    props,
    'orientation',
    'loopFocus',
    'render',
    'class',
    'modal',
    'disabled',
    'id',
    'style',
  );
  const orientation = () => props.orientation ?? 'horizontal';
  const modal = () => props.modal ?? true;
  const disabled = () => props.disabled ?? false;
  const [contentElement, setContentElement] = createSignal<HTMLElement | null>(null);
  const [hasSubmenuOpen, setHasSubmenuOpen] = createSignal(false);

  const generatedId = useBaseUiId();
  const id = () => (typeof props.id === 'string' ? props.id : generatedId);

  const state = createMemo<MenubarState>(() => ({
    orientation: orientation(),
    modal: modal(),
    hasSubmenuOpen: hasSubmenuOpen(),
  }));
  const allowMouseUpTriggerRef = refObject(false);
  // Port note: context getters retain prop and signal reactivity.
  const context: MenubarContext = {
    get contentElement() {
      return contentElement();
    },
    setContentElement,
    setHasSubmenuOpen,
    get hasSubmenuOpen() {
      return hasSubmenuOpen();
    },
    get modal() {
      return modal();
    },
    get disabled() {
      return disabled();
    },
    get orientation() {
      return orientation();
    },
    allowMouseUpTriggerRef,
    get rootId() {
      return id();
    },
  };

  return (
    <MenubarContext value={context}>
      <FloatingTree>
        <MenubarContent>
          <CompositeRoot
            render={props.render}
            class={props.class}
            style={props.style}
            state={state()}
            stateAttributesMapping={menubarStateAttributesMapping}
            refs={[setContentElement]}
            props={[{ role: 'menubar', id: id(), 'aria-orientation': orientation() }, elementProps]}
            orientation={orientation()}
            loopFocus={props.loopFocus ?? true}
            enableHomeAndEndKeys
            highlightItemOnHover={hasSubmenuOpen()}
          />
        </MenubarContent>
      </FloatingTree>
    </MenubarContext>
  );
}

function MenubarContent(props: { children?: JSX.Element | undefined }) {
  const nodeId = useFloatingNodeId();
  const { events: menuEvents } = useFloatingTree()!;
  const rootContext = useMenubarContext();

  useEffect(
    () => {
      function onSubmenuOpenChange(details: MenuOpenEventDetails) {
        if (!details.nodeId || details.parentNodeId !== nodeId) {
          return;
        }

        if (details.open) {
          if (!rootContext.hasSubmenuOpen) {
            rootContext.setHasSubmenuOpen(true);
          }
        } else if (
          details.reason !== REASONS.siblingOpen &&
          details.reason !== REASONS.listNavigation
        ) {
          rootContext.setHasSubmenuOpen(false);
        }
      }

      menuEvents.on('menuopenchange', onSubmenuOpenChange);

      return () => {
        menuEvents.off('menuopenchange', onSubmenuOpenChange);
      };
    },
    () => [menuEvents, nodeId, rootContext],
  );

  return <FloatingNode id={nodeId}>{props.children}</FloatingNode>;
}

export interface MenubarState {
  /**
   * The orientation of the menubar.
   */
  orientation: MenuRoot.Orientation;
  /**
   * Whether the menubar is modal.
   */
  modal: boolean;
  /**
   * Whether any submenu within the menubar is open.
   */
  hasSubmenuOpen: boolean;
}

export interface MenubarProps extends BaseUIComponentProps<'div', MenubarState> {
  /**
   * Whether the menubar is modal.
   * @default true
   */
  modal?: boolean | undefined;
  /**
   * Whether the whole menubar is disabled.
   * @default false
   */
  disabled?: boolean | undefined;
  /**
   * The orientation of the menubar.
   * @default 'horizontal'
   */
  orientation?: MenuRoot.Orientation | undefined;
  /**
   * Whether to loop keyboard focus back to the first item
   * when the end of the list is reached while using the arrow keys.
   * @default true
   */
  loopFocus?: boolean | undefined;
}

export namespace Menubar {
  export type State = MenubarState;
  export type Props = MenubarProps;
}
