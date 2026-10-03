import { createSignal } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { HTMLProps } from '../types';
import { omitProps } from '../../merge-props/mergeProps';
import { useBaseUiId } from '../useBaseUiId';
import { LabelableContext, useLabelableContext } from './LabelableContext';

export function LabelableProvider(props: LabelableProvider.Props) {
  const defaultId = useBaseUiId();

  const [controlIdState, setControlIdState] = createSignal<string | null | undefined>(defaultId);
  const [labelId, setLabelId] = createSignal<string | undefined>();
  const [messageIds, setMessageIds] = createSignal<string[]>([]);

  // Do not use `??`: `null` deliberately suppresses `for`.
  const controlId = () => {
    const current = controlIdState();
    return current === undefined ? defaultId : current;
  };

  const registrations = new Map<symbol, string | null>();

  const { messageIds: parentMessageIds } = useLabelableContext();

  const registerControlId = (source: symbol, nextId: string | null | undefined) => {
    if (nextId === undefined) {
      registrations.delete(source);
    } else {
      registrations.set(source, nextId);
    }

    setControlIdState((prev) => {
      if (registrations.size === 0) {
        // A hidden subtree (e.g. a re-suspending boundary) destroys effects but keeps its DOM,
        // so preserve its selected control.
        return prev;
      }

      let nextControlId: string | null | undefined;

      for (const id of registrations.values()) {
        // Keep the current selection while it is still registered, so rapid unmount/remount
        // cycles don't churn it.
        if (id === prev) {
          return prev;
        }

        if (nextControlId === undefined) {
          nextControlId = id;
        }
      }

      return nextControlId;
    });
  };

  const resetControlId = () => {
    if (registrations.size === 0) {
      setControlIdState(defaultId);
    }
  };

  const getDescriptionProps = (externalProps: HTMLProps) => {
    const describedBy = externalProps['aria-describedby'];
    const ids = describedBy ? String(describedBy).split(' ') : [];
    ids.push(...parentMessageIds(), ...messageIds());

    // Not object spread: it would read (and create) `children` when this is used as a props
    // getter on an element with children.
    const props: HTMLProps = omitProps(externalProps, ['aria-describedby']);
    props['aria-describedby'] = Array.from(new Set(ids)).join(' ') || undefined;
    return props;
  };

  const contextValue: LabelableContext = {
    controlId,
    registerControlId,
    resetControlId,
    labelId,
    setLabelId,
    messageIds,
    setMessageIds,
    getDescriptionProps,
  };

  return <LabelableContext value={contextValue}>{props.children}</LabelableContext>;
}

export interface LabelableProviderState {}

export interface LabelableProviderProps {
  children?: JSX.Element;
}

export namespace LabelableProvider {
  export type State = LabelableProviderState;
  export type Props = LabelableProviderProps;
}
