import { createMemo, createSignal, untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { addEventListener } from '@base-ui-solid/utils/addEventListener';
import { useEffect, useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { AnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { Timeout } from '@base-ui-solid/utils/useTimeout';
import { useTrackedRef } from '@base-ui-solid/utils/useTrackedRef';
import { warn } from '@base-ui-solid/utils/warn';
import { IS_DEV } from '@base-ui-solid/utils/isDev';
import { ownerWindow } from '@base-ui-solid/utils/owner';
import { onCleanupWithWrites } from '@base-ui-solid/utils/cleanup';
import { createChangeEventDetails } from '../../internals/createBaseUIEventDetails';
import { REASONS } from '../../internals/reasons';
import { useOpenChangeComplete } from '../../internals/useOpenChangeComplete';
import { useAnimationsFinished } from '../../internals/useAnimationsFinished';
import * as CollapsiblePanelDataAttributes from './CollapsiblePanelDataAttributes';
import type { CollapsibleRoot } from '../root/CollapsibleRoot';
import type { TransitionStatus } from '../../internals/useTransitionStatus';

type AnimationType = 'css-transition' | 'css-animation' | 'none';

interface Dimensions {
  height: number | undefined;
  width: number | undefined;
}

const EMPTY_DIMENSIONS: Dimensions = {
  height: undefined,
  width: undefined,
};

// Port note: upstream's `React.Activity` handling (suppressing replayed keyframe animations when
// an Activity boundary resumes) has no Solid equivalent and is not ported.
export function useCollapsiblePanel(
  parameters: UseCollapsiblePanelParameters,
): UseCollapsiblePanelReturnValue {
  const {
    hiddenUntilFound,
    id: idParam,
    keepMounted,
    mounted,
    onOpenChange,
    open,
    setMounted,
    setOpen,
    transitionStatus,
    cssVariables,
    style,
  } = parameters;

  let panelElementRef: HTMLDivElement | null = null;
  // A `render` function can swap the element out without the ref being detached, so a
  // disconnected element counts as unmounted (React would have reset the ref to `null`).
  const getPanel = () => (panelElementRef?.isConnected ? panelElementRef : null);
  const animationTypeRef = useTrackedRef<AnimationType | null>(null);
  // Port note: upstream keeps the measured size in state and renders it as the CSS variables. It's
  // only used by the variables, so here the measurement writes them to the element directly: a
  // size read from the DOM after it rendered isn't derivable, and copying it into a signal from
  // the measuring effect would re-render the panel to apply it (Solid's `EFFECT_RELAY_TEAR`).
  let dimensions: Dimensions = EMPTY_DIMENSIONS;
  const lastMeasuredDimensionsRef = useTrackedRef<Dimensions>(EMPTY_DIMENSIONS);
  // `beforematch` should reveal the matched content immediately, so the next
  // open cycle skips author-defined motion once and then returns to normal.
  let shouldSkipNextOpen = false;
  // Keyframe mount animations on initially open panels cause a visible layout
  // shift during the server-rendered first paint, so suppress that first open
  // lifecycle until the panel has been closed once.
  const shouldPreventMountAnimationRef = useTrackedRef(untrack(open));
  // Some open paths intentionally bypass motion, but the shared root transition
  // status still advances asynchronously. Override the panel to idle so its data
  // attributes and dimension cleanup reflect the immediate open state.
  // Port note: upstream clears it from a layout effect once the root transition state leaves
  // `starting`. A writable memo applies that rule in the same flush, so the effect doesn't write
  // its own input.
  const [forcePanelIdle, setForcePanelIdle] = createSignal<boolean>((prev) => {
    const status = transitionStatus();
    return (prev ?? false) && status === 'starting';
  });
  let pendingTemporaryStyleRestore: (() => void) | null = null;

  // Only used to handle panel close
  const runOnceCloseAnimationsFinish = useAnimationsFinished(getPanel);

  const hidden = () => !open() && !mounted();
  const panelTransitionStatus = (): TransitionStatus =>
    forcePanelIdle() ? 'idle' : transitionStatus();
  const shouldPreventOpenAnimation = createMemo(
    () => open() && shouldPreventMountAnimationRef.current,
  );
  function getRenderedDimensions() {
    return !untrack(open) &&
      untrack(mounted) &&
      // This fallback only restores a previously measured pixel size after the live
      // dimensions have been reset back to `auto`.
      animationTypeRef.current === 'css-animation' &&
      dimensions.height === undefined &&
      dimensions.width === undefined
      ? lastMeasuredDimensionsRef.current
      : dimensions;
  }

  // A variable set by the `style` prop wins, as it did when upstream merges it after the size.
  function applyDimensions() {
    const panel = panelElementRef;
    if (!panel) {
      return;
    }
    const { height, width } = getRenderedDimensions();
    const styleValue = untrack(style);
    if (!setsStyleProperty(styleValue, cssVariables.height)) {
      panel.style.setProperty(cssVariables.height, height === undefined ? 'auto' : `${height}px`);
    }
    if (!setsStyleProperty(styleValue, cssVariables.width)) {
      panel.style.setProperty(cssVariables.width, width === undefined ? 'auto' : `${width}px`);
    }
  }

  // The rendered size also depends on the open state (see `getRenderedDimensions`).
  useIsoLayoutEffect(
    () => {
      applyDimensions();
    },
    () => [open(), mounted()],
  );

  const shouldPersistHiddenTransitionStyles = () =>
    hiddenUntilFound() && hidden() && animationTypeRef.current !== 'css-animation';

  // Most measured dimensions are reused later when CSS keyframe closes need a
  // pixel size after the rendered dimensions have been reset back to `auto`.
  // Passing `false` is only for clearing the current dimensions state.
  function setDimensions(nextDimensions: Dimensions, shouldCacheMeasurement: boolean = true) {
    if (shouldCacheMeasurement) {
      lastMeasuredDimensionsRef.current = nextDimensions;
    }

    dimensions = nextDimensions;
    applyDimensions();
  }

  function restorePendingTemporaryStyle() {
    pendingTemporaryStyleRestore?.();
    pendingTemporaryStyleRestore = null;
  }

  function setPendingTemporaryStyleRestore(restore: () => void) {
    restorePendingTemporaryStyle();
    pendingTemporaryStyleRestore = () => {
      pendingTemporaryStyleRestore = null;
      restore();
    };
  }

  onCleanupWithWrites(() => {
    restorePendingTemporaryStyle();
  });

  // Port note: the effect reads the panel's computed style, so it is a measuring effect. It runs
  // once more after its own `setMounted(false)`, which at most repeats the same writes.
  useIsoLayoutEffect(
    ([isMounted, isOpen, preventOpenAnimation, status]) => {
      // A render function can remove the panel on close. Clear one-shot open animation
      // suppression even without an element, so the next open animates normally.
      if (!isOpen) {
        shouldPreventMountAnimationRef.current = false;
      }

      const panel = getPanel();
      if (!panel) {
        return undefined;
      }

      // `beforematch` can temporarily force a `0s` motion duration so the matched
      // content reveals immediately. Restore the authored duration before detecting
      // the next close animation type, otherwise that first close is misread as
      // "no motion" and the close transition or keyframe gets skipped.
      if (!isOpen && pendingTemporaryStyleRestore) {
        restorePendingTemporaryStyle();
      }

      const animationType = getAnimationType(panel, preventOpenAnimation);
      animationTypeRef.current = animationType;

      // Initially open keyframe panels skip their first paint animation to avoid
      // layout shift, but we still need to cache the expanded size so the first
      // close animation can start from pixels instead of `auto`.
      if (
        isOpen &&
        status === 'idle' &&
        shouldPreventMountAnimationRef.current &&
        animationType === 'css-animation'
      ) {
        lastMeasuredDimensionsRef.current = getDimensions(panel);
        return undefined;
      }

      // Handle the opening pass: measure the expanded size and, when necessary,
      // neutralize author-defined motion so the panel can open immediately.
      if (isOpen && status === 'starting') {
        // `beforematch` opens should reveal the panel immediately so find-in-page
        // does not wait for the author-defined transition or animation to finish.
        const skipNextOpen = shouldSkipNextOpen;
        shouldSkipNextOpen = false;

        if (animationType === 'none') {
          setDimensions(getDimensions(panel));
          setForcePanelIdle(true);
          return undefined;
        }

        if (animationType === 'css-transition') {
          const restoreLayoutStyles = resetLayoutStyles(panel);
          setDimensions(getDimensions(panel));

          if (!skipNextOpen) {
            return restoreLayoutStyles;
          }

          const restoreTransitionDuration = setTemporaryStyle(panel, 'transition-duration', '0s');
          setPendingTemporaryStyleRestore(restoreTransitionDuration);
          setForcePanelIdle(true);
          return restoreLayoutStyles;
        }

        setDimensions(getDimensions(panel));

        const restoreAnimationName = setTemporaryStyle(panel, 'animation-name', 'none');
        if (!skipNextOpen) {
          restoreAnimationName();
          return undefined;
        }

        const restoreAnimationDuration = setTemporaryStyle(panel, 'animation-duration', '0s');

        restoreAnimationName();
        setPendingTemporaryStyleRestore(restoreAnimationDuration);
        setForcePanelIdle(true);

        return undefined;
      }

      // Capture the current size as soon as close is requested, before the
      // deferred ending phase applies closed styles. This keeps close transitions
      // starting from a measured pixel value, including interrupted opens.
      if (!isOpen && isMounted && (status === 'idle' || status === 'starting')) {
        if (animationType === 'none') {
          setDimensions(EMPTY_DIMENSIONS, false);
          setMounted(false);
          return undefined;
        }

        setDimensions(getDimensions(panel));
        return undefined;
      }

      if (status !== 'ending') {
        return undefined;
      }

      // Reachable when `transitionStatus` already flipped to `ending` before this effect ran, so
      // the close branch above was skipped. Without motion there is nothing to wait for, so unmount
      // here instead of deferring to the animation-finished path below.
      if (animationType === 'none') {
        setMounted(false);
        return undefined;
      }

      const nextDimensions = getDimensions(panel);
      const hasMeasuredSize = nextDimensions.height > 0 || nextDimensions.width > 0;

      if (!hasMeasuredSize) {
        setMounted(false);
        return undefined;
      }

      setDimensions(nextDimensions);

      if (animationType === 'css-animation') {
        const restoreAnimationName = setTemporaryStyle(panel, 'animation-name', 'none');
        restoreAnimationName();
      }

      return undefined;
    },
    () => [mounted(), open(), shouldPreventOpenAnimation(), transitionStatus()],
    { name: IS_DEV ? 'BaseUI.useCollapsiblePanel.measure' : undefined, measuring: true },
  );

  useOpenChangeComplete({
    enabled: () => open() && mounted() && panelTransitionStatus() === 'idle',
    open: () => true,
    ref: getPanel,
    onComplete() {
      // An animation's `finished` microtask can resolve after `open` was set to `false` but
      // before the effect cleanup aborted this callback, so re-check the latest value here.
      // Clearing the measured size in that window would make the close transition start from
      // `height: 0` instead of the expanded pixel height.
      if (!untrack(open)) {
        return;
      }

      setDimensions(EMPTY_DIMENSIONS, false);
    },
  });

  // Closing panels need extra sequencing beyond `useOpenChangeComplete`.
  // This effect runs after the `ending` update has been applied, so
  // `[data-ending-style]` is already present. Chrome can still register the
  // exit transition one frame later when an Accordion closes one item while
  // opening another, so wait one frame before watching animations.
  // See https://github.com/mui/base-ui/issues/3099
  useEffect(
    ([isOpen, isMounted, status]) => {
      if (isOpen || !isMounted || status !== 'ending') {
        return undefined;
      }

      const panel = getPanel();
      if (!panel) {
        // A render function can drop the panel element while it closes. There is nothing left
        // to animate, so finish closing instead of staying in the ending phase.
        setMounted(false);
        setDimensions(EMPTY_DIMENSIONS, false);
        return undefined;
      }

      const abortController = new AbortController();
      let endingStyleFrame = -1;

      function handleComplete() {
        // Unmounting a panel that has already reopened would drop it from the DOM.
        if (untrack(open)) {
          return;
        }

        setMounted(false);
        setDimensions(EMPTY_DIMENSIONS, false);
      }

      endingStyleFrame = AnimationFrame.request(() => {
        runOnceCloseAnimationsFinish(handleComplete, abortController.signal);
      });

      return () => {
        AnimationFrame.cancel(endingStyleFrame);
        abortController.abort();
      };
    },
    () => [open(), mounted(), panelTransitionStatus()],
  );

  // Port note: React can't render `hidden="until-found"`, so upstream renders a boolean `hidden`
  // (`display: none`) and patches the attribute here. The layout effect above reads the computed
  // style in between, so the panel is briefly styled as `display: none`, which cancels its
  // running CSS transitions: a panel that becomes hidden doesn't keep a close transition running.
  // Solid renders `until-found` directly, so go through `display: none` explicitly.
  useIsoLayoutEffect(
    ([isHidden, isHiddenUntilFound]) => {
      const panel = getPanel();

      if (!panel || !isHiddenUntilFound || !isHidden) {
        return;
      }

      panel.setAttribute('hidden', '');
      // Reading a computed value forces a style recalculation.
      void ownerWindow(panel).getComputedStyle(panel).display;
      panel.setAttribute('hidden', 'until-found');
    },
    () => [hidden(), hiddenUntilFound()],
  );

  useEffect(
    function registerBeforeMatchListener() {
      const panel = getPanel();
      if (!panel) {
        return undefined;
      }

      const revealDecisionTimeout = Timeout.create();
      let revertRevealFrame = -1;

      // Reverting must wait until the browser has measured the match, and the
      // renderer cannot do it: it keeps rendering the same `hidden` and
      // `data-starting-style` props while the panel stays closed, so it never rewrites
      // attributes that were changed behind its back (the browser removes `hidden` as
      // part of the reveal).
      //
      // Whether the open arrived is decided in a task, not a frame: Solid applies the
      // `setOpen` update in a microtask, so it has landed by the time the timeout runs.
      // When the consumer ignores the open, it never lands and the decision holds. The
      // DOM revert then runs in a frame so it stays atomic with respect to paint.
      const scheduleRevealRevert = (
        revertSkippedMotion: boolean,
        restoreStartingStyle: boolean,
      ) => {
        revealDecisionTimeout.start(0, () => {
          if (untrack(open)) {
            return;
          }

          revertRevealFrame = AnimationFrame.request(() => {
            if (untrack(open)) {
              return;
            }

            if (revertSkippedMotion) {
              // The open never happened, so the next one is an ordinary open that
              // should keep its author-defined motion.
              shouldSkipNextOpen = false;
            }

            if (restoreStartingStyle) {
              panel.setAttribute(CollapsiblePanelDataAttributes.startingStyle, '');
            }

            panel.setAttribute('hidden', 'until-found');
          });
        });
      };

      const handleBeforeMatch = (event: Event) => {
        const eventDetails = createChangeEventDetails(REASONS.none, event);

        onOpenChange(true, eventDetails);

        if (eventDetails.isCanceled) {
          // A canceled reveal means the panel must stay hidden, so undo the
          // browser's removal of `hidden` and keep the content searchable.
          scheduleRevealRevert(false, false);
          return;
        }

        shouldSkipNextOpen = true;

        // The browser removes `hidden` and measures the match in the same task that
        // dispatches this event, while the state update below only lands in a
        // later microtask. Panels kept collapsed by persisted starting styles would still
        // be zero-sized at that point and the match highlight is dropped, so drop
        // those styles synchronously here.
        const hadStartingStyle = panel.hasAttribute(CollapsiblePanelDataAttributes.startingStyle);
        panel.removeAttribute(CollapsiblePanelDataAttributes.startingStyle);

        setOpen(true);

        // A controlled panel whose `onOpenChange` is ignored never receives the open
        // state, so return it to the fully closed state once the browser has measured.
        scheduleRevealRevert(true, hadStartingStyle);
      };

      const cleanupBeforeMatchListener = addEventListener(panel, 'beforematch', handleBeforeMatch);

      return () => {
        revealDecisionTimeout.clear();
        AnimationFrame.cancel(revertRevealFrame);
        cleanupBeforeMatchListener();
      };
    },
    () => [],
  );

  const shouldRender = () => keepMounted() || hiddenUntilFound() || mounted() || open();

  return {
    applyDimensions,
    props: () => ({
      ...(shouldPersistHiddenTransitionStyles()
        ? { [CollapsiblePanelDataAttributes.startingStyle]: '' }
        : undefined),
      // Solid sets `hidden="until-found"` as is (React coerces it to a boolean, so upstream
      // patches the attribute in an effect).
      hidden: hiddenUntilFound() && hidden() ? 'until-found' : hidden(),
      id: idParam(),
    }),
    ref: (element: HTMLDivElement | null) => {
      panelElementRef = element;
      applyDimensions();
    },
    shouldPreventOpenAnimation,
    shouldRender,
    transitionStatus: panelTransitionStatus,
  };
}

function getDimensions(element: HTMLElement) {
  return {
    height: element.scrollHeight,
    width: element.scrollWidth,
  };
}

function getAnimationType(
  element: HTMLElement,
  hasSuppressedMountAnimation: boolean,
): AnimationType {
  const panelStyles = ownerWindow(element).getComputedStyle(element);
  const hasAnimation =
    (panelStyles.animationName
      .split(',')
      .map((name) => name.trim())
      .some((name) => name !== '' && name !== 'none') ||
      hasSuppressedMountAnimation) &&
    hasNonZeroDuration(panelStyles.animationDuration);
  const hasTransition = hasNonZeroDuration(panelStyles.transitionDuration);

  if (hasAnimation && hasTransition) {
    if (IS_DEV) {
      warn(
        'CSS transitions and CSS animations both detected on Collapsible or Accordion panel.',
        'Only one of either animation type should be used.',
      );
    }

    return 'css-transition';
  }

  if (hasTransition) {
    return 'css-transition';
  }

  if (hasAnimation) {
    return 'css-animation';
  }

  return 'none';
}

function hasNonZeroDuration(value: string) {
  return value
    .split(',')
    .map((part) => part.trim())
    .some((part) => part !== '' && Number.parseFloat(part) > 0);
}

/**
 * Temporarily overrides an inline style property and returns a cleanup that
 * restores the previous inline value and priority.
 * @param element - The element whose inline style should be updated.
 * @param property - The CSS property name to override.
 * @param value - The temporary value to assign.
 * @returns A cleanup function that restores the original inline style state.
 */
function setTemporaryStyle(element: HTMLElement, property: string, value: string): () => void {
  const previousValue = element.style.getPropertyValue(property);
  const previousPriority = element.style.getPropertyPriority(property);

  element.style.setProperty(property, value);

  return () => {
    if (previousValue === '') {
      element.style.removeProperty(property);
      return;
    }

    element.style.setProperty(property, previousValue, previousPriority);
  };
}

/**
 * Temporarily resets inline alignment styles that can distort scroll-based
 * size measurements, then restores them on the next animation frame.
 * @param element - The panel element being measured.
 * @returns A cleanup function that cancels the scheduled restore and reapplies
 * the original inline layout styles immediately.
 */
function resetLayoutStyles(element: HTMLElement): () => void {
  const originalLayoutStyles = {
    'justify-content': element.style.justifyContent,
    'align-items': element.style.alignItems,
    'align-content': element.style.alignContent,
    'justify-items': element.style.justifyItems,
  };

  Object.keys(originalLayoutStyles).forEach((key) => {
    element.style.setProperty(key, 'initial', 'important');
  });

  function restoreLayoutStyles() {
    Object.entries(originalLayoutStyles).forEach(([key, value]) => {
      if (value === '') {
        element.style.removeProperty(key);
        return;
      }

      element.style.setProperty(key, value);
    });
  }

  const frame = AnimationFrame.request(restoreLayoutStyles);

  return () => {
    AnimationFrame.cancel(frame);
    restoreLayoutStyles();
  };
}

export interface UseCollapsiblePanelParameters {
  /**
   * Allows the browser's built-in page search to find and expand the panel contents.
   *
   * Overrides the `keepMounted` prop and uses `hidden="until-found"`
   * to hide the element without removing it from the DOM.
   */
  hiddenUntilFound: Accessor<boolean>;
  /**
   * The `id` attribute of the panel.
   */
  id: Accessor<string | undefined>;
  /**
   * Whether to keep the element in the DOM while the panel is closed.
   * This prop is ignored when `hiddenUntilFound` is used.
   */
  keepMounted: Accessor<boolean>;
  /**
   * Whether the collapsible panel is mounted for transition and hidden-state
   * purposes. This can be `false` while the element remains in the DOM when
   * `keepMounted` or `hiddenUntilFound` is enabled.
   */
  mounted: Accessor<boolean>;
  onOpenChange: (open: boolean, eventDetails: CollapsibleRoot.ChangeEventDetails) => void;
  /**
   * Whether the collapsible panel is currently open.
   */
  open: Accessor<boolean>;
  setMounted: (nextMounted: boolean) => void;
  setOpen: (nextOpen: boolean) => void;
  transitionStatus: Accessor<TransitionStatus>;
  /**
   * Port note: the names of the CSS variables the measured size is written to.
   */
  cssVariables: { height: string; width: string };
  /**
   * Port note: the panel's resolved `style` prop, applied to the same element. Only read once the
   * panel rendered. Call `applyDimensions` when it changes: a string replaces the whole inline
   * style, the variables included.
   */
  style: Accessor<JSX.CSSProperties | string | false | undefined>;
}

function setsStyleProperty(
  style: JSX.CSSProperties | string | false | undefined,
  property: string,
) {
  if (!style) {
    return false;
  }
  if (typeof style === 'string') {
    return style.split(';').some((declaration) => declaration.split(':')[0].trim() === property);
  }
  // A key set to `undefined` also overrides the size: the merged style omits the variable.
  return property in style;
}

export interface UseCollapsiblePanelReturnValue {
  /**
   * Port note: writes the measured size to the CSS variables again.
   */
  applyDimensions: () => void;
  props: Accessor<Record<string, unknown>>;
  ref: (element: HTMLDivElement | null) => void;
  shouldPreventOpenAnimation: Accessor<boolean>;
  shouldRender: Accessor<boolean>;
  transitionStatus: Accessor<TransitionStatus>;
}
