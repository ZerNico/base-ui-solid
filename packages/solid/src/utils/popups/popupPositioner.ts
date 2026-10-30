import { createMemo, omit } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { useAnchorPositioning } from '../../internals/useAnchorPositioning';
import { POPUP_COLLISION_AVOIDANCE } from '../../internals/constants';
import type {
  Align,
  Side,
  UseAnchorPositioningParameters,
  UseAnchorPositioningReturnValue,
  UseAnchorPositioningSharedParameters,
} from '../../internals/useAnchorPositioning';
import type { BaseUIComponentProps, HTMLProps } from '../../internals/types';
import type { AdaptiveOriginMiddleware } from './positioning/adaptiveOriginConstants';
import { usePositioner } from './positioning/usePositioner';
import type { PositioningInteractionStore } from './types';

/**
 * The state every popup Positioner shares.
 */
export interface PopupPositionerState {
  open: boolean;
  side: Side;
  align: Align;
  anchorHidden: boolean;
  instant: string | undefined;
}

/**
 * Port note: typed by what the hook reads, since a `SolidStore` with more state isn't assignable
 * to one with less (its listeners take the state).
 */
type PopupPositionerStore = PositioningInteractionStore & {
  useState(key: 'mounted'): Accessor<boolean>;
  useState(key: 'instantType'): Accessor<string | undefined>;
  useState(key: 'adaptiveOrigin'): Accessor<AdaptiveOriginMiddleware | undefined>;
  useStateSetter(key: 'positionerElement'): (value: HTMLElement | null) => void;
};

type PositioningOverrides = Partial<
  Omit<
    UseAnchorPositioningParameters,
    'interactionStore' | 'mounted' | 'keepMounted' | 'adaptiveOrigin'
  >
>;

/**
 * Port note: read lazily (`options.x`). `positioning` is read once: pass an object with getters
 * for reactive values. `state` and `inert` are accessors.
 */
export interface UsePopupPositionerOptions<State extends PopupPositionerState> {
  /**
   * Whether the popup stays mounted while closed.
   */
  keepMounted: Accessor<boolean>;
  /**
   * Positioning parameters that replace the props, such as values derived from the popup's parent.
   */
  positioning?: PositioningOverrides | undefined;
  /**
   * State that the part adds to or changes in the shared state.
   */
  state?:
    Accessor<Omit<State, keyof PopupPositionerState> & Partial<PopupPositionerState>> | undefined;
  /**
   * Whether the positioner ignores pointer events.
   * @default !open
   */
  inert?: Accessor<boolean> | undefined;
}

/**
 * Port note: `element` renders the positioner element when called, so the part calls it inside
 * its providers (Solid creates the element eagerly, under the owner that calls it). `open` and
 * `mounted` are accessors.
 */
export interface UsePopupPositionerReturnValue {
  element: () => JSX.Element;
  positioning: UseAnchorPositioningReturnValue;
  open: Accessor<boolean>;
  mounted: Accessor<boolean>;
}

// The props the part passes on to positioning, which an override replaces even when `undefined`.
const POSITIONING_PROPS = [
  'anchor',
  'positionMethod',
  'side',
  'sideOffset',
  'align',
  'alignOffset',
  'arrowPadding',
  'collisionBoundary',
  'collisionPadding',
  'sticky',
  'disableAnchorTracking',
] as const;

// Positioning parameters only an override sets.
const OVERRIDE_ONLY_PARAMETERS = ['nodeId', 'inline', 'shift', 'externalTree', 'lazyFlip'] as const;

/**
 * Runs what every popup Positioner does: it positions the popup against its anchor, registers the
 * positioner element, and renders it with the shared state.
 * The part adds what is specific to its popup, such as a backdrop or a scroll lock.
 */
export function usePopupPositioner<State extends PopupPositionerState>(
  store: PopupPositionerStore,
  componentProps: BaseUIComponentProps<'div', State> & UseAnchorPositioningSharedParameters,
  options: UsePopupPositionerOptions<State>,
): UsePopupPositionerReturnValue {
  const elementProps = omit(
    componentProps,
    'render',
    'class',
    'style',
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
  );

  const positioningOverrides = options.positioning;

  const open = store.useState('open');
  const mounted = store.useState('mounted');
  const transitionStatus = store.useState('transitionStatus');
  const instantType = store.useState('instantType');
  const adaptiveOrigin = store.useState('adaptiveOrigin');

  const parameters = {
    interactionStore: store,
    get mounted() {
      return mounted();
    },
    get keepMounted() {
      return options.keepMounted();
    },
    get collisionAvoidance() {
      if (positioningOverrides && 'collisionAvoidance' in positioningOverrides) {
        return positioningOverrides.collisionAvoidance;
      }
      return componentProps.collisionAvoidance ?? POPUP_COLLISION_AVOIDANCE;
    },
    get adaptiveOrigin() {
      return adaptiveOrigin();
    },
  } as UseAnchorPositioningParameters;

  // Port note: upstream spreads the overrides over the props. Getters keep both reactive.
  for (const key of POSITIONING_PROPS) {
    Object.defineProperty(parameters, key, {
      enumerable: true,
      get() {
        return positioningOverrides && key in positioningOverrides
          ? positioningOverrides[key]
          : componentProps[key];
      },
    });
  }
  for (const key of OVERRIDE_ONLY_PARAMETERS) {
    Object.defineProperty(parameters, key, {
      enumerable: true,
      get() {
        return positioningOverrides?.[key];
      },
    });
  }

  const positioning = useAnchorPositioning(parameters);

  // The part's state is compared by its values.
  const state = createMemo(
    () =>
      ({
        open: open(),
        side: positioning.side,
        align: positioning.align,
        anchorHidden: positioning.anchorHidden,
        instant: instantType(),
        ...options.state?.(),
      }) as State,
    { equals: fastObjectShallowCompare },
  );

  const element = () =>
    usePositioner(componentProps, state, {
      get styles() {
        return positioning.positionerStyles;
      },
      get transitionStatus() {
        return transitionStatus();
      },
      // Port note: `elementProps`' handlers take `BaseUIEvent`s.
      props: elementProps as HTMLProps<HTMLDivElement>,
      refs: store.useStateSetter('positionerElement'),
      get hidden() {
        return !mounted();
      },
      get inert() {
        return options.inert ? options.inert() : !open();
      },
    });

  return { element, positioning, open, mounted };
}
