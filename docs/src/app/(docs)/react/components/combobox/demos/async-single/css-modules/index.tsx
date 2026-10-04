import { createSignal, createMemo, createUniqueId } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Combobox } from 'base-ui-solid/combobox';
import styles from './index.module.css';

export default function ExampleAsyncSingleCombobox() {
  const id = createUniqueId();

  const [searchResults, setSearchResults] = createSignal<DirectoryUser[]>([]);
  const [selectedValue, setSelectedValue] = createSignal<DirectoryUser | null>(null);
  const [searchValue, setSearchValue] = createSignal('');
  const [error, setError] = createSignal<string | null>(null);
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

  const trimmedSearchValue = createMemo(() => searchValue().trim());

  const items = createMemo(() => {
    if (!selectedValue() || searchResults().some((user) => user.id === selectedValue()?.id)) {
      return searchResults();
    }

    return [...searchResults(), selectedValue()];
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

    if (trimmedSearchValue() === '') {
      return selectedValue() ? null : 'Start typing to search people…';
    }

    if (searchResults().length === 0) {
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
      filter={null}
      onOpenChangeComplete={(open) => {
        if (!open && selectedValue()) {
          setSearchResults([selectedValue()!]);
        }
      }}
      onValueChange={(nextSelectedValue) => {
        setSelectedValue(nextSelectedValue);
        setSearchValue('');
        setError(null);
      }}
      onInputValueChange={(nextSearchValue, { reason }) => {
        setSearchValue(nextSearchValue);

        const controller = new AbortController();
        abortControllerRef.current?.abort();
        abortControllerRef.current = controller;

        if (nextSearchValue === '') {
          setSearchResults([]);
          setError(null);
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
      <div class={styles.Label}>
        <label for={id}>Assign reviewer</label>
        <Combobox.InputGroup class={styles.InputGroup}>
          <Combobox.Input id={id} placeholder="e.g. Michael" class={styles.Input} />
          <div class={styles.ActionButtons}>
            <Combobox.Clear class={styles.Clear} aria-label="Clear selection">
              <XIcon />
            </Combobox.Clear>
            <Combobox.Trigger class={styles.Trigger} aria-label="Open popup">
              <CaretDownIcon />
            </Combobox.Trigger>
          </div>
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
                {(user: DirectoryUser) => (
                  <Combobox.Item class={styles.Item} value={user}>
                    <Combobox.ItemIndicator class={styles.ItemIndicator}>
                      <CheckIcon />
                    </Combobox.ItemIndicator>
                    <span class={styles.ItemText}>
                      <span class={styles.ItemTitle}>{user.name}</span>
                      <span class={styles.ItemEmail}>{user.email}</span>
                      <span class={styles.ItemSubtitle}>
                        <span>@{user.username}</span>
                        <span>{user.title}</span>
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

function CaretDownIcon(props: JSX.IntrinsicElements['svg']) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={
        typeof props.style === 'string'
          ? `display: block; ${props.style}`
          : { display: 'block', ...(typeof props.style === 'object' ? props.style : {}) }
      }
    >
      <path d="M12 6H4l4 4.5z" />
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
