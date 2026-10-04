import { REASONS } from '../internals/reasons';

/**
 * The `onItemHighlighted` reason for a list navigation event, matching the event type that the
 * reason promises in its details.
 *
 * Port note: handlers receive native events, so there's no React synthetic event type.
 */
export function getHighlightReason(
  event: Event | undefined,
): typeof REASONS.keyboard | typeof REASONS.pointer | typeof REASONS.none {
  if (event == null) {
    return REASONS.none;
  }
  if (event.type.startsWith('key')) {
    return REASONS.keyboard;
  }
  if (event.type.startsWith('mouse') || event.type.startsWith('pointer')) {
    return REASONS.pointer;
  }
  return REASONS.none;
}
