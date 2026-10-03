import type { StyleProp } from '../internals/types';

/**
 * If the provided style is not a function, it will be returned as is.
 * Otherwise, the function will call the style function with the state as the first argument.
 *
 * @param style
 * @param state
 */
export function resolveStyle<State>(style: StyleProp<State> | undefined, state: State) {
  return typeof style === 'function' ? style(state) : style;
}
