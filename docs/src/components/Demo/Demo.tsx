import { createSignal, For, Show } from 'solid-js';
import { Dynamic } from '@solidjs/web';
import { Select } from 'base-ui-solid/select';
import type { Component } from 'solid-js';
import type { JSX } from '@solidjs/web';
import type { CodeNode } from '../CodeBlock/Hast';
import { Hast } from '../CodeBlock/Hast';
import './Demo.css';
import '../GhostButton.css';
import '../Select.css';
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
        <div
          class="DemoPlaygroundInner"
          data-demo={props.variants[variant()].name === 'Tailwind' ? 'tailwind' : 'css-modules'}
        >
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
              <For
                each={Object.keys(props.variants[variant()].files).sort(
                  (a, b) => Number(b === 'index.tsx') - Number(a === 'index.tsx'),
                )}
              >
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
        <div class="DemoToolbarActions">
          <Show when={props.variants.length > 1}>
            {/* Port note: Solid's Select preserves the upstream styling-method selector behavior. */}
            <Select.Root
              value={variant()}
              items={props.variants.map((item, index) => ({ label: item.name, value: index }))}
              onValueChange={(value) => {
                if (value !== null) {
                  setVariant(value);
                  setFile('index.tsx');
                  setShowCode(true);
                }
              }}
            >
              <Select.Trigger class="GhostButton" data-layout="text" aria-label="Styling method">
                <Select.Value />
                <Select.Icon>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M11 10H5l3 3.5zm0-4H5l3-3.5z" />
                  </svg>
                </Select.Icon>
              </Select.Trigger>
              <Select.Portal>
                <Select.Positioner class="SelectPositioner" align="center" sideOffset={7}>
                  <Select.Popup class="SelectPopup">
                    <For each={props.variants}>
                      {(item, index) => (
                        <Select.Item class="SelectItem" value={index()}>
                          <Select.ItemIndicator class="SelectItemIndicator">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 16 16"
                              fill="none"
                              aria-hidden="true"
                            >
                              <path d="m2.5 8.5 4 4 7-9" stroke="currentColor" />
                            </svg>
                          </Select.ItemIndicator>
                          <Select.ItemText class="SelectItemText">{item.name}</Select.ItemText>
                        </Select.Item>
                      )}
                    </For>
                  </Select.Popup>
                </Select.Positioner>
              </Select.Portal>
            </Select.Root>
          </Show>
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
