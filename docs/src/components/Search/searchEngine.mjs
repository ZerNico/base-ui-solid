// Port note: the framework-independent search schema, flattening, scoring and URL rules
// mirror docs-infra useSearch; a cached async factory replaces React hook state.
import { create, insertMultiple, search as oramaSearch } from '@orama/orama';
import { pluginQPS } from '@orama/plugin-qps';
import { stemmer, language } from '@orama/stemmers/english';
import { resolvePageUrl } from '@mui/internal-docs-infra/resolvePageUrl';
import sitemap from 'virtual:docs-search';
import { stringToUrl } from '../../components/QuickNav/stringToUrl.mjs';

const searchSchema = {
  type: 'string',
  group: 'string',
  title: 'string',
  description: 'string',
  slug: 'string',
  sectionTitle: 'string',
  prefix: 'string',
  path: 'string',
  keywords: 'string',
  page: 'string',
  pageKeywords: 'string',
  sections: 'string',
  subsections: 'string',
  part: 'string',
  export: 'string',
  types: 'string',
  props: 'string',
  dataAttributes: 'string',
  cssVariables: 'string',
  section: 'string',
  subsection: 'string',
};

/**
 * Type for Orama search hit results
 */

/**
 * Default function to flatten a sitemap page into search results
 */
function defaultFlattenPage(
  page,
  sectionData,
  includeCategoryInGroup,
  excludeSections,
  generateSlug,
) {
  const results = [];

  // Extract top-level sections and all subsections with their slugs
  // Re-slugify from titles using the provided slugify function to match actual page IDs
  const sections = [];
  const subsections = [];
  if (page.sections) {
    // Top-level sections are the direct children
    for (const [originalSlug, sectionInfo] of Object.entries(page.sections)) {
      // Use generateSlug if provided, otherwise use the original slug from sitemap
      const slug = generateSlug ? generateSlug(sectionInfo.title, []) : originalSlug;
      sections.push({
        title: sectionInfo.title,
        slug,
      });

      // Subsections are all nested children (recursively)
      if (sectionInfo.children && Object.keys(sectionInfo.children).length > 0) {
        const extractWithSlugs = (hierarchy, parentSlugs, parentTitles) => {
          const items = [];
          for (const [childOriginalSlug, childData] of Object.entries(hierarchy)) {
            // Use generateSlug if provided, otherwise use the original slug from sitemap
            // When generateSlug is provided, pass parent titles for context
            // (e.g., for Releases pages: v1.0.0-rc.0-autocomplete)
            const childSlug = generateSlug
              ? generateSlug(childData.title, parentTitles)
              : childOriginalSlug;
            const currentSlugs = [...parentSlugs, childSlug];
            const currentTitles = [...parentTitles, childData.title];
            items.push({
              title: childData.title,
              slug: childSlug,
              parentSlugs: currentSlugs,
              parentTitles: currentTitles,
            });
            if (childData.children && Object.keys(childData.children).length > 0) {
              items.push(...extractWithSlugs(childData.children, currentSlugs, currentTitles));
            }
          }
          return items;
        };
        subsections.push(...extractWithSlugs(sectionInfo.children, [slug], [sectionInfo.title]));
      }
    }
  }
  const flattened = {};
  if (page.keywords?.length) {
    flattened.keywords = page.keywords.join(' ');
  }
  if (page.types && page.types.length > 0) {
    flattened.types = page.types.join(' ');
  }
  if (sections.length > 0) {
    flattened.sections = sections.map((s) => s.title).join(' ');
  }
  if (subsections.length > 0) {
    flattened.subsections = subsections.map((s) => s.title).join(' ');
  }

  // Add base page result
  results.push({
    type: 'page',
    group: includeCategoryInGroup ? `${sectionData.title} Pages` : 'Pages',
    page: page.title,
    title: page.title,
    slug: page.slug,
    path: page.path,
    description: page.description,
    sectionTitle: sectionData.title,
    prefix: sectionData.prefix,
    ...(flattened.keywords
      ? {
          keywords: flattened.keywords,
        }
      : {}),
    ...(flattened.types
      ? {
          types: flattened.types,
        }
      : {}),
    ...(excludeSections
      ? {}
      : {
          sections: flattened.sections,
          subsections: flattened.subsections,
        }),
  });

  // Add entries for each part
  if (page.parts && Object.keys(page.parts).length > 0) {
    for (const [partName, partData] of Object.entries(page.parts)) {
      results.push({
        type: 'part',
        group: 'API Reference',
        part: partName,
        export: `${page.slug}.${partName}`,
        slug: partName.toLowerCase(),
        path: page.path,
        title: page.title ? `${page.title} ‣ ${partName}` : partName,
        description: page.description,
        sectionTitle: sectionData.title,
        prefix: sectionData.prefix,
        props: partData.props ? partData.props.join(' ') : '',
        dataAttributes: partData.dataAttributes ? partData.dataAttributes.join(' ') : '',
        cssVariables: partData.cssVariables ? partData.cssVariables.join(' ') : '',
        keywords: flattened.keywords,
      });
    }
  }

  // Add entries for each export
  if (page.exports && Object.keys(page.exports).length > 0) {
    for (const [exportName, exportData] of Object.entries(page.exports)) {
      // If export name matches page slug (case-insensitive), use #api-reference
      const exportSlug =
        exportName.toLowerCase() === page.slug.toLowerCase()
          ? 'api-reference'
          : exportName.toLowerCase();
      results.push({
        type: 'export',
        group: 'API Reference',
        export: exportSlug,
        slug: page.slug,
        path: page.path,
        title: exportName,
        description: page.description,
        sectionTitle: sectionData.title,
        prefix: sectionData.prefix,
        props: exportData.props ? exportData.props.join(' ') : '',
        dataAttributes: exportData.dataAttributes ? exportData.dataAttributes.join(' ') : '',
        cssVariables: exportData.cssVariables ? exportData.cssVariables.join(' ') : '',
        keywords: flattened.keywords,
      });
    }
  }

  // Add entries for each section
  for (const sectionItem of sections) {
    results.push({
      type: 'section',
      group: 'Sections',
      section: sectionItem.title,
      slug: `${page.slug}#${sectionItem.slug}`,
      path: page.path,
      title: page.title ? `${page.title} ‣ ${sectionItem.title}` : sectionItem.title,
      description: page.description,
      sectionTitle: sectionData.title,
      prefix: sectionData.prefix,
      keywords: flattened.keywords,
    });
  }

  // Add entries for each subsection
  for (const subsectionItem of subsections) {
    const fullTitle = subsectionItem.parentTitles.join(' ‣ ');
    results.push({
      type: 'subsection',
      group: 'Sections',
      subsection: fullTitle,
      slug: `${page.slug}#${subsectionItem.slug.toLowerCase()}`,
      path: page.path,
      title: page.title ? `${page.title} ‣ ${fullTitle}` : fullTitle,
      description: page.description,
      sectionTitle: sectionData.title,
      prefix: sectionData.prefix,
      keywords: flattened.keywords,
    });
  }
  return results;
}

