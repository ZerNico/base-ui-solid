import { createSignal, For, Show } from 'solid-js';
import { Dialog } from 'base-ui-solid/dialog';
import { pages } from '../../data/sitemap';
import './Search.css';

export function SearchDialog() {
  const [query, setQuery] = createSignal('');
  const results = () =>
    pages.filter((page) =>
      `${page.title} ${page.description}`.toLowerCase().includes(query().toLowerCase()),
    );
  return (
    <Dialog.Root>
      <Dialog.Trigger class="SearchButton">Search documentation</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop class="SearchBackdrop" />
        <Dialog.Popup class="SearchPopup">
          <Dialog.Title>Search documentation</Dialog.Title>
          <Dialog.Description>Find component documentation.</Dialog.Description>
          <input
            aria-label="Search documentation"
            type="search"
            value={query()}
            onInput={(event) => setQuery(event.currentTarget.value)}
          />
          <ul>
            <For each={results()}>
              {(page) => (
                <li>
                  <a href={page.href}>{page.title}</a>
                  <p>{page.description}</p>
                </li>
              )}
            </For>
          </ul>
          <Show when={!results().length}>
            <p>No results found.</p>
          </Show>
          <Dialog.Close>Close</Dialog.Close>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
