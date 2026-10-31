import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const lib = vi.hoisted(() => ({
  listLibrary: vi.fn(), playOnce: vi.fn(), uploadToLibrary: vi.fn(), cropToSquare: vi.fn(),
}));

vi.mock('@/lib/media/library', () => ({ listLibrary: lib.listLibrary }));
vi.mock('@/lib/audio', () => ({ playOnce: lib.playOnce }));
vi.mock('@/lib/media', () => ({
  mediaUrl: (p: string | null) => (p ? `https://cdn.test/${p}` : null),
  uploadToLibrary: lib.uploadToLibrary,
  MAX_IMAGE_BYTES: 2 * 1024 * 1024,
}));
vi.mock('@/lib/crop/render', () => ({ cropToSquare: lib.cropToSquare }));

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
    expect(screen.getByRole('dialog', { name: 'Image Library' })).toBeTruthy();
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
    expect(onChoose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onChoose).toHaveBeenCalledWith('cards/c1.png');
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onChoose.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
  });

  it('sounds get a play / pause button that previews without choosing', async () => {
    lib.listLibrary.mockResolvedValue(['cards/c1.mp3']);
    const onChoose = vi.fn();
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue();
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    // jsdom does not play media: report the sound as playing so the second click is a pause.
    vi.spyOn(HTMLMediaElement.prototype, 'paused', 'get').mockReturnValue(false);
    const { unmount } = render(<MediaLibraryDialog kind="audio" onChoose={onChoose} onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Play c1.mp3' }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(onChoose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Pause c1.mp3' }));
    expect(pause).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Play c1.mp3' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Choose c1.mp3' }));
    fireEvent.click(screen.getByRole('button', { name: 'OK' }));
    expect(onChoose).toHaveBeenCalledWith('cards/c1.mp3');
    unmount();
    vi.restoreAllMocks();
  });

  it('Escape closes it', async () => {
    lib.listLibrary.mockResolvedValue([]);
    const onClose = vi.fn();
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={onClose} />);
    await screen.findByText('Nothing in the library yet.');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('the Cancel button closes it', async () => {
    lib.listLibrary.mockResolvedValue([]);
    const onClose = vi.fn();
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={onClose} />);
    await screen.findByText('Nothing in the library yet.');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
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

describe('MediaLibraryDialog crop before upload (A24)', () => {
  const png = new File(['png'], 'photo.png', { type: 'image/png' });
  const svg = new File(['<svg/>'], 'art.svg', { type: 'image/svg+xml' });

  beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:photo'), revokeObjectURL: vi.fn() }));
    lib.listLibrary.mockResolvedValue([]);
    lib.uploadToLibrary.mockReset().mockResolvedValue('library/1-photo-square.webp');
    lib.cropToSquare.mockReset().mockResolvedValue(new File(['webp'], 'photo-square.webp', { type: 'image/webp' }));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  /** Picks a file with the hidden "Upload new picture" input. */
  function pick(file: File) {
    fireEvent.change(screen.getByLabelText('Upload new picture'), { target: { files: [file] } });
  }

  /** Gives the crop window a 1200x800 picture, as the browser would when it loads. */
  function loadPicture() {
    const img = screen.getByRole('dialog', { name: 'Crop picture' }).querySelector('img') as HTMLImageElement;
    Object.defineProperty(img, 'naturalWidth', { value: 1200 });
    Object.defineProperty(img, 'naturalHeight', { value: 800 });
    fireEvent.load(img);
  }

  it('picking a PNG opens the crop window and uploads nothing yet', async () => {
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={() => undefined} />);
    await screen.findByText('Nothing in the library yet.');
    pick(png);
    expect(await screen.findByRole('dialog', { name: 'Crop picture' })).toBeTruthy();
    expect(lib.uploadToLibrary).not.toHaveBeenCalled();
  });

  it('Save crops the picture, uploads the square and reports the crop', async () => {
    const onCropped = vi.fn();
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={() => undefined} onCropped={onCropped} />);
    await screen.findByText('Nothing in the library yet.');
    pick(png);
    await screen.findByRole('dialog', { name: 'Crop picture' });
    loadPicture();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(lib.uploadToLibrary).toHaveBeenCalledTimes(1));
    expect(lib.cropToSquare).toHaveBeenCalledWith(png, expect.objectContaining({ ratio: 1.5 }));
    expect(lib.uploadToLibrary).toHaveBeenCalledWith('image', expect.objectContaining({ name: 'photo-square.webp' }));
    expect(onCropped).toHaveBeenCalledWith(expect.objectContaining({ ratio: 1.5 }));
    expect(screen.queryByRole('dialog', { name: 'Crop picture' })).toBeNull();
  });

  it('Cancel in the crop window uploads nothing and keeps the library open', async () => {
    const onClose = vi.fn();
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={onClose} />);
    await screen.findByText('Nothing in the library yet.');
    pick(png);
    const crop = await screen.findByRole('dialog', { name: 'Crop picture' });
    fireEvent.click(within(crop).getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByRole('dialog', { name: 'Crop picture' })).toBeNull();
    expect(lib.uploadToLibrary).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Escape in the crop window cancels the crop and does not close the library', async () => {
    const onClose = vi.fn();
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={onClose} />);
    await screen.findByText('Nothing in the library yet.');
    pick(png);
    fireEvent.keyDown(await screen.findByRole('dialog', { name: 'Crop picture' }), { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'Crop picture' })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    expect(lib.uploadToLibrary).not.toHaveBeenCalled();
  });

  it('a picture that cannot be cropped shows its message and uploads nothing', async () => {
    lib.cropToSquare.mockRejectedValue(new Error('Could not read this picture'));
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={() => undefined} />);
    await screen.findByText('Nothing in the library yet.');
    pick(png);
    await screen.findByRole('dialog', { name: 'Crop picture' });
    loadPicture();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Could not read this picture')).toBeTruthy();
    expect(lib.uploadToLibrary).not.toHaveBeenCalled();
  });

  it('an SVG picture uploads at once, without a crop window', async () => {
    render(<MediaLibraryDialog kind="image" onChoose={() => undefined} onClose={() => undefined} />);
    await screen.findByText('Nothing in the library yet.');
    pick(svg);
    await waitFor(() => expect(lib.uploadToLibrary).toHaveBeenCalledWith('image', svg));
    expect(screen.queryByRole('dialog', { name: 'Crop picture' })).toBeNull();
    expect(lib.cropToSquare).not.toHaveBeenCalled();
  });
});
