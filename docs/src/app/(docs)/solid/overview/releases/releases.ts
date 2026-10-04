export interface Release {
  version: string;
  versionSlug: string;
  date: string;
  highlights: string[];
  latest?: true;
}

// Port note: base-ui-solid releases, newest first. Each entry needs a matching
// `v<x-y-z>/page.mdx` release page and a route. Upstream release notes are in its changelog.
export const releases: Release[] = [];
