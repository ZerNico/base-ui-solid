import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { REPO_BRANCH, REPO_URL } from '../config';
import { getGitHubDemoUrl } from './getGitHubDemoUrl';

// Port note: the source link reads the repository and branch from `config.ts` instead of the
// SOURCE_CODE_REPO and LIB_VERSION environment variables. Upstream's tests for the version tag
// and for missing environment variables have no equivalent and aren't ported.
describe('getGitHubDemoUrl', () => {
  const GITHUB_BASE = `${REPO_URL}/tree/${REPO_BRANCH}`;
  const unixUrl =
    'file:///home/user/base-ui/docs/src/app/(docs)/solid/components/accordion/demos/hero/index.ts';
  const windowsUrl =
    'file:///C:/Users/Dev/base-ui/docs/src/app/(docs)/solid/components/accordion/demos/hero/index.ts';

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('converts a Unix file URL to a GitHub directory URL', () => {
    expect(getGitHubDemoUrl(unixUrl)).toBe(
      `${GITHUB_BASE}/docs/src/app/(docs)/solid/components/accordion/demos/hero`,
    );
  });

  it('converts a Windows file URL to a GitHub directory URL', () => {
    expect(getGitHubDemoUrl(windowsUrl)).toBe(
      `${GITHUB_BASE}/docs/src/app/(docs)/solid/components/accordion/demos/hero`,
    );
  });

  it('appends the kebab-cased variant subdirectory for CssModules', () => {
    expect(getGitHubDemoUrl(unixUrl, 'CssModules')).toBe(
      `${GITHUB_BASE}/docs/src/app/(docs)/solid/components/accordion/demos/hero/css-modules`,
    );
    // Port note: the Solid docs name the variant `CSS Modules`.
    expect(getGitHubDemoUrl(unixUrl, 'CSS Modules')).toBe(
      `${GITHUB_BASE}/docs/src/app/(docs)/solid/components/accordion/demos/hero/css-modules`,
    );
  });

  it('appends the variant subdirectory for Tailwind', () => {
    expect(getGitHubDemoUrl(unixUrl, 'Tailwind')).toBe(
      `${GITHUB_BASE}/docs/src/app/(docs)/solid/components/accordion/demos/hero/tailwind`,
    );
  });

  it('does not append a subdirectory for the Default variant', () => {
    expect(getGitHubDemoUrl(unixUrl, 'Default')).toBe(
      `${GITHUB_BASE}/docs/src/app/(docs)/solid/components/accordion/demos/hero`,
    );
  });

  it('returns null for undefined url', () => {
    expect(getGitHubDemoUrl(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getGitHubDemoUrl('')).toBeNull();
  });

  it('returns null when /docs/ is not in the path', () => {
    expect(getGitHubDemoUrl('file:///home/user/other-project/src/index.ts')).toBeNull();
  });

  describe('warnings', () => {
    // Warnings are deduplicated via module state, so each test needs a fresh module instance.
    let getGitHubDemoUrlFresh: typeof getGitHubDemoUrl;

    beforeEach(async () => {
      vi.resetModules();
      ({ getGitHubDemoUrl: getGitHubDemoUrlFresh } = await import('./getGitHubDemoUrl'));
    });

    it('returns null and warns in development when the file URL cannot be decoded', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      expect(getGitHubDemoUrlFresh('file:///home/user/base-ui/docs/%E0%A4%A/index.ts')).toBeNull();
      expect(warn).toHaveBeenCalledWith(
        'Base UI: Demo source link could not be generated.',
        expect.any(URIError),
      );
    });
  });

  it('handles encoded URI components', () => {
    const encoded = unixUrl.replace(/\(/g, '%28').replace(/\)/g, '%29');
    expect(getGitHubDemoUrl(encoded)).toBe(
      `${GITHUB_BASE}/docs/src/app/(docs)/solid/components/accordion/demos/hero`,
    );
  });
});
