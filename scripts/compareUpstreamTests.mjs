// TypeScript 7 (the Go port) has no JS API, so the parser comes from TypeScript 5.
import ts from 'typescript-5';
import fs from 'node:fs';
import path from 'node:path';

import { fileURLToPath } from 'node:url';
import { toPortPath } from './portPaths.mjs';

// Compares every ported test file with its upstream counterpart: each upstream test must exist in
// the port (by full "describe > it" name) with the same effective skip condition. Hard skips are
// allowed when marked `React-only` or `TODO(port): needs <Component>`.
// Usage: node scripts/compareUpstreamTests.mjs [path/to/upstream/base-ui]
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const UP = path.resolve(process.argv[2] ?? path.join(ROOT, '../base-ui'), 'packages');
const PT = path.join(ROOT, 'packages');
// Tests of React-only utilities that have no Solid counterpart.
const REACT_ONLY_TEST_FILES = new Set(['utils/src/getReactElementRef.test.tsx']);

const MAP = [
  ['react/src', 'solid/src'],
  ['utils/src', 'utils/src'],
  ['react/test', 'solid/test'],
];

function isReactAPIDetection(condition) {
  return /^(?:!hasCaptureOwnerStack|(?:Safe)?React\.\w+\s*===?\s*undefined)$/.test(condition);
}

function norm(text) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/reactMajor\s*<\s*\d+\s*\|\|\s*/g, '')
    .replace(/\s*\|\|\s*reactMajor\s*<\s*\d+/g, '')
    .trim();
}

// Returns { [fullName]: condition } where condition is 'run' | 'skip' | 'skipIf(<expr>)' | 'only' ...
function collect(file) {
  const src = ts.createSourceFile(
    file,
    fs.readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const out = {};
  function calleeInfo(expr) {
    // it / it.skip / it.skipIf(c) / describe.skipIf(c) / it.each(rows)
    if (ts.isCallExpression(expr) && ts.isPropertyAccessExpression(expr.expression)) {
      const pa = expr.expression;
      if (['skipIf', 'runIf', 'each'].includes(pa.name.text) && ts.isIdentifier(pa.expression)) {
        return {
          base: pa.expression.text,
          mod:
            pa.name.text === 'each'
              ? 'each'
              : `${pa.name.text}(${norm(expr.arguments.map((a) => a.getText()).join(','))})`,
        };
      }
      if (
        ['skipIf', 'runIf', 'each'].includes(pa.name.text) &&
        ts.isPropertyAccessExpression(pa.expression) &&
        ts.isIdentifier(pa.expression.expression)
      ) {
        return {
          base: pa.expression.expression.text,
          mod: `${pa.expression.name.text}.${pa.name.text}(${norm(expr.arguments.map((a) => a.getText()).join(','))})`,
        };
      }
    }
    if (ts.isIdentifier(expr)) {
      return { base: expr.text, mod: '' };
    }
    if (ts.isPropertyAccessExpression(expr) && ts.isIdentifier(expr.expression)) {
      return { base: expr.expression.text, mod: expr.name.text };
    }
    return null;
  }
  function bodySkip(fn) {
    // ({ skip }) => { if (cond) skip(); }  or  function ({ skip }) ...
    if (!fn || !(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) {
      return '';
    }
    if (!fn.parameters.length) {
      return '';
    }
    const p = fn.parameters[0];
    if (
      !ts.isObjectBindingPattern(p.name) ||
      !p.name.elements.some((el) => el.name.getText() === 'skip')
    ) {
      return '';
    }
    let cond = '';
    if (fn.body && ts.isBlock(fn.body)) {
      for (const st of fn.body.statements.slice(0, 3)) {
        if (ts.isIfStatement(st) && /\bskip\s*\(/.test(st.thenStatement.getText())) {
          cond = norm(st.expression.getText());
        }
      }
    }
    // A condition that only detects the React version (e.g. `React.useId === undefined`) has no
    // Solid counterpart; the port runs the test unconditionally.
    if (isReactAPIDetection(cond)) {
      return '';
    }
    return cond ? `skipIf(${cond})` : '';
  }
  function visit(node, prefix, inherited) {
    if (ts.isCallExpression(node)) {
      const info = calleeInfo(node.expression);
      if (info && ['it', 'test', 'describe'].includes(info.base) && node.arguments.length >= 1) {
        const nameArg = node.arguments[0];
        const name = ts.isStringLiteralLike(nameArg) ? nameArg.text : nameArg.getText();
        const fn = node.arguments[node.arguments.length - 1];
        const conds = [...inherited];
        let mod = info.mod;
        if (/^skipIf\((.*)\)$/.test(mod) && isReactAPIDetection(mod.slice(7, -1))) {
          mod = '';
        }
        if (mod === 'skip') {
          // Allowed hard skips carry a reason marker in a leading comment or the body.
          const stmt = node.parent;
          const full = src.text.slice(stmt.getFullStart(), node.end);
          if (/React-only/.test(full)) {
            mod = 'skip(react-only)';
          } else if (/TODO\(port\): needs/.test(full)) {
            mod = 'skip(needs-component)';
          }
        }
        if (mod && mod !== 'each') {
          conds.push(mod);
        }
        const bs = bodySkip(fn);
        if (bs) {
          conds.push(bs);
        }
        // Test names mention renamed modules, see `portPaths.mjs`.
        const full = (prefix ? `${prefix} > ${name}` : name)
          .replace(/\bReactStore\b/g, 'SolidStore')
          .replace('@base-ui/react', 'base-ui-solid');
        if (info.base === 'describe') {
          if (fn) {
            ts.forEachChild(fn, (c) => visit(c, full, conds));
          }
        } else {
          out[full] = conds.length ? conds.join(' & ') : 'run';
        }
        return;
      }
    }
    ts.forEachChild(node, (c) => visit(c, prefix, inherited));
  }
  visit(src, '', []);
  return out;
}

function walk(dir, acc = []) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p, acc);
    } else if (/\.test\.tsx?$/.test(f)) {
      acc.push(p);
    }
  }
  return acc;
}

