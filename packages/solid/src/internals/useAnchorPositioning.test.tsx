import { createSignal, onCleanup, Show } from 'solid-js';
import { expect, vi, describe, beforeEach, it } from 'vitest';
import { render, isJSDOM, screen, waitFor } from '#test-utils';
import { useAnchorPositioning, useFloatingRootStore } from './useAnchorPositioning';
import type { UseAnchorPositioningParameters } from './useAnchorPositioning';

const shiftSpy = vi.hoisted(() => vi.fn());

vi.mock('../utils/popups/positioning/dom', async () => {
  const actual = await vi.importActual<typeof import('../utils/popups/positioning/dom')>(
    '../utils/popups/positioning/dom',
  );

  return {
    ...actual,
    shift: ((...args: Parameters<typeof actual.shift>) => {
      shiftSpy(...args);
      return actual.shift(...args);
    }) satisfies typeof actual.shift,
  };
});

function TestUseAnchorPositioning(props: { shift?: UseAnchorPositioningParameters['shift'] }) {
  // Port note: `anchor` takes the element, from a signal set by a ref callback.
  const [anchorElement, setAnchorElement] = createSignal<HTMLDivElement | null>(null);

  const rootStore = useFloatingRootStore({});
  const positioning = useAnchorPositioning({
    get anchor() {
      return anchorElement();
    },
    mounted: true,
    positionMethod: 'absolute',
    side: 'bottom',
    align: 'center',
    sideOffset: 0,
    alignOffset: 0,
    collisionBoundary: 'clipping-ancestors',
    collisionPadding: 5,
    sticky: false,
    arrowPadding: 5,
    disableAnchorTracking: false,
    keepMounted: false,
    collisionAvoidance: { fallbackAxisSide: 'none' },
    get shift() {
      return props.shift;
    },
    interactionStore: rootStore,
  });

  return (
    <>
      <div ref={setAnchorElement}>anchor</div>
      <div ref={positioning.refs.setFloating}>floating</div>
    </>
  );
}

function TestLazyFlip(props: {
  side?: 'right' | 'bottom';
  align?: 'start' | 'center';
  lazyFlip?: boolean | 'placement';
}) {
  // Port note: `anchor` takes the element, from a signal set by a ref callback.
  const [anchorElement, setAnchorElement] = createSignal<HTMLDivElement | null>(null);
  const [shrunk, setShrunk] = createSignal(false);
  const height = () => (shrunk() ? 10 : 100);

  const rootStore = useFloatingRootStore({});
  const positioning = useAnchorPositioning({
    get anchor() {
      return anchorElement();
    },
    mounted: true,
    positionMethod: 'fixed',
    get side() {
      return props.side ?? 'right';
    },
    get align() {
      return props.align ?? 'start';
    },
    sideOffset: 0,
    alignOffset: 0,
    collisionBoundary: 'clipping-ancestors',
    collisionPadding: 5,
    sticky: false,
    arrowPadding: 5,
    disableAnchorTracking: false,
    keepMounted: false,
    collisionAvoidance: { fallbackAxisSide: 'none' },
    get lazyFlip() {
      return props.lazyFlip ?? true;
    },
    interactionStore: rootStore,
  });

  return (
    <>
      <div
        ref={setAnchorElement}
        data-testid="anchor"
        style={{ position: 'fixed', right: '200px', bottom: '30px', width: '20px', height: '20px' }}
      >
        anchor
      </div>
      <div
        ref={positioning.refs.setFloating}
        data-testid="floating"
        data-side={positioning.side}
        data-align={positioning.align}
        style={{ ...positioning.positionerStyles, width: '100px', height: `${height()}px` }}
      >
        floating
      </div>
      <button type="button" onClick={() => setShrunk(true)}>
        Shrink
      </button>
    </>
  );
}

// Port note: Solid doesn't call a ref with `null` when the element is removed, so the arrow
// detaches itself on cleanup (the Arrow parts' refs are called with `null`).
function LateArrow(props: { positioning: ReturnType<typeof useAnchorPositioning> }) {
  onCleanup(() => props.positioning.arrowRef(null));
  return (
    <div
      ref={props.positioning.arrowRef}
      data-testid="arrow"
      style={{ ...props.positioning.arrowStyles, width: '10px', height: '5px' }}
    />
  );
}

