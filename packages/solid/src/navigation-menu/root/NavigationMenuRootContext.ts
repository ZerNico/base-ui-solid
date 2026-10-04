import { createContext, useContext } from 'solid-js';
import type { Accessor } from 'solid-js';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { FloatingRootContext } from '../../floating-ui-solid';
import type { TransitionStatus } from '../../internals/useTransitionStatus';
import type { NavigationMenuRoot } from './NavigationMenuRoot';

export type NavigationMenuPopupAutoSizeResetState = {
  abortController: AbortController | null;
  owner: any;
};

/**
 * Port note: reactive values are accessors; setters, refs and `nested` are stable.
 */
export interface NavigationMenuRootContext<Value = any> {
  open: Accessor<boolean>;
  value: Accessor<NavigationMenuRoot.Value<Value>>;
  setValue: (
    value: NavigationMenuRoot.Value<Value>,
    eventDetails: Omit<NavigationMenuRoot.ChangeEventDetails, 'preventUnmountOnClose'>,
  ) => void;
  transitionStatus: Accessor<TransitionStatus>;
  mounted: Accessor<boolean>;
  popupElement: Accessor<HTMLElement | null>;
  setPopupElement: (element: HTMLElement | null) => void;
  positionerElement: Accessor<HTMLElement | null>;
  setPositionerElement: (element: HTMLElement | null) => void;
  viewportElement: Accessor<HTMLElement | null>;
  setViewportElement: (element: HTMLElement | null) => void;
  viewportTargetElement: Accessor<HTMLElement | null>;
  setViewportTargetElement: (element: HTMLElement | null) => void;
  activationDirection: Accessor<'left' | 'right' | 'up' | 'down' | null>;
  setActivationDirection: (direction: 'left' | 'right' | 'up' | 'down' | null) => void;
  floatingRootContext: Accessor<FloatingRootContext | undefined>;
  setFloatingRootContext: (context: FloatingRootContext | undefined) => void;
  currentContentRef: RefObject<HTMLDivElement | null>;
  nested: boolean;
  rootRef: RefObject<HTMLDivElement | null>;
  beforeInsideRef: RefObject<HTMLSpanElement | null>;
  afterInsideRef: RefObject<HTMLSpanElement | null>;
  beforeOutsideRef: RefObject<HTMLSpanElement | null>;
  afterOutsideRef: RefObject<HTMLSpanElement | null>;
  prevTriggerElementRef: RefObject<Element | null | undefined>;
  popupAutoSizeResetRef: RefObject<NavigationMenuPopupAutoSizeResetState>;
  delay: Accessor<number>;
  closeDelay: Accessor<number>;
  orientation: Accessor<'horizontal' | 'vertical'>;
  viewportInert: Accessor<boolean>;
  setViewportInert: (inert: boolean) => void;
}

export const NavigationMenuRootContext = createContext<NavigationMenuRootContext<any> | null>(null);

if (IS_DEV) {
  // Port note: Solid contexts have no `displayName`; it's set for parity with upstream.
  (NavigationMenuRootContext as { displayName?: string | undefined }).displayName =
    'NavigationMenuRootContext';
}

function useNavigationMenuRootContext<Value = any>(
  optional?: false,
): NavigationMenuRootContext<Value>;
function useNavigationMenuRootContext<Value = any>(
  optional: true,
): NavigationMenuRootContext<Value> | undefined;
function useNavigationMenuRootContext<Value = any>(optional?: boolean) {
  const context = (useContext(NavigationMenuRootContext) ?? undefined) as
    NavigationMenuRootContext<Value> | undefined;
  if (context === undefined && !optional) {
    throw new Error(
      'Base UI: NavigationMenuRootContext is missing. Navigation Menu parts must be placed within <NavigationMenu.Root>.',
    );
  }
  return context;
}

export const NavigationMenuTreeContext = createContext<string | null>(null);

function useNavigationMenuTreeContext() {
  return useContext(NavigationMenuTreeContext) ?? undefined;
}

export { useNavigationMenuRootContext, useNavigationMenuTreeContext };
