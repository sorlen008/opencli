import { CommandExecutionError } from '../../errors.js';
import { cli, Strategy } from '../../registry.js';
import type { IPage } from '../../types.js';

function buildReplyComposerUrl(tweetUrl: string): string {
  let pathname = '';
  try {
    pathname = new URL(tweetUrl).pathname;
  } catch {
    throw new Error(`Invalid tweet URL: ${tweetUrl}`);
  }
  const match = pathname.match(/\/status\/(\d+)/);
  if (!match?.[1]) throw new Error(`Could not extract tweet ID from URL: ${tweetUrl}`);
  return `https://x.com/compose/post?in_reply_to=${match[1]}`;
}

cli({
  site: 'twitter',
  name: 'reply',
  description: 'Reply to a specific tweet',
  domain: 'x.com',
  strategy: Strategy.UI, // Uses the UI directly to input and click post
  browser: true,
  args: [
    { name: 'url', type: 'string', required: true, positional: true, help: 'The URL of the tweet to reply to' },
    { name: 'text', type: 'string', required: true, positional: true, help: 'The text content of your reply' },
  ],
  columns: ['status', 'message', 'text'],
  func: async (page: IPage | null, kwargs: any) => {
    if (!page) throw new CommandExecutionError('Browser session required for twitter reply');

    // Navigate directly to the dedicated reply composer so the textarea is
    // reliably present. The inline reply on the tweet page loads after
    // primaryColumn and races with SPA hydration, causing intermittent failures.
    await page.goto(buildReplyComposerUrl(kwargs.url), { waitUntil: 'load', settleMs: 2500 });
    await page.wait({ selector: '[data-testid="tweetTextarea_0"]' });

    const result = await page.evaluate(`(async () => {
        try {
            const visible = (el) => !!el && (el.offsetParent !== null || el.getClientRects().length > 0);
            const boxes = Array.from(document.querySelectorAll('[data-testid="tweetTextarea_0"]'));
            const box = boxes.find(visible) || boxes[0];
            if (!box) {
                return { ok: false, message: 'Could not find the reply text area. Are you logged in?' };
            }

            box.focus();
            const textToInsert = ${JSON.stringify(kwargs.text)};
            const dataTransfer = new DataTransfer();
            dataTransfer.setData('text/plain', textToInsert);
            box.dispatchEvent(new ClipboardEvent('paste', {
                clipboardData: dataTransfer,
                bubbles: true,
                cancelable: true
            }));

            await new Promise(r => setTimeout(r, 1000));

            const buttons = Array.from(
                document.querySelectorAll('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]')
            );
            const btn = buttons.find((el) => visible(el) && !el.disabled);
            if (!btn) {
                return { ok: false, message: 'Reply button is disabled or not found.' };
            }
            btn.click();
            return { ok: true, message: 'Reply posted successfully.' };
        } catch (e) {
            return { ok: false, message: e.toString() };
        }
    })()`);

    if (result.ok) {
        await page.wait(3); // Wait for network submission to complete
    }

    return [{
        status: result.ok ? 'success' : 'failed',
        message: result.message,
        text: kwargs.text
    }];
  }
});

export const __test__ = { buildReplyComposerUrl };
