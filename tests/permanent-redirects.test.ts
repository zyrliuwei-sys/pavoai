import assert from 'node:assert/strict';
import test from 'node:test';

import {
  isRetiredBlogSlug,
  PERMANENT_REDIRECTS,
} from '../src/config/permanent-redirects';
import { permanentRedirectResponse } from '../src/lib/permanent-redirect';

const origin = 'https://pavoai.net';
const entries = Object.entries(PERMANENT_REDIRECTS);

test('all eight retired URLs return empty 301 responses for GET and HEAD', async () => {
  assert.equal(entries.length, 8);
  for (const [path, destination] of entries) {
    for (const method of ['GET', 'HEAD']) {
      const response = permanentRedirectResponse(
        new Request(origin + path, { method })
      );
      assert.ok(response, path);
      assert.equal(response.status, 301, path);
      assert.equal(response.headers.get('location'), destination, path);
      assert.equal(response.headers.get('link'), null, path);
      assert.equal(await response.text(), '', path);
    }
  }
});

test('the URL language controls the destination regardless of cookies or headers', () => {
  for (const [path, destination] of entries) {
    const chinese = path.startsWith('/zh/');
    assert.equal(destination, chinese ? '/zh/' : '/');
    for (const locale of ['en', 'zh']) {
      const response = permanentRedirectResponse(
        new Request(origin + path, {
          headers: {
            cookie: `PARAGLIDE_LOCALE=${locale}`,
            'Accept-Language': locale,
          },
        })
      );
      assert.equal(response?.headers.get('location'), destination);
    }
  }
});

test('trailing slashes and queries keep the same fixed destination', () => {
  for (const [path, destination] of entries) {
    for (const suffix of [
      '/',
      '?preview=1',
      '/?utm_source=example&next=https%3A%2F%2Fexample.com',
    ]) {
      const response = permanentRedirectResponse(
        new Request(origin + path + suffix)
      );
      assert.equal(response?.status, 301);
      assert.equal(response?.headers.get('location'), destination);
    }
  }
});

test('active articles, homepages, blog lists and unrelated paths are untouched', () => {
  const active = [
    'veo-3-1-vs-kling-3-0',
    'how-to-write-cinematic-video-prompts',
    'ugc-ads-with-ai-prompts',
  ];
  for (const slug of active) {
    assert.equal(isRetiredBlogSlug(slug), false);
    for (const prefix of ['', '/zh'])
      assert.equal(
        permanentRedirectResponse(
          new Request(`${origin}${prefix}/blog/${slug}`)
        ),
        null
      );
  }
  for (const path of [
    '/',
    '/zh/',
    '/blog',
    '/zh/blog',
    '/api/auth/get-session',
    `${entries[0][0]}-extra`,
  ])
    assert.equal(permanentRedirectResponse(new Request(origin + path)), null);
  for (const [path] of entries.filter(([path]) => path.startsWith('/blog/')))
    assert.equal(isRetiredBlogSlug(path.slice('/blog/'.length)), true);
});
