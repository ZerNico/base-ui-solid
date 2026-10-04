// Port note: each file read depends on its route metadata and reference path.
/* eslint-disable no-await-in-loop */
import { readdir, readFile } from 'node:fs/promises';
import { stringToUrl } from '../components/QuickNav/stringToUrl.mjs';

// Port note: build search data from MDX and reference JSON without importing page components.
export function searchIndexPlugin() {
  return {
    name: 'docs-search-index',
    resolveId(id) {
      return id === 'virtual:docs-search' ? '\0docs-search-index' : undefined;
    },
    async load(id) {
      if (id !== '\0docs-search-index') {
        return undefined;
      }
      const data = {};
      const routes = new URL('../routes/', import.meta.url);
      for (const filename of await readdir(routes)) {
        const routeFile = new URL(filename, routes);
        const route = await readFile(routeFile, 'utf8');
        const match = route.match(/import Content from '([^']+\.mdx)'/);
        const path = route.match(/createFileRoute\('\/_docs\/solid\/([^']+)'\)/)?.[1];
        if (
          !match ||
          !path ||
          (path.startsWith('overview/releases/') && path !== 'overview/releases/')
        ) {
          continue;
        }
        const [category] = path.split('/');
        const title = category[0].toUpperCase() + category.slice(1);
        if (path === `${category}/`) {
          continue;
        }
        const file = new URL(match[1], routeFile);
        this.addWatchFile(file.pathname);
        const source = await readFile(file, 'utf8');
        const heading = source.match(/^# (.+)$/m)?.[1].replace(/\s+\[(New|Preview)\]$/, '');
        if (!heading) {
          continue;
        }
        const sections = {};
        let section;
        for (const headingMatch of source.matchAll(/^(#{2,6}) (.+)$/gm)) {
          const headingTitle = headingMatch[2].replace(/\s+\[(New|Preview)\]$/, '');
          const entry = { title: headingTitle, children: {} };
          if (headingMatch[1].length === 2) {
            sections[stringToUrl(headingTitle)] = entry;
            section = entry;
          } else if (section) {
            section.children[stringToUrl(headingTitle)] = entry;
          }
        }
        const page = {
          title: heading,
          slug: path.split('/').filter(Boolean).at(-1),
          path: `/solid/${path}`,
          description: source.match(/<Subtitle>(.*?)<\/Subtitle>/s)?.[1] ?? '',
          sections,
          keywords: [
            ...(source.match(/keywords:\s*\[([\s\S]*?)\]/)?.[1] ?? '').matchAll(/'([^']+)'/g),
          ].map((value) => value[1]),
        };
        try {
          const referenceFile = new URL(`../../reference/${page.slug}.json`, import.meta.url);
          const reference = JSON.parse(await readFile(referenceFile, 'utf8'));
          this.addWatchFile(referenceFile.pathname);
          page.parts = Object.fromEntries(
            Object.entries(reference).map(([name, part]) => [
              name,
              {
                props: part.props?.map((row) => row.name),
                dataAttributes: part.dataAttributes?.map((row) => row.name),
                cssVariables: part.cssVariables?.map((row) => row.name),
              },
            ]),
          );
        } catch {
          /* Pages without an API reference need only page and section results. */
        }
        data[category] ??= { title, prefix: '', pages: [] };
        data[category].pages.push(page);
      }
      data.handbook.pages.push({
        title: 'llms.txt',
        slug: 'llms.txt',
        path: '/llms.txt',
        description: '',
        sections: {},
      });
      const order = [
        'Quick start',
        'Accessibility',
        'Releases',
        'Community',
        'About Base UI',
        'Styling',
        'Animation',
        'Composition',
        'Customization',
        'Forms',
        'TypeScript',
        'llms.txt',
      ];
      for (const [category, section] of Object.entries(data)) {
        section.pages.sort((a, b) =>
          ['components', 'utils'].includes(category)
            ? a.title.localeCompare(b.title)
            : order.indexOf(a.title) - order.indexOf(b.title),
        );
      }
      return `export default ${JSON.stringify({ data: Object.fromEntries(['overview', 'handbook', 'components', 'utils'].map((key) => [key, data[key]])) })};`;
    },
  };
}
