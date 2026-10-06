export interface Release {
  version: string;
  versionSlug: string;
  date: string;
  highlights: string[];
  latest?: true;
}

// Port note: base-ui-solid releases, newest first. Each entry needs a matching
// `v<x-y-z>/page.mdx` release page and a route. Upstream release notes are in its changelog.
export const releases: Release[] = [
  {
    version: 'v0.1.0',
    versionSlug: 'v0-1-0',
    date: '2026-10-06',
    latest: true,
    highlights: [
      'Render-function children get accessors (`{ payload }`, Combobox items, `*.Value` parts)',
      '`actionsRef`, `inputRef` and element-valued props replace React ref objects',
      'Reactive `mergeProps`, and Combobox and Select value types inferred from `items`',
      'Fixes for list item removal, Menu indicators and SSR input defaults',
    ],
  },
  {
    version: 'v0.0.1',
    versionSlug: 'v0-0-1',
    date: '2026-10-05',
    highlights: ['First release, porting Base UI v1.8.0 to Solid 2.0'],
  },
];
