import { REPO_BRANCH, REPO_URL } from '../config';

let warned: Set<string>;
if (import.meta.env.DEV) {
  warned = new Set();
}

function warnInDevelopment(message: string, error?: unknown) {
  if (import.meta.env.DEV && !warned.has(message)) {
    warned.add(message);
    if (error == null) {
      console.warn(message);
    } else {
      console.warn(message, error);
    }
  }
}

// Port note: upstream reads the repository and the release tag from environment variables that
// next.config.mjs injects (and returns `null` without them). The port links the repository and
// branch from `config.ts`, like the other source links of the docs.
function getGitHubBaseUrl() {
  return `${REPO_URL}/tree/${REPO_BRANCH}`;
}

// Port note: es-toolkit's kebabCase, for the variant names the docs use.
function kebabCase(value: string) {
  return value
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
    .replace(/([a-z\d])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Converts a file:// URL from import.meta.url to a GitHub source URL
 * for the demo directory, optionally targeting a specific variant subdirectory.
 */
export function getGitHubDemoUrl(
  fileUrl: string | undefined,
  selectedVariant?: string,
): string | null {
  if (!fileUrl) {
    return null;
  }

  try {
    const normalized = decodeURIComponent(fileUrl).replace(/\\/g, '/');

    const docsIndex = normalized.indexOf('/docs/');
    if (docsIndex === -1) {
      return null;
    }

    // Extract from "docs/" onward
    const repoRelativePath = normalized.slice(docsIndex + 1);

    // Strip the trailing filename to get the directory
    const lastSlash = repoRelativePath.lastIndexOf('/');
    if (lastSlash === -1) {
      return null;
    }
    let dirPath = repoRelativePath.slice(0, lastSlash);

    if (selectedVariant && selectedVariant !== 'Default') {
      dirPath += `/${kebabCase(selectedVariant)}`;
    }

    const githubBase = getGitHubBaseUrl();

    return `${githubBase}/${dirPath}`;
  } catch (error) {
    warnInDevelopment('Base UI: Demo source link could not be generated.', error);
    return null;
  }
}
