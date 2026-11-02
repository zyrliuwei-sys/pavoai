import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const baseline = JSON.parse(
  readFileSync(new URL('./fixtures/public-copy.json', import.meta.url), 'utf8')
);

const PRICE_COPY_KEYS = new Set(['lp.cmp.price', 'lp.faq.a2', 'lp.guide.b4']);
const withoutPriceAmounts = (value: unknown) =>
  String(value).replace(/\$\d+(?:\.\d{1,2})?/g, '$PRICE');

for (const locale of ['en', 'zh']) {
  test(`${locale}: preserve public wording, allowing only approved price amounts to change`, () => {
    const messages = JSON.parse(
      readFileSync(
        new URL(`../messages/${locale}.json`, import.meta.url),
        'utf8'
      )
    );
    for (const [key, value] of Object.entries(baseline.messages[locale])) {
      assert.equal(
        PRICE_COPY_KEYS.has(key)
          ? withoutPriceAmounts(messages[key])
          : messages[key],
        PRICE_COPY_KEYS.has(key) ? withoutPriceAmounts(value) : value,
        `${key}: existing copy must remain unchanged; add new keys instead`
      );
    }
    const addedPublicCopy = Object.keys(messages).filter(
      (key) =>
        /^(lp\.|blog\.|common\.metadata\.)/.test(key) &&
        !(key in baseline.messages[locale])
    );
    assert.deepEqual(
      addedPublicCopy,
      [],
      'Do not add public wording outside the approved pricing changes'
    );
  });
}
