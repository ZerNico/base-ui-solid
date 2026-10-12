/**
 * Port note: upstream counts React renders by incrementing a counter in a `render` function. Solid
 * calls a `render` function once and updates the element in place, so render mocks record each
 * change of the props and state it receives instead. Call this from a JSX expression in the
 * `render` function (`{recordRender(props, state, onRender)}`): it reads every prop (except
 * `children`, which must only be created once) and state key, so the expression re-runs, and calls
 * `onRender`, whenever one of them changes.
 */
export function recordRender(props: object, state: object | undefined, onRender: () => void): null {
  for (const key of Object.keys(props)) {
    if (key !== 'children') {
      Reflect.get(props, key);
    }
  }
  if (state) {
    for (const key of Object.keys(state)) {
      Reflect.get(state, key);
    }
  }
  onRender();
  return null;
}
