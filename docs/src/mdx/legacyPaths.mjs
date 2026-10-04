// Port note: share permanent framework redirects across dev, SSR, and static previews.
export function legacyPath(pathname) {
  if (pathname === '/react' || pathname.startsWith('/react/')) {
    return pathname
      .replace(/^\/react(?=\/|$)/, '/solid')
      .replace(/^\/solid\/components\/radio(?=\/|$)/, '/solid/components/radio-group');
  }
  return undefined;
}
