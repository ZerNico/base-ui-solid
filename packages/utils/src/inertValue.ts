/**
 * Port note: upstream returns `'true'` on React < 19, which doesn't support the boolean `inert`
 * attribute. Solid renders boolean attributes by presence, so the value is returned as is.
 */
export function inertValue(value?: boolean): boolean | undefined {
  return value;
}
