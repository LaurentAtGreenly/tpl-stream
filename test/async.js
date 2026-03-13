import { test } from 'zora';
import { renderAsString, html } from '../src/index.js';

test(`Promise that resolves a template is inserted`, async ({ eq }) => {
  const htmlString = await renderAsString(
    html`<div>${Promise.resolve(html`<h1>hello world</h1>`)}</div>`,
  );
  eq(htmlString, `<div><h1>hello world</h1></div>`);
});

test(`Promise that resolves a string is NOT escaped`, async ({ eq }) => {
  const htmlString = await renderAsString(
    html`<div>${Promise.resolve(`<h1>hello world</h1>`)}</div>`,
  );
  eq(htmlString, `<div><h1>hello world</h1></div>`);
});

test(`Promise that resolves an array is inlined`, async ({ eq }) => {
  const htmlString = await renderAsString(
    // prettier-ignore
    html`<div>${Promise.resolve([
        html`<h1>hello world</h1>`,
        html`<p>how are you?</p>`,
      ])}</div>`,
  );
  eq(htmlString, `<div><h1>hello world</h1><p>how are you?</p></div>`);
});

test('Stream of templates are inserted', async ({ eq }) => {
  const stream = async function* () {
    yield html`<li>item1</li>`;
    yield html`<li>item2</li>`;
    yield html`<li>item3</li>`;
  };

  const htmlString = await renderAsString(
    // prettier-ignore
    html`<ul>${stream()}</ul>`,
  );
  // prettier-ignore
  eq(htmlString, `<ul><li>item1</li><li>item2</li><li>item3</li></ul>`);
});

test('Stream of strings are not escaped', async ({ eq }) => {
  const stream = async function* () {
    yield `<li>item1</li>`;
    yield `<li>item2</li>`;
    yield `<li>item3</li>`;
  };

  const htmlString = await renderAsString(
    // prettier-ignore
    html`<ul>${stream()}</ul>`,
  );
  // prettier-ignore
  eq(htmlString, `<ul><li>item1</li><li>item2</li><li>item3</li></ul>`);
});

test('AsyncIterable (not an iterator) is inserted', async ({ eq }) => {
  const iterable = {
    [Symbol.asyncIterator]() {
      let i = 0;
      return {
        async next() {
          if (i < 3) {
            return { value: `<li>item${++i}</li>`, done: false };
          }
          return { done: true };
        },
      };
    },
  };

  const htmlString = await renderAsString(html`<ul>${iterable}</ul>`);
  eq(htmlString, `<ul><li>item1</li><li>item2</li><li>item3</li></ul>`);
});
