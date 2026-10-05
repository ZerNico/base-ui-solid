import { createSignal, createMemo, createUniqueId, For } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Combobox } from 'base-ui-solid/combobox';

export default function ExampleAsyncMultipleCombobox() {
  const id = createUniqueId();

  const [searchResults, setSearchResults] = createSignal<DirectoryUser[]>([]);
  const [selectedValues, setSelectedValues] = createSignal<DirectoryUser[]>([]);
  const [searchValue, setSearchValue] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
  const [blockStartStatus, setBlockStartStatus] = createSignal(false);

  const [isPending, setPending] = createSignal(false);
  let pendingCount = 0;
  async function startTransition(work: () => unknown) {
    pendingCount += 1;
    setPending(true);
    try {
      await work();
    } finally {
      pendingCount -= 1;
      setPending(pendingCount > 0);
    }
  }

  const { contains } = Combobox.useFilter();

  const abortControllerRef = { current: null } as { current: AbortController | null };
  const selectedValuesRef = { current: [] } as { current: DirectoryUser[] };

  const trimmedSearchValue = createMemo(() => searchValue().trim());

  const items = createMemo(() => {
    if (selectedValues().length === 0) {
      return searchResults();
    }

    const merged = [...searchResults()];

    selectedValues().forEach((user) => {
      if (!searchResults().some((result) => result.id === user.id)) {
        merged.push(user);
      }
    });

    return merged;
  });

  function getStatus() {
    if (isPending()) {
      return (
        <>
          <span
            aria-hidden="true"
            class="inline-block size-3 animate-[spin_0.75s_linear_infinite] rounded-full border border-current border-r-transparent"
          />
          Searching…
        </>
      );
    }

    if (error()) {
      return error();
    }

    if (trimmedSearchValue() === '' && !blockStartStatus()) {
      return selectedValues().length > 0 ? null : 'Start typing to search people…';
    }

    if (searchResults().length === 0 && !blockStartStatus()) {
      return `No matches for "${trimmedSearchValue()}".`;
    }

    return null;
  }

  function getEmptyMessage() {
    if (trimmedSearchValue() === '' || isPending() || searchResults().length > 0 || error()) {
      return null;
    }

    return 'Try a different search term.';
  }

  const status = createMemo(getStatus);
  const emptyMessage = createMemo(() => getEmptyMessage());

  return (
    <Combobox.Root
      items={items()}
      itemToStringLabel={(user: DirectoryUser) => user.name}
      isItemEqualToValue={(item, value) => item.id === value.id}
      multiple
      filter={null}
      onOpenChangeComplete={(open) => {
        if (!open) {
          setSearchResults(selectedValuesRef.current);
          setBlockStartStatus(false);
        }
      }}
      onValueChange={(nextSelectedValues) => {
        selectedValuesRef.current = nextSelectedValues;
        setSelectedValues(nextSelectedValues);
        setSearchValue('');
        setError(null);

        if (nextSelectedValues.length === 0) {
          setSearchResults([]);
          setBlockStartStatus(false);
        } else {
          setBlockStartStatus(true);
        }
      }}
      onInputValueChange={(nextSearchValue, { reason }) => {
        setSearchValue(nextSearchValue);

        const controller = new AbortController();
        abortControllerRef.current?.abort();
        abortControllerRef.current = controller;

        if (nextSearchValue === '') {
          setSearchResults(selectedValuesRef.current);
          setError(null);
          setBlockStartStatus(false);
          return;
        }

        if (reason === 'item-press') {
          return;
        }

        startTransition(async () => {
          setError(null);

          const result = await searchUsers(nextSearchValue, contains);

          if (controller.signal.aborted) {
            return;
          }

          startTransition(() => {
            setSearchResults(result.users);
            setError(result.error);
          });
        });
      }}
    >
      <div class="max-w-md flex flex-col gap-1">
        <label
          class="flex flex-col gap-1 text-sm leading-5 font-bold text-neutral-950 dark:text-white"
          for={id}
        >
          Assign reviewers
        </label>
        <Combobox.InputGroup class="flex min-h-8 w-64 cursor-text flex-wrap items-center gap-0.5 border border-neutral-950 bg-white dark:bg-neutral-950 px-2 py-1 focus-within:outline-2 focus-within:-outline-offset-1 focus-within:outline-neutral-950 dark:focus-within:outline-white has-[button]:px-1 dark:border-white min-[32rem]:w-[22rem]">
          <Combobox.Value>
            {(value: Accessor<DirectoryUser[]>) => (
              <Combobox.Chips
                class="flex w-full flex-wrap items-center gap-1"
                aria-label={value().length > 0 ? 'Selected reviewers' : undefined}
              >
                <For each={value()}>
                  {(user) => (
                    <Combobox.Chip
                      class="group flex min-h-[calc(1.5rem-2px)] cursor-default items-center gap-1 overflow-hidden bg-neutral-100 py-0 pr-[0.2rem] pl-[0.4rem] text-sm leading-none text-neutral-950 outline-none focus-within:bg-neutral-950 focus-within:text-white [@media(hover:hover)]:data-highlighted:bg-neutral-950 [@media(hover:hover)]:data-highlighted:text-white dark:bg-neutral-800 dark:text-white dark:focus-within:bg-white dark:focus-within:text-neutral-950 dark:[@media(hover:hover)]:data-highlighted:bg-white dark:[@media(hover:hover)]:data-highlighted:text-neutral-950"
                      aria-label={user.name}
                      aria-description="Press Backspace or Delete to remove"
                    >
                      {user.name}
                      <Combobox.ChipRemove
                        class="flex size-4 items-center justify-center border-0 bg-transparent p-0 text-inherit hover:bg-neutral-200 group-focus-within:hover:bg-neutral-700 dark:hover:bg-neutral-700 dark:group-focus-within:hover:bg-neutral-200"
                        aria-label={`Remove ${user.name}`}
                      >
                        <XIcon />
                      </Combobox.ChipRemove>
                    </Combobox.Chip>
                  )}
                </For>
                <Combobox.Input
                  id={id}
                  placeholder={value().length > 0 ? '' : 'e.g. Michael'}
                  aria-description={
                    value().length > 0
                      ? `${value().length} selected. From the start of the input, press Left Arrow to focus the selected items`
                      : undefined
                  }
                  class="h-[calc(1.5rem-2px)] min-w-12 flex-1 border-0 bg-white p-0 text-sm any-pointer-coarse:text-base dark:bg-neutral-950 font-normal text-neutral-950 outline-none placeholder:text-neutral-500 dark:placeholder:text-neutral-400 dark:text-white"
                />
              </Combobox.Chips>
            )}
          </Combobox.Value>
        </Combobox.InputGroup>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner class="outline-none" sideOffset={4}>
          <Combobox.Popup
            class="w-[var(--anchor-width)] max-w-[var(--available-width)] origin-[var(--transform-origin)] border border-neutral-950 bg-white text-neutral-950 shadow-[0.25rem_0.25rem_0_rgb(0_0_0_/_12%)] transition-[scale,opacity] duration-100 data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0 dark:border-white dark:bg-neutral-950 dark:text-white dark:shadow-none"
            aria-busy={isPending() ? 'true' : undefined}
          >
            <div class="max-h-[min(var(--available-height),24.5rem)] overflow-y-auto overscroll-contain py-1 scroll-pt-1 scroll-pb-1">
              <Combobox.Status>
                {status() ? (
                  <div class="flex items-center gap-2 py-1 pr-5 pl-2 text-sm leading-5 text-neutral-500 dark:text-neutral-400">
                    {status()}
                  </div>
                ) : null}
              </Combobox.Status>
              <Combobox.Empty>
                {emptyMessage() ? (
                  <div class="py-2 pr-4 pl-2 text-sm leading-4 text-neutral-500 dark:text-neutral-400">
                    {emptyMessage()}
                  </div>
                ) : null}
              </Combobox.Empty>
              <Combobox.List>
                {(user: Accessor<DirectoryUser>) => (
                  <Combobox.Item
                    value={user()}
                    class="grid cursor-default grid-cols-[1rem_1fr] items-start gap-2 px-2 py-2 text-sm leading-[1.2rem] outline-none select-none [@media(hover:hover)]:data-highlighted:relative [@media(hover:hover)]:data-highlighted:z-0 [@media(hover:hover)]:data-highlighted:text-neutral-950 [@media(hover:hover)]:data-highlighted:before:absolute [@media(hover:hover)]:data-highlighted:before:inset-0 [@media(hover:hover)]:data-highlighted:before:z-[-1] [@media(hover:hover)]:data-highlighted:before:bg-neutral-100 dark:[@media(hover:hover)]:data-highlighted:text-white dark:[@media(hover:hover)]:data-highlighted:before:bg-neutral-800"
                  >
                    <Combobox.ItemIndicator class="col-start-1 mt-1">
                      <CheckIcon />
                    </Combobox.ItemIndicator>
                    <span class="col-start-2 flex flex-col gap-1">
                      <span class="text-sm leading-5 font-bold">{user().name}</span>
                      <span class="text-xs">{user().email}</span>
                      <span class="flex flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                        <span>@{user().username}</span>
                        <span>{user().title}</span>
                      </span>
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </div>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}

function CheckIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}

function XIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      stroke-linecap="square"
      stroke-linejoin="round"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="m4.5 4.5 7 7m-7 0 7-7" />
    </svg>
  );
}
interface DirectoryUser {
  id: string;
  name: string;
  username: string;
  email: string;
  title: string;
}

