import type { JSX } from '@solidjs/web';
import { For, Show } from 'solid-js';

interface Row {
  name: string;
  type: string;
  default?: string;
  description: string;
  required?: boolean;
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
    <For each={props.text.replace(/([a-z])'([a-z])/gi, '$1’$2').split(/(`[^`]+`)/g)}>
      {(part) => (part.startsWith('`') ? <code class="MdCode">{part.slice(1, -1)}</code> : part)}
    </For>
  );
}
// Port note: expose the full translated type in the disclosure and the upstream compact label in the row.
function shortType(type: string) {
  if (type.includes('=>')) {
    return 'function';
  }
  let depth = 0;
  for (const character of type) {
    if ('(<[{'.includes(character)) {
      depth += 1;
    }
    if (')>]}'.includes(character)) {
      depth -= 1;
    }
    if (character === '|' && depth === 0) {
      return 'Union';
    }
  }
  return type;
}
function typeColor(type: string) {
  if (type === 'function') {
    return 'var(--color-red)';
  }
  if (['string', 'boolean', 'number'].includes(type)) {
    return 'var(--color-blue)';
  }
  return 'var(--color-violet)';
}
function ReferenceTable(props: { title: string; rows: Row[] }) {
  return (
    <Show when={props.rows.length}>
      <Show when={props.title !== 'Props'}>
        <h4 class="MdH4">{props.title}</h4>
      </Show>
      <div
        class={[
          'AccordionRoot ReferenceAccordionRoot ReferenceBlock',
          { 'bp0:bui-d-n': props.title !== 'Props' },
        ]}
        style={{ '--rows': props.rows.length }}
      >
        <div class="AccordionHeaderRow ReferenceHeaderRow">
          <div class="AccordionHeaderCell">
            <div class="AccordionHeaderCellInner">{props.title === 'Props' ? 'Prop' : 'Name'}</div>
          </div>
          <div class="AccordionHeaderCell ReferenceHeaderTypeCell">
            <div class="AccordionHeaderCellInner">Type</div>
          </div>
          <div class="AccordionHeaderCell ReferenceHeaderDefaultCell">
            <div class="AccordionHeaderCellInner">Default</div>
          </div>
          <div class="ReferenceHeaderIconCell" />
        </div>
        <For each={props.rows}>
          {(row) => (
            <details class="AccordionItem">
              <summary class="AccordionTrigger ReferenceTrigger">
                <span class="AccordionScrollable ReferenceNameCell">
                  <span class="AccordionScrollableInner">
                    <code class="TableCode bui-ws-nw" style={{ color: 'var(--color-navy)' }}>
                      {row.name}
                      <Show when={row.required}>
                        <sup class="ReferenceRequired">*</sup>
                      </Show>
                    </code>
                  </span>
                </span>
                <span class="AccordionScrollable ReferenceTypeCell">
                  <span class="AccordionScrollableInner">
                    <code
                      class="TableCode bui-ws-nw"
                      style={{ color: typeColor(shortType(row.type)) }}
                    >
                      {shortType(row.type)}
                    </code>
                  </span>
                </span>
                <span class="AccordionScrollable ReferenceDefaultCell">
                  <span class="AccordionScrollableInner">
                    <code
                      class="TableCode"
                      style={{
                        color:
                          row.default && row.default !== '-'
                            ? 'var(--color-blue)'
                            : 'var(--color-gray)',
                      }}
                    >
                      {row.default?.replaceAll('`', '').replace(/^-$/, '—') ?? '—'}
                    </code>
                  </span>
                </span>
                <span class="ReferenceIconWrap">
                  <svg
                    class="AccordionIcon ReferenceIcon"
                    width="10"
                    height="10"
                    viewBox="0 0 10 10"
                    fill="none"
                  >
                    <path d="M1 3.5L5 7.5L9 3.5" stroke="currentColor" />
                  </svg>
                </span>
              </summary>
              <div class="AccordionPanel">
                <div class="AccordionContent ReferenceCompactPanel">
                  <Description text={row.description} />
                  <code class="TableCode">{row.type}</code>
                </div>
              </div>
            </details>
          )}
        </For>
      </div>
      <Show when={props.title !== 'Props'}>
        <div
          class="TableRoot ReferenceTableRoot ReferenceBlock bui-d-n bp0:bui-d-b"
          style={{ '--rows': props.rows.length }}
        >
          <table class="TableRootTable">
            <thead>
              <tr>
                <th class="TableColumnHeader ReferenceWideNameColumn">
                  <div class="TableCellInner">
                    {props.title === 'CSS variables' ? 'CSS Variable' : 'Attribute'}
                  </div>
                </th>
                <th class="TableColumnHeader ReferenceWideDescriptionColumn">
                  <div class="TableCellInner">Description</div>
                </th>
                <th class="TableColumnHeader bui-w-10" aria-hidden="true">
                  <span class="bui-v-h">-</span>
                </th>
              </tr>
            </thead>
            <tbody>
              <For each={props.rows}>
                {(row) => (
                  <tr>
                    <th class="TableCell">
                      <div class="TableCellInner">
                        <code class="TableCode" style={{ color: 'var(--color-navy)' }}>
                          {row.name}
                        </code>
                      </div>
                    </th>
                    <td class="TableCell" colspan="2">
                      <div class="TableCellInner" style={{ 'white-space': 'normal' }}>
                        <Description text={row.description} />
                      </div>
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
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
          <Show when={Object.keys(reference).length > 1}>
            <p class="MdP">
              <Description text={entry.description} />
            </p>
          </Show>
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
