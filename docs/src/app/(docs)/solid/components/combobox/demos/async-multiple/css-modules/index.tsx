import { createSignal, createMemo, createUniqueId, For } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Combobox } from 'base-ui-solid/combobox';
import styles from './index.module.css';

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

  let abortController: AbortController | null = null;
  let latestSelectedValues: DirectoryUser[] = [];

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
          <span class={styles.Spinner} aria-hidden="true" />
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
          setSearchResults(latestSelectedValues);
          setBlockStartStatus(false);
        }
      }}
      onValueChange={(nextSelectedValues) => {
        latestSelectedValues = nextSelectedValues;
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
        abortController?.abort();
        abortController = controller;

        if (nextSearchValue === '') {
          setSearchResults(latestSelectedValues);
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
      <div class={styles.Container}>
        <label class={styles.Label} for={id}>
          Assign reviewers
        </label>
        <Combobox.InputGroup class={styles.InputGroup}>
          <Combobox.Value>
            {(value: Accessor<DirectoryUser[]>) => (
              <Combobox.Chips
                class={styles.Chips}
                aria-label={value().length > 0 ? 'Selected reviewers' : undefined}
              >
                <For each={value()}>
                  {(user) => (
                    <Combobox.Chip
                      class={styles.Chip}
                      aria-label={user.name}
                      aria-description="Press Backspace or Delete to remove"
                    >
                      {user.name}
                      <Combobox.ChipRemove
                        class={styles.ChipRemove}
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
                  class={styles.Input}
                />
              </Combobox.Chips>
            )}
          </Combobox.Value>
        </Combobox.InputGroup>
      </div>

      <Combobox.Portal>
        <Combobox.Positioner class={styles.Positioner} sideOffset={4}>
          <Combobox.Popup class={styles.Popup} aria-busy={isPending() ? 'true' : undefined}>
            <div class={styles.Viewport}>
              <Combobox.Status>
                {status() ? <div class={styles.Status}>{status()}</div> : null}
              </Combobox.Status>
              <Combobox.Empty>
                {emptyMessage() ? <div class={styles.Empty}>{emptyMessage()}</div> : null}
              </Combobox.Empty>
              <Combobox.List>
                {(user: Accessor<DirectoryUser>) => (
                  <Combobox.Item class={styles.Item} value={user()}>
                    <Combobox.ItemIndicator class={styles.ItemIndicator}>
                      <CheckIcon />
                    </Combobox.ItemIndicator>
                    <span class={styles.ItemText}>
                      <span class={styles.ItemTitle}>{user().name}</span>
                      <span class={styles.ItemEmail}>{user().email}</span>
                      <span class={styles.ItemSubtitle}>
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
