import { test } from 'zora';
import { renderAsString, html } from '../src/index.js';

test('arrays of templates are inlined', async ({ eq }) => {
  const ListItem = (value) => html`<li>${value}</li>`;
  const items = ['item 1', 'item 2', 'item 3'];

  eq(
    await renderAsString(
      // prettier-ignore
      html`<ul>${items.map(ListItem)}</ul>`,
    ),
    `<ul><li>item 1</li><li>item 2</li><li>item 3</li></ul>`,
  );
});

test('arrays of arrays are inlined', async ({ eq }) => {
  const ListItem = (value) => html`<li>${value}</li>`;
  const items = [[html`item 1a`, html`item 1b`], 'item 2', 'item 3'];

  eq(
    await renderAsString(
      // prettier-ignore
      html`<ul>${items.map(ListItem)}</ul>`,
    ),
    `<ul><li>item 1aitem 1b</li><li>item 2</li><li>item 3</li></ul>`,
  );
});

test('arrays of literals are escaped', async ({ eq }) => {
  const ListItem = (value) => value;
  const items = [
    '<script>pwned</script>',
    '<li>item 2</li>',
    '<li>item 3</li>',
  ];

  eq(
    await renderAsString(
      // prettier-ignore
      html`<ul>${items.map(ListItem)}</ul>`,
    ),
    `<ul>&lt;script&gt;pwned&lt;/script&gt;&lt;li&gt;item 2&lt;/li&gt;&lt;li&gt;item 3&lt;/li&gt;</ul>`,
  );
});

test('arrays of numbers and booleans are rendered', async ({ eq }) => {
  eq(
    await renderAsString(html`<p>${[42, true, false]}</p>`),
    `<p>42truefalse</p>`,
  );
});

test('nested arrays of literals are escaped', async ({ eq }) => {
  eq(
    await renderAsString(html`<p>${[['<b>bold</b>']]}</p>`),
    `<p>&lt;b&gt;bold&lt;/b&gt;</p>`,
  );
});
