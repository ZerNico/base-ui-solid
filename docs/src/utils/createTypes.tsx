import type { JSX } from '@solidjs/web';
import { For, Show } from 'solid-js';

interface Row {
  name: string;
  type: string;
  default?: string;
  description: string;
}
interface Reference {
  description: string;
  props: Row[];
  dataAttributes: Row[];
  cssVariables: Row[];
  additionalTypes?: { name: string; source: string }[];
}
function Description(props: { text: string }) {
  return (
    <For each={props.text.split(/(`[^`]+`)/g)}>
      {(part) => (part.startsWith('`') ? <code class="MdCode">{part.slice(1, -1)}</code> : part)}
    </For>
  );
}
function ReferenceTable(props: { title: string; rows: Row[] }) {
  return (
    <Show when={props.rows.length}>
      <h4 class="MdH4">{props.title}</h4>
      <div class="ReferenceOverflow">
        <table class="ReferenceTable">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Default</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.rows}>
              {(row) => (
                <tr>
                  <th scope="row">
                    <code>{row.name}</code>
                  </th>
                  <td>
                    <code>{row.type}</code>
                  </td>
                  <td>{row.default ?? '—'}</td>
                  <td>
                    <Description text={row.description} />
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
    </Show>
  );
}
// Port note: docs-infra's React type renderer is replaced by Solid JSX over the same reference fields.
export function createMultipleTypes<T extends Record<string, Reference>>(reference: T) {
  return Object.fromEntries(
    Object.entries(reference).map(([name, entry]) => [
      name,
      () => (
        <section>
          <p class="MdP">
            <Description text={entry.description} />
          </p>
          <ReferenceTable title="Props" rows={entry.props} />
          <ReferenceTable title="Data attributes" rows={entry.dataAttributes} />
          <ReferenceTable title="CSS variables" rows={entry.cssVariables} />
          <For each={entry.additionalTypes}>
            {(type) => (
              <details>
                <summary>{type.name}</summary>
                <pre class="CodeBlockPre">
                  <code>{type.source}</code>
                </pre>
              </details>
            )}
          </For>
        </section>
      ),
    ]),
  ) as { [K in keyof T]: () => JSX.Element };
}
