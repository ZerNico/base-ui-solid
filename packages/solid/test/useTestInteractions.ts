import type { HTMLProps } from '../src/internals/types';
import type { ElementProps } from '../src/floating-ui-solid/types';
import {
  ACTIVE_KEY,
  FOCUSABLE_ATTRIBUTE,
  SELECTED_KEY,
} from '../src/floating-ui-solid/utils/constants';

export type ExtendedUserProps = {
  [ACTIVE_KEY]?: boolean | undefined;
  [SELECTED_KEY]?: boolean | undefined;
};

export type TestElementProps = Omit<ElementProps, 'item'> & {
  item?:
    HTMLProps<HTMLElement> | ((props: ExtendedUserProps) => HTMLProps<HTMLElement>) | undefined;
};

export interface UseTestInteractionsReturn {
  getReferenceProps: (userProps?: HTMLProps<Element>) => Record<string, unknown>;
  getFloatingProps: (userProps?: HTMLProps<HTMLElement>) => Record<string, unknown>;
  getItemProps: (
    userProps?: Omit<HTMLProps<HTMLElement>, 'selected' | 'active'> & ExtendedUserProps,
  ) => Record<string, unknown>;
  getTriggerProps: (userProps?: HTMLProps<Element>) => Record<string, unknown>;
}

/**
 * Port note: the interaction hooks' `ElementProps` are read lazily, so call the returned getters
 * in a reactive scope (e.g. spread them in JSX: `<button {...getReferenceProps()} />`).
 */
export function useTestInteractions(
  propsList: Array<TestElementProps | void> = [],
): UseTestInteractionsReturn {
  const getReferenceProps = (userProps?: HTMLProps<Element>) =>
    mergeProps(userProps, propsList, 'reference');

  const getFloatingProps = (userProps?: HTMLProps<HTMLElement>) =>
    mergeProps(userProps, propsList, 'floating');

  const getItemProps = (
    userProps?: Omit<HTMLProps<HTMLElement>, 'selected' | 'active'> & ExtendedUserProps,
  ) => mergeProps(userProps, propsList, 'item');

  const getTriggerProps = (userProps?: HTMLProps<Element>) =>
    mergeProps(userProps, propsList, 'trigger');

  return { getReferenceProps, getFloatingProps, getItemProps, getTriggerProps };
}

/* eslint-disable guard-for-in */

function mergeProps<Key extends keyof TestElementProps>(
  userProps: (HTMLProps<any> & ExtendedUserProps) | undefined,
  propsList: Array<TestElementProps | void>,
  elementKey: Key,
): Record<string, unknown> {
  const eventHandlers = new Map<string, Array<(...args: unknown[]) => void>>();
  const isItem = elementKey === 'item';

  const outputProps = {} as Record<string, unknown>;

  if (elementKey === 'floating') {
    outputProps.tabindex = -1;
    outputProps[FOCUSABLE_ATTRIBUTE] = '';
  }

  for (let i = 0; i < propsList.length; i += 1) {
    let props;

    const propsOrGetProps = propsList[i]?.[elementKey];
    if (typeof propsOrGetProps === 'function') {
      props = userProps ? propsOrGetProps(userProps) : null;
    } else {
      props = propsOrGetProps;
    }
    if (!props) {
      continue;
    }

    mutablyMergeProps(outputProps, props, isItem, eventHandlers);
  }

  mutablyMergeProps(outputProps, userProps, isItem, eventHandlers);

  return outputProps;
}

function mutablyMergeProps(
  outputProps: Record<string, unknown>,
  props: any,
  isItem: boolean,
  eventHandlers: Map<string, Array<(...args: unknown[]) => void>>,
) {
  for (const key in props) {
    const value = (props as any)[key];

    if (isItem && (key === ACTIVE_KEY || key === SELECTED_KEY)) {
      continue;
    }

    if (!isEventHandlerKey(key)) {
      outputProps[key] = value;
      continue;
    }

    if (typeof value !== 'function') {
      continue;
    }

    let handlers = eventHandlers.get(key);
    if (!handlers) {
      const newHandlers: Array<(...args: unknown[]) => void> = [];
      handlers = newHandlers;
      eventHandlers.set(key, handlers);

      outputProps[key] = (...args: unknown[]) => {
        let returnValue: unknown;

        for (const fn of newHandlers) {
          const result = fn(...args);
          if (returnValue === undefined && result !== undefined) {
            returnValue = result;
          }
        }

        return returnValue;
      };
    }

    handlers.push(value);
  }
}

function isEventHandlerKey(key: string) {
  const thirdCharCode = key.charCodeAt(2);
  return (
    key.charCodeAt(0) === 111 &&
    key.charCodeAt(1) === 110 &&
    thirdCharCode >= 65 &&
    thirdCharCode <= 90
  );
}
