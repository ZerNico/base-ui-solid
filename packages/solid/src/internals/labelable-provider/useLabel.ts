import { untrack } from 'solid-js';
import type { Accessor } from 'solid-js';
import { isHTMLElement } from '@floating-ui/utils/dom';
import { ownerDocument } from '@base-ui-solid/utils/owner';
import { closest, getTarget } from '../../floating-ui-react/utils';
import { useRegisteredLabelId } from '../../utils/useRegisteredLabelId';
import { useLabelableContext } from './LabelableContext';

type LabelIdSetter = (
  value: string | undefined | ((prev: string | undefined) => string | undefined),
) => void;

/**
 * Returns an accessor for the label props: read it inside a `props` accessor.
 */
export function useLabel(params: UseLabelParameters = {}): Accessor<UseLabelReturnValue> {
  const { controlId: contextControlId, setLabelId: setContextLabelId } = useLabelableContext();

  const syncLabelId: LabelIdSetter = (nextLabelId) => {
    setContextLabelId(nextLabelId);
    params.setLabelId?.(nextLabelId);
  };

  const id = useRegisteredLabelId(() => params.id?.(), syncLabelId);

  const resolvedControlId = () => contextControlId() ?? params.fallbackControlId?.();

  function focusControl(event: MouseEvent) {
    const controlId = untrack(resolvedControlId) ?? undefined;
    if (params.focusControl) {
      params.focusControl(event, controlId);
      return;
    }

    if (!controlId) {
      return;
    }

    const controlElement = ownerDocument(event.currentTarget as Element).getElementById(controlId);
    if (isHTMLElement(controlElement)) {
      focusElementWithVisible(controlElement);
    }
  }

  function handleInteraction(event: MouseEvent) {
    const target = getTarget(event) as HTMLElement | null;
    if (closest(target, 'button,input,select,textarea')) {
      return;
    }

    // Prevent text selection when double clicking label.
    if (!event.defaultPrevented && event.detail > 1) {
      event.preventDefault();
    }

    if (untrack(() => params.native?.())) {
      return;
    }

    focusControl(event);
  }

  return () =>
    params.native?.()
      ? {
          id: id(),
          for: resolvedControlId() ?? undefined,
          onMouseDown: handleInteraction,
        }
      : {
          id: id(),
          onClick: handleInteraction,
          onPointerDown(event: PointerEvent) {
            event.preventDefault();
          },
        };
}

export interface UseLabelParameters {
  id?: Accessor<string | undefined> | undefined;
  /**
   * Control id used when no labelable context control id exists.
   */
  fallbackControlId?: Accessor<string | undefined> | undefined;
  /**
   * Whether the rendered element is a native `<label>`.
   * @default false
   */
  native?: Accessor<boolean | undefined> | undefined;
  /**
   * Additional callback to sync the current label id with local component state/store.
   */
  setLabelId?: LabelIdSetter | undefined;
  /**
   * Custom focus handler for non-native labels.
   * If omitted, focus behavior targets the resolved control id.
   */
  focusControl?: ((event: MouseEvent, controlId: string | undefined) => void) | undefined;
}

export type UseLabelReturnValue = Record<string, any>;

export function focusElementWithVisible(element: HTMLElement) {
  element.focus({
    // Available from Chrome 144+ (January 2026).
    // Safari and Firefox already support it.
    focusVisible: true,
  } as FocusOptions);
}
