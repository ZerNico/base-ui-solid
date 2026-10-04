import { createMemo, createSignal, Show, untrack } from 'solid-js';
import { Portal } from '@solidjs/web';
import type { JSX } from '@solidjs/web';
import { isElement } from '@floating-ui/utils/dom';
import { mergeCleanups } from '../mergeCleanups';
import { ownerDocument, ownerWindow } from '../owner';
import { addEventListener } from '../addEventListener';
import type { Store } from './Store';
import { useForcedRerendering } from '../useForcedRerendering';
import { useAnimationFrame } from '../useAnimationFrame';
import { useIsoLayoutEffect } from '../useIsoLayoutEffect';
import { useTimeout } from '../useTimeout';
import { NOOP } from '../empty';

const STYLES = `
.baseui-store-inspector-trigger {
  all: unset;
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: oklch(0.651 0.078 264);
}

.baseui-store-inspector-trigger:hover,
.baseui-store-inspector-trigger:focus-visible {
 opacity: 0.8;
}

.baseui-store-inspector-content {
  background: #101010;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding-bottom: 12px;
  scrollbar-width: thin;
  padding: 8px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.baseui-store-inspector-content h3 {
  text-transform: uppercase;
  font-weight: bold;
}

.baseui-store-inspector-content pre {
  margin: 0 0 16px 0;
}

.baseui-store-inspector-content pre:last-child {
  margin-bottom: 0;
}

.baseui-store-inspector-root {
  position: fixed;
  background: oklch(0.34 0.036 264);
  color: #fff;
  z-index: 1000;
  font-size: 12px;
  padding: 8px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  max-width: 50vw;
  color-scheme: dark;
  overflow: clip;
  box-shadow:
    0 10px 15px -3px oklch(12% 9% 264deg / 8%),
    0 4px 6px -4px oklch(12% 9% 264deg / 8%);
}

.baseui-store-inspector-header {
  display: flex;
  align-items: center;
  cursor: move;
  -webkit-user-select: none;
  user-select: none;
  touch-action: none;
  padding: 4px 8px 8px 8px;
  gap: 8px;

  h2 {
    font-size: 16px;
    flex-grow: 1;
  }
}

.baseui-store-inspector-header button {
  all: unset;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
}

.baseui-store-inspector-header button:hover,
.baseui-store-inspector-header button:focus-visible {
  opacity: 0.8;
}

.baseui-store-inspector-resize-handle {
  position: absolute;
  width: 8px;
  height: 8px;
  right: -4px;
  bottom: -4px;
  cursor: se-resize;
  background: linear-gradient(135deg, transparent 50%, rgba(255, 255, 255, 0.25) 50%);
  border-radius: 2px;
}
`;

function getTarget(event: Event) {
  if ('composedPath' in event) {
    return event.composedPath()[0];
  }

  return (event as Event).target;
}

/**
 * Minimal shape of a store owner (such as a Base UI popup handle) that exposes a live store to
 * inspect. Typed structurally so this dev utility stays decoupled from the component packages'
 * handle types. The exposed store is loosely typed on purpose: handles narrow it for their public
 * API, but at runtime it is a full `Store`, which the inspector casts to internally.
 */
export interface StoreOwner {
  readonly store: object;
  subscribeStore?(listener: () => void): () => void;
}

interface StoreInspectorBaseProps {
  /**
   * Additional data to display in the inspector.
   */
  additionalData?: any;
  /**
   * Title to display in the panel header.
   */
  title?: string | undefined;
  /**
   * Whether the inspector panel should be open by default.
   * @default false
   */
  defaultOpen?: boolean | undefined;
}

export type StoreInspectorProps = StoreInspectorBaseProps &
  (
    | {
        /**
         * Instance of the store to inspect.
         */
        store: Store<any>;
        handle?: undefined;
      }
    | {
        /**
         * A store owner (such as a Base UI popup handle) whose live `store` is inspected.
         */
        handle: StoreOwner;
        store?: undefined;
      }
  );

/**
 * A tool to inspect the state of a Store in a floating panel.
 * This is intended for development and debugging purposes.
 */
