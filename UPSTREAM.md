# Upstream tracking

This is a port of [mui/base-ui](https://github.com/mui/base-ui) (`@base-ui/react`) to Solid 2.0.

- Ported from upstream commit: `57920487fb91b7ce4f92548e7a6c0ce95abb4907`
- Reference checkout: `../base-ui`

The tracked commit is on upstream's default branch, which usually runs ahead of the latest release.
Upstream tags releases on a separate release branch, so a tag is not an ancestor of the tracked
commit. base-ui.com documents the latest release, so it can differ from this port where
upstream changed something after that release.

The folder layout mirrors upstream (`packages/react/src/*` → `packages/solid/src/*`,
`packages/utils/src/*` → `packages/utils/src/*`, plus the renames listed in `PORTING.md`) so upstream diffs can be ported file by file.
See `PORTING.md` for the React → Solid translation rules.

## Syncing with upstream

1. Run `pnpm upstream:sync`. It fetches `origin` in `../base-ui`, discovers its default
   branch, and lists every commit since the tracked commit, oldest first. Changed files in
   `packages/react/src`, `packages/utils/src`, `packages/react/test`, and `docs` are mapped to
   `packages/solid/src`, `packages/utils/src`, `packages/solid/test`, and `docs`. Each entry shows
   its Git status and whether the mapped port file currently exists. Renames appear as a deletion
   and an addition. Merge commits show changes against their first parent.
2. Inspect each patch with `pnpm upstream:sync --diff <commit>`, or inspect a range with
   `pnpm upstream:sync --diff <old>..<new>` (Git three-dot ranges are also supported).
   Port each applicable diff following [PORTING.md](./PORTING.md), including source, tests,
   type tests, helpers, and documentation. Keep track of the last fully processed commit,
   including commits with no applicable changes.
3. Run full verification before advancing the baseline: `npx tsc -p tsconfig.json`,
   `pnpm test:jsdom --run --silent=false`, `pnpm test:chromium --run --silent=false`, and
   `pnpm test:compare-upstream`. Require passing tests, no Solid diagnostics, and no upstream
   test differences for the synced files. Format changed files with `npx prettier --write <files>`
   and lint them with `pnpm exec eslint --report-unused-disable-directives --max-warnings 0 <files>`.
4. After all applicable changes through a commit are ported and verified, run
   `pnpm upstream:sync --mark <commit>`. This resolves the full hash and updates only the tracking
   line in this document, removing the previous baseline's release/date annotation. It rejects
   commits outside the default branch or behind the current baseline. Commit the ported changes
   and the updated tracking document together.

Use `--upstream /path/to/base-ui` to override the reference checkout. The script uses plain Git
commands and does not change the upstream working tree. Its fetch updates remote-tracking refs.
Use `--tracking-file /tmp/UPSTREAM.md` with a temporary copy to rehearse listing or marking without
changing this document. Relative override paths resolve from the current working directory.
Port-file existence checks always use this repository. If a shallow checkout lacks the tracked
commit or the history needed to prove ancestry, deepen it with
`git -C ../base-ui fetch --deepen=100 origin` (or use `--unshallow` for full history). Run `pnpm upstream:sync --help` for usage.
