import { describe, it, expect } from 'vitest';
import { extractConversationMessageText } from './whatsapp-inbox.functions';

describe('extractConversationMessageText', () => {
  it('should extract text from parts array', () => {
    const msg = {
      parts: [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: 'World' }
      ]
    };
    expect(extractConversationMessageText(msg)).toBe('Hello World');
  });

  it('should extract text from content property', () => {
    const msg = { content: 'Direct content' };
    expect(extractConversationMessageText(msg)).toBe('Direct content');
  });

  it('should extract text from text property', () => {
    const msg = { text: 'Direct text' };
    expect(extractConversationMessageText(msg)).toBe('Direct text');
  });

  it('should return empty string for invalid message', () => {
    expect(extractConversationMessageText(null)).toBe('');
    expect(extractConversationMessageText({})).toBe('');
  });
});
