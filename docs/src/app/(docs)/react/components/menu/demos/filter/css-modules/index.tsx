import { For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Menu } from 'base-ui-solid/menu';
import styles from './index.module.css';

export default function ExampleMenuFilter() {
  return (
    <Menu.FilterProvider>
      <Menu.Root>
        <Menu.Trigger class={styles.Trigger}>
          Actions <CaretDownIcon />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner class={styles.Positioner} sideOffset={8} align="start">
            <Menu.Popup class={styles.Popup}>
              <div class={styles.InputContainer}>
                <Menu.Input
                  class={styles.Input}
                  aria-label="Filter actions"
                  placeholder="e.g. Save"
                />
                <Menu.Clear class={styles.Clear}>
                  <ClearIcon />
                </Menu.Clear>
              </div>
              <Menu.Empty class={styles.Empty}>No actions found.</Menu.Empty>
              <Menu.List class={styles.List}>
                <Menu.Group class={styles.Section}>
                  <Menu.GroupLabel class={styles.GroupLabel}>File</Menu.GroupLabel>
                  <Menu.Item class={styles.Item}>New file</Menu.Item>
                  <Menu.Item class={styles.Item}>Open file</Menu.Item>
                  <Menu.Item class={styles.Item}>Save</Menu.Item>
                  <Menu.Item class={styles.Item}>Save as</Menu.Item>
                  <Menu.Item class={styles.Item}>Duplicate</Menu.Item>
                  <Menu.Item class={styles.Item}>Rename</Menu.Item>
                </Menu.Group>
                <Menu.Group class={styles.Section}>
                  <Menu.GroupLabel class={styles.GroupLabel}>Organize</Menu.GroupLabel>
                  <FilterableSubmenu
                    label="Move to folder"
                    inputLabel="Filter folders"
                    placeholder="e.g. Projects"
                    emptyText="No folders found."
                    options={folderOptions}
                  />
                  <Menu.SubmenuRoot>
                    <Menu.SubmenuTrigger class={styles.SubmenuTrigger}>
                      Share
                      <CaretRightIcon />
                    </Menu.SubmenuTrigger>
                    <Menu.Portal>
                      <Menu.Positioner
                        class={styles.Positioner}
                        sideOffset={getSubmenuOffset}
                        alignOffset={getSubmenuOffset}
                      >
                        <Menu.Popup class={styles.Popup}>
                          <Menu.List class={[styles.List, styles.SubmenuList]}>
                            <For each={sharingOptions}>
                              {(option) => <Menu.Item class={styles.Item}>{option}</Menu.Item>}
                            </For>
                          </Menu.List>
                        </Menu.Popup>
                      </Menu.Positioner>
                    </Menu.Portal>
                  </Menu.SubmenuRoot>
                  <FilterableSubmenu
                    label="Export"
                    inputLabel="Filter export formats"
                    placeholder="e.g. PDF"
                    emptyText="No export formats found."
                    options={exportOptions}
                  />
                  <Menu.Item class={styles.Item}>Download a copy</Menu.Item>
                  <Menu.Item class={styles.Item}>Delete</Menu.Item>
                </Menu.Group>

                <Menu.RadioGroup class={styles.Section} defaultValue="date">
                  <Menu.Separator class={styles.Separator} />
                  <Menu.GroupLabel class={styles.GroupLabel}>Sort by</Menu.GroupLabel>
                  <For
                    each={[
                      ['date', 'Date modified'],
                      ['name', 'Name'],
                      ['size', 'Size'],
                    ]}
                  >
                    {([value, label]) => (
                      <Menu.RadioItem class={styles.ChoiceItem} value={value}>
                        <Menu.RadioItemIndicator class={styles.ChoiceIndicator}>
                          <CheckIcon />
                        </Menu.RadioItemIndicator>
                        <span class={styles.ChoiceText}>{label}</span>
                      </Menu.RadioItem>
                    )}
                  </For>
                </Menu.RadioGroup>

                <Menu.Group class={styles.Section}>
                  <Menu.Separator class={styles.Separator} />
                  <Menu.GroupLabel class={styles.GroupLabel}>View</Menu.GroupLabel>
                  <Menu.CheckboxItem class={styles.ChoiceItem} defaultChecked>
                    <Menu.CheckboxItemIndicator class={styles.ChoiceIndicator}>
                      <CheckIcon />
                    </Menu.CheckboxItemIndicator>
                    <span class={styles.ChoiceText}>Show details</span>
                  </Menu.CheckboxItem>
                  <Menu.CheckboxItem class={styles.ChoiceItem}>
                    <Menu.CheckboxItemIndicator class={styles.ChoiceIndicator}>
                      <CheckIcon />
                    </Menu.CheckboxItemIndicator>
                    <span class={styles.ChoiceText}>Show sidebar</span>
                  </Menu.CheckboxItem>
                  <Menu.CheckboxItem class={styles.ChoiceItem}>
                    <Menu.CheckboxItemIndicator class={styles.ChoiceIndicator}>
                      <CheckIcon />
                    </Menu.CheckboxItemIndicator>
                    <span class={styles.ChoiceText}>Keep available offline</span>
                  </Menu.CheckboxItem>
                </Menu.Group>
              </Menu.List>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </Menu.FilterProvider>
  );
}