export function StoreInspector(props: StoreInspectorProps) {
  const store = useStoreInspectorStore(props);
  const [open, setOpen] = createSignal(untrack(() => props.defaultOpen ?? false));
  // Port note: upstream reads `triggerRef.current` during render (`null` on the first render).
  let triggerElement: HTMLButtonElement | null = null;

  return (
    <>
      {/* Port note: React 19 hoists and dedupes `<style href precedence>`; it's rendered inline here. */}
      <style>{STYLES}</style>
      <button
        ref={(element) => {
          triggerElement = element;
        }}
        class="baseui-store-inspector-trigger"
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((o) => !o);
        }}
        title="Toggle store inspector"
        aria-hidden="true"
      >
        <FileJson />
      </button>
      <StoreInspectorPanel
        anchorElement={triggerElement}
        open={open()}
        store={store()}
        title={props.title}
        additionalData={props.additionalData}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

/**
 * Port note: returns an accessor. A handle's store is re-read when the handle notifies
 * (upstream's `useSyncExternalStore`).
 */
function useStoreInspectorStore(props: StoreInspectorProps) {
  const [track, trigger] = createSignal(undefined, { equals: false, ownedWrite: true });

  useIsoLayoutEffect(
    ([handle]) => {
      return handle?.subscribeStore?.(() => trigger(undefined)) ?? NOOP;
    },
    () => [props.handle],
  );

  return createMemo(() => {
    track();
    // A handle exposes a narrowed store view for its public API; at runtime it is a full `Store`.
    return (props.store ?? props.handle?.store) as Store<any>;
  });
}

interface PanelProps {
  anchorElement: HTMLElement | null;
  store: Store<any>;
  title?: string | undefined;
  additionalData?: any;
  open: boolean;
  onClose?: (() => void) | undefined;
}

export function StoreInspectorPanel(props: PanelProps) {
  const rerender = useForcedRerendering();
  const rerenderTimeout = useTimeout();

  // Update when state changes
  useIsoLayoutEffect(
    ([store]) => {
      const unsubscribe = store.subscribe(() => {
        rerenderTimeout.start(1, () => rerender());
      });

      return unsubscribe;
    },
    () => [props.store],
  );

  const logToConsole = () => {
    const store = props.store;
    const data: any = {
      state: store.state,
    };

    if (Object.keys((store as any).context ?? {}).length > 0) {
      data.context = (store as any).context;
    }

    if (props.additionalData !== undefined) {
      data.additionalData = props.additionalData;
    }

    // eslint-disable-next-line no-console
    console.log(data);
  };

  if (typeof document === 'undefined') {
    // The environment doesn't change, so the early return doesn't break reactivity.
    // eslint-disable-next-line solid/components-return-once
    return null;
  }

  // Port note: the panel content is re-evaluated when the store notifies (`rerender.track()`),
  // like upstream's forced rerender.
  const state = createMemo(() => {
    rerender.track();
    return JSON.stringify(props.store.state, getStringifyReplacer(), 2);
  });

  const context = createMemo(() => {
    rerender.track();
    const storeContext = (props.store as any).context ?? {};
    return Object.keys(storeContext).length > 0
      ? JSON.stringify(storeContext, getStringifyReplacer(), 2)
      : undefined;
  });

  const additionalData = createMemo(() => {
    rerender.track();
    return props.additionalData !== undefined
      ? JSON.stringify(props.additionalData, getStringifyReplacer(), 2)
      : undefined;
  });

  return (
    <Show when={props.open}>
      <Portal mount={ownerDocument(untrack(() => props.anchorElement)).body}>
        <Window
          title={props.title ?? 'Store Inspector'}
          onClose={props.onClose}
          headerActions={
            <button type="button" onClick={logToConsole} title="Log to console">
              <SquareTerminal />
            </button>
          }
        >
          <h3>State</h3>
          <pre>{state()}</pre>
          <Show when={context() !== undefined}>
            <h3>Context</h3>
            <pre>{context()}</pre>
          </Show>
          <Show when={additionalData() !== undefined}>
            <h3>Additional data</h3>
            <pre>{additionalData()}</pre>
          </Show>
        </Window>
      </Portal>
    </Show>
  );
}

