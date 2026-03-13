import { test } from 'zora';
import { render, html } from '../src/index.js';

const getChunks = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return chunks;
};

test(`content with no Promise is not chunked`, async ({ eq }) => {
  const chunks = await getChunks(
    render(html`<p>${html`<span>${42}</span>`}</p>`),
  );
  eq(chunks, ['<p><span>42</span></p>']);
});

test(`A chunk is created when there is a pending Promise`, async ({ eq }) => {
  const chunks = await getChunks(
    render(html`<p>${Promise.resolve(html`${42}`)}</p>`),
  );
  eq(chunks, ['<p>', '42</p>']);
});

test(`Web Stream: handles backpressure`, async ({ eq }) => {
  const template = html`<section>${Promise.resolve('p1')}</section><section>${Promise.resolve('p2')}</section><section>${Promise.resolve('p3')}</section>`;
  // Using a strategy with 1 highWaterMark to test backpressure
  const stream = render(template, { highWaterMark: 1 });
  const chunks = [];

  // Simulate slow consumer
  for await (const chunk of stream) {
    chunks.push(chunk);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  eq(chunks, ['<section>', 'p1</section><section>', 'p2</section><section>', 'p3</section>']);
});
