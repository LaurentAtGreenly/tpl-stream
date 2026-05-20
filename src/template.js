import { safeHTML, isSafeHTML, escape } from './safe-html.js';

export { html, raw };

function raw(value) {
  return safeHTML(value);
}

function* html(templateParts, ...values) {
  const [firstPart, ...rest] = templateParts;

  yield safeHTML(firstPart);

  const pairs = values.map((value, index) => [value, rest[index]]);

  for (const [value, part] of pairs) {
    if (isSafeHTML(value)) {
      yield safeHTML(value.value + part);
    } else if (value?.[Symbol.iterator] && typeof value !== 'string') {
      yield* Iterator.from(value).map((item) =>
        typeof item === 'number' || typeof item === 'boolean'
          ? safeHTML(String(item))
          : item,
      );
      yield safeHTML(part);
    } else if (isAsync(value)) {
      yield* [value, safeHTML(part)];
    } else {
      yield safeHTML(
        (typeof value === 'object' && value !== null
          ? attributesFragment(value)
          : isNil(value)
            ? ''
            : escape(String(value))) + part,
      );
    }
  }
}

const attributesFragment = (value) =>
  Object.entries(value)
    .filter(([, value]) => value !== false)
    .map(([attr, value]) => `${escape(attr)}="${escape(value)}"`)
    .join(' ');

const isAsync = (value) =>
  value?.then !== undefined || value?.[Symbol.asyncIterator];

const isNil = (value) => value === null || value === undefined;
