import { useBaseUIFloating } from '../../floating-ui-react/hooks/useFloating';
import { useFloatingRootContext } from '../../floating-ui-react/hooks/useFloatingRootContext';
import type { UseFloatingOptions } from '../../floating-ui-react/types';
import { useAnchorPositioningWithHook } from '../../internals/useAnchorPositioning';
import type {
  UseAnchorPositioningParameters,
  UseAnchorPositioningReturnValue,
} from '../../internals/useAnchorPositioning';

function useFloatingWithFallbackStore(options: UseFloatingOptions) {
  const fallbackStore = useFloatingRootContext(options);
  // Port note: `options` holds getters, so they're forwarded instead of spread, and the root
  // context is read reactively by `useBaseUIFloating`.
  return useBaseUIFloating(
    Object.create(options, {
      rootContext: {
        get() {
          return options.rootContext || fallbackStore;
        },
      },
    }),
  );
}

/**
 * Positioning path for the Navigation Menu, whose active trigger supplies its root store after the
 * positioner has already rendered.
 */
export function useNavigationMenuAnchorPositioning(
  params: UseAnchorPositioningParameters,
): UseAnchorPositioningReturnValue {
  return useAnchorPositioningWithHook(params, useFloatingWithFallbackStore);
}
