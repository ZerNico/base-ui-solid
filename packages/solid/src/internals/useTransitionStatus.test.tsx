import { createSignal, flush } from 'solid-js';
import { expect, describe, it, vi, afterEach } from 'vitest';
import { AnimationFrame } from '@base-ui-solid/utils/useAnimationFrame';
import { render, screen } from '#test-utils';
import { useTransitionStatus } from './useTransitionStatus';

describe('useTransitionStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function Test(props: { open: boolean }) {
    const { transitionStatus } = useTransitionStatus(() => props.open);
    return <div data-testid="status" data-status={transitionStatus() ?? 'none'} />;
  }

  it('does not request a frame for an element that mounts already open', async () => {
    const requestSpy = vi.spyOn(AnimationFrame, 'request');

    await render(() => <Test open />);

    expect(screen.getByTestId('status')).toHaveAttribute('data-status', 'none');
    expect(requestSpy).not.toHaveBeenCalled();
  });

  it('clears the starting status on the next frame after opening', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(AnimationFrame, 'request').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });

    const [open, setOpen] = createSignal(false);
    await render(() => <Test open={open()} />);
    setOpen(true);
    flush();

    expect(screen.getByTestId('status')).toHaveAttribute('data-status', 'starting');
    expect(frames).toHaveLength(1);

    frames[0](0);
    // Like React (which `act` waits for here), the update made in the frame lands in a later task.
    await new Promise((resolve) => {
      setTimeout(resolve);
    });
    flush();

    expect(screen.getByTestId('status')).toHaveAttribute('data-status', 'none');
  });

  it('clears a stale ending status when reopened before the exit settles', async () => {
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(AnimationFrame, 'request').mockImplementation((callback) => {
      frames.push(callback);
      return frames.length;
    });

    const [open, setOpen] = createSignal(true);
    await render(() => <Test open={open()} />);
    setOpen(false);
    flush();
    expect(screen.getByTestId('status')).toHaveAttribute('data-status', 'ending');

    setOpen(true);
    flush();
    expect(frames).toHaveLength(1);

    frames[0](0);
    // Like React (which `act` waits for here), the update made in the frame lands in a later task.
    await new Promise((resolve) => {
      setTimeout(resolve);
    });
    flush();

    expect(screen.getByTestId('status')).toHaveAttribute('data-status', 'none');
  });
});
