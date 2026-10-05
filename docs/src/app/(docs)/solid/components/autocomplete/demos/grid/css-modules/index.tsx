import { createSignal, For } from 'solid-js';
import type { Accessor } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Autocomplete } from 'base-ui-solid/autocomplete';
import styles from './index.module.css';

export default function ExampleEmojiPicker() {
  const [pickerOpen, setPickerOpen] = createSignal(false);
  const [textValue, setTextValue] = createSignal('');
  const [searchValue, setSearchValue] = createSignal('');

  let textInput: HTMLInputElement | null = null;

  function handleInsertEmoji(value: string | null) {
    if (!value || !textInput) {
      return;
    }

    const emoji = value;
    const start = textInput.selectionStart ?? textInput.value.length ?? 0;
    const end = textInput.selectionEnd ?? textInput.value.length ?? 0;

    setTextValue((prev) => prev.slice(0, start) + emoji + prev.slice(end));
    setPickerOpen(false);

    const input = textInput;
    if (input) {
      input.focus();
      const caretPos = start + emoji.length;
      input.setSelectionRange(caretPos, caretPos);
    }
  }

  return (
    <div class={styles.Container}>
      <div class={styles.InputGroup}>
        <input
          ref={(element) => {
            textInput = element;
          }}
          type="text"
          aria-label="Message"
          class={styles.TextInput}
          placeholder="iMessage"
          value={textValue()}
          onInput={(event) => setTextValue(event.target.value)}
        />

        <Autocomplete.Root
          items={emojiGroups}
          grid
          open={pickerOpen()}
          onOpenChange={setPickerOpen}
          onOpenChangeComplete={() => setSearchValue('')}
          value={searchValue()}
          onValueChange={(value, details) => {
            if (details.reason !== 'item-press') {
              setSearchValue(value);
            }
          }}
        >
          <Autocomplete.Trigger class={styles.EmojiButton} aria-label="Choose emoji">
            😀
          </Autocomplete.Trigger>
          <Autocomplete.Portal>
            <Autocomplete.Positioner class={styles.Positioner} sideOffset={4} align="end">
              <Autocomplete.Popup class={styles.Popup} aria-label="Select emoji">
                <Autocomplete.Input
                  aria-label="Search emojis"
                  placeholder="Search emojis…"
                  class={styles.Input}
                />
                <div class={styles.Viewport}>
                  <Autocomplete.Empty>
                    <div class={styles.Empty}>No emojis found</div>
                  </Autocomplete.Empty>
                  <Autocomplete.List
                    aria-label="Emoji results"
                    class={styles.List}
                    style={{ '--cols': COLUMNS } as JSX.CSSProperties}
                  >
                    {(group: Accessor<EmojiGroup>) => (
                      <Autocomplete.Group items={group().items} class={styles.Group}>
                        <Autocomplete.GroupLabel class={styles.GroupLabel}>
                          {group().label}
                        </Autocomplete.GroupLabel>
                        <div class={styles.Grid} role="presentation">
                          <For each={chunkArray(group().items, COLUMNS)}>
                            {(row, _rowIdx) => (
                              <Autocomplete.Row class={styles.Row}>
                                <For each={row}>
                                  {(rowItem) => (
                                    <Autocomplete.Item
                                      value={rowItem}
                                      class={styles.Item}
                                      onClick={() => {
                                        handleInsertEmoji(rowItem.emoji);
                                        setPickerOpen(false);
                                      }}
                                    >
                                      <span class={styles.Emoji}>{rowItem.emoji}</span>
                                    </Autocomplete.Item>
                                  )}
                                </For>
                              </Autocomplete.Row>
                            )}
                          </For>
                        </div>
                      </Autocomplete.Group>
                    )}
                  </Autocomplete.List>
                </div>
              </Autocomplete.Popup>
            </Autocomplete.Positioner>
          </Autocomplete.Portal>
        </Autocomplete.Root>
      </div>
    </div>
  );
}

const COLUMNS = 5;

