import { cp, rm, access } from 'node:fs/promises';
// Port note: Start prerenders into dist/client; expose upstream's export directory name.
await access(new URL('../dist/client/react/components/collapsible/index.html', import.meta.url));
await rm(new URL('../export', import.meta.url), { recursive: true, force: true });
await cp(new URL('../dist/client', import.meta.url), new URL('../export', import.meta.url), {
  recursive: true,
});
