import { html, renderAsString } from '../src/index.js';

const result = await renderAsString(html`<p>${'hello'}</p>`);

if (result !== '<p>hello</p>') {
  throw new Error(`Expected '<p>hello</p>', got '${result}'`);
}
