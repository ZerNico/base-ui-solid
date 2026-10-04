import type { JSX } from '@solidjs/web';

// Port note: Solid style objects are kebab-case, so the styles are assigned with `setProperty`.
export function clearStyles(element: HTMLElement | null, originalStyles: JSX.CSSProperties) {
  if (element) {
    for (const [property, value] of Object.entries(originalStyles)) {
      element.style.setProperty(property, value == null ? '' : String(value));
    }
  }
}

export const LIST_FUNCTIONAL_STYLES = {
  position: 'relative',
  'max-height': '100%',
  'overflow-x': 'hidden',
  'overflow-y': 'auto',
} as const;
