import { useId } from '@base-ui-solid/utils/useId';

/**
 * Wraps `useId` and prefixes generated `id`s with `base-ui-`
 * @param {string | undefined} idOverride overrides the generated id when provided
 * @returns {string}
 */
export function useBaseUiId(idOverride?: string): string {
  return useId(idOverride, 'base-ui');
}
