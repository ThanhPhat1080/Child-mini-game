import { describe, expect, it } from 'vitest'
import type { MemoryCard } from '@/lib/memory/types'
import { drawDeck, levelsAvailable, pairsOf, parseLevel } from '@/lib/memory/deck'

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function makeCards(n: number, active = true): MemoryCard[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `${active ? 'c' : 'x'}${i}`,
    word: `w${i}`,
    image_path: `img/${i}.png`,
    audio_path: null,
    active,
  }))
}

describe('levelsAvailable', () => {
  it('5 cards: none', () => {
    expect(levelsAvailable(5)).toEqual({ 12: false, 24: false, 30: false })
  })
  it('6 cards: only 12', () => {
    expect(levelsAvailable(6)).toEqual({ 12: true, 24: false, 30: false })
  })
  it('12 cards: 12 and 24', () => {
    expect(levelsAvailable(12)).toEqual({ 12: true, 24: true, 30: false })
  })
  it('15 cards: all', () => {
    expect(levelsAvailable(15)).toEqual({ 12: true, 24: true, 30: true })
  })
})

describe('drawDeck', () => {
  it('returns level tiles, each card twice, unique keys', () => {
    const tiles = drawDeck(makeCards(20), 24, mulberry32(1))
    expect(tiles).toHaveLength(24)
    const counts = new Map<string, number>()
    for (const t of tiles) counts.set(t.card.id, (counts.get(t.card.id) ?? 0) + 1)
    expect(counts.size).toBe(pairsOf(24))
    for (const c of counts.values()) expect(c).toBe(2)
    expect(new Set(tiles.map((t) => t.key)).size).toBe(24)
    for (const t of tiles) expect(t.key).toMatch(new RegExp(`^${t.card.id}:[01]$`))
  })
  it('is deterministic for a fixed rng', () => {
    const cards = makeCards(20)
    const a = drawDeck(cards, 12, mulberry32(7)).map((t) => t.key)
    const b = drawDeck(cards, 12, mulberry32(7)).map((t) => t.key)
    expect(a).toEqual(b)
  })
  it('uses all 6 cards for level 12 with 6 cards', () => {
    const tiles = drawDeck(makeCards(6), 12, mulberry32(3))
    expect(new Set(tiles.map((t) => t.card.id)).size).toBe(6)
  })
  it('different rng streams give different orders', () => {
    const cards = makeCards(20)
    const a = drawDeck(cards, 30, mulberry32(1)).map((t) => t.key)
    const b = drawDeck(cards, 30, mulberry32(2)).map((t) => t.key)
    expect(a).not.toEqual(b)
  })
  it('never draws inactive cards and does not mutate input', () => {
    const cards = [...makeCards(6), ...makeCards(10, false)]
    const copy = cards.map((c) => c.id)
    const tiles = drawDeck(cards, 12, mulberry32(5))
    for (const t of tiles) expect(t.card.active).toBe(true)
    expect(cards.map((c) => c.id)).toEqual(copy)
  })
  it('throws when not enough active cards', () => {
    expect(() => drawDeck(makeCards(5), 12)).toThrow('not enough cards')
    expect(() => drawDeck([...makeCards(5), ...makeCards(5, false)], 12)).toThrow('not enough cards')
  })
})

describe('parseLevel', () => {
  it('parses valid levels', () => {
    expect(parseLevel('24')).toBe(24)
  })
  it('rejects invalid', () => {
    expect(parseLevel('25')).toBeNull()
    expect(parseLevel('abc')).toBeNull()
    expect(parseLevel('')).toBeNull()
  })
})
