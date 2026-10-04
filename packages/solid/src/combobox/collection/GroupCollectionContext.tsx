import { createContext, useContext } from 'solid-js';
import type { JSX } from '@solidjs/web';

/**
 * Port note: `items` is a getter.
 */
interface GroupCollectionContext {
  items: readonly any[];
}

const GroupCollectionContext = createContext<GroupCollectionContext | null>(null);

export function useGroupCollectionContext() {
  return useContext(GroupCollectionContext);
}

export function GroupCollectionProvider(props: GroupCollectionProvider.Props) {
  const contextValue: GroupCollectionContext = {
    get items() {
      return props.items;
    },
  };

  return <GroupCollectionContext value={contextValue}>{props.children}</GroupCollectionContext>;
}

namespace GroupCollectionProvider {
  export interface Props {
    children: JSX.Element;
    items: readonly any[];
  }
}
