import { Link } from '@tanstack/solid-router';
import { omit, Show } from 'solid-js';
import type { JSX } from '@solidjs/web';

/**
 * Port note: stands in for upstream's `next/link`. Links to docs pages navigate on the client
 * through TanStack Router. Everything outside the router (hash links, external URLs, `/r/`
 * redirects, static files such as `.md`/`.txt`) stays a native anchor, like upstream's `Link`.
 */
export function RouterLink(props: JSX.IntrinsicElements['a']) {
  const route = () => {
    const href = typeof props.href === 'string' ? props.href : undefined;
    if (!href || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/r/')) {
      return undefined;
    }
    const [pathAndSearch, hash] = href.split('#');
    const [path] = pathAndSearch.split('?');
    if (/\.[a-z0-9]+$/i.test(path)) {
      return undefined;
    }
    return { path, hash };
  };

  const other = omit(props, 'href', 'children', 'class');

  return (
    <Show when={route()} fallback={<a {...props} />}>
      {(target) => (
        // TanStack's `Link` passes `class` through as a plain attribute, so flatten Solid's
        // class arrays and objects, and don't add its default `active` class.
        <Link
          {...(other as any)}
          class={toClassName(props.class)}
          activeProps={{}}
          to={target().path}
          hash={target().hash}
        >
          {props.children}
        </Link>
      )}
    </Show>
  );
}

function toClassName(value: unknown): string | undefined {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(toClassName).filter(Boolean).join(' ') || undefined;
  }
  if (typeof value === 'object') {
    return (
      Object.entries(value)
        .filter(([, enabled]) => enabled)
        .map(([name]) => name)
        .join(' ') || undefined
    );
  }
  return undefined;
}
