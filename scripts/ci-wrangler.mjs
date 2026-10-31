// CI helper: materialize wrangler.jsonc from the committed template.
// wrangler.jsonc is gitignored (it holds the real D1 database_id), so GitHub
// Actions builds it from wrangler.example.jsonc + environment variables
// supplied by .github/workflows/deploy.yml. Local deploys never run this —
// they use the working copy directly.
import { readFileSync, writeFileSync } from 'node:fs';

const REQUIRED = [
  'WORKER_NAME',
  'ACCOUNT_ID',
  'D1_DATABASE_NAME',
  'D1_DATABASE_ID',
  'VITE_APP_URL',
  'VITE_APP_NAME',
];
for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`ci-wrangler: missing required env ${key}`);
    process.exit(1);
  }
}

// The example only uses full-line comments, so a line filter is enough
// (naive `//` stripping would corrupt https:// URLs). Trailing commas are
// legal JSONC but not JSON — drop them before parsing.
const source = readFileSync('wrangler.example.jsonc', 'utf8')
  .split('\n')
  .filter((line) => !line.trim().startsWith('//'))
  .join('\n')
  .replace(/,(\s*[}\]])/g, '$1');

const config = JSON.parse(source);
config.name = process.env.WORKER_NAME;
config.account_id = process.env.ACCOUNT_ID;
config.compatibility_date = config.compatibility_date || '2026-10-01';
config.vars = {
  ...(config.vars || {}),
  DATABASE_PROVIDER: 'd1',
  VITE_APP_URL: process.env.VITE_APP_URL,
  VITE_APP_NAME: process.env.VITE_APP_NAME,
  ...(process.env.VITE_APP_DESCRIPTION
    ? { VITE_APP_DESCRIPTION: process.env.VITE_APP_DESCRIPTION }
    : {}),
};
config.d1_databases = [
  {
    binding: 'DB',
    database_name: process.env.D1_DATABASE_NAME,
    database_id: process.env.D1_DATABASE_ID,
    migrations_dir: 'drizzle',
    remote: true,
  },
];
if (process.env.CUSTOM_DOMAIN && process.env.CUSTOM_DOMAIN !== 'none') {
  config.routes = [{ pattern: process.env.CUSTOM_DOMAIN, custom_domain: true }];
}

writeFileSync('wrangler.jsonc', JSON.stringify(config, null, 2) + '\n');
console.log(`ci-wrangler: wrote wrangler.jsonc for worker "${config.name}"`);
