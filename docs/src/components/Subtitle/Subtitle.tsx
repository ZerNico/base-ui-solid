import type { JSX } from '@solidjs/web';
import { useLocation } from '@tanstack/solid-router';
import { Show } from 'solid-js';
import { MarkdownIcon } from '../../icons/MarkdownIcon';
import { GitHubIcon } from '../../icons/GitHubIcon';
import './Subtitle.css';

export function Subtitle(props: { children?: JSX.Element; skipLinks?: boolean }) {
  const location = useLocation();
  return (
    <div class="Subtitle">
      <p>{props.children}</p>
      <Show when={!props.skipLinks}>
        <div class="SubtitleLinks">
          <a class="SubtitleLink" href={`https://base-ui.com${location().pathname}.md`}>
            <span class="SubtitleLinkText">
              <MarkdownIcon />
              View as Markdown
            </span>
          </a>
          <Show
            when={
              location().pathname.includes('/components/') ||
              location().pathname.includes('/utils/')
            }
          >
            <a
              class="SubtitleLink"
              href={`https://github.com/mui/base-ui/blob/master/docs/src/app/(docs)${location().pathname}/page.mdx`}
            >
              <span class="SubtitleLinkText">
                <GitHubIcon />
                View source
              </span>
            </a>
          </Show>
        </div>
      </Show>
    </div>
  );
}
