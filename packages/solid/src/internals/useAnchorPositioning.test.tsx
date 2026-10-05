import { createSignal } from 'solid-js';
import { expect, vi, describe, beforeEach, it } from 'vitest';
import { render, isJSDOM, screen, waitFor } from '#test-utils';
import { useFloating } from '../../test/floating-ui-tests/useFloating';
import { useAnchorPositioningWithHook } from './useAnchorPositioning';
import type { UseAnchorPositioningParameters } from './useAnchorPositioning';

const shiftSpy = vi.hoisted(() => vi.fn());

vi.mock('../floating-ui-solid', async () => {
  const actual =
    await vi.importActual<typeof import('../floating-ui-solid')>('../floating-ui-solid');

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

  const positioning = useAnchorPositioningWithHook(
    {
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
    },
    useFloating,
  );

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

  const positioning = useAnchorPositioningWithHook(
    {
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
    },
    useFloating,
  );

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
});
