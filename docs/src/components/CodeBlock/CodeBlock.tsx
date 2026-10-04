import type { JSX } from '@solidjs/web';
import { omit, Show } from 'solid-js';
import { CopyIcon } from '../../icons/CopyIcon';
import '../GhostButton.css';
import './CodeBlock.css';

// Port note: highlighted HAST is compiled directly into Solid JSX rather than React CodeHighlighter.
export function CodeBlock(props: JSX.IntrinsicElements['pre'] & { 'data-title'?: string }) {
  let root: HTMLElement | undefined;
  return (
    <figure
      class="CodeBlockRoot MdFigure"
      ref={(element) => {
        root = element;
      }}
    >
      <Show when={props['data-title']}>
        <div class="CodeBlockPanel">
          <div class="CodeBlockPanelTitle">{props['data-title']}</div>
          <button
            class="GhostButton"
            data-layout="icon"
            aria-label="Copy code"
            onClick={() =>
              navigator.clipboard.writeText(root?.querySelector('code')?.textContent ?? '')
            }
          >
            <CopyIcon />
          </button>
        </div>
      </Show>
      <div class="CodeBlockPreContainer">
        <div class="CodeBlockViewport" tabindex="0" style={{ 'overflow-x': 'auto' }}>
          <pre
            {...omit(props, 'children', 'class', 'data-title')}
            class="CodeBlockPre CodeBlockPreInline"
          >
            {props.children}
          </pre>
        </div>
      </div>
    </figure>
  );
}
