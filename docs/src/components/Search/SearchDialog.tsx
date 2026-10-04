import { createSignal, For, Show } from 'solid-js';
import { Dialog } from 'base-ui-solid/dialog';
import { pages } from '../../data/sitemap';
import './Search.css';
import '../GhostButton.css';
import '../SearchTrigger.css';
import '../MobileNav.css';

export function SearchDialog(props: { mobileTriggerClass?: string } = {}) {
  const [query, setQuery] = createSignal('');
  const results = () =>
    pages.filter((page) =>
      `${page.title} ${page.description}`.toLowerCase().includes(query().toLowerCase()),
    );
  return (
    <Dialog.Root>
      <Dialog.Trigger class="SearchTrigger HeaderSearchDesktopTrigger">
        Search <span style={{ color: 'var(--gray-t1)' }}>(⌘K)</span>
      </Dialog.Trigger>
      <Dialog.Trigger
        class={['SearchTrigger', props.mobileTriggerClass ?? 'HeaderSearchMobileTrigger']}
        aria-label="Search documentation"
      >
        <svg class="MobileNavTriggerIcon" viewBox="0 0 16 16" fill="none" stroke="currentColor">
          <circle cx="7" cy="7" r="5.5" />
          <path d="m11 11 4 4" />
        </svg>
        Navigation
      </Dialog.Trigger>
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
