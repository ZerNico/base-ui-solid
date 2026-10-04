// Port note: Solid uses native attributes and reactive props; render functions replace cloned elements.
import { PreviewCard } from 'base-ui-solid/preview-card';
import styles from '../../index.module.css';

const demoPreviewCard = PreviewCard.createHandle();

export default function PreviewCardDetachedTriggersSimpleDemo() {
  return (
    <div>
      <p class={styles.Paragraph}>
        The principles of good{' '}
        <PreviewCard.Trigger
          class={styles.Link}
          handle={demoPreviewCard}
          href="https://en.wikipedia.org/wiki/Typography"
        >
          typography
        </PreviewCard.Trigger>{' '}
        remain in the digital age.
      </p>

      <PreviewCard.Root handle={demoPreviewCard}>
        <PreviewCard.Portal>
          <PreviewCard.Positioner sideOffset={8}>
            <PreviewCard.Popup class={styles.Popup}>
              <PreviewCard.Arrow class={styles.Arrow} />
              <div class={styles.PopupContent}>
                <img
                  width="224"
                  height="150"
                  class={styles.Image}
                  src="https://images.unsplash.com/photo-1619615391095-dfa29e1672ef?q=80&w=448&h=300"
                  alt="Station Hofplein signage in Rotterdam, Netherlands"
                />
                <p class={styles.Summary}>
                  <strong>Typography</strong> is the art and science of arranging type to make
                  written language clear, visually appealing, and effective in communication.
                </p>
              </div>
            </PreviewCard.Popup>
          </PreviewCard.Positioner>
        </PreviewCard.Portal>
      </PreviewCard.Root>
    </div>
  );
}
