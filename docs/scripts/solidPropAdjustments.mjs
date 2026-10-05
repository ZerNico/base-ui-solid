// Port note: React types and ref objects aren't part of the Solid API. These rewrites turn
// upstream's prop types into the port's types. `generateReference.mjs` applies them to every prop,
// and they're idempotent, so `node scripts/generateReference.mjs --reapply` re-applies them to every
// existing `reference/*.json`.

const REF_OBJECT = String.raw`(?:React\.)?RefObject<([^<>]+?) \| null>`;

/**
 * Rewrites React types in a type string (e.g. `React.ReactNode`, `React.MouseEvent<…>`) to the
 * Solid and DOM types the port uses.
 */
export function adjustReactTypes(type) {
  return type
    .replace(
      /\bReact\.ReactNode\b|\bReactNode\b|\bReact\.ReactElement\b|\bReactElement\b/g,
      'JSX.Element',
    )
    .replace(/\bReact\.CSSProperties\b/g, 'JSX.CSSProperties')
    .replace(/\bReact\.(\w+)EventHandler<[^<>]*>/g, '((event: $1Event) => void)')
    .replace(/\bReact\.(\w*Event)(?:<[^<>]*(?:<[^<>]*>[^<>]*)*>)?/g, '$1');
}

/**
 * Rewrites a reference prop (`{ name, type, description }`) in place for Solid.
 */
export function adjustRefProp(prop) {
  prop.type = adjustReactTypes(prop.type);
  prop.description = prop.description.replace(/`ReactNode`/g, '`JSX.Element`');
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
  // Item and value render functions (`Combobox.List`, `Select.Value`, …) are called once with
  // their arguments as accessors.
  const renderFunction = /\(\(((?:\w+: [^()]+?)(?:, \w+: [^()]+?)*)\) => JSX\.Element\)/;
  const renderMatch = prop.name.startsWith('children') ? renderFunction.exec(prop.type) : null;
  if (renderMatch && !/^(?:arg|state):/.test(renderMatch[1])) {
    const params = renderMatch[1]
      .split(', ')
      .map((param) => param.replace(/^(\w+): (?!Accessor<)(.+)$/, '$1: Accessor<$2>'));
    prop.type = prop.type.replace(renderMatch[0], `((${params.join(', ')}) => JSX.Element)`);
    const note = renderMatch[1].startsWith('item:')
      ? 'A render function is called once per item with the item and its index as accessors, like `<For>` with a custom key, so read them in JSX.'
      : 'A render function is called once with its arguments as accessors, so read them in JSX to keep the content up to date.';
    if (prop.description === '-') {
      prop.description = note;
    } else if (!prop.description.includes(note)) {
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
