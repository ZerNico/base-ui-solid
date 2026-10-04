import { Accordion } from 'base-ui-solid/accordion';
import { SITE_URL } from '../../config';
import { Link } from './Link';
import { PlusIcon } from './icons/PlusIcon';
import { MinusIcon } from './icons/MinusIcon';

export default function Homepage() {
  return (
    <div style={{ display: 'contents' }}>
      <script
        type="application/ld+json"
        // Port note: trusted static schema uses Solid's innerHTML API.
        // eslint-disable-next-line solid/no-innerhtml
        innerHTML={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'Base UI Solid',
          url: SITE_URL,
        })}
      />
      {/* Set the Site name for Google results. https://developers.google.com/search/docs/appearance/site-names */}
      {/* Organization schema for Google Knowledge Panel and entity recognition.
          https://developers.google.com/search/docs/appearance/structured-data/organization */}

      <section class="bui-d-c">
        <h1 class="Text sz-3 bp2:sz-4 bui-gcs-1 bui-gce-9 bp4:bui-gce-5">
          Unstyled UI components for building accessible user interfaces
        </h1>
        <div class="bui-gcs-1 bui-gce-9">
          <Link class="Text sz-2 bui-d-if" href="/solid/overview/quick-start" withArrow>
            Documentation
          </Link>
        </div>
      </section>
      <section class="bui-d-c">
        <div class="bui-d-f bui-fd-c bui-g-4 bui-gcs-1 bui-gce-9 bp2:bui-gcs-3 bp4:bui-gce-7">
          <p class="Text sz-2">
            Base UI Solid is an unofficial port of{' '}
            <Link href="https://base-ui.com">Base&nbsp;UI</Link> to Solid&nbsp;2.0: unstyled,
            accessible UI components for building design systems and web applications.
          </p>
          <p class="Text sz-2">
            The port follows Base&nbsp;UI file by file. Components keep the same parts, props, data
            attributes, CSS variables, and behavior, and the upstream test suite is ported alongside
            them, so Base&nbsp;UI's design and documentation apply to Solid as well.
          </p>
          <p class="Text sz-2">
            Base&nbsp;UI is created by the team behind Radix, Floating&nbsp;UI, and
            Material&nbsp;UI. This port is not affiliated with or endorsed by the Base&nbsp;UI team.
          </p>
        </div>
      </section>
      <div class="bui-gcs-1 bui-gce-9 bp3:bui-gcs-3">
        <div class="Separator" role="separator" aria-hidden="true" />
      </div>
      <section class="bui-d-c">
        <div class="bui-gcs-1 bui-gce-9 bp2:bui-gce-3">
          <h2 class="Text sz-2">The fine print</h2>
        </div>
        <div class="bui-gcs-1 bui-gce-9 bp2:bui-gcs-3 bp4:bui-gce-7">
          <Accordion.Root
            class="AccordionWebsiteRoot"
            itemscope
            itemtype="https://schema.org/FAQPage"
            // Setting `keepMounted` so that the content of all panels is available in the DOM for search engines. This is especially important for the homepage, which contains important SEO content.
            keepMounted
          >
            <Accordion.Item
              class="AccordionWebsiteItem"
              itemscope
              itemprop="mainEntity"
              itemtype="https://schema.org/Question"
            >
              <Accordion.Header class="AccordionWebsiteHeader">
                <Accordion.Trigger class="AccordionWebsiteTrigger Text sz-2" itemprop="name">
                  What is Base UI Solid?
                  <PlusIcon class="AccordionWebsiteIcon AccordionWebsiteIconPlus" />
                  <MinusIcon class="AccordionWebsiteIcon AccordionWebsiteIconMinus" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel
                class="AccordionWebsitePanel"
                itemscope
                itemprop="acceptedAnswer"
                itemtype="https://schema.org/Answer"
              >
                <p class="Text sz-2" itemprop="text">
                  Base UI Solid is a library of unstyled UI components for building accessible
                  component libraries, user interfaces, web applications, and websites with Solid
                  2.0. Base UI Solid components are highly configurable, composable, and
                  customizable.
                </p>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item
              class="AccordionWebsiteItem"
              itemscope
              itemprop="mainEntity"
              itemtype="https://schema.org/Question"
            >
              <Accordion.Header class="AccordionWebsiteHeader">
                <Accordion.Trigger class="AccordionWebsiteTrigger Text sz-2" itemprop="name">
                  Does Base UI Solid work with any styling library?
                  <PlusIcon class="AccordionWebsiteIcon AccordionWebsiteIconPlus" />
                  <MinusIcon class="AccordionWebsiteIcon AccordionWebsiteIconMinus" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel
                class="AccordionWebsitePanel"
                itemscope
                itemprop="acceptedAnswer"
                itemtype="https://schema.org/Answer"
              >
                <p class="Text sz-2" itemprop="text">
                  Yes. Base UI Solid works with Tailwind, CSS Modules, CSS-in-JS, plain CSS, and any
                  other styling library you prefer. It also works with JavaScript animation
                  libraries like Motion, or just plain CSS transitions. Base UI Solid is an unstyled
                  component library. The package does not bundle any CSS, and does not prescribe any
                  styling solution.
                </p>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item
              class="AccordionWebsiteItem"
              itemscope
              itemprop="mainEntity"
              itemtype="https://schema.org/Question"
            >
              <Accordion.Header class="AccordionWebsiteHeader">
                <Accordion.Trigger class="AccordionWebsiteTrigger Text sz-2" itemprop="name">
                  Which accessibility standards does Base UI Solid follow?
                  <PlusIcon class="AccordionWebsiteIcon AccordionWebsiteIconPlus" />
                  <MinusIcon class="AccordionWebsiteIcon AccordionWebsiteIconMinus" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel
                class="AccordionWebsitePanel"
                itemscope
                itemprop="acceptedAnswer"
                itemtype="https://schema.org/Answer"
              >
                <p class="Text sz-2" itemprop="text">
                  Base UI Solid ports Base UI's accessibility behavior. Base UI follows the{' '}
                  <Link href="https://www.w3.org/WAI/ARIA/apg/patterns/">
                    ARIA Authoring Practices Guide patterns
                  </Link>{' '}
                  and complies with the{' '}
                  <Link href="https://www.w3.org/TR/WCAG22/#new-features-in-wcag-2-2">
                    WCAG 2.2 standard
                  </Link>{' '}
                  for component behavior. The port runs Base UI's test suite, including its
                  accessibility tests.
                </p>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item
              class="AccordionWebsiteItem"
              itemscope
              itemprop="mainEntity"
              itemtype="https://schema.org/Question"
            >
              <Accordion.Header class="AccordionWebsiteHeader">
                <Accordion.Trigger class="AccordionWebsiteTrigger Text sz-2" itemprop="name">
                  How does Base UI Solid differ from Radix UI?
                  <PlusIcon class="AccordionWebsiteIcon AccordionWebsiteIconPlus" />
                  <MinusIcon class="AccordionWebsiteIcon AccordionWebsiteIconMinus" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel
                class="AccordionWebsitePanel"
                itemscope
                itemprop="acceptedAnswer"
                itemtype="https://schema.org/Answer"
              >
                <div class="bui-d-f bui-fd-c bui-g-4" itemprop="text">
                  <p class="Text sz-2">
                    In terms of API design, both libraries are very similar. Base UI Solid keeps
                    Base UI's APIs, which are intentionally close to Radix UI for an easier
                    migration path. Base UI Solid provides more complex components such as Combobox
                    and Autocomplete. Base UI Solid also provides deeper feature support such as
                    input scrubbing, nested dialogs, and triggering menus on hover. Base UI Solid is
                    more robust and more polished in terms of a11y and edge case handling.
                  </p>
                </div>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item
              class="AccordionWebsiteItem"
              itemscope
              itemprop="mainEntity"
              itemtype="https://schema.org/Question"
            >
              <Accordion.Header class="AccordionWebsiteHeader">
                <Accordion.Trigger class="AccordionWebsiteTrigger Text sz-2" itemprop="name">
                  How does Base UI Solid relate to Base UI?
                  <PlusIcon class="AccordionWebsiteIcon AccordionWebsiteIconPlus" />
                  <MinusIcon class="AccordionWebsiteIcon AccordionWebsiteIconMinus" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel
                class="AccordionWebsitePanel"
                itemscope
                itemprop="acceptedAnswer"
                itemtype="https://schema.org/Answer"
              >
                <p class="Text sz-2" itemprop="text">
                  Base UI Solid ports a specific upstream Base UI release to Solid 2.0 and follows
                  its changes. Base UI itself targets React, while Base UI Solid uses native Solid
                  components, adapting the API where React and Solid differ.
                </p>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item
              class="AccordionWebsiteItem"
              itemscope
              itemprop="mainEntity"
              itemtype="https://schema.org/Question"
            >
              <Accordion.Header class="AccordionWebsiteHeader">
                <Accordion.Trigger class="AccordionWebsiteTrigger Text sz-2" itemprop="name">
                  Is Base UI Solid free for commercial use?
                  <PlusIcon class="AccordionWebsiteIcon AccordionWebsiteIconPlus" />
                  <MinusIcon class="AccordionWebsiteIcon AccordionWebsiteIconMinus" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel
                class="AccordionWebsitePanel"
                itemscope
                itemprop="acceptedAnswer"
                itemtype="https://schema.org/Answer"
              >
                <p class="Text sz-2" itemprop="text">
                  Yes. Base UI Solid, like Base UI, is licensed under the MIT license, and is free
                  for commercial use. You are free to use it in your commercial projects, and to
                  modify it to suit your needs.
                </p>
              </Accordion.Panel>
            </Accordion.Item>
            <Accordion.Item
              class="AccordionWebsiteItem"
              itemscope
              itemprop="mainEntity"
              itemtype="https://schema.org/Question"
            >
              <Accordion.Header class="AccordionWebsiteHeader">
                <Accordion.Trigger class="AccordionWebsiteTrigger Text sz-2" itemprop="name">
                  Is Base UI Solid an official Base UI project?
                  <PlusIcon class="AccordionWebsiteIcon AccordionWebsiteIconPlus" />
                  <MinusIcon class="AccordionWebsiteIcon AccordionWebsiteIconMinus" />
                </Accordion.Trigger>
              </Accordion.Header>
              <Accordion.Panel
                class="AccordionWebsitePanel"
                itemscope
                itemprop="acceptedAnswer"
                itemtype="https://schema.org/Answer"
              >
                <p class="Text sz-2" itemprop="text">
                  No. It's an independent, community-maintained port, not affiliated with the Base
                  UI team, and it comes without any formal support guarantees.
                </p>
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion.Root>
        </div>
      </section>
    </div>
  );
}

const description = 'Unstyled UI components for building accessible web apps and design systems.';

export const metadata = {
  description,
  twitter: {
    site: '@base_ui',
    card: 'summary_large_image',
    description,
  },
  openGraph: {
    type: 'website',
    url: './',
    description,
  },
};

// Custom viewport for the homepage because on mobile it doesn't have a header
export const viewport = {
  themeColor: [
    // Desktop Safari page background
    {
      media: '(prefers-color-scheme: light) and (min-width: 1024px)',
      color: 'oklch(95% 0.25% 264)',
    },
    {
      media: '(prefers-color-scheme: dark) and (min-width: 1024px)',
      color: 'oklch(25% 1% 264)',
    },

    // Mobile Safari header background (match the page content)
    {
      media: '(prefers-color-scheme: light)',
      color: '#FFF',
    },
    {
      media: '(prefers-color-scheme: dark)',
      color: '#000',
    },
  ],
};
