// Upstream names that were renamed in the port, applied to paths inside the mapped source and
// test folders. Keep this in sync with the "Renamed modules" section of PORTING.md.
const RENAMES = [
  // A Solid port of upstream's vendored `@floating-ui/react` fork.
  [/(^|\/)floating-ui-react(?=\/|$)/, '$1floating-ui-solid'],
  // The store class that binds a Store to the framework's reactivity.
  [/(^|\/)ReactStore(?=\.)/, '$1SolidStore'],
  // Docs pages live under `/solid/` instead of `/react/`.
  [/(^|\/)\(docs\)\/react(?=\/|$)/, '$1(docs)/solid'],
];

/**
 * Maps a path below a mapped folder (for example `floating-ui-react/hooks/useHover.ts`) to the
 * port's name for it.
 * @param {string} relativePath
 */
export function toPortPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  return RENAMES.reduce(
    (result, [pattern, replacement]) => result.replace(pattern, replacement),
    normalized,
  );
}
