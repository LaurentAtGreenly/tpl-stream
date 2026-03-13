import { test } from 'zora';
import { renderAsString, html, raw } from '../src/index.js';

test('raw helper bypasses escaping', async ({ eq }) => {
  const htmlString = await renderAsString(
    html`<div>${raw('<b>bold</b>')}</div>`,
  );
  eq(htmlString, `<div><b>bold</b></div>`);
});

test('raw helper works with templates', async ({ eq }) => {
  const htmlString = await renderAsString(
    html`<div>${raw(html`<span>42</span>`)}</div>`,
  );
  eq(htmlString, `<div><span>42</span></div>`);
});
