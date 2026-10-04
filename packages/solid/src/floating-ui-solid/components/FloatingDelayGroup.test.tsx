import { vi, expect, beforeEach, test, it } from 'vitest';

import { createEffect, createSignal, flush, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';
import {
  fireEvent,
  flushMicrotasks,
  render,
  screen,
  isJSDOM,
  useTestInteractions,
} from '#test-utils';

import { FloatingDelayGroup, useDelayGroup } from './FloatingDelayGroup';
import { useFloating } from '../../../test/floating-ui-tests/useFloating';
import { useHover } from '../../../test/floating-ui-tests/useHover';
import type { HTMLProps } from '../../internals/types';

/**
 * Port note: upstream clones `children` with the reference props (`React.cloneElement`). Solid
 * can't clone elements, so `children` is a function that receives an accessor of the props to spread.
 */
interface Props {
  label: string;
  children: (props: () => Record<string, unknown>) => JSX.Element;
}

function Tooltip(props: Props) {
  const [open, setOpen] = createSignal(false);

  const floating = useFloating({
    get open() {
      return open();
    },
    onOpenChange: setOpen,
  });
  const { refs, context } = floating;

  const delayGroup = useDelayGroup(context.rootStore, {
    get open() {
      return open();
    },
  });
  const { delayRef } = delayGroup;
  const hover = useHover(context, { delay: () => delayRef.current });
  const { getReferenceProps } = useTestInteractions([hover]);

  // Port note: Solid components don't re-render. Instead, this counts how many times the
  // consumer's reactive state (`open` and `isInstantPhase`) changed, including the initial run.
  let renderCount = 0;
  let renderCountRef: HTMLSpanElement | null = null;

  createEffect(
    () => [open(), delayGroup.isInstantPhase],
    () => {
      renderCount += 1;
      if (renderCountRef) {
        renderCountRef.textContent = String(renderCount);
      }
    },
  );

  return (
    <>
      {props.children(() =>
        getReferenceProps({
          ref: refs.setReference,
          'data-instant-phase': delayGroup.isInstantPhase ? '' : undefined,
        } as HTMLProps<Element>),
      )}
      <span
        data-testid={`render-count-${props.label}`}
        ref={(node) => {
          renderCountRef = node;
        }}
      />
      <Show when={open()}>
        <div
          data-testid={`floating-${props.label}`}
          ref={refs.setFloating}
          style={{
            position: floating.strategy,
            top: floating.y != null ? `${floating.y}px` : '',
            left: floating.x != null ? `${floating.x}px` : '',
          }}
        >
          {props.label}
        </div>
      </Show>
    </>
  );
}

function App() {
  return (
    <FloatingDelayGroup delay={{ open: 1000, close: 200 }}>
      <Tooltip label="one">
        {(props) => <button data-testid="reference-one" {...props()} />}
      </Tooltip>
      <Tooltip label="two">
        {(props) => <button data-testid="reference-two" {...props()} />}
      </Tooltip>
      <Tooltip label="three">
        {(props) => <button data-testid="reference-three" {...props()} />}
      </Tooltip>
    </FloatingDelayGroup>
  );
}

describe.skipIf(!isJSDOM)('FloatingDelayGroup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  test('groups delays correctly', async () => {
    await render(() => <App />);

    fireEvent.mouseEnter(screen.getByTestId('reference-one'));

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.queryByTestId('floating-one')).not.toBeInTheDocument();

    vi.advanceTimersByTime(999);
    await flushMicrotasks();

    expect(screen.getByTestId('floating-one')).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('reference-two'));

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.queryByTestId('floating-one')).not.toBeInTheDocument();
    expect(screen.getByTestId('floating-two')).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('reference-three'));

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.queryByTestId('floating-two')).not.toBeInTheDocument();
    expect(screen.getByTestId('floating-three')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId('reference-three'));

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.getByTestId('floating-three')).toBeInTheDocument();

    vi.advanceTimersByTime(199);
    await flushMicrotasks();

    expect(screen.queryByTestId('floating-three')).not.toBeInTheDocument();
  });

  test('timeoutMs', async () => {
    function App() {
      return (
        <FloatingDelayGroup delay={{ open: 1000, close: 100 }} timeoutMs={500}>
          <Tooltip label="one">
            {(props) => <button data-testid="reference-one" {...props()} />}
          </Tooltip>
          <Tooltip label="two">
            {(props) => <button data-testid="reference-two" {...props()} />}
          </Tooltip>
          <Tooltip label="three">
            {(props) => <button data-testid="reference-three" {...props()} />}
          </Tooltip>
        </FloatingDelayGroup>
      );
    }

    await render(() => <App />);

    fireEvent.mouseEnter(screen.getByTestId('reference-one'));

    vi.advanceTimersByTime(1000);
    await flushMicrotasks();

    fireEvent.mouseLeave(screen.getByTestId('reference-one'));
    flush();

    expect(screen.getByTestId('floating-one')).toBeInTheDocument();

    vi.advanceTimersByTime(499);
    await flushMicrotasks();

    expect(screen.queryByTestId('floating-one')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('reference-two'));

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.getByTestId('floating-two')).toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('reference-three'));

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.queryByTestId('floating-two')).not.toBeInTheDocument();
    expect(screen.getByTestId('floating-three')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByTestId('reference-three'));

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.getByTestId('floating-three')).toBeInTheDocument();

    vi.advanceTimersByTime(99);
    await flushMicrotasks();

    expect(screen.queryByTestId('floating-three')).not.toBeInTheDocument();
  });

  it('resets the instant phase after Strict Mode replays the lifecycle effects', async () => {
    // Port note: React-only `<React.StrictMode>` wrapper dropped (Solid doesn't replay effects);
    // the instant phase reset is still tested.
    await render(() => (
      <FloatingDelayGroup delay={{ open: 1000, close: 0 }} timeoutMs={50}>
        <Tooltip label="one">
          {(props) => <button data-testid="reference-one" {...props()} />}
        </Tooltip>
        <Tooltip label="two">
          {(props) => <button data-testid="reference-two" {...props()} />}
        </Tooltip>
      </FloatingDelayGroup>
    ));

    fireEvent.mouseEnter(screen.getByTestId('reference-one'));
    vi.advanceTimersByTime(1000);
    await flushMicrotasks();

    fireEvent.mouseEnter(screen.getByTestId('reference-two'));
    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    const secondReference = screen.getByTestId('reference-two');
    expect(secondReference).toHaveAttribute('data-instant-phase');

    fireEvent.mouseLeave(secondReference);
    vi.advanceTimersByTime(50);
    await flushMicrotasks();

    expect(secondReference).not.toHaveAttribute('data-instant-phase');
  });

  it('keeps the active context when an inactive consumer unmounts', async () => {
    function Test() {
      const [showSecond, setShowSecond] = createSignal(true);

      return (
        <FloatingDelayGroup delay={{ open: 1000, close: 100 }} timeoutMs={500}>
          <Tooltip label="one">
            {(props) => <button data-testid="reference-one" {...props()} />}
          </Tooltip>
          <Show when={showSecond()}>
            <Tooltip label="two">
              {(props) => <button data-testid="reference-two" {...props()} />}
            </Tooltip>
          </Show>
          <Tooltip label="three">
            {(props) => <button data-testid="reference-three" {...props()} />}
          </Tooltip>
          <button type="button" onClick={() => setShowSecond(false)}>
            Remove inactive
          </button>
        </FloatingDelayGroup>
      );
    }

    await render(() => <Test />);

    fireEvent.mouseEnter(screen.getByTestId('reference-one'));

    vi.advanceTimersByTime(1000);
    await flushMicrotasks();

    expect(screen.getByTestId('floating-one')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove inactive' }));
    flush();
    expect(screen.queryByTestId('reference-two')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('reference-three'));

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.queryByTestId('floating-one')).not.toBeInTheDocument();
    expect(screen.getByTestId('floating-three')).toBeInTheDocument();
  });

  it('keeps the timeout active when the last closed consumer unmounts', async () => {
    function Test() {
      const [showFirst, setShowFirst] = createSignal(true);

      return (
        <FloatingDelayGroup delay={{ open: 1000, close: 100 }} timeoutMs={500}>
          <Show when={showFirst()}>
            <Tooltip label="one">
              {(props) => <button data-testid="reference-one" {...props()} />}
            </Tooltip>
          </Show>
          <Tooltip label="two">
            {(props) => <button data-testid="reference-two" {...props()} />}
          </Tooltip>
          <button type="button" onClick={() => setShowFirst(false)}>
            Remove closed
          </button>
        </FloatingDelayGroup>
      );
    }

    await render(() => <Test />);

    fireEvent.mouseEnter(screen.getByTestId('reference-one'));

    vi.advanceTimersByTime(1000);
    await flushMicrotasks();

    fireEvent.mouseLeave(screen.getByTestId('reference-one'));

    vi.advanceTimersByTime(100);
    await flushMicrotasks();

    expect(screen.queryByTestId('floating-one')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Remove closed' }));
    flush();
    expect(screen.queryByTestId('reference-one')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('reference-two'));

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.getByTestId('floating-two')).toBeInTheDocument();
  });

  it('does not re-render unrelated consumers', async () => {
    function App() {
      return (
        <FloatingDelayGroup delay={{ open: 1000, close: 100 }} timeoutMs={500}>
          <Tooltip label="one">
            {(props) => <button data-testid="reference-one" {...props()} />}
          </Tooltip>
          <Tooltip label="two">
            {(props) => <button data-testid="reference-two" {...props()} />}
          </Tooltip>
          <Tooltip label="three">
            {(props) => <button data-testid="reference-three" {...props()} />}
          </Tooltip>
        </FloatingDelayGroup>
      );
    }

    await render(() => <App />);

    fireEvent.mouseEnter(screen.getByTestId('reference-one'));

    vi.advanceTimersByTime(1000);
    await flushMicrotasks();

    fireEvent.mouseLeave(screen.getByTestId('reference-one'));
    flush();

    expect(screen.getByTestId('floating-one')).toBeInTheDocument();

    vi.advanceTimersByTime(499);
    await flushMicrotasks();

    expect(screen.queryByTestId('floating-one')).not.toBeInTheDocument();

    fireEvent.mouseEnter(screen.getByTestId('reference-two'));

    vi.advanceTimersByTime(1);
    await flushMicrotasks();

    expect(screen.getByTestId('floating-two')).toBeInTheDocument();
    // Port note: upstream counts React renders (11, 7 and 3). Here the count is the number of
    // reactive updates of each consumer: `one` opened, closed and entered the instant phase, `two`
    // opened and entered the instant phase, and the unrelated `three` only ran initially.
    expect(screen.queryByTestId('render-count-one')).toHaveTextContent('4');
    expect(screen.queryByTestId('render-count-two')).toHaveTextContent('3');
    expect(screen.queryByTestId('render-count-three')).toHaveTextContent('1');
  });
});
