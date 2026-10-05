import { createMemo, omit, onCleanup, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useId } from '@base-ui-solid/utils/useId';
import { inertValue } from '@base-ui-solid/utils/inertValue';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import type { BaseUIComponentProps } from '../../internals/types';
import { useRenderElement } from '../../internals/useRenderElement';
import { useNavigationMenuRootContext } from '../root/NavigationMenuRootContext';
import { FocusGuard } from '../../utils/FocusGuard';
import {
  getNextTabbable,
  getPreviousTabbable,
  isOutsideEvent,
  contains,
} from '../../floating-ui-solid/utils';
import { getEmptyRootContext } from '../../floating-ui-solid/utils/getEmptyRootContext';
import { useNavigationMenuPositionerContext } from '../positioner/NavigationMenuPositionerContext';

const EMPTY_ROOT_CONTEXT = getEmptyRootContext();

/**
 * Port note: returns a ref callback that assigns `refObject`, and resets it when the current owner
 * is disposed (React calls refs with `null` on unmount).
 */
function useGuardRef(refObject: RefObject<HTMLSpanElement | null>) {
  let element: HTMLSpanElement | null = null;
  onCleanup(() => {
    if (refObject.current === element) {
      refObject.current = null;
    }
  });
  return (node: HTMLSpanElement) => {
    element = node;
    refObject.current = node;
  };
}

/**
 * Port note: renders upstream's `<div ref={setViewportTargetElement}>`, and resets the element on
 * disposal like React's `null` ref call.
 */
function ViewportTarget(props: {
  setElement: (element: HTMLElement | null) => void;
  children?: JSX.Element | undefined;
}) {
  let element: HTMLDivElement | null = null;
  onCleanup(() => {
    if (element) {
      element = null;
      props.setElement(null);
    }
  });
  return (
    <div
      ref={(node) => {
        element = node;
        props.setElement(node);
      }}
    >
      {props.children}
    </div>
  );
}

function Guards(props: { children?: JSX.Element | undefined }) {
  const {
    beforeInsideRef,
    beforeOutsideRef,
    afterInsideRef,
    afterOutsideRef,
    positionerElement,
    viewportElement,
    floatingRootContext,
  } = useNavigationMenuRootContext();
  const hasPositioner = Boolean(useNavigationMenuPositionerContext(true));

  const referenceElement = () => positionerElement() || viewportElement();

  // Port note: keep the viewport target mounted while its trigger context arrives.
  // Remounting it in a Show branch can let the old ref cleanup clear the new target
  // after Solid assigns it, moving content beyond the inside focus guards.
  return (
    <>
      <Show when={floatingRootContext() || hasPositioner}>
        {(_) => (
          <FocusGuard
            ref={useGuardRef(beforeInsideRef)}
            onFocusIn={(event) => {
              const reference = referenceElement();
              if (reference && isOutsideEvent(event, reference)) {
                getNextTabbable(reference)?.focus();
              } else {
                beforeOutsideRef.current?.focus();
              }
            }}
          />
        )}
      </Show>
      {props.children}
      <Show when={floatingRootContext() || hasPositioner}>
        {(_) => (
          <FocusGuard
            ref={useGuardRef(afterInsideRef)}
            onFocusIn={(event) => {
              const reference = referenceElement();
              if (reference && isOutsideEvent(event, reference)) {
                getPreviousTabbable(reference)?.focus();
              } else {
                afterOutsideRef.current?.focus();
              }
            }}
          />
        )}
      </Show>
    </>
  );
}

/**
 * The clipping viewport of the navigation menu's current content.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Navigation Menu](https://base-ui-solid.pages.dev/solid/components/navigation-menu)
 */
export function NavigationMenuViewport(componentProps: NavigationMenuViewport.Props) {
  const elementProps = omit(componentProps, 'render', 'class', 'style', 'children', 'id');

  const generatedId = useId();
  const id = () => componentProps.id ?? generatedId;

  const {
    setViewportElement,
    setViewportTargetElement,
    floatingRootContext,
    prevTriggerElementRef,
    viewportInert,
    setViewportInert,
  } = useNavigationMenuRootContext();

  const positioning = useNavigationMenuPositionerContext(true);
  const hasPositioner = Boolean(positioning);
  // Port note: the active trigger's store replaces the root context, so the subscription follows it.
  const domReferenceState = createMemo(() =>
    (floatingRootContext() || EMPTY_ROOT_CONTEXT).useState('domReferenceElement'),
  );
  const domReference = () => domReferenceState()();

  useIsoLayoutEffect(
    ([domReferenceValue]) => {
      if (domReferenceValue) {
        prevTriggerElementRef.current = domReferenceValue;
      }
    },
    () => [domReference(), prevTriggerElementRef],
  );

  // Port note: a stable object provides the `children`, so they're created once.
  const childrenProps = {
    get children() {
      return (
        <>
          {hasPositioner ? (
            componentProps.children
          ) : (
            <Guards>
              <ViewportTarget setElement={setViewportTargetElement}>
                {componentProps.children}
              </ViewportTarget>
            </Guards>
          )}
        </>
      );
    },
  };

  // Port note: React's `onBlur` bubbles, so it's `onFocusOut`.
  const handleFocusOut = (event: FocusEvent) => {
    const relatedTarget = event.relatedTarget as Element | null;
    const currentTarget = event.currentTarget as Element;

    // If focus is leaving the viewport and not going to the trigger, make it inert
    // to prevent a focus loop.
    if (
      relatedTarget &&
      !contains(currentTarget, relatedTarget) &&
      relatedTarget !== domReference()
    ) {
      setViewportInert(true);
    }
  };

  const renderViewport = () =>
    useRenderElement('div', componentProps, {
      ref: setViewportElement,
      props: () => [
        {
          id: id(),
          onFocusOut: handleFocusOut,
          ...(!hasPositioner && viewportInert() && { inert: inertValue(true) }),
        },
        childrenProps,
        elementProps,
      ],
    });

  return <>{hasPositioner ? <Guards>{renderViewport()}</Guards> : renderViewport()}</>;
}

export interface NavigationMenuViewportState {}

export interface NavigationMenuViewportProps extends BaseUIComponentProps<
  'div',
  NavigationMenuViewportState
> {}

export namespace NavigationMenuViewport {
  export type State = NavigationMenuViewportState;
  export type Props = NavigationMenuViewportProps;
}