async function searchUsers(
  query: string,
  filter: (item: string, query: string) => boolean,
): Promise<{ users: DirectoryUser[]; error: string | null }> {
  // Simulate network delay
  await new Promise((resolve) => {
    setTimeout(resolve, Math.random() * 500 + 100);
  });

  // Simulate occasional network errors (1% chance)
  if (Math.random() < 0.01 || query === 'will_error') {
    return {
      users: [],
      error: 'Failed to fetch people. Please try again.',
    };
  }

  const users = allUsers.filter((user) => {
    return (
      filter(user.name, query) ||
      filter(user.username, query) ||
      filter(user.email, query) ||
      filter(user.title, query)
    );
  });

  return {
    users,
    error: null,
  };
}

const allUsers: DirectoryUser[] = [
  {
    id: 'leslie-alexander',
    name: 'Leslie Alexander',
    username: 'leslie',
    email: 'leslie.alexander@example.com',
    title: 'Product Manager',
  },
  {
    id: 'kathryn-murphy',
    name: 'Kathryn Murphy',
    username: 'kathryn',
    email: 'kathryn.murphy@example.com',
    title: 'Marketing Lead',
  },
  {
    id: 'courtney-henry',
    name: 'Courtney Henry',
    username: 'courtney',
    email: 'courtney.henry@example.com',
    title: 'Design Systems',
  },
  {
    id: 'michael-foster',
    name: 'Michael Foster',
    username: 'michael',
    email: 'michael.foster@example.com',
    title: 'Engineering Manager',
  },
  {
    id: 'lindsay-walton',
    name: 'Lindsay Walton',
    username: 'lindsay',
    email: 'lindsay.walton@example.com',
    title: 'Product Designer',
  },
  {
    id: 'tom-cook',
    name: 'Tom Cook',
    username: 'tom',
    email: 'tom.cook@example.com',
    title: 'Frontend Engineer',
  },
  {
    id: 'whitney-francis',
    name: 'Whitney Francis',
    username: 'whitney',
    email: 'whitney.francis@example.com',
    title: 'Customer Success',
  },
  {
    id: 'jacob-jones',
    name: 'Jacob Jones',
    username: 'jacob',
    email: 'jacob.jones@example.com',
    title: 'Security Engineer',
  },
  {
    id: 'arlene-mccoy',
    name: 'Arlene McCoy',
    username: 'arlene',
    email: 'arlene.mccoy@example.com',
    title: 'Data Analyst',
  },
  {
    id: 'marvin-mckinney',
    name: 'Marvin McKinney',
    username: 'marvin',
    email: 'marvin.mckinney@example.com',
    title: 'QA Specialist',
  },
  {
    id: 'eleanor-pena',
    name: 'Eleanor Pena',
    username: 'eleanor',
    email: 'eleanor.pena@example.com',
    title: 'Operations',
  },
  {
    id: 'jerome-bell',
    name: 'Jerome Bell',
    username: 'jerome',
    email: 'jerome.bell@example.com',
    title: 'DevOps Engineer',
  },
];
