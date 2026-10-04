import { createSignal, For, onSettled } from 'solid-js';
import type { Component } from 'solid-js';
import { render } from '@solidjs/web';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Link,
  Outlet,
  RouterProvider,
} from '@tanstack/solid-router';
import { useIsoLayoutEffect } from '@base-ui-solid/utils/useIsoLayoutEffect';
import TestViewer from './TestViewer';
import { fixtures } from './fixtures';
import type { Fixture } from './fixtures';
import 'docs/src/css/index.css';

const viewerRoot = document.getElementById('test-viewer');

// Port note: upstream keeps one React root per `FixtureRenderer` and lets a later
// `root.render()` replace the fixture. Disposing a Solid root clears its container, so the
// fixture currently rendered in `#test-viewer` is tracked here and disposed before the next one
// renders.
let disposeViewer: (() => void) | null = null;

function FixtureRenderer(props: { component: Component; isTailwind: boolean }) {
  useIsoLayoutEffect(
    ([FixtureComponent, isTailwind]) => {
      let dispose: (() => void) | null = null;
      const renderTimeout = setTimeout(() => {
        if (viewerRoot == null) {
          return;
        }
        disposeViewer?.();
        dispose = render(
          () => (
            <TestViewer isTailwind={isTailwind}>
              <FixtureComponent />
            </TestViewer>
          ),
          viewerRoot,
        );
        disposeViewer = dispose;
      });

      return () => {
        clearTimeout(renderTimeout);
        setTimeout(() => {
          if (dispose != null && disposeViewer === dispose) {
            dispose();
            disposeViewer = null;
          }
        });
      };
    },
    () => [props.component, props.isTailwind],
  );

  return null;
}

function computePath(fixture: Fixture) {
  return `/${fixture.suite}/${fixture.name}`;
}

function App() {
  function computeIsDev() {
    if (window.location.hash === '#dev') {
      return true;
    }
    if (window.location.hash === '#no-dev') {
      return false;
    }
    return process.env.NODE_ENV === 'development';
  }
  const [isDev, setDev] = createSignal(computeIsDev());
  onSettled(() => {
    function handleHashChange() {
      setDev(computeIsDev());
    }
    window.addEventListener('hashchange', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  });

  return (
    <>
      <Outlet />

      <div hidden={!isDev()}>
        <p>
          Devtools can be enabled by appending <code>#dev</code> in the addressbar or disabled by
          appending <code>#no-dev</code>.
        </p>
        <a href="#no-dev">Hide devtools</a>
        <details>
          <summary id="my-test-summary">nav for all tests</summary>
          <nav id="tests">
            <ol>
              <For each={fixtures}>
                {(fixture) => {
                  const path = computePath(fixture);
                  return (
                    <li>
                      <Link to={path}>{path}</Link>
                    </li>
                  );
                }}
              </For>
            </ol>
          </nav>
        </details>
      </div>
    </>
  );
}

// Port note: upstream renders react-router's `<Routes>` inside `App`. TanStack Router declares the
// routes up front, with `App` as the root route component rendering the matched fixture in its
// `<Outlet />`.
const rootRoute = createRootRoute({ component: App });

const fixtureRoutes = fixtures.flatMap((fixture) => {
  const path = computePath(fixture);
  const FixtureComponent = fixture.Component;
  if (FixtureComponent === undefined) {
    console.warn('Missing `Component` for ', fixture);
    return [];
  }

  return [
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => (
        <FixtureRenderer component={FixtureComponent} isTailwind={fixture.isTailwind} />
      ),
    }),
  ];
});

const router = createRouter({ routeTree: rootRoute.addChildren(fixtureRoutes) });

const container = document.getElementById('react-root');
const children = () => <RouterProvider router={router} />;

if (container != null) {
  render(children, container);
}
