// Keep CSS imports first to ensure CSS layer order is correct
import './css/index.css';

import type { JSX } from '@solidjs/web';
import { REPO_URL } from '../../config';
import { Link } from './Link';
import { SearchDialog } from '../../components/Search/SearchDialog';
import { Logo } from '../../components/Logo';

export default function Layout(props: { children?: JSX.Element }) {
  return (
    <div style={{ display: 'contents' }}>
      <div class="Body bui-p-6 bp2:bui-py-7 bp2:bui-px-9">
        <div style={{ display: 'contents' }}>
          <div
            class="bui-bs-bb bui-d-g bui-gtc-8 bui-g-8 bp2:bui-g-9"
            style={{ 'max-width': '1480px', 'margin-inline': 'auto' }}
          >
            <header class="bui-d-c">
              <div class="bui-gcs-1 bui-gce-4">
                <Logo aria-label="Base UI for Solid" />
              </div>
              <nav
                class="bui-d-f bui-fd-c bui-g-2 bui-gcs-5 bui-gce-8 bp2:bui-gcs-5 bp2:bui-gce-9 bp3:bui-gcs-5 bp3:bui-gce-7"
                aria-label="social links"
              >
                <Link class="Text sz-1" href={REPO_URL}>
                  GitHub
                </Link>
              </nav>
              <div class="bui-d-n bp3:bui-d-f bui-fd-c bui-g-2 bui-ai-s bui-gcs-7 bui-gce-9">
                <SearchDialog mobileTriggerClass="bui-d-n" />
              </div>
            </header>
            <main id="main" class="bui-d-c">
              {props.children}
            </main>
            <div class="bui-gcs-1 bui-gce-9 bp3:bui-gcs-3">
              <div class="Separator" role="separator" aria-hidden="true" />
            </div>
            <footer class="bui-d-c">
              <div class="bui-gcs-1 bui-gce-9 bp2:bui-gce-3">
                <span class="Text sz-1">© base-ui-solid contributors</span>
              </div>
              <nav
                class="bui-d-f bui-fd-c bui-g-2 bui-gcs-1 bui-gce-9 bp2:bui-gcs-3 bp4:bui-gce-7"
                aria-label="social links"
              >
                <Link class="Text sz-1" href={REPO_URL}>
                  GitHub
                </Link>
                <Link class="Text sz-1" href="https://www.npmjs.com/package/base-ui-solid">
                  npm
                </Link>
              </nav>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