function TestLateArrow(props: { switchAnchor?: boolean; anchorLeft?: number }) {
  // Port note: `anchor` takes the element, from a signal set by a ref callback.
  const [offscreenAnchor, setOffscreenAnchor] = createSignal<HTMLDivElement | null>(null);
  const [anchor, setAnchor] = createSignal<HTMLDivElement | null>(null);
  const [arrowMounted, setArrowMounted] = createSignal(false);

  const rootStore = useFloatingRootStore({});
  const positioning = useAnchorPositioning({
    get anchor() {
      return props.switchAnchor && !arrowMounted() ? offscreenAnchor() : anchor();
    },
    mounted: true,
    positionMethod: 'fixed',
    side: 'top',
    align: 'center',
    sideOffset: 0,
    alignOffset: 0,
    collisionBoundary: 'clipping-ancestors',
    collisionPadding: 5,
    sticky: false,
    arrowPadding: 5,
    // Nothing else repositions the popup, so only the arrow mounting can center it.
    disableAnchorTracking: true,
    keepMounted: false,
    collisionAvoidance: { fallbackAxisSide: 'none' },
    interactionStore: rootStore,
  });

  return (
    <>
      <div
        ref={setOffscreenAnchor}
        style={{ position: 'fixed', left: '100px', top: '-1000px', width: '40px', height: '20px' }}
      />
      <div
        ref={setAnchor}
        data-testid="anchor"
        style={{
          position: 'fixed',
          left: `${props.anchorLeft ?? 100}px`,
          top: '100px',
          width: '40px',
          height: '20px',
        }}
      >
        anchor
      </div>
      <div
        ref={positioning.refs.setFloating}
        data-testid="floating"
        data-positioned={positioning.isPositioned || undefined}
        style={{ ...positioning.positionerStyles, width: '200px', height: '50px' }}
      >
        <Show when={arrowMounted()}>
          <LateArrow positioning={positioning} />
        </Show>
      </div>
      <button type="button" onClick={() => setArrowMounted((mounted) => !mounted)}>
        Toggle arrow
      </button>
    </>
  );
}