interface FilterableSubmenuProps {
  label: string;
  inputLabel: string;
  placeholder: string;
  emptyText: string;
  options: readonly string[];
}

function FilterableSubmenu(props: FilterableSubmenuProps) {
  return (
    <Menu.FilterProvider>
      <Menu.SubmenuRoot>
        <Menu.SubmenuTrigger class={styles.SubmenuTrigger}>
          {props.label}
          <CaretRightIcon />
        </Menu.SubmenuTrigger>
        <Menu.Portal>
          <Menu.Positioner
            class={styles.Positioner}
            sideOffset={getSubmenuOffset}
            alignOffset={getSubmenuOffset}
          >
            <Menu.Popup class={styles.Popup}>
              <div class={styles.InputContainer}>
                <Menu.Input
                  class={styles.Input}
                  aria-label={props.inputLabel}
                  placeholder={props.placeholder}
                />
                <Menu.Clear class={styles.Clear}>
                  <ClearIcon />
                </Menu.Clear>
              </div>
              <Menu.Empty class={styles.Empty}>{props.emptyText}</Menu.Empty>
              <Menu.List class={[styles.List, styles.SubmenuList]}>
                <For each={props.options}>
                  {(option) => <Menu.Item class={styles.Item}>{option}</Menu.Item>}
                </For>
              </Menu.List>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.SubmenuRoot>
    </Menu.FilterProvider>
  );
}

function getSubmenuOffset({ side }: { side: Menu.Positioner.Props['side'] }) {
  return side === 'top' || side === 'bottom' ? 4 : -4;
}

function CaretDownIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path d="M12 6H4l4 4.5z" />
    </svg>
  );
}

function ClearIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path d="m3.5 3.5 9 9m0-9-9 9" />
    </svg>
  );
}

function CaretRightIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path d="M6 12V4l4.5 4z" />
    </svg>
  );
}

function CheckIcon(
  props: Omit<JSX.IntrinsicElements['svg'], 'style'> & { style?: JSX.CSSProperties },
) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      {...props}
      style={{ display: 'block', ...props.style }}
    >
      <path d="m2.5 8.5 4 4 7-9" />
    </svg>
  );
}

const sharingOptions = [
  'Email',
  'Messages',
  'AirDrop',
  'Copy link',
  'Invite collaborators',
  'Publish to web',
  'Send a copy',
];

const folderOptions = [
  'Desktop',
  'Documents',
  'Downloads',
  'Projects',
  'Archive',
  'Shared',
  'Trash',
];

const exportOptions = [
  'PDF document',
  'Word document',
  'Plain text',
  'Rich text',
  'Markdown',
  'HTML page',
  'Image',
];
