import { describe, expect, it } from 'vitest';
import { loadSearch, buildResultUrl } from './searchEngine.mjs';

describe('docs search', () => {
  it('lists public pages in upstream navigation groups without release detail pages', async () => {
    const engine = await loadSearch();
    expect(engine.defaultResults.results.map((group) => group.group)).toEqual([
      'Overview Pages',
      'Handbook Pages',
      'Components Pages',
      'Utils Pages',
    ]);
    const defaults = engine.defaultResults.results.flatMap((group) => group.items);
    expect(buildResultUrl(defaults.find((result) => result.title === 'llms.txt'))).toBe(
      '/llms.txt',
    );
    expect(defaults.some((result) => result.title.startsWith('v1.'))).toBe(false);
  });

  it('ranks an exact component match first and includes API and section results', async () => {
    const engine = await loadSearch();
    const result = await engine.search('select');
    expect(result.results[0].group).toBe('Components Pages');
    expect(result.results[0].items[0].title).toBe('Select');
    expect(
      result.results
        .find((group) => group.group === 'API Reference')
        .items.some((item) => buildResultUrl(item) === '/react/components/select#root'),
    ).toBe(true);
    expect(
      result.results
        .find((group) => group.group === 'Sections')
        .items.some((item) => buildResultUrl(item).startsWith('/react/components/select#')),
    ).toBe(true);
    expect(result.results.every((group) => group.items.length <= 5)).toBe(true);
  });

  it('returns no matches for an unknown query and resets to defaults', async () => {
    const engine = await loadSearch();
    expect((await engine.search('zzzzzzzzzzzzzz')).results).toEqual([]);
    expect(await engine.search('')).toBe(engine.defaultResults);
  });

  it('keeps forms integration section fragments aligned with the page headings', async () => {
    const engine = await loadSearch();
    const result = await engine.search('Initialize the form');
    const urls = result.results.flatMap((group) => group.items.map(buildResultUrl));
    expect(urls).toContain('/react/handbook/forms#react-hook-form-initialize-the-form');
    expect(urls).toContain('/react/handbook/forms#tanstack-form-initialize-the-form');
  });
});
