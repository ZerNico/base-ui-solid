import { Dynamic } from '@solidjs/web';
import { createSignal } from 'solid-js';
import type { Component } from 'solid-js';
import { PreviewCard } from 'base-ui-solid/preview-card';
import styles from '../../index.module.css';

const demoPreviewCard = PreviewCard.createHandle<Component>();

const cardContents = {
  typography: () => (
    <div class={styles.PopupContent}>
      <img
        width="224"
        height="150"
        class={styles.Image}
        src="https://images.unsplash.com/photo-1619615391095-dfa29e1672ef?q=80&w=448&h=300"
        alt="Station Hofplein signage in Rotterdam, Netherlands"
      />
      <p class={styles.Summary}>
        <strong>Typography</strong> is the art and science of arranging type.
      </p>
    </div>
  ),
  design: () => (
    <div class={styles.PopupContent}>
      <img
        width="241"
        height="240"
        class={styles.Image}
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b7/Braun_ABW30_%28schwarz%29.jpg/250px-Braun_ABW30_%28schwarz%29.jpg"
        alt="Braun ABW30"
      />
      <p class={styles.Summary}>
        A <strong>design</strong> is the concept or proposal for an object, process, or system.
      </p>
    </div>
  ),
  art: () => (
    <div class={styles.PopupContent}>
      <img
        width="206"
        height="240"
        class={styles.Image}
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5f/MonaLisa_sfumato.jpeg/250px-MonaLisa_sfumato.jpeg"
        alt="Mona Lisa"
      />
      <p class={styles.Summary}>
        <strong>Art</strong> is a diverse range of cultural activity centered around works utilizing
        creative or imaginative talents, which are expected to evoke a worthwhile experience,
        generally through an expression of emotional power, conceptual ideas, technical proficiency,
        or beauty.
      </p>
    </div>
  ),
};

export default function PreviewCardDetachedTriggersControlledDemo() {
  const [open, setOpen] = createSignal(false);
  const [triggerId, setTriggerId] = createSignal<string | null>(null);

  const handleOpenChange = (isOpen: boolean, eventDetails: PreviewCard.Root.ChangeEventDetails) => {
    setOpen(isOpen);
    setTriggerId(eventDetails.trigger?.id ?? null);
  };

  return (
    <div>
      <div class={styles.Container}>
        <p class={styles.Paragraph}>
          Discover{' '}
          <PreviewCard.Trigger
            class={styles.Link}
            handle={demoPreviewCard}
            href="https://en.wikipedia.org/wiki/Typography"
            id="trigger-1"
            payload={cardContents.typography}
          >
            typography
          </PreviewCard.Trigger>
          ,{' '}
          <PreviewCard.Trigger
            class={styles.Link}
            handle={demoPreviewCard}
            href="https://en.wikipedia.org/wiki/Industrial_design"
            id="trigger-2"
            payload={cardContents.design}
          >
            design
          </PreviewCard.Trigger>
          , or{' '}
          <PreviewCard.Trigger
            class={styles.Link}
            handle={demoPreviewCard}
            href="https://en.wikipedia.org/wiki/Art"
            id="trigger-3"
            payload={cardContents.art}
          >
            art
          </PreviewCard.Trigger>
          .
        </p>
        <button
          type="button"
          class={styles.Button}
          onClick={() => {
            setTriggerId('trigger-2');
            setOpen(true);
          }}
        >
          Open programmatically
        </button>
      </div>

      <PreviewCard.Root
        handle={demoPreviewCard}
        open={open()}
        onOpenChange={handleOpenChange}
        triggerId={triggerId()}
      >
        {({ payload }) => (
          <PreviewCard.Portal>
            <PreviewCard.Positioner sideOffset={8} class={styles.Positioner}>
              <PreviewCard.Popup class={styles.Popup}>
                <PreviewCard.Arrow class={styles.Arrow} />
                <Dynamic component={payload()} />
              </PreviewCard.Popup>
            </PreviewCard.Positioner>
          </PreviewCard.Portal>
        )}
      </PreviewCard.Root>
    </div>
  );
}
