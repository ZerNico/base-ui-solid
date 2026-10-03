import { vi, expect, describe, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { render } from '@solidjs/testing-library';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useTestInteractions } from './useTestInteractions';
import { FOCUSABLE_ATTRIBUTE } from '../src/floating-ui-react/utils/constants';

describe('useTestInteractions', () => {
  it('correctly merges functions', () => {
    const firstInteractionOnClick = vi.fn();
    const secondInteractionOnClick = vi.fn();
    const secondInteractionOnKeyDown = vi.fn();
    const userOnClick = vi.fn();

    function App() {
      const { getReferenceProps } = useTestInteractions([
        { reference: { onClick: firstInteractionOnClick } },
        {
          reference: {
            onClick: secondInteractionOnClick,
            onKeyDown: secondInteractionOnKeyDown,
          },
        },
      ]);

      const { onClick, onKeyDown } = getReferenceProps({ onClick: userOnClick });

      // @ts-expect-error
      onClick();
      // @ts-expect-error
      onKeyDown();

      return null;
    }

    render(() => <App />);

    expect(firstInteractionOnClick).toHaveBeenCalledTimes(1);
    expect(secondInteractionOnClick).toHaveBeenCalledTimes(1);
    expect(userOnClick).toHaveBeenCalledTimes(1);
    expect(secondInteractionOnKeyDown).toHaveBeenCalledTimes(1);
  });

  it('does not error with undefined user supplied functions', () => {
    function App() {
      const { getReferenceProps } = useTestInteractions([{ reference: { onClick() {} } }]);
      expect(() =>
        // @ts-expect-error
        getReferenceProps({ onClick: undefined }).onClick(),
      ).not.toThrowError();
      return null;
    }

    render(() => <App />);
  });

  it('does not break props that start with `on`', () => {
    function App() {
      const { getReferenceProps } = useTestInteractions([]);

      const props = getReferenceProps({
        // @ts-expect-error
        onlyShowVotes: true,
        onyx: () => {},
      });

      expect(props.onlyShowVotes).toBe(true);
      expect(typeof props.onyx).toBe('function');

      return null;
    }

    render(() => <App />);
  });

  it('does not break props that return values', () => {
    function App() {
      const { getReferenceProps } = useTestInteractions([]);

      const props = getReferenceProps({
        // @ts-expect-error
        onyx: () => 'returned value',
      });

      // @ts-expect-error
      expect(props.onyx()).toBe('returned value');

      return null;
    }

    render(() => <App />);
  });

  it('adds focusable props to floating elements', () => {
    function App() {
      const { getFloatingProps } = useTestInteractions([]);
      const props = getFloatingProps();

      // Port note: lowercase attribute names (`tabindex`).
      expect(props.tabindex).toBe(-1);
      expect(props[FOCUSABLE_ATTRIBUTE]).toBe('');

      return null;
    }

    render(() => <App />);
  });

  it('strips active and selected from item props passed to item callbacks', () => {
    // Port note: lowercase attribute names (`tabindex`). Solid's JSX types only accept string
    // `aria-*` booleans, but internal props pass booleans (rendered as strings by `useRenderElement`).
    const item = vi.fn((props: { active?: boolean; selected?: boolean }) => ({
      role: 'option' as const,
      tabindex: props.active ? 0 : -1,
      'aria-selected': props.selected as any,
    }));

    function App() {
      const { getItemProps } = useTestInteractions([{ item }]);
      const props = getItemProps({ active: true, selected: true });

      expect(item).toHaveBeenCalledWith({ active: true, selected: true });
      expect(props.active).toBeUndefined();
      expect(props.selected).toBeUndefined();
      expect(props.role).toBe('option');
      expect(props.tabindex).toBe(0);
      expect(props['aria-selected']).toBe(true);

      return null;
    }

    render(() => <App />);
  });

  it('prop getters are memoized', () => {
    const effectRuns = vi.fn();

    // Port note: the component body runs once; the forced update re-evaluates what reads `count`
    // and the effect depends on the getters, like upstream.
    function App() {
      const [count, setCount] = createSignal(0, { ownedWrite: true });
      const propsList = [
        { reference: { onClick() {} } },
        { floating: { onKeyDown() {} } },
        { item: { onMouseMove() {} } },
      ];

      const { getReferenceProps, getFloatingProps, getItemProps } = useTestInteractions(propsList);

      useEffect(
        () => {
          effectRuns();
          setCount((value) => value + 1);
        },
        () => [getReferenceProps, getFloatingProps, getItemProps],
      );

      return <>{count()}</>;
    }

    render(() => <App />);
    flush();

    // The getters must be stable across the re-render forced by the effect.
    expect(effectRuns).toHaveBeenCalledTimes(1);
  });
});
