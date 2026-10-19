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
    version: 'v0.3.1',
    versionSlug: 'v0-3-1',
    date: '2026-10-19',
    latest: true,
    highlights: [
      'Popups wait for exit animations that start a frame after they close, like Motion components in the `render` prop',
    ],
  },
  {
    version: 'v0.3.0',
    versionSlug: 'v0-3-0',
    date: '2026-10-16',
    highlights: [
      'Requires Solid `2.0.0-rc.15`',
      'Popups no longer flood the console with `EFFECT_RELAY_TEAR` diagnostics in development',
      'Fixes for Number Field, Toast, Popover, Menu, OTP Field and Select',
    ],
  },
  {
    version: 'v0.2.0',
    versionSlug: 'v0-2-0',
    date: '2026-10-12',
    highlights: [
      'Syncs with Base UI v1.9.0',
      'Removes the unreleased `highlightItem` action, as upstream did',
      'Fixes for Field, Tabs, Collapsible, Combobox, Drawer, Menu and labels in shadow roots',
      'Fieldset Legend exposes `data-disabled`',
    ],
  },
  {
    version: 'v0.1.0',
    versionSlug: 'v0-1-0',
    date: '2026-10-06',
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
