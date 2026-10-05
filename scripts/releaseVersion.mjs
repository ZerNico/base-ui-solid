/* eslint-disable no-console */
// Port note: replaces upstream's `lerna version --no-changelog --no-push --no-git-tag-version`.
// Sets the same version on every published package. Committing, tagging and pushing stay manual
// (see .github/workflows/publish.yml).
// Usage: pnpm release:version <version>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGES = ['packages/utils', 'packages/solid'];
// Semantic Versioning 2.0.0, https://semver.org/#is-there-a-suggested-regular-expression-regex-to-check-a-semver-string
const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

const version = process.argv[2]?.replace(/^v/, '');

if (!version || !SEMVER.test(version)) {
  console.error('Usage: pnpm release:version <version> (for example 1.0.0 or 1.0.0-beta.1)');
  process.exit(1);
}

for (const packageDir of PACKAGES) {
  const file = path.join(ROOT, packageDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(file, 'utf8'));
  const previous = packageJson.version;
  packageJson.version = version;
  fs.writeFileSync(file, `${JSON.stringify(packageJson, null, 2)}\n`);
  console.log(`${packageJson.name}: ${previous} -> ${version}`);
}

console.log(
  `\nNext: commit, then tag and push it:\n  git tag v${version}\n  git push origin v${version}`,
);
