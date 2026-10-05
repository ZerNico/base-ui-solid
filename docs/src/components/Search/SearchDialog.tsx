import { createSignal, For, onSettled, Show } from 'solid-js';
import type { Accessor } from 'solid-js';
import { Dialog } from 'base-ui-solid/dialog';
import { Autocomplete } from 'base-ui-solid/autocomplete';
import { ScrollArea } from 'base-ui-solid/scroll-area';
import type { SearchResult } from '@mui/internal-docs-infra/useSearch/types';
import { MagnifyingGlassIcon } from '../../icons/MagnifyingGlassIcon';
import '../GhostButton.css';
import './Search.css';
import '../SearchTrigger.css';
import '../MobileNav.css';
import { RouterLink } from '../RouterLink';

type Group = { group: string; items: SearchResult[] };
type Engine = {
  search: (value: string) => Promise<{ results: Group[] }>;
  defaultResults: { results: Group[] };
  buildResultUrl: (result: SearchResult) => string;
};

export function SearchDialog(props: { mobileTriggerClass?: string } = {}) {
  const [open, setOpen] = createSignal(false);
  const [query, setQuery] = createSignal('');
  const [groups, setGroups] = createSignal<Group[]>([]);
  let engine: Engine | undefined;
  let highlighted: SearchResult | undefined;
  let requestId = 0;
  const items = () => groups().flatMap((group) => group.items);
  async function search(value: string) {
    setQuery(value);
    requestId += 1;
    const id = requestId;
    // Port note: defer the upstream search index until interaction to keep hydration small.
    const currentEngine: Engine =
      engine ?? (await (await import('./searchEngine.mjs')).loadSearch());
    engine = currentEngine;
    const result = await currentEngine.search(value);
    if (id === requestId) {
      setGroups(result.results);
    }
  }
  function changeOpen(value: boolean) {
    setOpen(value);
    if (value) {
      void search('');
    }
  }
  onSettled(() => {
    const handleKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        changeOpen(!open());
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  });
  return (
    <Dialog.Root open={open()} onOpenChange={changeOpen}>
      <Dialog.Trigger class="SearchTrigger HeaderSearchDesktopTrigger">
        Search{' '}
        <span class="SearchTriggerShortcut">
          (<kbd>⌘K</kbd>)
        </span>
      </Dialog.Trigger>
      <Dialog.Trigger
        class={['SearchTrigger', props.mobileTriggerClass ?? 'HeaderSearchMobileTrigger']}
        aria-label="Search documentation"
      >
        <MagnifyingGlassIcon class="MobileNavTriggerIcon" />
        Navigation
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop class="SearchBackdrop" />
        <Dialog.Viewport class="SearchViewport">
          <Dialog.Popup class="SearchPopup">
            <Dialog.Title class="bui-sr-only">Search documentation</Dialog.Title>
            <Autocomplete.Root<SearchResult>
              items={items()}
              value={query()}
              onValueChange={(value) => void search(value)}
              onOpenChange={(value, details) => {
                if (!value && details.reason === 'escape-key') {
                  changeOpen(false);
                }
              }}
              onItemHighlighted={(item) => {
                highlighted = item;
              }}
              open
              inline
              filter={null}
              autoHighlight="always"
              keepHighlight
              itemToStringValue={(item) => item.title ?? ''}
            >
              <div class="SearchHead">
                <div class="SearchInputRoot">
                  <MagnifyingGlassIcon class="SearchInputIcon" />
                  <Autocomplete.Input
                    id="search-input"
                    aria-label="Search"
                    placeholder="Search"
                    class="SearchInput"
                    onKeyDown={(event) => {
                      if (
                        event.key === 'Enter' &&
                        highlighted &&
                        engine &&
                        (event.metaKey || event.ctrlKey || event.shiftKey)
                      ) {
                        event.preventDefault();
                        window.open(engine.buildResultUrl(highlighted), '_blank', 'noopener');
                      }
                    }}
                  />
                </div>
              </div>
              <div class="SearchBody">
                <ScrollArea.Root class="SearchScrollAreaRoot">
                  <ScrollArea.Viewport class="SearchScrollAreaViewport">
                    <ScrollArea.Content style={{ 'min-width': '100%' }}>
                      <Show
                        when={items().length}
                        fallback={
                          query().trim() ? (
                            <Autocomplete.Status class="SearchEmptyState">
                              No results found.
                            </Autocomplete.Status>
                          ) : null
                        }
                      >
                        <Autocomplete.List class="SearchList">
                          <For each={groups()}>
                            {(group) => (
                              <Autocomplete.Group items={group.items} class="SearchGroup">
                                <Autocomplete.GroupLabel class="SearchGroupLabel">
                                  {group.group.replace(/ Pages$/, '')}
                                </Autocomplete.GroupLabel>
                                <Autocomplete.Collection>
                                  {(result: Accessor<SearchResult>) => (
                                    <Autocomplete.Item
                                      value={result()}
                                      class="SearchOptionItem"
                                      render={(itemProps) => (
                                        <RouterLink
                                          {...itemProps}
                                          href={engine?.buildResultUrl(result())}
                                          tabindex="-1"
                                          onClick={() => changeOpen(false)}
                                        />
                                      )}
                                    >
                                      <For each={result().title?.split(' ‣ ')}>
                                        {(part, index) => (
                                          <>
                                            <Show when={index() > 0}>
                                              <svg
                                                class="SearchBreadcrumbSeparator"
                                                width="16"
                                                height="16"
                                                viewBox="0 0 16 16"
                                              >
                                                <path
                                                  fill="currentColor"
                                                  d="M5.47 13.03a.75.75 0 0 1 0-1.06L9.44 8 5.47 4.03a.75.75 0 0 1 1.06-1.06l4.5 4.5a.75.75 0 0 1 0 1.06l-4.5 4.5a.75.75 0 0 1-1.06 0"
                                                />
                                              </svg>
                                            </Show>
                                            <span
                                              class={[
                                                'SearchBreadcrumbPart',
                                                {
                                                  last:
                                                    index() ===
                                                    (result().title?.split(' ‣ ').length ?? 0) - 1,
                                                },
                                              ]}
                                            >
                                              {part.replace(/^About Base[\s\u00a0]UI$/, 'About')}
                                            </span>
                                          </>
                                        )}
                                      </For>
                                    </Autocomplete.Item>
                                  )}
                                </Autocomplete.Collection>
                              </Autocomplete.Group>
                            )}
                          </For>
                        </Autocomplete.List>
                      </Show>
                    </ScrollArea.Content>
                  </ScrollArea.Viewport>
                  <ScrollArea.Scrollbar class="SearchScrollbar">
                    <ScrollArea.Thumb class="SearchScrollbarThumb" />
                  </ScrollArea.Scrollbar>
                </ScrollArea.Root>
              </div>
              <div class="SearchFooter">
                <div class="SearchFooterHint">
                  <kbd aria-label="Enter" class="SearchFooterEnter">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      aria-hidden="true"
                    >
                      <path d="m9 10-5 5 5 5" />
                      <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                    </svg>
                  </kbd>
                  <span>Go to page</span>
                </div>
              </div>
            </Autocomplete.Root>
            <Dialog.Close class="SearchClose">Close</Dialog.Close>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
