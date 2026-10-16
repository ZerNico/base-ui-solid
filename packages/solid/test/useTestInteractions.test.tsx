import { vi, expect, describe, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { render } from '@solidjs/testing-library';
import { useEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { useTestInteractions } from './useTestInteractions';
import { FOCUSABLE_ATTRIBUTE } from '../src/floating-ui-solid/utils/constants';

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

      // @ts-expect-error The prop getter returns unknown values; these supplied handlers are callable.
      onClick();
      // @ts-expect-error The prop getter returns unknown values; these supplied handlers are callable.
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
        // @ts-expect-error The prop getter returns unknown values; the interaction supplies a callable onClick.
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
        // @ts-expect-error onlyShowVotes is a custom prop outside React HTMLProps.
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
        // @ts-expect-error onyx is a custom callback outside React HTMLProps.
        onyx: () => 'returned value',
      });

      // @ts-expect-error The prop getter returns unknown values; the supplied onyx callback is callable.
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
    const renderedGetters: Array<ReturnType<typeof useTestInteractions>> = [];
    const effectRuns = vi.fn();

    // Port note: the component body runs once. The forced update re-evaluates what reads `count`
    // (here the effect's deps, which record the getters they see, standing in for upstream's
    // re-render) and the effect depends on the getters, like upstream.
    function App() {
      const [count, setCount] = createSignal(0, { ownedWrite: true });
      const propsList = [
        { reference: { onClick() {} } },
        { floating: { onKeyDown() {} } },
        { item: { onMouseMove() {} } },
      ];

      const interactions = useTestInteractions(propsList);

      useEffect(
        () => {
          effectRuns();
          setCount((value) => value + 1);
        },
        () => {
          count();
          renderedGetters.push({ ...interactions });
          return [
            interactions.getReferenceProps,
            interactions.getFloatingProps,
            interactions.getItemProps,
          ];
        },
      );

      return <>{count()}</>;
    }

    render(() => <App />);
    flush();

    // The state update re-renders once; stable getters keep the effect from firing again.
    expect(effectRuns).toHaveBeenCalledTimes(1);
    expect(renderedGetters).toHaveLength(2);
    expect(renderedGetters[1].getReferenceProps).toBe(renderedGetters[0].getReferenceProps);
    expect(renderedGetters[1].getFloatingProps).toBe(renderedGetters[0].getFloatingProps);
    expect(renderedGetters[1].getItemProps).toBe(renderedGetters[0].getItemProps);
  });
});
