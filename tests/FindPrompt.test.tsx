import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FindPrompt } from '@/components/find/FindPrompt';

afterEach(cleanup);

const sizeOf = (word: string) => {
  const { container, unmount } = render(<FindPrompt word={word} keyId={0} onSay={vi.fn()} />);
  const px = parseFloat(container.querySelector<HTMLElement>('[data-find-word]')!.style.fontSize);
  unmount();
  return px;
};

describe('FindPrompt word size (F3: long words fit the bar)', () => {
  it('a 40-character word uses a smaller font than a short word', () => {
    const long = 'a'.repeat(40);
    expect(sizeOf(long)).toBeLessThan(sizeOf('cat'));
  });

  it('a word of 18 characters or fewer keeps the full size', () => {
    expect(sizeOf('x'.repeat(18))).toBe(96);
  });
});