/**
 * Default function to format search results
 */
function defaultFormatResult(hit) {
  const base = {
    id: hit.id,
    title: hit.document.title,
    description: hit.document.description,
    slug: hit.document.slug,
    sectionTitle: hit.document.sectionTitle,
    prefix: hit.document.prefix,
    path: hit.document.path,
    score: hit.score,
    keywords: hit.document.keywords,
  };
  const type = hit.document.type;
  if (type === 'part') {
    return {
      ...base,
      type: 'part',
      part: hit.document.part,
      export: hit.document.export,
      props: hit.document.props,
      dataAttributes: hit.document.dataAttributes,
      cssVariables: hit.document.cssVariables,
    };
  }
  if (type === 'export') {
    return {
      ...base,
      type: 'export',
      export: hit.document.export,
      props: hit.document.props,
      dataAttributes: hit.document.dataAttributes,
      cssVariables: hit.document.cssVariables,
    };
  }
  if (type === 'section') {
    return {
      ...base,
      type: 'section',
      section: hit.document.section,
    };
  }
  if (type === 'subsection') {
    return {
      ...base,
      type: 'subsection',
      subsection: hit.document.subsection,
    };
  }

  // Default to page type
  return {
    ...base,
    type: 'page',
    page: hit.document.title,
    ...(hit.document.sections
      ? {
          sections: hit.document.sections,
        }
      : {}),
    ...(hit.document.subsections
      ? {
          subsections: hit.document.subsections,
        }
      : {}),
  };
}
export const defaultSearchBoost = {
  type: 100,
  group: 100,
  slug: 2,
  path: 2,
  title: 2,
  page: 10,
  pageKeywords: 15,
  description: 1.5,
  part: 1.5,
  export: 1.3,
  types: 2,
  sectionTitle: 50,
  section: 3,
  subsection: 2.5,
  props: 1.5,
  dataAttributes: 1.5,
  cssVariables: 1.5,
  sections: 0.7,
  subsections: 0.3,
  keywords: 1.5,
};

