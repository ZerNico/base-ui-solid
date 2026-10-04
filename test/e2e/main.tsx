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
import * as DomTestingLibrary from '@testing-library/dom';
import TestViewer from './TestViewer';
import 'docs/src/css/index.css';

declare global {
  interface Window {
    DomTestingLibrary: typeof DomTestingLibrary;
    elementToString: (element: Node | null | undefined) => string | false;
  }
}

interface Fixture {
  Component: Component<any>;
  name: string;
  path: string;
  suite: string;
}

const globbedFixtures = import.meta.glob<{ default: Component }>(
  './fixtures/**/*.{js,jsx,ts,tsx}',
  {
    eager: true,
  },
);

const fixtures: Fixture[] = [];

for (const path in globbedFixtures) {
  const [suite, name] = path
    .replace('./', '')
    .replace(/\.\w+$/, '')
    .split('/');

  fixtures.push({
    path,
    suite: `e2e-${suite}`,
    name,
    Component: globbedFixtures[path].default,
  });
}

function computePath(fixture: Fixture) {
  return `/${fixture.suite}/${fixture.path.slice(11, -4)}`;
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
                {(test) => {
                  const path = computePath(test);
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
    console.warn('Missing `Component` ', fixture);
    return [];
  }

  return [
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => (
        <TestViewer>
          <FixtureComponent />
        </TestViewer>
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

window.DomTestingLibrary = DomTestingLibrary;
window.elementToString = function elementToString(element) {
  if (
    element != null &&
    (element.nodeType === element.ELEMENT_NODE || element.nodeType === element.DOCUMENT_NODE)
  ) {
    return window.DomTestingLibrary.prettyDOM(element as Element, undefined, {
      highlight: true,
      maxDepth: 1,
    });
  }
  return String(element);
};
