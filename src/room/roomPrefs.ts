// ─── Room preferences — the bridge between the editor and the world ─────────
// SetTheMood (dollhouse editor) writes; GyanHouse (walkable world room) reads.
// Same key as the mood editor's original persistence ('chale-room-v1') so
// existing saves carry over, plus a devices key for lamp / fan state.
//
// Pure localStorage — no three.js, no React, safe for unit tests (guarded).
import { SWATCH, MOODS, type MoodId, type RoomMats } from './materials'

const MATS_KEY = 'chale-room-v1'
const DEVICES_KEY = 'chale-room-devices-v1'

/** Device ids that map to real meshes/lights in the single-room scene. */
export interface RoomDevices {
  /** room_ceiling — pendant bulb + main room light */
  ceiling: boolean
  /** room_desk — desk lamp shade + warm desk light */
  desk: boolean
  /** room_fan — standing fan blades spin */
  fan: boolean
}

export const DEFAULT_DEVICES: RoomDevices = {
  ceiling: true,
  desk: true,
  fan: false,
}

function matsValid(v: unknown): v is RoomMats {
  if (!v || typeof v !== 'object') return false
  return Object.values(v as Record<string, unknown>).every((id) => typeof id === 'string' && SWATCH[id])
}

/** Saved mats + hour, validated; falls back to the first mood preset. */
export function loadRoomMats(): { mats: RoomMats; hour: number } {
  const fallback = { mats: { ...MOODS[0].mats }, hour: MOODS[0].hour }
  try {
    if (typeof window === 'undefined') return fallback
    const raw = window.localStorage.getItem(MATS_KEY)
    if (!raw) return fallback
    const v = JSON.parse(raw) as { mats?: unknown; hour?: unknown }
    if (!matsValid(v.mats)) return fallback
    const hour = typeof v.hour === 'number' && v.hour >= 0 && v.hour <= 24 ? v.hour : fallback.hour
    return { mats: { ...fallback.mats, ...(v.mats as RoomMats) }, hour }
  } catch {
    return fallback
  }
}

/** Save mats + hour (called from the editor's store subscription). */
export function saveRoomMats(mats: RoomMats, hour: number): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(MATS_KEY, JSON.stringify({ mats, hour }))
  } catch {
    /* private mode */
  }
}

export function loadRoomDevices(): RoomDevices {
  try {
    if (typeof window === 'undefined') return { ...DEFAULT_DEVICES }
    const raw = window.localStorage.getItem(DEVICES_KEY)
    if (!raw) return { ...DEFAULT_DEVICES }
    const v = JSON.parse(raw) as Partial<Record<keyof RoomDevices, unknown>>
    return {
      ceiling: typeof v.ceiling === 'boolean' ? v.ceiling : DEFAULT_DEVICES.ceiling,
      desk: typeof v.desk === 'boolean' ? v.desk : DEFAULT_DEVICES.desk,
      fan: typeof v.fan === 'boolean' ? v.fan : DEFAULT_DEVICES.fan,
    }
  } catch {
    return { ...DEFAULT_DEVICES }
  }
}

export function saveRoomDevices(d: RoomDevices): void {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(DEVICES_KEY, JSON.stringify(d))
  } catch {
    /* private mode */
  }
}

/** Mood id from saved state (best effort — used for "close to X" labels). */
export function nearestMoodId(mats: RoomMats): MoodId {
  let best: MoodId = MOODS[0].id
  let bestScore = -1
  for (const m of MOODS) {
    const hits = (Object.keys(m.mats) as (keyof RoomMats)[]).filter((k) => m.mats[k] === mats[k]).length
    if (hits > bestScore) {
      bestScore = hits
      best = m.id
    }
  }
  return best
}
