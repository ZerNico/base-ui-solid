import {
  renderWithErrorBoundary,
  describeConformance,
  isJSDOM,
  render,
  screen,
  waitFor,
} from '#test-utils';
import { expect, vi, describe, it } from 'vitest';
import { createSignal, flush, omit } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { ScrollArea } from '..';

// Port note: Solid doesn't append `px` to numeric style values, so sizes are passed as strings.
// Upstream's `rerender` is a signal.

describe('<ScrollArea.Content />', () => {
  describeConformance(ScrollArea.Content, {
    refInstanceof: window.HTMLDivElement,
    wrap: (node) => (
      <ScrollArea.Root>
        <ScrollArea.Viewport>{node()}</ScrollArea.Viewport>
      </ScrollArea.Root>
    ),
  });

  it('throws a descriptive error when rendered outside <ScrollArea.Viewport>', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await expect(
        renderWithErrorBoundary(render, () => (
          <ScrollArea.Root>
            <ScrollArea.Content />
          </ScrollArea.Root>
        )),
      ).rejects.toThrow(
        'Base UI: ScrollAreaViewportContext missing. ScrollAreaViewport parts must be placed within <ScrollArea.Viewport>.',
      );
    } finally {
      errorSpy.mockRestore();
    }
  });

  it.skipIf(isJSDOM)('recomputes overflow when observed content resizes', async () => {
    const [contentHeight, setContentHeight] = createSignal(50);

    await render(() => (
      <ScrollArea.Root data-testid="root" style={{ width: '100px', height: '100px' }}>
        <ScrollArea.Viewport style={{ width: '100%', height: '100%' }}>
          <ScrollArea.Content data-testid="content" style={{ height: `${contentHeight()}px` }} />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    ));
    const root = screen.getByTestId('root');

    await waitFor(() => expect(root).not.toHaveAttribute('data-has-overflow-y'));

    setContentHeight(1000);
    flush();

    await waitFor(() => expect(root).toHaveAttribute('data-has-overflow-y'));
  });

  it('supports a custom content renderer that does not forward its ref', async () => {
    // Port note: Solid can't clone a `render` element, so the component is rendered by a render
    // function and drops the `ref` it receives.
    function ContentWithoutRef(props: JSX.HTMLAttributes<HTMLDivElement>) {
      return <div {...omit(props, 'ref')} />;
    }

    await render(() => (
      <ScrollArea.Root>
        <ScrollArea.Viewport>
          <ScrollArea.Content
            data-testid="content"
            render={(props) => <ContentWithoutRef {...props} />}
          />
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    ));

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
