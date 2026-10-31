import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const lib = vi.hoisted(() => ({ listLibrary: vi.fn(), playOnce: vi.fn() }));

vi.mock('@/lib/media/library', () => ({ listLibrary: lib.listLibrary }));
vi.mock('@/lib/audio', () => ({ playOnce: lib.playOnce }));
vi.mock('@/lib/media', () => ({ mediaUrl: (p: string | null) => (p ? `https://cdn.test/${p}` : null) }));

import { MediaLibraryDialog } from '@/components/admin/MediaLibraryDialog';

beforeEach(() => {
  lib.listLibrary.mockReset();
  lib.playOnce.mockReset();
});
afterEach(cleanup);

describe('MediaLibraryDialog', () => {
  it('is a labelled dialog that lists pictures as choosable buttons', async () => {
    lib.listLibrary.mockResolvedValue(['cards/c1.png', 'spot/a.png']);
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={() => undefined} />);
    expect(screen.getByRole('dialog', { name: 'Choose from library' })).toBeTruthy();
    expect(lib.listLibrary).toHaveBeenCalledWith('image');
    expect(await screen.findByRole('button', { name: 'Choose c1.png' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Choose a.png' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play c1.png' })).toBeNull();
  });

  it('choosing a picture calls onChoose with its path and then closes', async () => {
    lib.listLibrary.mockResolvedValue(['cards/c1.png']);
    const onChoose = vi.fn();
    const onClose = vi.fn();
    render(<MediaLibraryDialog kind="image" onChoose={onChoose} onClose={onClose} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Choose c1.png' }));
    expect(onChoose).toHaveBeenCalledWith('cards/c1.png');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChoose.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });

  it('sounds get a separate play button that previews without choosing', async () => {
    lib.listLibrary.mockResolvedValue(['cards/c1.mp3']);
    const onChoose = vi.fn();
    render(<MediaLibraryDialog kind="audio" onChoose={onChoose} onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Play c1.mp3' }));
    expect(lib.playOnce).toHaveBeenCalledWith('https://cdn.test/cards/c1.mp3');
    expect(onChoose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Choose c1.mp3' }));
    expect(onChoose).toHaveBeenCalledWith('cards/c1.mp3');
  });

  it('Escape closes it', async () => {
    lib.listLibrary.mockResolvedValue([]);
    const onClose = vi.fn();
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={onClose} />);
    await screen.findByText('Nothing in the library yet.');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the Close button closes it', async () => {
    lib.listLibrary.mockResolvedValue([]);
    const onClose = vi.fn();
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={onClose} />);
    await screen.findByText('Nothing in the library yet.');
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows the empty message when nothing is in use', async () => {
    lib.listLibrary.mockResolvedValue([]);
    render(<MediaLibraryDialog kind="audio" onChoose={() => undefined} onClose={() => undefined} />);
    expect(await screen.findByText('Nothing in the library yet.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /^Choose / })).toBeNull();
  });

  it('shows an error line when the library cannot be read', async () => {
    lib.listLibrary.mockRejectedValue(new Error('offline'));
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={() => undefined} />);
    await waitFor(() => expect(screen.getByText('Could not load the library.')).toBeTruthy());
    expect(screen.queryByText('Nothing in the library yet.')).toBeNull();
  });
});
