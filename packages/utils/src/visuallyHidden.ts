// Port note: Solid style objects use kebab-case property names and don't append `px` to numbers.
type CSSProperties = Readonly<Record<string, string | number>>;

const visuallyHiddenBase = {
  'clip-path': 'inset(50%)',
  overflow: 'hidden',
  'white-space': 'nowrap',
  border: 0,
  padding: 0,
  width: '1px',
  height: '1px',
  margin: '-1px',
} satisfies CSSProperties;

export const visuallyHidden = {
  ...visuallyHiddenBase,
  position: 'fixed',
  margin: 0,
  top: 0,
  left: 0,
} satisfies CSSProperties;

export const visuallyHiddenInput = {
  ...visuallyHiddenBase,
  position: 'absolute',
} satisfies CSSProperties;
