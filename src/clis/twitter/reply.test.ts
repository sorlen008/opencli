import { describe, expect, it } from 'vitest';
import { __test__ } from './reply.js';

describe('twitter reply helpers', () => {
  it('builds the reply composer URL from a standard tweet URL', () => {
    expect(__test__.buildReplyComposerUrl('https://x.com/_kop6/status/2040254679301718161?s=20'))
      .toBe('https://x.com/compose/post?in_reply_to=2040254679301718161');
  });

  it('builds the reply composer URL from an i/status URL', () => {
    expect(__test__.buildReplyComposerUrl('https://x.com/i/status/2040318731105313143'))
      .toBe('https://x.com/compose/post?in_reply_to=2040318731105313143');
  });

  it('throws on an invalid tweet URL', () => {
    expect(() => __test__.buildReplyComposerUrl('not-a-url'))
      .toThrow('Invalid tweet URL');
  });

  it('throws when URL contains no status ID', () => {
    expect(() => __test__.buildReplyComposerUrl('https://x.com/home'))
      .toThrow('Could not extract tweet ID');
  });
});
