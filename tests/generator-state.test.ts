import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parsePendingGeneration,
  shouldResumeGeneration,
} from '../src/lib/generator-state';

const draft = {
  prompt: 'A lighthouse on a rainy coast',
  tabId: 'image',
  auto: true,
  selection: {
    modelId: 'seedream-4',
    quality: '4K',
    aspect: '9:16',
    fast: false,
  },
};

test('recover the entire selected generation without changing its settings', () => {
  const recovered = parsePendingGeneration(JSON.stringify(draft));
  assert.deepEqual(recovered?.selection, draft.selection);
  assert.equal(recovered?.prompt, draft.prompt);
  assert.equal(recovered?.tabId, 'image');
});

test('refreshing a draft or closing the paywall does not automatically spend credits', () => {
  assert.equal(shouldResumeGeneration(draft, ''), false);
  assert.equal(shouldResumeGeneration(draft, '?mode=image'), false);
  assert.equal(shouldResumeGeneration(draft, '?checkout=cancelled'), false);
  assert.equal(shouldResumeGeneration(draft, '?checkout=returned'), true);
  assert.equal(
    shouldResumeGeneration({ ...draft, auto: false }, '?checkout=returned'),
    false
  );
});

test('reject corrupt or incompatible persisted input', () => {
  for (const raw of [
    null,
    '{',
    'null',
    '[]',
    '{}',
    JSON.stringify({ ...draft, tabId: 'unknown' }),
    JSON.stringify({ ...draft, prompt: '' }),
    JSON.stringify({ ...draft, prompt: 'a'.repeat(2001) }),
    JSON.stringify({ ...draft, selection: { modelId: 12 } }),
  ]) {
    assert.equal(parsePendingGeneration(raw), null);
  }
});

test('checkout recovery preserves selected video duration and defaults older drafts to five seconds', () => {
  for (const [modelId, duration] of [
    ['seedance-2-0', 15],
    ['wan-2-7', 2],
  ] as const) {
    const selection = {
      ...draft.selection,
      modelId,
      quality: '720p',
      duration,
    };
    const recovered = parsePendingGeneration(
      JSON.stringify({ ...draft, tabId: 'video', selection })
    );
    assert.deepEqual(recovered?.selection, selection);
    assert.equal(
      shouldResumeGeneration(recovered!, '?checkout=returned'),
      true
    );
    const { duration: _, ...legacySelection } = selection;
    assert.equal(
      parsePendingGeneration(
        JSON.stringify({ ...draft, tabId: 'video', selection: legacySelection })
      )?.selection?.duration,
      5
    );
  }
});

test('invalid saved durations cannot silently become a different paid request', () => {
  for (const duration of [null, 2, 16, 5.5, '15', false]) {
    assert.equal(
      parsePendingGeneration(
        JSON.stringify({
          ...draft,
          tabId: 'video',
          selection: { ...draft.selection, modelId: 'seedance-2-0', duration },
        })
      ),
      null
    );
  }
});
