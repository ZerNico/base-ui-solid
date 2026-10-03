import { Show } from 'solid-js';
import { useIsHydrating } from '../utils/useIsHydrating';
import { useCSPContext } from './csp-context/CSPContext';

/**
 * Renders an inline script that runs before Solid hydrates, used by components that need
 * to position server-rendered content ahead of hydration (e.g. `Tabs.Indicator`,
 * `Slider.Thumb`).
 *
 * The `script` source is imported by the caller through the package's `#prehydration/*`
 * subpath import, whose `browser` condition resolves to a stub module exporting an empty
 * string — so the script body is excluded from client bundles. It only ever executes from
 * server-rendered HTML.
 *
 * Render this only when the script should be emitted (i.e. gate `renderBeforeHydration`
 * and any structural conditions at the call site). The element is still rendered (with
 * empty content) on the client during the hydration pass so the tree matches the
 * server markup, and the already-executed server script is kept. Once `isHydrating` flips to
 * `false` the element unmounts.
 *
 * When adding a new consumer, register a matching `#prehydration/*` entry (with `browser`
 * and `default` conditions) in `packages/solid/package.json` `imports`; the `browser`
 * condition reuses the shared `internals/prehydrationScript.stub.ts`.
 */
export function PrehydrationScript(props: PrehydrationScript.Props) {
  const csp = useCSPContext();
  const isHydrating = useIsHydrating();

  return (
    <Show when={isHydrating()}>
      {/* Port note: there's no `suppressHydrationWarning`. Hydration claims the server-rendered
      element (whose script has already run) even though the client content is empty. */}
      {/* eslint-disable-next-line solid/no-innerhtml */}
      <script nonce={csp.nonce} innerHTML={props.script} />
    </Show>
  );
}

export namespace PrehydrationScript {
  export interface Props {
    /**
     * The script source, imported through the `#prehydration/*` subpath import.
     * Empty in client bundles.
     */
    script: string;
  }
}
