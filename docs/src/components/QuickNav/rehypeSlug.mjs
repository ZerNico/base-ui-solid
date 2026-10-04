import { headingRank } from 'hast-util-heading-rank';
import { toString } from 'hast-util-to-string';
import { visit } from 'unist-util-visit';
import { stringToUrl } from './stringToUrl.mjs';

export { stringToUrl } from './stringToUrl.mjs';

// This is a fork of https://github.com/rehypejs/rehype-slug/blob/main/lib/index.js, but better

/**
 * @typedef {import('hast').Root} Root
 */

/**
 * @typedef Options
 *   Configuration (optional).
 * @property {string} [prefix='']
 *   Prefix to add in front of `id`s (default: `''`).
 */

/** @type {Options} */
const emptyOptions = {};

/**
 * Add `id`s to headings.
 *
 * @param {Options | null | undefined} [options]
 *   Configuration (optional).
 * @returns
 *   Transform.
 */
export default function rehypeSlug(options) {
  const settings = options || emptyOptions;
  const prefix = settings.prefix || '';

  /**
   * @param {Root} tree
   *   Tree.
   * @returns {undefined}
   *   Nothing.
   */
  return (tree) => {
    // Tracks slugs already used on this page so repeated heading text does not
    // produce duplicate ids. Mirrors github-slugger: the first occurrence keeps
    // the bare slug, later ones get `-1`, `-2`, … suffixes.
    /** @type {Map<string, number>} */
    const occurrences = new Map();

    visit(tree, 'element', (node) => {
      if (headingRank(node)) {
        if (node.properties.id) {
          // Seed pre-existing ids (set by an author or an earlier plugin) so a
          // later heading whose text slugs to the same value gets suffixed
          // instead of colliding.
          occurrences.set(String(node.properties.id), 0);
        } else {
          const base = prefix + stringToUrl(toString(node));
          let id = base;
          while (occurrences.has(id)) {
            occurrences.set(base, occurrences.get(base) + 1);
            id = `${base}-${occurrences.get(base)}`;
          }
          occurrences.set(id, 0);
          node.properties.id = id;
        }
      }

      return undefined;
    });
  };
}
