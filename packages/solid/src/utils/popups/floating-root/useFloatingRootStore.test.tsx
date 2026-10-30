import { describe, expect, it } from 'vitest';
import { createSignal, flush } from 'solid-js';
import { createRenderer } from '#test-utils';
import { useFloatingRootStore } from './useFloatingRootStore';
import type { FloatingRootStore } from './FloatingRootStore';

describe('useFloatingRootStore', () => {
  const { render } = createRenderer();

  function Test(props: { anchor: Element | null; onStore: (store: FloatingRootStore) => void }) {
    const store = useFloatingRootStore({
      elements: {
        get anchor() {
          return props.anchor;
        },
      },
    });
    props.onStore(store);
    return null;
  }

  it('follows the anchor when it changes after the first render', async () => {
    const first = document.createElement('button');
    const second = document.createElement('button');
    let store: FloatingRootStore | undefined;
    const onStore = (value: FloatingRootStore) => {
      store = value;
    };
    // Port note: a signal instead of `setProps`.
    const [anchor, setAnchor] = createSignal<Element | null>(first);

    await render(() => <Test anchor={anchor()} onStore={onStore} />);
    expect(store?.select('anchor')).toBe(first);

    setAnchor(second);
    flush();

    expect(store?.select('anchor')).toBe(second);
    expect(store?.select('anchorElement')).toBe(second);
  });
});
