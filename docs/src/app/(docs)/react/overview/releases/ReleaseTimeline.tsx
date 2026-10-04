import { For } from 'solid-js';
import type { JSX } from '@solidjs/web';
import { Link } from '../../../../(website)/Link';
import { releases } from './releases';
import './ReleaseTimeline.css';

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

function renderHighlight(text: string): JSX.Element {
  const parts = text.split(/`([^`]+)`/);
  return parts.length === 1
    ? text
    : parts.map((part, i) => (i % 2 === 1 ? <code class="MdCode">{part}</code> : part));
}

export function ReleaseTimeline() {
  return (
    <ul class="ReleaseTimeline" aria-label="Release timeline">
      <For each={releases}>
        {(release) => (
          <li class="TimelineItem">
            <article class="TimelineCard">
              <div class="TimelineCardHeader">
                <time class="TimelineDate" datetime={release.date}>
                  {dateFormatter.format(new Date(release.date))}
                </time>
                <h2 class="TimelineVersion">
                  <Link
                    class="TimelineVersionLink"
                    href={`/react/overview/releases/${release.versionSlug}`}
                  >
                    {release.version}
                  </Link>
                  {release.latest && <span class="TimelineBadge">Latest</span>}
                </h2>
              </div>
              <ul class="TimelineHighlights">
                <For each={release.highlights}>
                  {(highlight) => <li>{renderHighlight(highlight)}</li>}
                </For>
              </ul>
            </article>
          </li>
        )}
      </For>
    </ul>
  );
}
