/**
 * Mutable container, the counterpart of React's `RefObject`.
 * Used where upstream shares a mutable value through a ref object (e.g. a list of elements).
 */
export interface RefObject<T> {
  current: T;
}
