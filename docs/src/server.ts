import { provideRequestEvent } from '@solidjs/web/storage';
import { createStartHandler, defaultStreamHandler } from '@tanstack/solid-start-server';
import { legacyPath } from './mdx/legacyPaths.mjs';
import { getGeneratedFile } from './mdx/generatedFiles';

// Port note: this static docs site uses Start's real SSR handler directly, with the same
// request-event scope, and has no server functions. The entry was added because Start rc.8's
// server barrel imported server-function helpers that Solid Web rc.13 removed (fixed in Start
// rc.10). It also serves the legacy redirects and the generated files.
const handle = createStartHandler(defaultStreamHandler);
export default {
  async fetch(request: Request) {
    const url = new URL(request.url);
    const target = legacyPath(url.pathname);
    if (target) {
      return new Response(null, { status: 301, headers: { Location: target + url.search } });
    }
    if (request.method === 'GET' || request.method === 'HEAD') {
      const generated = await getGeneratedFile(url.pathname);
      if (generated) {
        return generated;
      }
    }
    const response = await provideRequestEvent({ request, locals: {} }, () => handle(request));
    if (response.status === 404) {
      // eslint-disable-next-line no-console -- Log missing request URLs without a warning flood.
      console.info(`[docs:not-found] ${request.method} ${request.url}`);
    }
    return response;
  },
};
