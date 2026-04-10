import { test } from 'zora';
import { render, html } from '../src/index.js';

test('backpressure: should not overfill the buffer', async ({ eq, ok }) => {
  let pushCount = 0;
  const items = Array.from({ length: 10 }, (_, i) => i);

  // An async iterator that we can use to track how many items have been processed
  async function* slowGenerator() {
    for (const item of items) {
      pushCount++;
      yield html`<li>${item}</li>`;
    }
  }

  const stream = render(html`<ul>${slowGenerator()}</ul>`);
  const reader = stream.getReader();

  // Read the first chunk (the <ul>)
  const { value: firstValue, done: firstDone } = await reader.read();
  ok(!firstDone, 'should not be done');
  eq(firstValue, '<ul>', 'first chunk should be <ul>');

  // At this point, if backpressure is NOT working, it might have already exhausted the generator
  // If backpressure IS working, it should have stopped after filling the queue (default HWM is 1)

  // Wait a bit to see if more items are pushed to the internal buffer
  await new Promise(resolve => setTimeout(resolve, 50));

  // If HWM is 1, it should have enqueued the first chunk ('<ul>') and maybe paused.
  // Actually, ReadableStream's default strategy has HWM = 1 (chunk).
  // Once we read '<ul>', desiredSize should go back to 1.
  
  // Let's refine the test. We want to see that it doesn't pull everything from the generator immediately.
  ok(pushCount < items.length, `Should have paused. Current pushCount: ${pushCount}`);

  // Read the rest
  const results = [firstValue];
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    results.push(value);
  }

  eq(pushCount, items.length, 'Should eventually process all items');
  eq(results.join(''), '<ul>' + items.map(i => `<li>${i}</li>`).join('') + '</ul>');
});

test('backpressure: respects desiredSize', async ({ eq, ok }) => {
  let yieldedCount = 0;
  async function* gen() {
    while (yieldedCount < 20) {
      yieldedCount++;
      yield 'chunk';
    }
  }

  // We can't easily control HWM of the stream created by render() if it's hardcoded.
  // But we can check if it stops yielding when we don't read.
  const stream = render(html`${gen()}`);
  const reader = stream.getReader();

  // Give it some time to potentially over-yield
  await new Promise(resolve => setTimeout(resolve, 50));
  
  // If no backpressure, yieldedCount would be 20.
  // With backpressure, it should be much less (depending on HWM).
  ok(yieldedCount < 20, `Should pause yielding. yieldedCount: ${yieldedCount}`);

  // Clean up
  await reader.cancel();
});
