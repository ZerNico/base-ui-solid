import { type Accessor, onCleanup, untrack } from 'solid-js';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import { NOOP } from '../noop';
import { useBaseUiId } from '../useBaseUiId';
import { useLabelableContext } from './LabelableContext';

export function useLabelableId(params: UseLabelableIdParameters = {}): Accessor<string> {
  const id = () => params.id?.();
  const enabled = () => params.enabled?.() ?? true;

  const { controlId, registerControlId, resetControlId } = useLabelableContext();

  const defaultId = useBaseUiId();

  const controlSource = Symbol();
  let hasRegistered = false;
  let hadExplicitId = false;

  const unregisterControlId = () => {
    if (!hasRegistered || registerControlId === NOOP) {
      return;
    }

    hasRegistered = false;
    registerControlId(controlSource, undefined);
  };

  useIsoLayoutEffect(
    ([currentId, isEnabled]) => {
      if (!isEnabled || registerControlId === NOOP) {
        unregisterControlId();
        return undefined;
      }

      let nextId: string | null | undefined;

      if (currentId !== undefined) {
        hadExplicitId = true;
        nextId = currentId;
      } else if (hadExplicitId) {
        nextId = defaultId;
      } else {
        // An id-less replacement must claim the provider's fallback so a previously registered
        // explicit id is not retained after its control unmounts.
        resetControlId();
        return undefined;
      }

      hasRegistered = true;
      registerControlId(controlSource, nextId);

      return undefined;
    },
    () => [id(), enabled()],
  );

  onCleanup(unregisterControlId);

  // The provider's id wins until registration runs: the label renders `for` from the
  // provider's pre-registration state, so preempting it with an explicit `id` here would
  // leave the pair unassociated in server-rendered markup.
  return () => (enabled() ? controlId() : undefined) ?? id() ?? untrack(() => defaultId);
}

export interface UseLabelableIdParameters {
  /**
   * The control's `id`. Return `null` for a control that takes its name from `aria-labelledby`
   * instead, so that the label omits `for`.
   */
  id?: Accessor<string | null | undefined> | undefined;
  /**
   * Whether the control owns the label association of its labelable scope.
   * @default true
   */
  enabled?: Accessor<boolean | undefined> | undefined;
}

export type UseLabelableIdReturnValue = Accessor<string>;

export interface UseLabelableIdState {}
