import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { toPortPath } from './portPaths.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mappings = [
  ['packages/react/src', 'packages/solid/src'],
  ['packages/utils/src', 'packages/utils/src'],
  ['packages/react/test', 'packages/solid/test'],
  ['docs', 'docs'],
];
const paths = mappings.map(([upstream]) => upstream);
const trackingPattern = /^(- Ported from upstream commit: )`([a-f\d]{7,40})`[^\r\n]*/m;

function print(message) {
  process.stdout.write(`${message}\n`);
}

function main() {
  const options = {
    upstream: path.resolve(root, '../base-ui'),
    'tracking-file': path.join(root, 'UPSTREAM.md'),
  };
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === '--help') {
      print(`Usage: pnpm upstream:sync [--upstream <checkout>] [--tracking-file <file>]
       pnpm upstream:sync --diff <commit|range> [options]
       pnpm upstream:sync --mark <commit> [options]

Fetch origin and list commits after UPSTREAM.md's tracked commit on its default branch.
File markers: [exists] / [missing] refer to the mapped file in this port.
--diff shows a commit's first-parent patch or a Git A..B / A...B diff.
--mark records a verified commit; it does not port changes or run verification.
Relative override paths are resolved from the current working directory.`);
      return;
    }
    if (!['--upstream', '--tracking-file', '--diff', '--mark'].includes(option)) {
      throw new Error(`Unknown option: ${option}. Use --help for usage.`);
    }
    const value = args[index + 1];
    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${option}.`);
    }
    const key = option.slice(2);
    if (key === 'diff' || key === 'mark') {
      if (options.diff || options.mark) {
        throw new Error('Specify only one --diff or --mark mode.');
      }
    }
    options[key] = value;
    index += 1;
  }

  const upstream = path.resolve(options.upstream);
  const trackingFile = path.resolve(options['tracking-file']);
  const document = readFileSync(trackingFile, 'utf8');
  const matches = [...document.matchAll(new RegExp(trackingPattern.source, 'gm'))];
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one tracked commit in ${trackingFile}.`);
  }
  function git(...gitArgs) {
    return execFileSync('git', ['-C', upstream, ...gitArgs], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  }
  function resolveCommit(revision) {
    return git('rev-parse', '--verify', '--end-of-options', `${revision}^{commit}`).trim();
  }

  console.error(`Fetching origin in ${upstream}...`);
  const remoteHead = git('ls-remote', '--symref', 'origin', 'HEAD');
  const branch = remoteHead.match(/^ref: refs\/heads\/(.+)\tHEAD$/m)?.[1];
  if (!branch) {
    throw new Error('Cannot determine origin’s default branch.');
  }
  // Fetch the discovered branch explicitly, including single-branch checkouts.
  git('fetch', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`);
  const tip = resolveCommit(`refs/remotes/origin/${branch}`);
  const tracked = resolveCommit(matches[0][2]);

  if (options.diff) {
    const range = options.diff.match(/^(.+?)(\.{2,3})([^.].*)$/);
    if (range) {
      const from = resolveCommit(range[1]);
      const to = resolveCommit(range[3]);
      process.stdout.write(
        git(
          'diff',
          '--no-ext-diff',
          '--no-textconv',
          '--no-color',
          `${from}${range[2]}${to}`,
          '--',
          ...paths,
        ),
      );
    } else {
      const commit = resolveCommit(options.diff);
      process.stdout.write(
        git(
          'show',
          '--first-parent',
          '--format=fuller',
          '--no-ext-diff',
          '--no-textconv',
          '--no-color',
          commit,
          '--',
          ...paths,
        ),
      );
    }
    return;
  }

  // Both listing and marking require the baseline to belong to the default branch.
  git('merge-base', '--is-ancestor', tracked, tip);
  if (options.mark) {
    const commit = resolveCommit(options.mark);
    git('merge-base', '--is-ancestor', tracked, commit);
    git('merge-base', '--is-ancestor', commit, tip);
    // Release/date annotations describe the old baseline, so remove them when advancing it.
    writeFileSync(trackingFile, document.replace(trackingPattern, `$1\`${commit}\``));
    print(`Updated ${trackingFile}: ${tracked} -> ${commit}`);
    return;
  }

  print(`Tracked: ${tracked}\nDefault branch: origin/${branch} (${tip})`);
  const commits = git('rev-list', '--reverse', '--topo-order', `${tracked}..${tip}`)
    .trim()
    .split('\n')
    .filter(Boolean);
  print(`${commits.length} upstream commit(s) since the tracked commit.`);
  for (const commit of commits) {
    print(`\n${git('show', '-s', '--format=%H %s', commit).trim()}`);
    const files = git(
      'show',
      '--first-parent',
      '--format=',
      '--name-status',
      '-z',
      '--no-renames',
      commit,
      '--',
      ...paths,
    )
      .split('\0')
      .filter(Boolean);
    if (!files.length) {
      print('  (no changes in the tracked paths)');
    }
    for (let index = 0; index < files.length; index += 2) {
      const status = files[index];
      const file = files[index + 1];
      const [source, destination] = mappings.find(
        ([prefix]) => file.startsWith(`${prefix}/`) || file === prefix,
      );
      const portFile = destination + toPortPath(file.slice(source.length));
      const marker = existsSync(path.join(root, portFile)) ? 'exists' : 'missing';
      print(`  ${status} ${JSON.stringify(file)} -> ${JSON.stringify(portFile)} [${marker}]`);
    }
  }
}

try {
  main();
} catch (error) {
  console.error(`upstream:sync: ${error.message}`);
  if (error.stderr) {
    console.error(String(error.stderr).trim());
  }
  process.exitCode = 1;
}
