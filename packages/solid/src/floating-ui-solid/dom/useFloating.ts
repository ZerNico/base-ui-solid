import { createMemo, createSignal, flush, onCleanup, untrack } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { computePosition } from '@floating-ui/dom';
import type { ComputePositionConfig } from '@floating-ui/dom';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { fastObjectShallowCompare } from '@base-ui-solid/utils/fastObjectShallowCompare';
import { deepEqual, getDPR, roundByDPR } from './utils';
import type {
  ReferenceType,
  UseFloatingData,
  UseFloatingOptions,
  UseFloatingReturn,
} from './types';

/**
 * Provides data to position a floating element.
 * @see https://floating-ui.com/docs/useFloating
 *
 * Port note: Solid counterpart of `@floating-ui/react-dom`'s `useFloating`, built on
 * `@floating-ui/dom`. Options are read lazily (pass getters for reactive options), and the
 * returned data is exposed through getters (see `UseFloatingReturn`). The position is
 * recomputed when the elements, `placement`, `strategy` or `middleware` (compared deeply, like
 * upstream) change.
 */
export function useFloating<RT extends ReferenceType = ReferenceType>(
  options: UseFloatingOptions<RT> = {},
): UseFloatingReturn<RT> {
  const placement = () => options.placement ?? 'bottom';
  const strategy = () => options.strategy ?? 'absolute';
  const transform = () => options.transform ?? true;

  const [data, setData] = createSignal<UseFloatingData>(
    {
      x: 0,
      y: 0,
      strategy: untrack(strategy),
      placement: untrack(placement),
      middlewareData: {},
      isPositioned: false,
    },
    { ownedWrite: true },
  );

  const latestMiddleware = createMemo(() => options.middleware ?? [], { equals: deepEqual });

  const [reference, setReferenceState] = createSignal<RT | null>(null, { ownedWrite: true });
  const [floating, setFloatingState] = createSignal<HTMLElement | null>(null, {
    ownedWrite: true,
  });

  const referenceRef: RefObject<RT | null> = { current: null };
  const floatingRef: RefObject<HTMLElement | null> = { current: null };
  let dataRef = untrack(data);

  const setReference = (node: RT | null) => {
    if (node !== referenceRef.current) {
      referenceRef.current = node;
      setReferenceState(() => node);
    }
  };

  const setFloating = (node: HTMLElement | null) => {
    if (node !== floatingRef.current) {
      floatingRef.current = node;
      setFloatingState(() => node);
    }
  };

  const referenceEl = createMemo(() => options.elements?.reference || reference());
  const floatingEl = createMemo(() => options.elements?.floating || floating());

  // Port note: upstream recreates `update` (re-running the effect below) when these change.
  const config = createMemo(() => ({
    placement: placement(),
    strategy: strategy(),
    middleware: latestMiddleware(),
  }));

  let isMounted = true;
  onCleanup(() => {
    isMounted = false;
  });

  const update = () => {
    if (!referenceRef.current || !floatingRef.current) {
      return;
    }

    const computeConfig: Partial<ComputePositionConfig> = { ...untrack(config) };
    const platform = untrack(() => options.platform);
    if (platform) {
      computeConfig.platform = platform;
    }

    computePosition(referenceRef.current, floatingRef.current, computeConfig).then(
      (positionData) => {
        const fullData = {
          ...positionData,
          // The floating element's position may be recomputed while it's closed
          // but still mounted (such as when transitioning out). To ensure
          // `isPositioned` will be `false` initially on the next open, avoid
          // setting it to `true` when `open === false` (must be specified).
          isPositioned: untrack(() => options.open) !== false,
        };
        if (isMounted && !deepEqual(dataRef, fullData)) {
          dataRef = fullData;
          // Port note: `ReactDOM.flushSync(() => setData(fullData))`.
          setData(fullData);
          flush();
        }
      },
    );
  };

  useIsoLayoutEffect(
    ([open]) => {
      if (open === false && dataRef.isPositioned) {
        dataRef.isPositioned = false;
        setData((prev) => ({ ...prev, isPositioned: false }));
      }
    },
    () => [options.open],
  );

  useIsoLayoutEffect(
    ([referenceElement, floatingElement]) => {
      if (referenceElement) {
        referenceRef.current = referenceElement;
      }
      if (floatingElement) {
        floatingRef.current = floatingElement;
      }

      if (referenceElement && floatingElement) {
        const whileElementsMounted = options.whileElementsMounted;
        if (whileElementsMounted) {
          return whileElementsMounted(referenceElement, floatingElement, update);
        }

        update();
      }

      return undefined;
    },
    () => [referenceEl(), floatingEl(), config(), options.whileElementsMounted != null] as const,
  );

  const floatingStyles = createMemo<JSX.CSSProperties>(
    () => {
      const initialStyles = {
        position: strategy(),
        left: 0,
        top: 0,
      } as JSX.CSSProperties;

      const floatingElement = floatingEl();
      if (!floatingElement) {
        return initialStyles;
      }

      const { x: dataX, y: dataY } = data();
      const x = roundByDPR(floatingElement, dataX);
      const y = roundByDPR(floatingElement, dataY);

      if (transform()) {
        return {
          ...initialStyles,
          transform: `translate(${x}px, ${y}px)`,
          ...(getDPR(floatingElement) >= 1.5 && { 'will-change': 'transform' }),
        };
      }

      // Port note: Solid doesn't add `px` to numeric style values.
      return {
        position: strategy(),
        left: `${x}px`,
        top: `${y}px`,
      };
    },
    { equals: fastObjectShallowCompare },
  );

  const refs = {
    reference: referenceRef,
    floating: floatingRef,
    setReference,
    setFloating,
  };

  const elements = {
    get reference() {
      return referenceEl();
    },
    get floating() {
      return floatingEl();
    },
  };

  return {
    get x() {
      return data().x;
    },
    get y() {
      return data().y;
    },
    get strategy() {
      return data().strategy;
    },
    get placement() {
      return data().placement;
    },
    get middlewareData() {
      return data().middlewareData;
    },
    get isPositioned() {
      return data().isPositioned;
    },
    update,
    refs,
    elements,
    get floatingStyles() {
      return floatingStyles();
    },
  };
}
