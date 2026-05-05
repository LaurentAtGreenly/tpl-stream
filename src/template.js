import { templateCache } from './cache.js';

export { html };

function html(templateParts, ...values) {
  if (!templateCache.has(templateParts)) {
    templateCache.set(templateParts, compile(templateParts, ...values));
  }

  return templateCache.get(templateParts)(...values);
}

const zip = (a, b) => a.map((item, i) => [item, b[i]]);

const compile = (templateParts, ...values) => {
  const segments = [];
  let syncRun = { type: 'sync', startPart: templateParts[0], ops: [] };

  for (const [value, part] of zip(values, templateParts.slice(1))) {
    if (value?.[Symbol.iterator] && typeof value !== 'string') {
      segments.push(syncRun, { type: 'iter' });
      syncRun = { type: 'sync', startPart: part, ops: [] };
    } else if (isAsync(value)) {
      segments.push(syncRun, { type: 'async' });
      syncRun = { type: 'sync', startPart: part, ops: [] };
    } else {
      syncRun.ops.push({
        op: typeof value === 'object' ? 'attributes' : 'escape',
        part,
      });
    }
  }

  segments.push(syncRun);

  return function* (...values) {
    let vi = 0;
    for (const segment of segments) {
      if (segment.type === 'iter') {
        yield* values[vi++];
      } else if (segment.type === 'async') {
        yield values[vi++];
      } else {
        let str = segment.startPart;
        for (const { op, part } of segment.ops) {
          str +=
            (op === 'attributes'
              ? attributesFragment(values[vi])
              : escape(String(values[vi]))) + part;
          vi++;
        }
        yield str;
      }
    }
  };
};

const attributesFragment = (value) =>
  Object.entries(value)
    .filter(([_, value]) => value !== false)
    .map(([attr, value]) => `${attr}="${escape(value)}"`)
    .join(' ');

const isAsync = (value) =>
  value?.then !== undefined || value?.[Symbol.asyncIterator];

const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const htmlEntities = /[&<>"']/g;
const escape = (value) => {
  if (/[&<>"']/.test(value)) {
    return value.replace(htmlEntities, (char) => escapeMap[char]);
  }

  return value;
};
