import type { ClassProp } from '../internals/types';

/**
 * If the provided class is not a function, it will be returned as is.
 * Otherwise, the function will call the class function with the state as the first argument.
 *
 * @param className
 * @param state
 */
export function resolveClassName<State>(className: ClassProp<State> | undefined, state: State) {
  return typeof className === 'function' ? className(state) : className;
}