function getStringifyReplacer() {
  const ancestors: any[] = [];

  return function replacer(this: unknown, _: string, value: unknown) {
    if (isElement(value)) {
      return `Element(${value.tagName.toLowerCase()}${value.id ? `#${value.id}` : ''})`;
    }

    if (value === undefined) {
      return '[undefined]';
    }

    if (value instanceof Map) {
      return Array.from(value.entries());
    }

    if (value instanceof Set) {
      return Array.from(value);
    }

    if (typeof value !== 'object' || value === null) {
      return value;
    }
    // `this` is the object that value is contained in,
    // i.e., its direct parent.
    while (ancestors.length > 0 && ancestors.at(-1) !== this) {
      ancestors.pop();
    }

    if (ancestors.includes(value)) {
      return '[circular reference]';
    }

    ancestors.push(value);
    return value;
  };
}

interface WindowProps {
  title?: string | undefined;
  onClose?: (() => void) | undefined;
  children: JSX.Element;
  headerActions?: JSX.Element | undefined;
}

/**
 * A reusable draggable and resizable window component.
 * Handles all the pointer events for dragging and resizing internally.
 */
function Window(props: WindowProps) {
  let rootElement: HTMLDivElement | null = null;
  let headerElement: HTMLDivElement | null = null;
  const raf = useAnimationFrame();
  const minWidth = 160;
  const minHeight = 52;

  // Track position when user drags the window
  const [position, setPosition] = createSignal<{ left: number; top: number } | null>(null, {
    ownedWrite: true,
  });
  let dragState: {
    dragging: boolean;
    startX: number;
    startY: number;
    startLeft: number;
    startTop: number;
  } | null = null;

  // Track size when user resizes the window
  const [size, setSize] = createSignal<{ width: number; height: number } | null>(null, {
    ownedWrite: true,
  });
  let resizeState: {
    resizing: boolean;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
    minWidth: number;
    minHeight: number;
    maxWidth: number;
    maxHeight: number;
  } | null = null;

  useIsoLayoutEffect(
    ([currentPosition]) => {
      if (currentPosition != null) {
        return;
      }
      const el = rootElement;
      if (!el) {
        return;
      }

      setPosition({ left: 8, top: 8 });
    },
    () => [position()],
  );

  const onPointerDown = (event: PointerEvent) => {
    if (!headerElement || !rootElement) {
      return;
    }
    const target = getTarget(event) as Element | null;
    if (target && target.closest('button')) {
      return;
    }
    const currentPos = untrack(position) ?? { left: 8, top: 8 };
    dragState = {
      dragging: true,
      startX: event.clientX,
      startY: event.clientY,
      startLeft: currentPos.left,
      startTop: currentPos.top,
    };
    try {
      headerElement.setPointerCapture(event.pointerId);
    } catch {
      void 0;
    }
    event.preventDefault();
  };

  const endDrag = (event?: PointerEvent) => {
    if (headerElement && event) {
      try {
        headerElement.releasePointerCapture(event.pointerId);
      } catch {
        void 0;
      }
    }
    if (dragState) {
      dragState.dragging = false;
    }
  };

  const onPointerMove = (event: PointerEvent) => {
    const state = dragState;
    if (!state || !state.dragging) {
      return;
    }
    const nextLeft = state.startLeft + (event.clientX - state.startX);
    const nextTop = Math.max(0, state.startTop + (event.clientY - state.startY));

    raf.request(() => {
      setPosition({ left: nextLeft, top: nextTop });
    });
  };

  const onResizePointerDown = (event: PointerEvent) => {
    if (!rootElement) {
      return;
    }
    const rect = rootElement.getBoundingClientRect();
    const currentPosition = untrack(position);
    const currentSize = untrack(size) ?? { width: rect.width, height: rect.height };
    const currentLeft = currentPosition?.left ?? rect.left;
    const currentTop = currentPosition?.top ?? rect.top;
    const win = ownerWindow(rootElement);
    const maxWidth = Math.max(100, win.innerWidth - currentLeft);
    const maxHeight = Math.max(80, win.innerHeight - currentTop);
    resizeState = {
      resizing: true,
      startX: event.clientX,
      startY: event.clientY,
      startWidth: currentSize.width,
      startHeight: currentSize.height,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
    };
    try {
      (event.currentTarget as any)?.setPointerCapture?.((event as any).pointerId);
    } catch {
      void 0;
    }
    event.preventDefault();
  };

  const onResizePointerMove = (event: PointerEvent) => {
    const state = resizeState;
    if (!state || !state.resizing) {
      return;
    }
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    const nextWidth = Math.min(state.maxWidth, Math.max(state.minWidth, state.startWidth + dx));
    const nextHeight = Math.min(state.maxHeight, Math.max(state.minHeight, state.startHeight + dy));
    raf.request(() => {
      setSize({ width: nextWidth, height: nextHeight });
    });
  };

  const endResize = (event?: PointerEvent) => {
    if (event) {
      try {
        (getTarget(event) as any)?.releasePointerCapture?.((event as any).pointerId);
      } catch {
        void 0;
      }
    }
    if (resizeState) {
      resizeState.resizing = false;
    }
  };

  // Bind/unbind global listeners for dragging and resizing
  useIsoLayoutEffect(
    () => {
      const win = ownerWindow(rootElement);
      const move = (event: PointerEvent) => {
        onPointerMove(event);
        onResizePointerMove(event);
      };
      const up = (event: PointerEvent) => {
        endDrag(event);
        endResize(event);
      };
      return mergeCleanups(
        addEventListener(win, 'pointermove', move),
        addEventListener(win, 'pointerup', up),
        addEventListener(win, 'pointercancel', up),
      );
    },
    () => [],
  );

  // Compute window style once per render
  // Port note: a memo of the Solid style object (kebab-case, `px` units).
  const style = createMemo(() => {
    const currentPosition = position();
    const currentSize = size();
    const result: JSX.CSSProperties = {};
    let win: Window | null = null;
    if (rootElement) {
      win = ownerWindow(rootElement);
    } else if (typeof window !== 'undefined') {
      win = window;
    }
    const viewportMax = win ? Math.max(0, win.innerHeight - 16) : undefined;
    if (currentPosition) {
      result.top = px(currentPosition.top);
      result.left = px(currentPosition.left);
      result.right = 'auto';
      result.position = 'fixed';
      if (currentSize?.width != null) {
        result.width = px(currentSize.width);
      }
      if (currentSize?.height != null) {
        result.height = px(currentSize.height);
      }
      result['max-height'] = px(
        win ? Math.max(0, win.innerHeight - currentPosition.top - 8) : undefined,
      );
    } else {
      if (currentSize?.width != null) {
        result.width = px(currentSize.width);
      }
      if (currentSize?.height != null) {
        result.height = px(currentSize.height);
      }
      result['max-height'] = px(viewportMax);
    }
    return result;
  });

  return (
    <div
      ref={(element) => {
        rootElement = element;
      }}
      class="baseui-store-inspector-root"
      style={style()}
    >
      <div
        ref={(element) => {
          headerElement = element;
        }}
        class="baseui-store-inspector-header"
        onPointerDown={onPointerDown}
      >
        <h2>{props.title}</h2>
        {props.headerActions}
        <button type="button" onClick={() => props.onClose?.()} title="Close window">
          <CloseIcon />
        </button>
      </div>
      <div class="baseui-store-inspector-content">{props.children}</div>
      <div onPointerDown={onResizePointerDown} style={{ position: 'relative' }}>
        <div class="baseui-store-inspector-resize-handle" />
      </div>
    </div>
  );
}

function px(value: number | undefined) {
  return value === undefined ? undefined : `${value}px`;
}

function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  );
}

function FileJson() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
      <path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" />
      <path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" />
    </svg>
  );
}

function SquareTerminal() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path d="m7 11 2-2-2-2" />
      <path d="M11 13h4" />
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
    </svg>
  );
}