describe('useAnchorPositioning', () => {
  beforeEach(() => {
    shiftSpy.mockClear();
  });

  it('uses the visual viewport for shift by default', async () => {
    await render(() => <TestUseAnchorPositioning />);

    expect(shiftSpy).toHaveBeenCalled();
    expect(shiftSpy.mock.calls[0]?.[0].rootBoundary).toBe(undefined);
  });

  it.each([
    { shift: { rootBoundary: 'layoutViewport' } as const, crossAxis: false },
    { shift: { crossAxis: true, rootBoundary: 'layoutViewport' } as const, crossAxis: true },
  ])('uses the configured shift options', async ({ shift, crossAxis }) => {
    await render(() => <TestUseAnchorPositioning shift={shift} />);

    expect(shiftSpy.mock.calls[0]?.[0].rootBoundary).toBe('layoutViewport');
    expect(shiftSpy.mock.calls[0]?.[0].crossAxis).toBe(crossAxis);
  });

  it.skipIf(isJSDOM)('locks a flipped alignment after the popup shrinks', async () => {
    // Only `'placement'` locks the align axis. Plain `true` stays side-only so Combobox keeps
    // recomputing its alignment.
    const { user } = await render(() => <TestLazyFlip lazyFlip="placement" />);
    const floating = screen.getByTestId('floating');

    await waitFor(() => {
      expect(floating).toHaveAttribute('data-align', 'end');
    });

    await user.click(screen.getByRole('button', { name: 'Shrink' }));

    await waitFor(() => {
      const anchorBottom = screen.getByTestId('anchor').getBoundingClientRect().bottom;
      const floatingBottom = floating.getBoundingClientRect().bottom;
      expect(Math.abs(anchorBottom - floatingBottom)).toBeLessThan(1);
    });

    expect(floating).toHaveAttribute('data-align', 'end');
  });

  it.skipIf(isJSDOM)('leaves the alignment free when lazy flipping is side-only', async () => {
    const { user } = await render(() => <TestLazyFlip lazyFlip />);
    const floating = screen.getByTestId('floating');

    await waitFor(() => {
      expect(floating).toHaveAttribute('data-align', 'end');
    });

    await user.click(screen.getByRole('button', { name: 'Shrink' }));

    await waitFor(() => {
      expect(floating).toHaveAttribute('data-align', 'start');
    });
  });

  it.skipIf(isJSDOM)('locks a flipped side after the popup shrinks', async () => {
    const { user } = await render(() => <TestLazyFlip side="bottom" align="center" />);
    const floating = screen.getByTestId('floating');

    // The anchor sits at the viewport's bottom edge, so the popup flips above it.
    await waitFor(() => {
      expect(floating).toHaveAttribute('data-side', 'top');
    });

    // Shrinking makes the preferred bottom side fit again, but the flip is locked.
    await user.click(screen.getByRole('button', { name: 'Shrink' }));

    await waitFor(() => {
      const anchorTop = screen.getByTestId('anchor').getBoundingClientRect().top;
      const floatingBottom = floating.getBoundingClientRect().bottom;
      expect(Math.abs(anchorTop - floatingBottom)).toBeLessThan(1);
    });

    expect(floating).toHaveAttribute('data-side', 'top');
  });

  it.skipIf(isJSDOM)('flips back to the preferred side without lazy flipping', async () => {
    const { user } = await render(() => (
      <TestLazyFlip side="bottom" align="center" lazyFlip={false} />
    ));
    const floating = screen.getByTestId('floating');

    await waitFor(() => {
      expect(floating).toHaveAttribute('data-side', 'top');
    });

    await user.click(screen.getByRole('button', { name: 'Shrink' }));

    await waitFor(() => {
      expect(floating).toHaveAttribute('data-side', 'bottom');
    });
  });

  it.skipIf(isJSDOM)('centers an arrow that mounts after the popup is positioned', async () => {
    const { user } = await render(() => <TestLateArrow />);

    await waitFor(() => {
      expect(screen.getByTestId('floating')).toHaveAttribute('data-positioned');
    });

    await user.click(screen.getByRole('button', { name: 'Toggle arrow' }));

    const anchorRect = screen.getByTestId('anchor').getBoundingClientRect();
    const anchorCenter = anchorRect.left + anchorRect.width / 2;

    await waitFor(() => {
      const arrowRect = screen.getByTestId('arrow').getBoundingClientRect();
      expect(arrowRect.left + arrowRect.width / 2).toBeCloseTo(anchorCenter, 0);
    });
  });

  it.skipIf(isJSDOM)(
    'positions against the new anchor when the arrow mounts as the anchor changes',
    async () => {
      const { user } = await render(() => <TestLateArrow switchAnchor />);
      const floating = screen.getByTestId('floating');

      await waitFor(() => {
        expect(floating).toHaveAttribute('data-positioned');
      });
      expect(floating.getBoundingClientRect().bottom).toBeLessThan(0);

      await user.click(screen.getByRole('button', { name: 'Toggle arrow' }));

      const anchorTop = screen.getByTestId('anchor').getBoundingClientRect().top;
      await waitFor(() => {
        expect(floating.getBoundingClientRect().bottom).toBeCloseTo(anchorTop, 0);
      });
    },
  );

  it.skipIf(isJSDOM)(
    'repositions when the arrow unmounts after the popup is positioned',
    async () => {
      // The anchor's right edge sits at 5px, so the arrow's shift limit holds the popup at -5px
      // while the arrow is mounted, and collision padding moves it to 5px once it's gone.
      const { user } = await render(() => <TestLateArrow anchorLeft={-35} />);
      const floating = screen.getByTestId('floating');
      const toggle = screen.getByRole('button', { name: 'Toggle arrow' });

      await waitFor(() => {
        expect(floating).toHaveAttribute('data-positioned');
      });

      await user.click(toggle);
      await waitFor(() => {
        expect(floating.getBoundingClientRect().left).toBeCloseTo(-5, 0);
      });

      await user.click(toggle);
      expect(screen.queryByTestId('arrow')).toBe(null);
      await waitFor(() => {
        expect(floating.getBoundingClientRect().left).toBeCloseTo(5, 0);
      });
    },
  );
});
