import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { build, type Plugin } from 'vite';

import config from '../vite.config';

test('the real build keeps the private guide as JSON text while normal MDX still compiles', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'pavo-playbook-build-'));
  try {
    const plugins = (config.plugins ?? []) as Plugin[];
    const markdownPlugin = plugins.find((p) => p?.name === '@mdx-js/rollup');
    assert.ok(markdownPlugin, 'Use the actual application MDX configuration');
    const guide = resolve('src/content/admin/ops-playbook.md');
    const about = resolve('src/content/pages/about.en.mdx');
    const entry = join(directory, 'probe.js');
    await writeFile(
      entry,
      `export { default as markdown } from ${JSON.stringify(`${guide}?raw`)};\n` +
        `export { default as About } from ${JSON.stringify(about)};\n`
    );
    await build({
      configFile: false,
      envFile: false,
      plugins: [markdownPlugin],
      logLevel: 'silent',
      publicDir: false,
      ssr: { noExternal: true },
      build: {
        ssr: entry,
        outDir: join(directory, 'build'),
        copyPublicDir: false,
        rollupOptions: { output: { entryFileNames: 'probe.mjs' } },
      },
    });
    const result = await import(
      pathToFileURL(join(directory, 'build/probe.mjs')).href
    );
    const source = await readFile(guide, 'utf8');
    assert.equal(typeof result.markdown, 'string');
    assert.equal(result.markdown, source);
    assert.equal(
      JSON.parse(JSON.stringify({ markdown: result.markdown })).markdown,
      source
    );
    assert.equal(typeof result.About, 'function');
    const images = [...source.matchAll(/\]\((\/imgs\/ops-playbook\/[^)]+)\)/g)];
    assert.equal(images.length, 11);
    for (const [, image] of images)
      assert.ok((await readFile(resolve(`public${image}`))).length > 0, image);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
