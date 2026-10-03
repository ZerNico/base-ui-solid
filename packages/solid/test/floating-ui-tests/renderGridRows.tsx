import { children as resolveChildren } from 'solid-js';
import type { JSX } from '@solidjs/web';

export const GRID_COLUMN_COUNT = 2;

/**
 * Port note: Solid has no `React.Children`, so the (already created) children are resolved with
 * Solid's `children` helper. Call it where the children should be created (under the providers).
 */
export function renderGridRows(children: JSX.Element, grid?: boolean): JSX.Element {
  if (!grid) {
    return children;
  }

  const items = resolveChildren(() => children).toArray();

  return Array.from({ length: Math.ceil(items.length / GRID_COLUMN_COUNT) }, (_row, rowIndex) => (
    <div role="row" style={{ display: 'contents' }}>
      {items.slice(rowIndex * GRID_COLUMN_COUNT, rowIndex * GRID_COLUMN_COUNT + GRID_COLUMN_COUNT)}
    </div>
  ));
}
