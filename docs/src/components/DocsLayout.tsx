import type { JSX } from '@solidjs/web';
import { For } from 'solid-js';
import { Header } from './Header';
import * as SideNav from './SideNav';
import * as QuickNav from './QuickNav/QuickNav';
import { pages } from '../data/sitemap';
import '../app/(docs)/layout.css';
import { MAIN_CONTENT_ID } from './SkipNav';

export function DocsLayout(props: { children: JSX.Element }) {
  return (
    <>
      <div class="RootLayout">
        <div class="RootLayoutContainer">
          <div class="RootLayoutContent">
            <div class="ContentLayoutRoot">
              <Header />
              <SideNav.Root>
                <SideNav.Section>
                  <SideNav.Heading>Components</SideNav.Heading>
                  <SideNav.List>
                    <For each={pages}>
                      {(page) => <SideNav.Item href={page.href}>{page.title}</SideNav.Item>}
                    </For>
                  </SideNav.List>
                </SideNav.Section>
              </SideNav.Root>
              <main class="ContentLayoutMain" id={MAIN_CONTENT_ID}>
                <QuickNav.Container>{props.children}</QuickNav.Container>
              </main>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