let engine;
export function loadSearch() {
  engine ??= createSearch();
  return engine;
}
async function createSearch() {
  const enableStemming = true;
  const generateSlug = (title, parents) =>
    stringToUrl(
      parents[0] === 'React Hook Form' || parents[0] === 'TanStack Form'
        ? `${parents[0]} ${title}`
        : title,
    );
  const flattenPage = defaultFlattenPage;
  const formatResult = defaultFormatResult;
  const showPrivatePages = false;
  const maxDefaultResults = undefined;
  const searchIndex = await create({
    schema: searchSchema,
    components: enableStemming
      ? {
          tokenizer: {
            stemming: true,
            language,
            stemmer,
            stemmerSkipProperties: [
              'type',
              'group',
              'slug',
              'sectionTitle',
              'page',
              'part',
              'export',
              'dataAttributes',
              'cssVariables',
              'props',
            ],
          },
        }
      : undefined,
    plugins: [pluginQPS()],
  });

  // Flatten the sitemap data structure to a single array of pages
  const pages = [];
  const pageResultsByGroup = {};
  let pageResultsCount = 0;
  Object.entries(sitemap.data).forEach(([_sectionKey, sectionData]) => {
    (sectionData.pages || []).forEach((page) => {
      // Skip private pages in public deployments
      if (!showPrivatePages && page.audience === 'private') {
        return;
      }
      const flattened = flattenPage(page, sectionData, true, true, generateSlug);
      pages.push(...flattened);

      // Add the first result (page type) to default results, grouped by their group
      if (
        (maxDefaultResults === undefined || pageResultsCount < maxDefaultResults) &&
        flattened.length > 0
      ) {
        const pageResult = flattened[0];
        const group = pageResult.group || 'Pages';
        if (!pageResultsByGroup[group]) {
          pageResultsByGroup[group] = [];
        }
        pageResultsByGroup[group].push(pageResult);
        pageResultsCount += 1;
      }
    });
  });

  // Port note: Orama skips empty-string fields, leaving QPS stats undefined for unused
  // schema properties. A nonempty NUL token initializes every property without matches.
  const dummyDoc = Object.fromEntries(Object.keys(searchSchema).map((key) => [key, '\u0000']));
  await insertMultiple(searchIndex, [dummyDoc, ...pages]);
  const pageResultsGrouped = Object.entries(pageResultsByGroup).map(([group, items]) => ({
    group,
    items,
  }));
  const defaultResultsValue = {
    results: pageResultsGrouped,
    count: pageResultsCount,
    elapsed: {
      raw: 0,
      formatted: '0ms',
    },
  };

  const index = searchIndex;
  const defaultResults = defaultResultsValue;
  const tolerance = 0;
  const boost = defaultSearchBoost;
  async function search(value) {
    if (!value.trim()) {
      return defaultResults;
    }
    const facets = undefined;
    const groupBy = { properties: ['group'], maxResult: 5 };
    const where = undefined;
    const limit = 20;
    const valueLower = value.toLowerCase();
    // Normalize for comparison: convert spaces/hyphens to a common format
    const valueNormalized = valueLower.replace(/[-\s]+/g, ' ').trim();

    // For longer search terms, skip custom sorting and rely on Orama's scoring
    // The overhead of checking exact/startsWith/contains isn't worth it
    const useCustomSort = valueLower.length <= 20;

    // Cache for computed document properties to avoid repeated string operations
    const cache = new Map();
    const getDocProps = (doc) => {
      const key = doc.slug; // Use slug as cache key since it's unique per document
      let props = cache.get(key);
      if (!props) {
        const titleLower = doc.title.toLowerCase();
        const slugLower = doc.slug.toLowerCase();
        props = {
          titleLower,
          slugLower,
          slugNormalized: slugLower.replace(/-/g, ' '),
        };
        cache.set(key, props);
      }
      return props;
    };
    const searchResults = await oramaSearch(index, {
      term: value,
      facets,
      groupBy,
      where,
      limit,
      tolerance,
      boost,
      sortBy: useCustomSort
        ? ([_, aScore, aDocument], [__, bScore, bDocument]) => {
            const a = getDocProps(aDocument);
            const b = getDocProps(bDocument);

            // Prioritize exact matches (short-circuit on first match)
            const aExact =
              a.titleLower === valueLower ||
              a.slugLower === valueLower ||
              a.slugNormalized === valueNormalized;
            const bExact =
              b.titleLower === valueLower ||
              b.slugLower === valueLower ||
              b.slugNormalized === valueNormalized;
            if (aExact !== bExact) {
              return aExact ? -1 : 1;
            }

            // Then prioritize startsWith matches
            const aStartsWith =
              a.titleLower.startsWith(valueLower) || a.slugNormalized.startsWith(valueNormalized);
            const bStartsWith =
              b.titleLower.startsWith(valueLower) || b.slugNormalized.startsWith(valueNormalized);
            if (aStartsWith !== bStartsWith) {
              return aStartsWith ? -1 : 1;
            }

            // Then prioritize contains matches
            const aContains =
              a.titleLower.includes(valueLower) || a.slugNormalized.includes(valueNormalized);
            const bContains =
              b.titleLower.includes(valueLower) || b.slugNormalized.includes(valueNormalized);
            if (aContains !== bContains) {
              return aContains ? -1 : 1;
            }

            // Then sort by score descending
            return bScore - aScore;
          }
        : undefined,
    });
    const count = searchResults.count;
    const elapsed = searchResults.elapsed;
    if (searchResults.groups) {
      const groupedResults = searchResults.groups.map((group) => ({
        group: group.values.join(' '),
        items: group.result.map(formatResult),
      }));
      return {
        results: groupedResults,
        count,
        elapsed,
      };
    }
    const formattedResults = searchResults.hits.map(formatResult);
    return {
      results: [
        {
          group: 'Default',
          items: formattedResults,
        },
      ],
      count,
      elapsed,
    };
  }
  return { search, defaultResults, buildResultUrl };
}
export function buildResultUrl(result) {
  let url = resolvePageUrl(result.path, result.prefix);

  // Add hash for non-page types
  if ('type' in result && result.type !== 'page') {
    let hash;
    if (result.type === 'section' || result.type === 'subsection') {
      // For sections and subsections, extract hash from the slug field
      // which already contains the page slug + hash (e.g., "button#api-reference")
      const hashIndex = result.slug.indexOf('#');
      hash = hashIndex !== -1 ? result.slug.substring(hashIndex + 1) : '';
    } else if (result.type === 'part') {
      hash = result.part.toLowerCase();
    } else if (result.type === 'export') {
      hash = result.export; // already lowercase or api-reference
    } else {
      hash = '';
    }
    if (hash) {
      url += `#${hash}`;
    }
  }
  return url;
}
