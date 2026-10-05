import { createMemo, createSignal, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { isElement } from '@floating-ui/utils/dom';
import { EMPTY_OBJECT } from '@base-ui-solid/utils/empty';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useAnchorPositioning } from '../../internals/useAnchorPositioning';
import type {
  Side,
  Align,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import { POPUP_COLLISION_AVOIDANCE } from '../../internals/constants';
import { ToastPositionerContext } from './ToastPositionerContext';
import { useFloatingRootContext } from '../../floating-ui-solid';
import { NOOP } from '../../internals/noop';
import type { ToastObject } from '../useToastManager';
import { useToastProviderContext } from '../provider/ToastProviderContext';
import { usePositioner } from '../../utils/usePositioner';
import * as ToastRootCssVars from '../root/ToastRootCssVars';

/**
 * Positions the toast against the anchor.
 * Renders a `<div>` element.
 *
 * Documentation: [Base UI Toast](https://base-ui-solid.pages.dev/solid/components/toast)
 */
export function ToastPositioner(componentProps: ToastPositioner.Props): JSX.Element {
  const elementProps = omit(
    componentProps,
    'toast',
    'render',
    'class',
    'anchor',
    'positionMethod',
    'side',
    'align',
    'sideOffset',
    'alignOffset',
    'collisionBoundary',
    'collisionPadding',
    'arrowPadding',
    'sticky',
    'disableAnchorTracking',
    'collisionAvoidance',
    'style',
  );

  const toast = () => componentProps.toast;

  const store = useToastProviderContext();

  const positionerProps = () =>
    (toast().positionerProps ?? EMPTY_OBJECT) as NonNullable<ToastObject<any>['positionerProps']>;

  // Port note: upstream's destructuring defaults (`anchor = positionerProps.anchor`) only apply
  // when the prop is `undefined`.
  const anchorProp = () =>
    componentProps.anchor === undefined ? positionerProps().anchor : componentProps.anchor;

  const [positionerElement, setPositionerElement] = createSignal<HTMLDivElement | null>(null, {
    ownedWrite: true,
  });

  const domIndex = store.useState('toastIndex', () => toast().id);
  const visibleIndex = store.useState('toastVisibleIndex', () => toast().id);

  const anchor = () => {
    const value = anchorProp();
    return isElement(value) ? value : null;
  };

  const floatingRootContext = useFloatingRootContext({
    open: true,
    onOpenChange: NOOP,
    elements: {
      get floating() {
        return positionerElement();
      },
      get reference() {
        return anchor();
      },
    },
  });

  const positioning = useAnchorPositioning({
    get anchor() {
      return anchor();
    },
    get positionMethod() {
      return componentProps.positionMethod ?? positionerProps().positionMethod ?? 'absolute';
    },
    floatingRootContext,
    mounted: true,
    get side() {
      return componentProps.side ?? positionerProps().side ?? 'top';
    },
    get sideOffset() {
      return componentProps.sideOffset ?? positionerProps().sideOffset ?? 0;
    },
    get align() {
      return componentProps.align ?? positionerProps().align ?? 'center';
    },
    get alignOffset() {
      return componentProps.alignOffset ?? positionerProps().alignOffset ?? 0;
    },
    get collisionBoundary() {
      return (
        componentProps.collisionBoundary ??
        positionerProps().collisionBoundary ??
        'clipping-ancestors'
      );
    },
    get collisionPadding() {
      return componentProps.collisionPadding ?? positionerProps().collisionPadding ?? 5;
    },
    get sticky() {
      return componentProps.sticky ?? positionerProps().sticky ?? false;
    },
    get arrowPadding() {
      return componentProps.arrowPadding ?? positionerProps().arrowPadding ?? 5;
    },
    get disableAnchorTracking() {
      return (
        componentProps.disableAnchorTracking ?? positionerProps().disableAnchorTracking ?? false
      );
    },
    keepMounted: true,
    get collisionAvoidance() {
      return (
        componentProps.collisionAvoidance ??
        positionerProps().collisionAvoidance ??
        POPUP_COLLISION_AVOIDANCE
      );
    },
  });

  const state = createMemo<ToastPositionerState>(
    () => ({
      side: positioning.side,
      align: positioning.align,
      anchorHidden: positioning.anchorHidden,
    }),
    { equals: fastObjectShallowCompare },
  );

  return (
    <ToastPositionerContext value={positioning}>
      {usePositioner(componentProps, state, {
        get styles() {
          return {
            ...positioning.positionerStyles,
            [ToastRootCssVars.index as string]:
              toast().transitionStatus === 'ending' ? domIndex() : visibleIndex(),
          } as JSX.CSSProperties;
        },
        get transitionStatus() {
          return toast().transitionStatus;
        },
        props: elementProps as HTMLProps<HTMLDivElement>,
        refs: [setPositionerElement],
      })}
    </ToastPositionerContext>
  );
}

export interface ToastPositionerState {
  /**
   * The side of the anchor the component is placed on.
   */
  side: Side;
  /**
   * The alignment of the component relative to the anchor.
   */
  align: Align;
  /**
   * Whether the anchor element is hidden.
   */
  anchorHidden: boolean;
}

export interface ToastPositionerProps
  extends
    BaseUIComponentProps<'div', ToastPositionerState>,
    Omit<UseAnchorPositioningSharedParameters, 'side' | 'anchor'> {
  /**
   * An element to position the toast against.
   */
  anchor?: Element | null | undefined;
  /**
   * Which side of the anchor element to align the toast against.
   * May automatically change to avoid collisions.
   * @default 'top'
   */
  side?: Side | undefined;
  /**
   * The toast object associated with the positioner.
   */
  toast: ToastObject<any>;
}

export namespace ToastPositioner {
  export type State = ToastPositionerState;
  export type Props = ToastPositionerProps;
}