let diffs = 0;
const allowed = {};
const rows = [];
for (const [u, p] of MAP) {
  for (const upFile of walk(path.join(UP, u))) {
    const rel = toPortPath(path.relative(path.join(UP, u), upFile));
    const module = rel.split(path.sep)[0];
    const ptFile = path.join(PT, p, rel);
    if (!fs.existsSync(ptFile)) {
      // Every upstream test file needs a counterpart, except for React-only utilities.
      if (
        p.endsWith('/src') &&
        !REACT_ONLY_TEST_FILES.has(`${p}/${rel}`) &&
        (p === 'utils/src' ||
          (fs.existsSync(path.join(PT, p, module)) &&
            fs.statSync(path.join(PT, p, module)).isDirectory()) ||
          !rel.includes(path.sep))
      ) {
        rows.push([`${p}/${rel}`, '(test file)', 'present', 'MISSING']);
        diffs += 1;
      }
      continue;
    }
    const a = collect(upFile),
      b = collect(ptFile);
    for (const [name, cond] of Object.entries(a)) {
      if (!(name in b)) {
        rows.push([`${p}/${rel}`, name, cond, 'MISSING']);
        diffs += 1;
        continue;
      }
      const pc = b[name];
      const same = pc === cond;
      if (same) {
        continue;
      }
      if (/skip\(react-only\)|skip\(needs-component\)/.test(pc)) {
        allowed[pc.match(/skip\((\S+)\)/)[1]] = (allowed[pc.match(/skip\((\S+)\)/)[1]] || 0) + 1;
        continue;
      }
      rows.push([`${p}/${rel}`, name, cond, pc]);
      diffs += 1;
    }
  }
}
for (const r of rows) {
  // eslint-disable-next-line no-console
  console.log(`${r[0]}\n   ${r[1].slice(0, 120)}\n     upstream: ${r[2]}\n     port:     ${r[3]}`);
}
// eslint-disable-next-line no-console
console.log('\nALLOWED SKIPS:', JSON.stringify(allowed));
// eslint-disable-next-line no-console
console.log('DIFFERENCES:', diffs);
process.exitCode = diffs > 0 ? 1 : 0;
