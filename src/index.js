export { render, renderAsString, html };

const { constructor: GeneratorFunction } = function* () {};

const templateCache = new WeakMap();

const zip = (arr1, arr2) => arr1.map((item, index) => [item, arr2[index]]);

const compile = (templateParts, ...values) => {
  const src = buildSource(templateParts, ...values);
  const args = [
    'utils',
    ...Array.from({ length: values.length }, (_, i) => 'arg' + i),
  ];
  const gen = new GeneratorFunction(...args, src);
  return (...values) => gen({ escape, attributesFragment }, ...values);
};

const buildSource = (templateParts, ...values) => {
  const [first, ...rest] = templateParts;
  const tuples = zip(rest, values);
  return (
    tuples.reduce((src, [tplPart, value], i) => {
      if (value?.[Symbol.iterator] && typeof value !== 'string') {
        return src + `;yield *arg${i};yield \`${tplPart}\``;
      }

      if (isAsync(value)) {
        return src + `;yield arg${i}; yield \`${tplPart}\``;
      }

      if (typeof value === 'object') {
        return src + `+utils.attributesFragment(arg${i}) + \`${tplPart}\``;
      }

      return src + `+utils.escape(String(arg${i})) + \`${tplPart}\``;
    }, `yield \`${first}\``) + ';'
  );
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

// we use coroutine instead of async iterable to avoid Promise overhead (for perf)
function* _render(template) {
  for (const chunk of template) {
    if (typeof chunk === 'string') {
      yield chunk;
    } else if (chunk?.[Symbol.iterator]) {
      yield* _render(chunk);
    } else if (chunk?.then) {
      const resolved = yield chunk;
      yield* _render(typeof resolved === 'string' ? [resolved] : resolved);
    } else if (chunk?.[Symbol.asyncIterator]) {
      const iterator = chunk[Symbol.asyncIterator]();
      while (true) {
        const { value: resolved, done } = yield iterator.next();
        if (done === true) {
          break;
        }
        yield* _render(typeof resolved === 'string' ? [resolved] : resolved);
      }
    } else {
      throw new Error('Unsupported chunk');
    }
  }
}

function html(templateParts, ...values) {
  if (!templateCache.has(templateParts)) {
    templateCache.set(templateParts, compile(templateParts, ...values));
  }

  return templateCache.get(templateParts)(...values);
}

function render(template, strategy) {
  const buffer = [];
  let controller = null;
  let iterable = null;
  let nextChunk = null;

  return new ReadableStream(
    {
      async start(ctrl) {
        controller = ctrl;
        iterable = _render(template);
      },
      async pull() {
        while (controller.desiredSize > 0) {
          const { value, done } = iterable.next(nextChunk);
          nextChunk = null;

          if (done) {
            if (buffer.length) {
              const chunk = buffer.join('');
              if (chunk) controller.enqueue(chunk);
              buffer.length = 0;
            }
            controller.close();
            break;
          }

          if (typeof value === 'string') {
            buffer.push(value);
            if (buffer.length > 10) {
              const chunk = buffer.join('');
              if (chunk) controller.enqueue(chunk);
              buffer.length = 0;
            }
          } else if (value?.then) {
            if (buffer.length) {
              const chunk = buffer.join('');
              if (chunk) controller.enqueue(chunk);
              buffer.length = 0;
            }
            nextChunk = await value;
            return;
          }
        }
      },
    },
    strategy,
  );
}

async function renderAsString(template) {
  const buffer = [];

  for await (const chunk of render(template)) {
    buffer.push(chunk);
  }

  return buffer.join('');
}