function chunkArray<T>(array: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

interface EmojiItem {
  emoji: string;
  value: string;
  name: string;
}

interface EmojiGroup {
  value: string;
  label: string;
  items: EmojiItem[];
}

export const emojiCategories = [
  {
    label: 'Smileys & Emotion',
    emojis: [
      { emoji: '😀', name: 'grinning face' },
      { emoji: '😃', name: 'grinning face with big eyes' },
      { emoji: '😄', name: 'grinning face with smiling eyes' },
      { emoji: '😁', name: 'beaming face with smiling eyes' },
      { emoji: '😆', name: 'grinning squinting face' },
      { emoji: '😅', name: 'grinning face with sweat' },
      { emoji: '🤣', name: 'rolling on the floor laughing' },
      { emoji: '😂', name: 'face with tears of joy' },
      { emoji: '🙂', name: 'slightly smiling face' },
      { emoji: '🙃', name: 'upside-down face' },
      { emoji: '😉', name: 'winking face' },
      { emoji: '😊', name: 'smiling face with smiling eyes' },
      { emoji: '😇', name: 'smiling face with halo' },
      { emoji: '🥰', name: 'smiling face with hearts' },
      { emoji: '😍', name: 'smiling face with heart-eyes' },
      { emoji: '🤩', name: 'star-struck' },
      { emoji: '😘', name: 'face blowing a kiss' },
      { emoji: '😗', name: 'kissing face' },
      { emoji: '☺️', name: 'smiling face' },
      { emoji: '😚', name: 'kissing face with closed eyes' },
      { emoji: '😙', name: 'kissing face with smiling eyes' },
      { emoji: '🥲', name: 'smiling face with tear' },
      { emoji: '😋', name: 'face savoring food' },
      { emoji: '😛', name: 'face with tongue' },
      { emoji: '😜', name: 'winking face with tongue' },
      { emoji: '🤪', name: 'zany face' },
      { emoji: '😝', name: 'squinting face with tongue' },
      { emoji: '🤑', name: 'money-mouth face' },
      { emoji: '🤗', name: 'hugging face' },
      { emoji: '🤭', name: 'face with hand over mouth' },
    ],
  },
  {
    label: 'Animals & Nature',
    emojis: [
      { emoji: '🐶', name: 'dog face' },
      { emoji: '🐱', name: 'cat face' },
      { emoji: '🐭', name: 'mouse face' },
      { emoji: '🐹', name: 'hamster' },
      { emoji: '🐰', name: 'rabbit face' },
      { emoji: '🦊', name: 'fox' },
      { emoji: '🐻', name: 'bear' },
      { emoji: '🐼', name: 'panda' },
      { emoji: '🐨', name: 'koala' },
      { emoji: '🐯', name: 'tiger face' },
      { emoji: '🦁', name: 'lion' },
      { emoji: '🐮', name: 'cow face' },
      { emoji: '🐷', name: 'pig face' },
      { emoji: '🐽', name: 'pig nose' },
      { emoji: '🐸', name: 'frog' },
      { emoji: '🐵', name: 'monkey face' },
      { emoji: '🙈', name: 'see-no-evil monkey' },
      { emoji: '🙉', name: 'hear-no-evil monkey' },
      { emoji: '🙊', name: 'speak-no-evil monkey' },
      { emoji: '🐒', name: 'monkey' },
      { emoji: '🐔', name: 'chicken' },
      { emoji: '🐧', name: 'penguin' },
      { emoji: '🐦', name: 'bird' },
      { emoji: '🐤', name: 'baby chick' },
      { emoji: '🐣', name: 'hatching chick' },
      { emoji: '🐥', name: 'front-facing baby chick' },
      { emoji: '🦆', name: 'duck' },
      { emoji: '🦅', name: 'eagle' },
      { emoji: '🦉', name: 'owl' },
      { emoji: '🦇', name: 'bat' },
    ],
  },
  {
    label: 'Food & Drink',
    emojis: [
      { emoji: '🍎', name: 'red apple' },
      { emoji: '🍏', name: 'green apple' },
      { emoji: '🍊', name: 'tangerine' },
      { emoji: '🍋', name: 'lemon' },
      { emoji: '🍌', name: 'banana' },
      { emoji: '🍉', name: 'watermelon' },
      { emoji: '🍇', name: 'grapes' },
      { emoji: '🍓', name: 'strawberry' },
      { emoji: '🫐', name: 'blueberries' },
      { emoji: '🍈', name: 'melon' },
      { emoji: '🍒', name: 'cherries' },
      { emoji: '🍑', name: 'peach' },
      { emoji: '🥭', name: 'mango' },
      { emoji: '🍍', name: 'pineapple' },
      { emoji: '🥥', name: 'coconut' },
      { emoji: '🥝', name: 'kiwi fruit' },
      { emoji: '🍅', name: 'tomato' },
      { emoji: '🍆', name: 'eggplant' },
      { emoji: '🥑', name: 'avocado' },
      { emoji: '🥦', name: 'broccoli' },
      { emoji: '🥬', name: 'leafy greens' },
      { emoji: '🥒', name: 'cucumber' },
      { emoji: '🌶️', name: 'hot pepper' },
      { emoji: '🫑', name: 'bell pepper' },
      { emoji: '🌽', name: 'ear of corn' },
      { emoji: '🥕', name: 'carrot' },
      { emoji: '🫒', name: 'olive' },
      { emoji: '🧄', name: 'garlic' },
      { emoji: '🧅', name: 'onion' },
      { emoji: '🥔', name: 'potato' },
    ],
  },
];

const emojiGroups: EmojiGroup[] = emojiCategories.map((category) => ({
  value: category.label,
  label: category.label,
  items: category.emojis.map((emoji) => ({
    ...emoji,
    value: emoji.name.toLowerCase(),
  })),
}));
