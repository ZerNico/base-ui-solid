import { cp, rm, access, writeFile } from 'node:fs/promises';
// Port note: Start prerenders into dist/client; expose upstream's export directory name.
await access(new URL('../dist/client/solid/components/collapsible.html', import.meta.url));
await rm(new URL('../export', import.meta.url), { recursive: true, force: true });
await cp(new URL('../dist/client', import.meta.url), new URL('../export', import.meta.url), {
  recursive: true,
});

// Port note: export the same root 404 document used by Start for static hosting.
const { default: server } = await import('../dist/server/server.js');
const response = await server.fetch(new Request('http://localhost/__static-not-found__'));
if (response.status !== 404) {
  throw new Error(`Expected a 404 response, received ${response.status}`);
}
await writeFile(new URL('../export/404.html', import.meta.url), await response.text());
