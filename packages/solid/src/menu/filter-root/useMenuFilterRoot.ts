import { omit, merge } from 'solid-js';
import type { RefObject } from '@base-ui-solid/utils/refObject';
import { platform } from '@base-ui-solid/utils/platform';
import { useIsHydrating } from '../../utils/useIsHydrating';
import type { MenuFilterRootProps } from './MenuFilterRoot';
/** Splits a filterable root's props between the menu root and the filter below it. */
export function useMenuFilterRoot<Payload>(props: MenuFilterRootProps<Payload>) {
  const otherProps = omit(
    props,
    'children',
    'value',
    'defaultValue',
    'onValueChange',
    'filter',
    'autoHighlight',
    'locale',
  );
  const virtualFocusRef = { current: null } as RefObject<HTMLElement | null>;
  const hydrating = useIsHydrating();
  // Port note: preserve lazy props through Solid's merge and getters.
  return {
    get children() {
      return props.children;
    },
    rootProps: merge(otherProps, {
      virtualFocus: true,
      get webkitItemSelected() {
        return !hydrating() && platform.engine.webkit;
      },
      virtualFocusRef,
      get allowEscape() {
        return !props.autoHighlight;
      },
      get resetOnPointerLeave() {
        return props.autoHighlight !== 'always';
      },
    }),
    dropdownProps: {
      get value() {
        return props.value;
      },
      get defaultValue() {
        return props.defaultValue;
      },
      get onValueChange() {
        return props.onValueChange;
      },
      get filter() {
        return props.filter;
      },
      get autoHighlight() {
        return props.autoHighlight ?? false;
      },
      get locale() {
        return props.locale;
      },
    },
  };
}
