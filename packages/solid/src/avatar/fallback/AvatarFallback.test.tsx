import type { Mock } from 'vitest';
import { Show, createSignal, flush } from 'solid-js';
import { Avatar } from '..';
import { createRenderer, describeConformance, render, isJSDOM, waitFor, screen } from '#test-utils';
import { useImageLoadingStatus } from '../image/useImageLoadingStatus';
import type { ImageLoadingStatus } from '../root/AvatarRoot';

vi.mock('../image/useImageLoadingStatus');

// Port note: the hook takes `src` as an accessor and returns the status as an accessor.
function mockLoadingStatus(getStatus: (src: string | undefined) => ImageLoadingStatus) {
  (useImageLoadingStatus as Mock).mockImplementation((src: () => string | undefined) => [
    () => getStatus(src()),
    () => {},
  ]);
}

describe('<Avatar.Fallback />', () => {
  beforeEach(() => {
    // The global `vi.resetAllMocks()` teardown clears the implementation, and the component
    // destructures the hook's return value, so every test needs a stub in place.
    mockLoadingStatus(() => 'idle');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describeConformance(Avatar.Fallback, {
    wrap: (node) => <Avatar.Root>{node()}</Avatar.Root>,
    refInstanceof: window.HTMLSpanElement,
  });

  it.skipIf(!isJSDOM)('should not render the children if the image loaded', async () => {
    mockLoadingStatus(() => 'loaded');

    await render(() => (
      <Avatar.Root>
        <Avatar.Image />
        <Avatar.Fallback data-testid="fallback" />
      </Avatar.Root>
    ));

    await waitFor(() => {
      expect(screen.queryByTestId('fallback')).toBe(null);
    });
  });

  it.skipIf(!isJSDOM)('should render the fallback if the image fails to load', async () => {
    mockLoadingStatus(() => 'error');

    await render(() => (
      <Avatar.Root>
        <Avatar.Image />
        <Avatar.Fallback>AC</Avatar.Fallback>
      </Avatar.Root>
    ));

    await waitFor(() => {
      expect(screen.queryByText('AC')).not.toBe(null);
    });
  });

  it.skipIf(!isJSDOM)('shows the fallback when a loaded image is unmounted', async () => {
    mockLoadingStatus(() => 'loaded');

    function Test() {
      const [showImage, setShowImage] = createSignal(true);

      return (
        <div>
          <button onClick={() => setShowImage(false)}>Hide image</button>
          <Avatar.Root>
            <Show when={showImage()}>
              <Avatar.Image data-testid="image" src="avatar.png" />
            </Show>
            <Avatar.Fallback data-testid="fallback">AC</Avatar.Fallback>
          </Avatar.Root>
        </div>
      );
    }

    const { user } = await render(() => <Test />);

    await waitFor(() => {
      expect(screen.queryByTestId('fallback')).toBe(null);
    });
    expect(screen.getByTestId('image')).not.toBe(null);

    await user.click(screen.getByText('Hide image'));

    await waitFor(() => {
      expect(screen.getByTestId('fallback')).not.toBe(null);
    });
    expect(screen.queryByTestId('image')).toBe(null);
  });

  describe.skipIf(!isJSDOM)('prop: delay', () => {
    const { clock, render: renderFakeTimers } = createRenderer();

    clock.withFakeTimers();

    it('shows the fallback when the delay has elapsed', async () => {
      await renderFakeTimers(() => (
        <Avatar.Root>
          <Avatar.Image />
          <Avatar.Fallback delay={100}>AC</Avatar.Fallback>
        </Avatar.Root>
      ));

      expect(screen.queryByText('AC')).toBe(null);

      clock.tick(100);

      expect(screen.queryByText('AC')).not.toBe(null);
    });

    it('shows the fallback immediately when delay is 0', async () => {
      mockLoadingStatus(() => 'error');

      await renderFakeTimers(() => (
        <Avatar.Root>
          <Avatar.Image />
          <Avatar.Fallback delay={0}>AC</Avatar.Fallback>
        </Avatar.Root>
      ));

      // No timers are advanced: `delay={0}` must render synchronously on mount.
      expect(screen.queryByText('AC')).not.toBe(null);
    });

    it('shows the fallback when delay changes to 0', async () => {
      mockLoadingStatus(() => 'error');

      function Test(props: { delay?: number }) {
        return (
          <Avatar.Root>
            <Avatar.Image />
            <Avatar.Fallback delay={props.delay}>AC</Avatar.Fallback>
          </Avatar.Root>
        );
      }

      const [delay, setDelay] = createSignal<number | undefined>(100);
      await renderFakeTimers(() => <Test delay={delay()} />);

      expect(screen.queryByText('AC')).toBe(null);

      setDelay(0);
      flush();

      expect(screen.queryByText('AC')).not.toBe(null);
    });

    it('keeps the fallback visible when delay changes from undefined to a number', async () => {
      mockLoadingStatus(() => 'error');

      function Test(props: { delay?: number }) {
        return (
          <Avatar.Root>
            <Avatar.Image />
            <Avatar.Fallback delay={props.delay}>AC</Avatar.Fallback>
          </Avatar.Root>
        );
      }

      const [delay, setDelay] = createSignal<number | undefined>(undefined);
      await renderFakeTimers(() => <Test delay={delay()} />);

      expect(screen.queryByText('AC')).not.toBe(null);

      setDelay(100);
      flush();

      expect(screen.queryByText('AC')).not.toBe(null);
    });

    it('keeps the fallback visible across a number -> undefined -> number delay change', async () => {
      mockLoadingStatus(() => 'error');

      function Test(props: { delay?: number }) {
        return (
          <Avatar.Root>
            <Avatar.Image />
            <Avatar.Fallback delay={props.delay}>AC</Avatar.Fallback>
          </Avatar.Root>
        );
      }

      const [delay, setDelay] = createSignal<number | undefined>(100);
      await renderFakeTimers(() => <Test delay={delay()} />);

      // Fallback is hidden until the delay elapses.
      expect(screen.queryByText('AC')).toBe(null);

      // Removing the delay before it elapses shows the fallback immediately.
      setDelay(undefined);
      flush();
      expect(screen.queryByText('AC')).not.toBe(null);

      // Restoring the delay must not re-hide the already-visible fallback.
      setDelay(100);
      flush();
      expect(screen.queryByText('AC')).not.toBe(null);
    });
  });

  it.skipIf(!isJSDOM)(
    'keeps fallback mounted and image unmounted while the image is loading',
    async () => {
      mockLoadingStatus((src) => (src ? 'loading' : 'error'));

      function Test() {
        const [showImage, setShowImage] = createSignal(false);

        function handleShowImage() {
          setShowImage(true);
        }

        return (
          <div>
            <button onClick={handleShowImage}>Show image</button>
            <Avatar.Root>
              <Avatar.Image data-testid="image" src={showImage() ? 'avatar.png' : undefined} />
              <Avatar.Fallback data-testid="fallback">AC</Avatar.Fallback>
            </Avatar.Root>
          </div>
        );
      }

      const { user } = await render(() => <Test />);

      expect(screen.queryByTestId('image')).toBe(null);
      expect(screen.getByTestId('fallback')).not.toBe(null);

      await user.click(screen.getByText('Show image'));

      await waitFor(() => {
        expect(screen.queryByTestId('image')).toBe(null);
        expect(screen.getByTestId('fallback')).not.toBe(null);
      });
    },
  );

  describe.skipIf(isJSDOM)('regression', () => {
    afterEach(() => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = true;
    });

    it('keeps only one of image or fallback mounted when switching to image', async () => {
      globalThis.BASE_UI_ANIMATIONS_DISABLED = false;

      mockLoadingStatus((src) => (src ? 'loaded' : 'error'));

      const style = `
        @keyframes test-exit {
          to {
            opacity: 0;
          }
        }

        .animation-test-fallback[data-ending-style] {
          animation: test-exit 2s;
        }
      `;

      function Test() {
        const [showImage, setShowImage] = createSignal(false);

        function handleShowImage() {
          setShowImage(true);
        }

        return (
          <div>
            <style>{style}</style>
            <button onClick={handleShowImage}>Show image</button>
            <Avatar.Root>
              <Avatar.Image data-testid="image" src={showImage() ? 'avatar.png' : undefined} />
              <Avatar.Fallback class="animation-test-fallback" data-testid="fallback">
                AC
              </Avatar.Fallback>
            </Avatar.Root>
          </div>
        );
      }

      const { user } = await render(() => <Test />);

      expect(screen.queryByTestId('image')).toBe(null);
      expect(screen.getByTestId('fallback')).not.toBe(null);

      await user.click(screen.getByText('Show image'));

      await waitFor(() => {
        expect(screen.queryByTestId('image')).not.toBe(null);
        expect(screen.queryByTestId('fallback')).toBe(null);
      });
    });
  });
});
