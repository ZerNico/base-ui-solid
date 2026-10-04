import { createSignal, For, Show } from 'solid-js';
import { Dynamic } from '@solidjs/web';
import type { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { CodeNode } from '../CodeBlock/Hast';
import { Hast } from '../CodeBlock/Hast';
import './Demo.css';
import '../GhostButton.css';
import { CopyIcon } from '../../icons/CopyIcon';

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
  let source: HTMLPreElement | undefined;
  const [variant, setVariant] = createSignal(0);
  const [file, setFile] = createSignal('index.tsx');
  const [showCode, setShowCode] = createSignal(false);
  return (
    <section class="DemoRoot" aria-label="Live demo">
      <div class="DemoPlayground DemoPreview">
        <div class="DemoPlaygroundInner" data-demo={variant() === 0 ? 'css-modules' : 'tailwind'}>
          <Dynamic component={props.variants[variant()].component} />
        </div>
      </div>
      <div class="DemoToolbar">
        <div class="DemoToolbarScrollAreaRoot">
          <div class="DemoToolbarViewport" style={{ 'overflow-x': 'auto' }}>
            <div
              class="DemoTabsList"
              role="tablist"
              tabindex="-1"
              aria-label="Source files"
              onKeyDown={handleTabKeys as JSX.EventHandler<HTMLDivElement, KeyboardEvent>}
            >
              <For each={Object.keys(props.variants[variant()].files)}>
                {(name) => (
                  <button
                    class="DemoTab"
                    role="tab"
                    data-active={file() === name || undefined}
                    tabindex={file() === name ? 0 : -1}
                    aria-selected={file() === name ? 'true' : 'false'}
                    onClick={() => setFile(name)}
                  >
                    <span>{name}</span>
                  </button>
                )}
              </For>
            </div>
          </div>
        </div>
        <div
          class="DemoToolbarActions"
          tabindex="-1"
          role="tablist"
          aria-label="Styling variant"
          onKeyDown={handleTabKeys as JSX.EventHandler<HTMLDivElement, KeyboardEvent>}
        >
          <For each={props.variants}>
            {(item, index) => (
              <button
                class="DemoVariant"
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
      </div>
      <div class="DemoCodeBlockCollapsible">
        <div class="DemoCodeBlockRoot" data-closed={!showCode() || undefined}>
          <button
            class="GhostButton DemoCodeBlockCopyButton"
            data-layout="icon"
            aria-label="Copy code"
            onClick={() => navigator.clipboard.writeText(source?.textContent ?? '')}
          >
            <CopyIcon />
          </button>
          <div class="DemoCodeBlockViewport" data-closed={!showCode() || undefined} tabindex="0">
            <div class="DemoSourceBrowser">
              <pre
                ref={(element) => {
                  source = element;
                }}
              >
                <code>
                  <Show when={props.variants[variant()].files[file()]} keyed>
                    {(node) => <Hast node={node} />}
                  </Show>
                </code>
              </pre>
            </div>
          </div>
        </div>
        <button
          class="DemoCollapseButton DemoSourceToggle"
          data-sticky={showCode() || undefined}
          aria-expanded={showCode() ? 'true' : 'false'}
          onClick={() => setShowCode(!showCode())}
        >
          <span class="DemoCollapseButtonVisual">{showCode() ? 'Hide code' : 'Show code'}</span>
        </button>
      </div>
    </section>
  );
}
