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
                <For each={['Overview', 'Handbook', 'Components', 'Utils']}>
                  {(section) => (
                    <SideNav.Section>
                      <SideNav.Heading>{section}</SideNav.Heading>
                      <SideNav.List>
                        <For
                          each={[
                            ...pages,
                            {
                              section: 'Overview',
                              title: 'Releases',
                              href: '/react/overview/releases',
                              description: '',
                            },
                            {
                              section: 'Handbook',
                              title: 'llms.txt',
                              href: 'https://base-ui.com/llms.txt',
                              description: '',
                            },
                          ]
                            .filter((page) => page.section === section && page.title !== section)
                            .sort((a, b) => {
                              const order = [
                                'Quick start',
                                'Accessibility',
                                'Releases',
                                'Community',
                                'About Base UI',
                                'Styling',
                                'Animation',
                                'Composition',
                                'Customization',
                                'Forms',
                                'TypeScript',
                                'llms.txt',
                              ];
                              return section === 'Components' || section === 'Utils'
                                ? a.title.localeCompare(b.title)
                                : order.indexOf(a.title.replaceAll('\u00a0', ' ')) -
                                    order.indexOf(b.title.replaceAll('\u00a0', ' '));
                            })}
                        >
                          {(page) => <SideNav.Item href={page.href}>{page.title}</SideNav.Item>}
                        </For>
                      </SideNav.List>
                    </SideNav.Section>
                  )}
                </For>
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
