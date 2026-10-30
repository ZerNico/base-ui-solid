import { expect, test, vi } from 'vitest';
import { flushMicrotasks, render } from '#test-utils';
import { PopupTriggerMap } from '../popupTriggerMap';
import { FloatingRootStore } from '../floating-root/FloatingRootStore';
import type { UseFloatingReturn } from '../types';
import type { VirtualElement } from './dom';
import { useBaseUIFloating } from './useFloating';

function Test(props: { rootStore: FloatingRootStore; onRender(value: UseFloatingReturn): void }) {
  // Port note: the hook runs once; its return value is reactive.
  props.onRender(useBaseUIFloating({ rootStore: props.rootStore }));
  return null;
}

test('uses the supplied root store while preserving DOM and position references', async () => {
  const referenceElement = document.createElement('button');
  const positionerElement = document.createElement('div');
  document.body.append(referenceElement, positionerElement);

  try {
    const store = new FloatingRootStore({
      open: true,
      anchorElement: referenceElement,
      positionerElement,
      triggerElements: new PopupTriggerMap(),
      defaultPopupId: undefined,
      nested: false,
      onOpenChange: vi.fn(),
    });
    let floating: UseFloatingReturn | undefined;

    await render(() => (
      <Test
        rootStore={store}
        onRender={(value) => {
          floating = value;
        }}
      />
    ));

    expect(floating?.context.rootStore).toBe(store);
    expect(store.context.positioning).toBe(floating?.context);
    expect(floating?.refs.floating.current).toBe(positionerElement);
    expect(floating?.refs.domReference.current).toBe(referenceElement);

    const anchorOverride: VirtualElement = {
      getBoundingClientRect: () => new DOMRect(1, 2, 3, 4),
    };

    floating?.refs.setPositionReference(anchorOverride);
    await flushMicrotasks();

    expect(floating?.refs.reference.current).toBe(anchorOverride);
    expect(floating?.elements.reference).toBe(anchorOverride);
    expect(store.state.anchorElement).toBe(referenceElement);
    expect(floating?.refs.domReference.current).toBe(referenceElement);
  } finally {
    referenceElement.remove();
    positionerElement.remove();
  }
});
