// Port note: React ref objects aren't part of the Solid API. These rewrites turn upstream's
// `RefObject` prop types into the port's types. `generateReference.mjs` applies them to every prop,
// and they're idempotent, so they can also be re-applied to an existing `reference/*.json`.

const REF_OBJECT = String.raw`(?:React\.)?RefObject<([^<>]+?) \| null>`;

/**
 * Rewrites a reference prop (`{ name, type, description }`) in place for Solid.
 */
export function adjustRefProp(prop) {
  // Outputs: the library hands the user something through a callback, like Solid's `ref`.
  if (prop.name === 'actionsRef') {
    prop.type = prop.type.replace(new RegExp(`^${REF_OBJECT}$`), '((actions: $1) => void)');
    prop.description = prop.description.replace(
      /^A ref to imperative actions\./,
      "A callback that receives the imperative actions. It's called once, when the component is set up (like a `ref` callback).",
    );
  }
  if (prop.name === 'inputRef') {
    prop.type = prop.type.replace(/^(?:React\.|JSX\.)?Ref<(\w+)>$/, '((element: $1) => void)');
  }
  // Inputs: the user passes one of their elements (e.g. from a signal set by a ref callback).
  if (['container', 'anchor', 'initialFocus', 'finalFocus'].includes(prop.name)) {
    prop.type = prop.type
      .replace(new RegExp(`${REF_OBJECT} \\| `), (match, inner) =>
        prop.name === 'initialFocus' || prop.name === 'finalFocus' ? `${inner} | null | ` : '',
      )
      .replace(/^(.*) \| null \| (\(.*\)) \| null$/, '$1 | null | $2');
    prop.description = prop.description.replace(
      '`RefObject`: Move focus to the ref element.',
      "`HTMLElement`: Move focus to the element. `null` (an element that isn't set yet) falls back to the default behavior.",
    );
  }
  // Root render-function children receive `{ payload }` with `payload` as an accessor.
  if (prop.name === 'children' && prop.type.includes('PayloadChildRenderFunction<Payload>')) {
    prop.type = prop.type
      .replace(/React\.ReactNode/g, 'JSX.Element')
      .replace(
        'PayloadChildRenderFunction<Payload>',
        '((arg: { payload: Accessor<Payload | undefined> }) => JSX.Element)',
      );
    const note =
      "A render function is called once with `{ payload }`, where `payload` is an accessor of the active trigger's payload, so it can be destructured.";
    if (!prop.description.includes(note)) {
      prop.description = `${prop.description}\n${note}`;
    }
  }
  return prop;
}

/**
 * Rewrites an additional type's source (e.g. `ToastObject`) for Solid.
 */
export function adjustRefTypeSource(source) {
  return source.replace(
    '/** The ref for the toast. */\n  ref?: RefObject<HTMLElement | null>;',
    "/** Returns the toast's root element (`null` while it isn't mounted). */\n  ref?: () => HTMLElement | null;",
  );
}
