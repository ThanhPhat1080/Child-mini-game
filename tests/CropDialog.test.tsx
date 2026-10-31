import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CropDialog } from '@/components/admin/CropDialog';
import type { Crop } from '@/lib/crop/geometry';

const file = new File(['x'], 'photo.png', { type: 'image/png' });

/** A 480 px square on a 1200x800 picture, in the middle, so it can grow and shrink. */
const smallStart: Crop = { x: 0.2, y: 0.2, w: 0.4, h: 0.6, ratio: 1.5 };

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(URL, {
    createObjectURL: vi.fn(() => 'blob:photo'),
    revokeObjectURL: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Renders the dialog and loads a 1200x800 picture into it. */
function renderLoaded(props: { start?: Crop; onSave?: (c: Crop) => void; onCancel?: () => void } = {}) {
  const onSave = props.onSave ?? vi.fn();
  const onCancel = props.onCancel ?? vi.fn();
  const { container } = render(<CropDialog file={file} start={props.start} onSave={onSave} onCancel={onCancel} />);
  const img = container.querySelector('img') as HTMLImageElement;
  Object.defineProperty(img, 'naturalWidth', { value: 1200 });
  Object.defineProperty(img, 'naturalHeight', { value: 800 });
  fireEvent.load(img);
  return { onSave, onCancel };
}

describe('CropDialog', () => {
  it('is a dialog named "Crop picture"', () => {
    renderLoaded();
    expect(screen.getByRole('dialog', { name: 'Crop picture' })).toBeTruthy();
  });

  it('save gives a square crop on a 1200x800 picture', () => {
    const { onSave } = renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const crop = (onSave as ReturnType<typeof vi.fn>).mock.calls[0][0] as Crop;
    expect(crop.w * 1200).toBeCloseTo(crop.h * 800);
  });

  it('ArrowRight on the crop area moves it right', () => {
    const { onSave } = renderLoaded({ start: smallStart });
    fireEvent.keyDown(screen.getByRole('group', { name: 'Crop area' }), { key: 'ArrowRight' });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const crop = (onSave as ReturnType<typeof vi.fn>).mock.calls[0][0] as Crop;
    expect(crop.x).toBeGreaterThan(smallStart.x);
  });

  it('Shift+ArrowRight grows the square', () => {
    const { onSave } = renderLoaded({ start: smallStart });
    fireEvent.keyDown(screen.getByRole('group', { name: 'Crop area' }), { key: 'ArrowRight', shiftKey: true });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    const crop = (onSave as ReturnType<typeof vi.fn>).mock.calls[0][0] as Crop;
    expect(crop.w * 1200).toBeGreaterThan(smallStart.w * 1200);
    expect(crop.w * 1200).toBeCloseTo(crop.h * 800);
  });

  it('Esc calls onCancel and does not save', () => {
    const { onSave, onCancel } = renderLoaded();
    fireEvent.keyDown(screen.getByRole('dialog', { name: 'Crop picture' }), { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });

  it('Cancel calls onCancel and not onSave', () => {
    const { onSave, onCancel } = renderLoaded();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
