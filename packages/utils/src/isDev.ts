import { DEV } from 'solid-js';

/**
 * Whether the code runs against Solid's development build.
 * Used in place of upstream's `process.env.NODE_ENV !== 'production'` checks so the
 * source works unbundled (no `process` global in the browser).
 */
export const IS_DEV = DEV !== undefined;
