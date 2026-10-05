import { createMemo, createSignal, onSettled } from 'solid-js';
import { runCleanup } from '@base-ui-solid/utils/cleanup';
import type { Accessor } from 'solid-js';
import { areArraysEqual } from '@base-ui-solid/utils/areArraysEqual';
import type { JSX } from '@solidjs/web';
import type { HTMLProps } from '../types';
import { omitProps } from '../../merge-props/mergeProps';
import { useBaseUiId } from '../useBaseUiId';
import { LabelableContext, useLabelableContext } from './LabelableContext';

export function LabelableProvider(props: LabelableProvider.Props) {
  const defaultId = useBaseUiId();

  const [controlIdState, setControlIdState] = createSignal<string | null | undefined>(defaultId);
  const [labelId, setLabelId] = createSignal<string | undefined>();
  // Port note: upstream's description and error parts append their id to `messageIds` from an
  // effect when they render, and remove it on cleanup. Here they register an accessor of their id
  // once (after it rendered), and `messageIds` is derived from the registered accessors, so the control's
  // `aria-describedby` updates in the same flush as the part. Ids keep upstream's order: the
  // order in which they became active.
  const [messageIdSources, setMessageIdSources] = createSignal<
    Accessor<MessageIdEntry | undefined>[]
  >([], { ownedWrite: true });
  let activationCount = 0;

  const registerMessageId = (id: Accessor<string | false | null | undefined>) => {
    const entry = createMemo<MessageIdEntry | undefined>((prev) => {
      const currentId = id();
      if (!currentId) {
        return undefined;
      }
      if (prev?.id === currentId) {
        return prev;
      }
      activationCount += 1;
      return { id: currentId, order: activationCount };
    });
    // Registered once the part has rendered (not on the server, like upstream's effects): writing
    // during a render would hold up transitions.
    onSettled(() => {
      setMessageIdSources((prev) => [...prev, entry]);
      return () =>
        runCleanup(() => setMessageIdSources((prev) => prev.filter((item) => item !== entry)));
    });
  };

  const messageIds = createMemo(
    () =>
      messageIdSources()
        .map((source) => source())
        .filter((entry): entry is MessageIdEntry => entry !== undefined)
        .sort((a, b) => a.order - b.order)
        .map((entry) => entry.id),
    { equals: areArraysEqual },
  );

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
    registerMessageId,
    getDescriptionProps,
  };

  return <LabelableContext value={contextValue}>{props.children}</LabelableContext>;
}

interface MessageIdEntry {
  id: string;
  order: number;
}

export interface LabelableProviderState {}

export interface LabelableProviderProps {
  children?: JSX.Element | undefined;
}

export namespace LabelableProvider {
  export type State = LabelableProviderState;
  export type Props = LabelableProviderProps;
}
