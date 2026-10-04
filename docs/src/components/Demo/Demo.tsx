import { createSignal, For, Show } from 'solid-js';
import { Dynamic } from '@solidjs/web';
import type { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { CodeNode } from '../CodeBlock/Hast';
import { Hast } from '../CodeBlock/Hast';
import './Demo.css';

export interface DemoVariant {
  name: string;
  component: Component;
  files: Record<string, CodeNode>;
}
function handleTabKeys(event: KeyboardEvent & { currentTarget: HTMLDivElement }) {
  const tabs = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const current = tabs.indexOf(event.target as HTMLButtonElement);
  if (current < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    return;
  }
  event.preventDefault();
  let next = (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  if (event.key === 'Home') {
    next = 0;
  }
  if (event.key === 'End') {
    next = tabs.length - 1;
  }
  tabs[next].focus();
  tabs[next].click();
}
export function Demo(props: { variants: DemoVariant[] }) {
  const [variant, setVariant] = createSignal(0);
  const [file, setFile] = createSignal('index.tsx');
  const [showCode, setShowCode] = createSignal(false);
  return (
    <section class="DemoRoot" aria-label="Live demo">
      <div
        class="DemoToolbar"
        role="tablist"
        tabindex="-1"
        aria-label="Styling variant"
        onKeyDown={handleTabKeys as JSX.EventHandler<HTMLDivElement, KeyboardEvent>}
      >
        <For each={props.variants}>
          {(item, index) => (
            <button
              role="tab"
              tabindex={variant() === index() ? 0 : -1}
              aria-selected={variant() === index() ? 'true' : 'false'}
              onClick={() => {
                setVariant(index());
                setFile('index.tsx');
              }}
            >
              {item.name}
            </button>
          )}
        </For>
      </div>
      <div class="DemoPreview" data-demo={variant() === 0 ? 'css-modules' : 'tailwind'}>
        <Dynamic component={props.variants[variant()].component} />
      </div>
      <button
        class="DemoSourceToggle"
        aria-expanded={showCode() ? 'true' : 'false'}
        onClick={() => setShowCode(!showCode())}
      >
        Source code
      </button>
      <Show when={showCode()}>
        <div
          role="tablist"
          tabindex="-1"
          aria-label="Source files"
          onKeyDown={handleTabKeys as JSX.EventHandler<HTMLDivElement, KeyboardEvent>}
        >
          <For each={Object.keys(props.variants[variant()].files)}>
            {(name) => (
              <button
                role="tab"
                aria-selected={file() === name ? 'true' : 'false'}
                onClick={() => setFile(name)}
              >
                {name}
              </button>
            )}
          </For>
        </div>
        <pre class="CodeBlockPre" tabindex="0">
          <code>
            <Show when={props.variants[variant()].files[file()]} keyed>
              {(node) => <Hast node={node} />}
            </Show>
          </code>
        </pre>
      </Show>
    </section>
  );
}
