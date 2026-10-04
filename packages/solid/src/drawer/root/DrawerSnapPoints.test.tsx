import { createRenderer, screen, waitFor } from '#test-utils';
import { Drawer } from 'base-ui-solid/drawer';
import { untrack } from 'solid-js';
import { describe, expect, it } from 'vitest';
import type { DrawerSnapPoint } from './DrawerRootContext';
import { useDrawerSnapPoints } from './useDrawerSnapPoints';

function SnapPointProbe() {
  const drawerResolvedSnapPointsactiveSnapPointOffset = useDrawerSnapPoints();
  return (
    <output data-testid="snap-point-probe">
      {JSON.stringify({
        resolvedSnapPoints: drawerResolvedSnapPointsactiveSnapPointOffset.resolvedSnapPoints(),
        activeSnapPointOffset:
          drawerResolvedSnapPointsactiveSnapPointOffset.activeSnapPointOffset(),
      })}
    </output>
  );
}
function setHeight(element: HTMLElement | null, value: number) {
  if (element) {
    Object.defineProperty(element, 'offsetHeight', { configurable: true, value });
  }
}
function SnapPointsCase(props: {
  snapPoints: DrawerSnapPoint[];
  snapPoint?: DrawerSnapPoint | null;
  popupHeight?: number;
  viewportHeight?: number;
}) {
  return (
    <Drawer.Root open modal={false} snapPoints={props.snapPoints} snapPoint={props.snapPoint}>
      <SnapPointProbe />
      <Drawer.Portal>
        <Drawer.Viewport
          ref={(element) => untrack(() => setHeight(element, props.viewportHeight ?? 400))}
        >
          <Drawer.Popup
            data-testid="popup"
            ref={(element) => untrack(() => setHeight(element, props.popupHeight ?? 300))}
          >
            Drawer
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
function readProbe() {
  return JSON.parse(screen.getByTestId('snap-point-probe').textContent || '{}') as {
    resolvedSnapPoints: Array<{
      value: DrawerSnapPoint;
      height: number;
      offset: number;
    }>;
    activeSnapPointOffset: number | null;
  };
}
describe('Drawer snap point composition', () => {
  const { render } = createRenderer();
  it('resolves supported units, filters invalid values, clamps heights, and keeps the last duplicate', async () => {
    const previousFontSize = document.documentElement.style.fontSize;
    document.documentElement.style.fontSize = '20px';
    try {
      await render((overrides) => (
        <SnapPointsCase
          snapPoints={[
            Number.NaN,
            'invalid',
            'invalidpx',
            'invalidrem',
            -1,
            '2rem',
            '100px',
            200,
            200.5,
            800,
          ]}
          snapPoint={200}
          {...overrides()}
        />
      ));
      await waitFor(() => {
        expect(readProbe().resolvedSnapPoints).toEqual([
          { value: -1, height: 0, offset: 300 },
          { value: '2rem', height: 40, offset: 260 },
          { value: '100px', height: 100, offset: 200 },
          { value: 200.5, height: 200.5, offset: 99.5 },
          { value: 800, height: 300, offset: 0 },
        ]);
      });
      expect(readProbe().activeSnapPointOffset).toBe(99.5);
      expect(screen.getByTestId('popup').style.getPropertyValue('--drawer-snap-point-offset')).toBe(
        '99.5px',
      );
    } finally {
      document.documentElement.style.fontSize = previousFontSize;
    }
  });
  it('uses fractional and pixel snap points and resolves null or invalid active values as closed', async () => {
    const { setProps } = await render((overrides) => (
      <SnapPointsCase snapPoints={[0.5, 200, '2rem']} snapPoint={200} {...overrides()} />
    ));
    await waitFor(() => {
      expect(readProbe().activeSnapPointOffset).toBe(100);
    });
    await setProps({ snapPoints: [0.5, 200, '2rem'], snapPoint: null });
    expect(readProbe().activeSnapPointOffset).toBeNull();
    expect(screen.getByTestId('popup').style.getPropertyValue('--drawer-snap-point-offset')).toBe(
      '0px',
    );
    await setProps({ snapPoints: [0.5, 200, '2rem'], snapPoint: 'invalid' });
    expect(readProbe().activeSnapPointOffset).toBeNull();
  });
  it('produces no resolved snap point when the list is empty', async () => {
    await render((overrides) => <SnapPointsCase snapPoints={[]} {...overrides()} />);
    expect(readProbe().resolvedSnapPoints).toEqual([]);
    expect(readProbe().activeSnapPointOffset).toBeNull();
  });
  it('resolves a single snap point without a deduplication pass', async () => {
    await render((overrides) => (
      <SnapPointsCase snapPoints={['100px']} snapPoint="100px" {...overrides()} />
    ));
    await waitFor(() => {
      expect(readProbe().resolvedSnapPoints).toEqual([
        { value: '100px', height: 100, offset: 200 },
      ]);
    });
    expect(readProbe().activeSnapPointOffset).toBe(200);
  });
});
