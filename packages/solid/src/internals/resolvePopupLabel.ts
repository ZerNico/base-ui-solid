interface PopupLabelProps {
  'aria-label'?: string | undefined;
  'aria-labelledby'?: string | undefined;
  render?: unknown;
}

export function resolvePopupLabel(
  props: PopupLabelProps,
  activeTriggerElement: Element | null,
  activeTriggerId: string | null,
) {
  // Port note: upstream also reads `aria-label`/`aria-labelledby` from a `render` element's props
  // (unwrapping server-created `React.lazy` wrappers). Solid doesn't support element `render`
  // props (only functions, components and tag names, which are opaque), so only the component's
  // own props are read.
  const ariaLabel = props['aria-label'];
  let ariaLabelledBy = props['aria-labelledby'];

  if (ariaLabelledBy == null && !ariaLabel) {
    // Prefer the element's live id: a `render` element's own id wins over the registered one.
    ariaLabelledBy = activeTriggerElement
      ? activeTriggerElement.id || undefined
      : activeTriggerId || undefined;
  }

  return ariaLabelledBy;
}
