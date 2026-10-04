// Port note: one configuration shared by browser components and Node docs generators.
// Set these before deploying the docs or publishing a source repository.
export const SITE_URL = 'https://base-ui-solid.example';
export const REPO_URL = 'https://github.com/OWNER/base-ui-solid';
export const REPO_BRANCH = 'main';

export function sourceUrl(path: string) {
  const portPath = path.replace(/^packages\/react\/src\//, 'packages/solid/src/');
  return `${REPO_URL}/blob/${REPO_BRANCH}/${portPath}`;
}
