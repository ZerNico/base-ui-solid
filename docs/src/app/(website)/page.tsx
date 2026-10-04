import { Accordion } from 'base-ui-solid/accordion';
import { Link } from './Link';
import { Paper } from './logos/Paper';
import { Zed } from './logos/Zed';
import { Unsplash } from './logos/Unsplash';
import { Operate } from './logos/Operate';
import { GitHub } from './logos/GitHub';
import { Interfere } from './logos/Interfere';
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
          name: 'Base UI for Solid',
          url: 'https://base-ui.com',
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
          <Link class="Text sz-2 bui-d-if" href="/react/overview/quick-start" withArrow>
            Documentation
          </Link>
        </div>
      </section>
      <section class="bui-d-c">
        <div class="bui-d-f bui-fd-c bui-g-4 bui-gcs-1 bui-gce-9 bp2:bui-gcs-3 bp4:bui-gce-7">
          <p class="Text sz-2">
            From the creators of Radix, Floating&nbsp;UI, and Material&nbsp;UI, Base&nbsp;UI is a
            comprehensive UI component library for building accessible user interfaces with Solid
            2.0.
          </p>
          <p class="Text sz-2">
            Each Base UI component is meticulously designed for composability, consistency, and
            craft. The library's architecture prioritizes flexibility—without imposing visual
            opinions—helping teams craft distinctive interfaces that are fundamentally accessible
            and reliable.
          </p>
          <p class="Text sz-2">
            Collectively, we've been building component libraries for multiple decades. We've
            learned what works, what lasts, and what doesn't. And we really, really sweat the
            details.
          </p>
          <p class="Text sz-2">
            Base UI is built to last. It is designed with care and maintained with intent. Our
            mission is to provide a future-proof foundation for professional interface design on the
            Web.
          </p>
        </div>
      </section>
      <div class="bui-gcs-1 bui-gce-9 bp3:bui-gcs-3">
        <div class="Separator" role="separator" aria-hidden="true" />
      </div>
      <section class="bui-d-c">
        <div class="bui-gcs-1 bui-gce-9 bp2:bui-gce-3">
          <h2 class="Text sz-2">Made for the makers</h2>
        </div>
        <ul
          class="List bui-gcs-1 bui-gce-9 bp3:bui-gcs-3 bui-d-g bui-gtc-2 bp2:bui-gtc-4 bp3:bui-gtc-6 bui-g-8 bp2:bui-g-9"
          aria-label="companies using Base UI"
        >
          <li>
            <div class="bui-d-f bui-fd-c bui-g-2">
              <div class="Figure" aria-hidden="true">
                <div class="bui-d-f bui-ai-c bui-jc-c bui-h-100">
                  <Paper />
                </div>
              </div>
              <span class="Text sz-1">Paper</span>
            </div>
          </li>
          <li>
            <div class="bui-d-f bui-fd-c bui-g-2">
              <div class="Figure" aria-hidden="true">
                <div class="bui-d-f bui-ai-c bui-jc-c bui-h-100">
                  <GitHub />
                </div>
              </div>
              <span class="Text sz-1">GitHub</span>
            </div>
          </li>
          <li>
            <div class="bui-d-f bui-fd-c bui-g-2">
              <div class="Figure" aria-hidden="true">
                <div class="bui-d-f bui-ai-c bui-jc-c bui-h-100">
                  <Zed />
                </div>
              </div>
              <span class="Text sz-1">Zed</span>
            </div>
          </li>
          <li>
            <div class="bui-d-f bui-fd-c bui-g-2">
              <div class="Figure" aria-hidden="true">
                <div class="bui-d-f bui-ai-c bui-jc-c bui-h-100">
                  <Unsplash />
                </div>
              </div>
              <span class="Text sz-1">Unsplash</span>
            </div>
          </li>
          <li>
            <div class="bui-d-f bui-fd-c bui-g-2">
              <div class="Figure" aria-hidden="true">
                <div class="bui-d-f bui-ai-c bui-jc-c bui-h-100">
                  <Operate />
                </div>
              </div>
              <span class="Text sz-1">Operate</span>
            </div>
          </li>
          <li>
            <div class="bui-d-f bui-fd-c bui-g-2">
              <div class="Figure" aria-hidden="true">
                <div class="bui-d-f bui-ai-c bui-jc-c bui-h-100">
                  <Interfere />
                </div>
              </div>
              <span class="Text sz-1">Interfere</span>
            </div>
          </li>
        </ul>
      </section>
      <div class="bui-gcs-1 bui-gce-9 bp3:bui-gcs-3">
        <div class="Separator" role="separator" aria-hidden="true" />
      </div>
      <section class="bui-d-c">
        <div class="bui-gcs-1 bui-gce-9 bp2:bui-gce-3">
          <h2 class="Text sz-2">So you know who to blame</h2>
        </div>
        <div class="bui-gcs-1 bui-gce-9 bp2:bui-gcs-3 bp4:bui-gce-7">
          <ul
            class="List"
            aria-label="team members"
            style={{ 'border-top': '1px solid var(--gray-t2)' }}
          >
            <li class="ListItem bui-d-g bui-gtc-2 bui-g-8 bp3:bui-g-9">
              <span class="Text sz-2">Colm Tuite</span>
              <span class="Text sz-2">Director of Design Engineering</span>
            </li>
            <li class="ListItem bui-d-g bui-gtc-2 bui-g-8 bp3:bui-g-9">
              <span class="Text sz-2">Marija Najdova</span>
              <span class="Text sz-2">Director of Engineering</span>
            </li>
            <li class="ListItem bui-d-g bui-gtc-2 bui-g-8 bp3:bui-g-9">
              <span class="Text sz-2">Flavien Delangle</span>
              <span class="Text sz-2">Engineer</span>
            </li>
            <li class="ListItem bui-d-g bui-gtc-2 bui-g-8 bp3:bui-g-9">
              <span class="Text sz-2">James Nelson</span>
              <span class="Text sz-2">Engineer</span>
            </li>
            <li class="ListItem bui-d-g bui-gtc-2 bui-g-8 bp3:bui-g-9">
              <span class="Text sz-2">Jenna Smith</span>
              <span class="Text sz-2">Engineer</span>
            </li>
            <li class="ListItem bui-d-g bui-gtc-2 bui-g-8 bp3:bui-g-9">
              <span class="Text sz-2">Michał Dudak</span>
              <span class="Text sz-2">Engineer</span>
            </li>
            <li class="ListItem bui-d-g bui-gtc-2 bui-g-8 bp3:bui-g-9">
              <span class="Text sz-2">Aarón García</span>
              <span class="Text sz-2">Design Engineer</span>
            </li>
            <li class="ListItem bui-d-g bui-gtc-2 bui-g-8 bp3:bui-g-9">
              <span class="Text sz-2">Vlad Moroz</span>
              <span class="Text sz-2">Contributor</span>
            </li>
          </ul>
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
                  What is Base UI?
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
                  Base UI is a library of unstyled UI components for building accessible component
                  libraries, user interfaces, web applications, and websites with Solid 2.0. Base UI
                  components are highly configurable, composable, and customizable.
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
                  Does Base UI work with any styling library?
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
                  Yes. Base UI works with Tailwind, CSS Modules, CSS-in-JS, plain CSS, and any other
                  styling library you prefer. It also works with JavaScript animation libraries like
                  Motion, or just plain CSS transitions. Base UI is an unstyled component library.
                  The package does not bundle any CSS, and does not prescribe any styling solution.
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
                  Which accessibility standards does Base UI follow?
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
                  When designing and speccing components, we follow{' '}
                  <Link href="https://www.w3.org/WAI/ARIA/apg/patterns/">
                    ARIA Authoring Practices Guide patterns
                  </Link>
                  , and comply with the{' '}
                  <Link href="https://www.w3.org/TR/WCAG22/#new-features-in-wcag-2-2">
                    WCAG 2.2 standard
                  </Link>
                  . Base UI is compliant with all Success Criteria levels relating to component
                  behavior. However, in most cases, we go way beyond these guides. Base UI
                  components are tested across a wide range of browsers, devices, platforms, and
                  environments, and are designed to be accessible.
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
                  How does Base UI differ from Radix UI?
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
                    In terms of API design, both libraries are very similar. We intentionally kept
                    our APIs close to Radix UI for an easier migration path. Base UI provides more
                    complex components such as Combobox and Autocomplete. Base UI also provides
                    deeper feature support such as input scrubbing, nested dialogs, and triggering
                    menus on hover. Base UI is more robust and more polished in terms of a11y and
                    edge case handling.
                  </p>
                  <p class="Text sz-2">
                    But the most important difference is that Base UI is actively maintained and
                    developed, with a dedicated team of 7 developers, designers, and managers
                    working on it full-time.
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
                  Can I use Base UI without React?
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
                  This is base-ui-solid, an unofficial port of Base UI for Solid 2.0. The upstream
                  Base UI package targets React; this package uses native Solid components.
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
                  Is Base UI free for commercial use?
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
                  Yes. Base UI is licensed under the MIT license, and is free for commercial use.
                  You are free to use it in your commercial projects, and to modify it to suit your
                  needs.
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
                  Do you offer enterprise SLAs?
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
                  Not currently. We do provide dedicated support channels to some very large
                  enterprise companies who are working with us as design partners. But we do not
                  currently provide Service Level Agreements, guaranteed response times, issue
                  escalation, feature prioritization, or any other formal support guarantees.
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
