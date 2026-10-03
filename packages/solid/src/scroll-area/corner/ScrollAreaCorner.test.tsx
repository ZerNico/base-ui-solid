import { expect, describe, it } from 'vitest';
import { describeConformance, isJSDOM, render, screen, waitFor } from '#test-utils';
import { ScrollArea } from '..';

// Port note: Solid doesn't append `px` to numeric style values, so sizes are passed as strings.

function mockViewportMetrics(viewport: HTMLDivElement | null) {
  if (!viewport) {
    return;
  }

  const metrics = {
    clientHeight: 100,
    scrollHeight: 1000,
    clientWidth: 100,
    scrollWidth: 1000,
  };

  for (const [key, value] of Object.entries(metrics)) {
    const descriptor = Object.getOwnPropertyDescriptor(viewport, key);
    if (!descriptor || descriptor.configurable) {
      Object.defineProperty(viewport, key, { value, configurable: true });
    }
  }
}

describe('<ScrollArea.Corner />', () => {
  describeConformance(ScrollArea.Corner, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <ScrollArea.Root>
        <ScrollArea.Viewport ref={mockViewportMetrics} style={{ width: '100px', height: '100px' }}>
          <div style={{ width: '1000px', height: '1000px' }} />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" keepMounted style={{ width: '10px' }}>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
        <ScrollArea.Scrollbar orientation="horizontal" keepMounted style={{ height: '10px' }}>
          <ScrollArea.Thumb />
        </ScrollArea.Scrollbar>
        {node()}
      </ScrollArea.Root>
    ),
  });

  it('is hidden from the accessibility tree by default', async () => {
    await render(() => (
      <ScrollArea.Root>
        <ScrollArea.Viewport ref={mockViewportMetrics} style={{ width: '100px', height: '100px' }}>
          <div style={{ width: '1000px', height: '1000px' }} />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" keepMounted style={{ width: '10px' }} />
        <ScrollArea.Scrollbar orientation="horizontal" keepMounted style={{ height: '10px' }} />
        <ScrollArea.Corner data-testid="corner" />
      </ScrollArea.Root>
    ));

    expect(screen.getByTestId('corner')).toHaveAttribute('aria-hidden', 'true');
  });

  it('allows overriding aria-hidden', async () => {
    await render(() => (
      <ScrollArea.Root>
        <ScrollArea.Viewport ref={mockViewportMetrics} style={{ width: '100px', height: '100px' }}>
          <div style={{ width: '1000px', height: '1000px' }} />
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" keepMounted style={{ width: '10px' }} />
        <ScrollArea.Scrollbar orientation="horizontal" keepMounted style={{ height: '10px' }} />
        <ScrollArea.Corner data-testid="corner" aria-hidden={undefined} />
      </ScrollArea.Root>
    ));

    expect(screen.getByTestId('corner')).not.toHaveAttribute('aria-hidden');
  });

  describe.skipIf(isJSDOM)('interactions', () => {
    it('should apply correct corner size when both scrollbars are present', async () => {
      await render(() => (
        <ScrollArea.Root style={{ width: '200px', height: '200px' }}>
          <ScrollArea.Viewport data-testid="viewport" style={{ width: '100%', height: '100%' }}>
            <div style={{ width: '1000px', height: '1000px' }} />
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar orientation="vertical" style={{ width: '10px' }} />
          <ScrollArea.Scrollbar orientation="horizontal" style={{ height: '10px' }} />
          <ScrollArea.Corner data-testid="corner" />
        </ScrollArea.Root>
      ));

      const corner = screen.getByTestId('corner');

      await waitFor(() => {
        const style = getComputedStyle(corner);
        expect(style.getPropertyValue('--scroll-area-corner-width')).toBe('10px');
        expect(style.getPropertyValue('--scroll-area-corner-height')).toBe('10px');
      });
    });
  });
});
