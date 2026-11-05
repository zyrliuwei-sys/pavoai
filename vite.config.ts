import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import mdx from '@mdx-js/rollup';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
import { defineConfig } from 'vite';

import { loadEnvFiles } from './src/lib/env.ts';

// Populate process.env from .env.local / .env.{NODE_ENV} / .env for the
// dev server and build process (Vite only exposes VITE_* via import.meta.env;
// server code reads secrets from process.env). In production, env comes
// from the actual host/container environment.
loadEnvFiles();

// Cloudflare Workers build (pnpm cf:build / cf:deploy): stub out unused DB
// drivers — mysql2 crashes workerd at module evaluation (node:net,
// node:process requires); postgres.js runs fine under nodejs_compat but is
// dead weight when the backend is D1. Which driver the bundle keeps follows
// wrangler.jsonc `vars.DATABASE_PROVIDER` (the runtime truth on workerd) —
// d1 stubs both, postgresql keeps postgres.js for the Hyperdrive binding.
const isCloudflareBuild = (process.env.NITRO_PRESET || '').includes(
  'cloudflare'
);
const driverStub = fileURLToPath(
  new URL('./src/core/db/driver-stub.ts', import.meta.url)
);

// Prefer wrangler.jsonc over the build-time env, which can be polluted by
// .env.local (e.g. DATABASE_PROVIDER=sqlite for local dev).
function workersDbProvider(): string {
  try {
    const raw = readFileSync(
      new URL('./wrangler.jsonc', import.meta.url),
      'utf8'
    );
    const m = raw.match(/"DATABASE_PROVIDER"\s*:\s*"([^"]+)"/);
    if (m) return m[1];
  } catch {
    // no wrangler.jsonc yet (fresh clone) — fall through
  }
  return process.env.DATABASE_PROVIDER || 'd1';
}

const workersDb = isCloudflareBuild ? workersDbProvider() : '';
const keepPostgres = workersDb === 'postgresql' || workersDb === 'postgres';
let buildId = process.env.VITE_BUILD_ID || 'development';
let buildLabel = process.env.VITE_BUILD_LABEL || 'Development';
try {
  if (!process.env.VITE_BUILD_ID)
    buildId = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], {
      encoding: 'utf8',
    }).trim();
  const diff = execFileSync(
    'git',
    ['diff', 'HEAD', '--', 'src', 'messages', 'vite.config.ts', 'server'],
    { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 }
  );
  const untracked = execFileSync(
    'git',
    ['ls-files', '--others', '--exclude-standard', '-z', '--', 'src', 'server'],
    { encoding: 'utf8' }
  )
    .split('\0')
    .filter(Boolean);
  if ((diff || untracked.length) && !process.env.VITE_BUILD_ID) {
    const fingerprint = createHash('sha256').update(diff);
    for (const file of untracked)
      fingerprint.update(file).update(readFileSync(file));
    buildId += `-${fingerprint.digest('hex').slice(0, 8)}`;
  }
  if (!process.env.VITE_BUILD_LABEL)
    buildLabel = execFileSync('git', ['log', '-1', '--format=%s'], {
      encoding: 'utf8',
    })
      .trim()
      .slice(0, 150);
} catch {
  /* Source archives may not have Git metadata. */
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_BUILD_ID': JSON.stringify(buildId),
    'import.meta.env.VITE_BUILD_LABEL': JSON.stringify(buildLabel),
  },
  server: {
    port: 3000,
    // Cloud sandboxes (ShipAny Code / e2b) proxy the dev server through a
    // per-sandbox subdomain; without this Vite's host check blocks the
    // preview with "Blocked request. This host is not allowed."
    allowedHosts: ['.e2b.app'],
  },
  resolve: {
    tsconfigPaths: true,
    alias: isCloudflareBuild
      ? {
          mysql2: driverStub,
          ...(keepPostgres ? {} : { postgres: driverStub }),
        }
      : {},
  },
  plugins: [
    // MDX must run before the react plugin so JSX in compiled MDX gets transformed.
    // .claude/ holds agent skills served verbatim (`?raw`) — never compile them.
    {
      enforce: 'pre',
      ...mdx({
        providerImportSource: '@mdx-js/react',
        exclude: /\/\.claude\//,
      }),
    },
    tailwindcss(),
    paraglideVitePlugin({
      project: './project.inlang',
      outdir: './src/paraglide',
      outputStructure: 'message-modules',
      cookieName: 'PARAGLIDE_LOCALE',
      strategy: ['url', 'cookie', 'baseLocale'],
      urlPatterns: [
        // API endpoints are never locale-prefixed.
        {
          pattern: '/api/:path(.*)?',
          localized: [
            ['en', '/api/:path(.*)?'],
            ['zh', '/api/:path(.*)?'],
          ],
        },
        // Bare locale homes match without a trailing-slash redirect.
        {
          pattern: '/',
          localized: [
            ['zh', '/zh'],
            ['en', '/'],
          ],
        },
        // "as-needed" prefix: zh under /zh, en (default) unprefixed.
        {
          pattern: '/:path(.*)?',
          localized: [
            ['zh', '/zh/:path(.*)?'],
            ['en', '/:path(.*)?'],
          ],
        },
      ],
    }),
    tanstackStart({
      srcDirectory: 'src',
    }),
    viteReact(),
    // Footer badges are live database content. Render the landing per request
    // so a directory can verify a newly installed badge without another deploy.
    nitro({
      experimental: { tasks: true },
      tasks: {
        'operations:inspect': {
          handler: fileURLToPath(
            new URL('./server/tasks/operations.ts', import.meta.url)
          ),
        },
      },
      scheduledTasks: { '0 * * * *': ['operations:inspect'] },
    }),
  ],
});
