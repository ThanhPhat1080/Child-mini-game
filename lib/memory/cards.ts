import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { mediaUrl } from '@/lib/media';
import { speakKid } from '@/lib/sfx';
import type { MemoryCard } from '@/lib/memory/types';

/** Active cards only (the deck is built from these). Throws Error(message) when Supabase fails. */
export async function fetchActiveCards(): Promise<MemoryCard[]> {
  const { data, error } = await createSupabaseBrowserClient()
    .from('memory_cards')
    .select('id, word, image_path, audio_path, active')
    .eq('active', true)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []) as MemoryCard[];
}

/** The recording that is playing now, so a new word can cut it off (no overlapping voices). */
let current: HTMLAudioElement | null = null;

/**
 * Says a card's word: the recorded file when there is one, else (or if the file cannot play) the
 * English kid voice, never both and never twice. Never throws.
 */
export function sayWord(card: Pick<MemoryCard, 'word' | 'audio_path'>): void {
  try {
    if (current) {
      current.pause();
      current = null;
    }
    const url = mediaUrl(card.audio_path);
    if (!url) {
      speakKid(card.word);
      return;
    }
    const audio = new Audio(url);
    current = audio;
    let fellBack = false;
    const fallback = () => {
      if (fellBack || current !== audio) return; // already spoken, or a newer word took over
      fellBack = true;
      current = null;
      speakKid(card.word);
    };
    audio.addEventListener('error', fallback);
    audio.play().catch(fallback);
  } catch {
    try { speakKid(card.word); } catch { /* nothing more to try */ }
  }
}
