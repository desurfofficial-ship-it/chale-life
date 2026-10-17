/**
 * homeLayoutStore.ts — the player's own furniture layout (PRIORITY 2).
 *
 * Owns WHERE each bought piece stands in Gyan's room: place / move / rotate /
 * remove with the pure rules from homeLayout.ts, persisted to localStorage so
 * the layout survives leaving and returning (the directive's save/restore
 * requirement). The purchase ledger stays in gameStore.home.furnitureIds —
 * this store only arranges pieces the player already owns.
 *
 * Pattern: module singleton + subscribe/notify (same as officeStore), so
 * React subscribes with useSyncExternalStore and e2e can probe window.__chaleHome.
 */
import { getState } from '../store/gameStore'
import {
  findFreeSpot,
  moveFurniture,
  placeFurniture,
  removeFurniture,
  rotateFurniture,
  uidFor,
  type HomePlacement,
  type Quarter,
} from './homeLayout'

const SAVE_KEY = 'chale-home-layout-v1'

export interface HomeLayoutState {
  /** Placed pieces (ordered — render order is stable). */
  readonly layout: readonly HomePlacement[]
  /** uid currently selected in the Arrange editor (null = none). */
  readonly selectedUid: string | null
  /** Last rejection message for the Arrange UI feedback line (null = none). */
  readonly feedback: string | null
}

function load(): readonly HomePlacement[] {
  try {
    if (typeof localStorage === 'undefined') return []
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    // Full row validation — a corrupt save must never wedge the room.
    const out: HomePlacement[] = []
    for (const row of parsed) {
      const p = row as Partial<HomePlacement>
      if (
        typeof p?.uid === 'string' &&
        typeof p?.id === 'string' &&
        Number.isFinite(p?.x) &&
        Number.isFinite(p?.z) &&
        typeof p?.rot === 'number' &&
        p.rot >= 0 &&
        p.rot <= 3 &&
        Number.isInteger(p.rot)
      ) {
        out.push({ uid: p.uid, id: p.id, x: p.x as number, z: p.z as number, rot: p.rot as Quarter })
      }
    }
    return out
  } catch {
    return []
  }
}

function save(layout: readonly HomePlacement[]): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(SAVE_KEY, JSON.stringify(layout))
  } catch {
    /* storage full / private mode — the layout just isn't saved */
  }
}

let state: HomeLayoutState = { layout: load(), selectedUid: null, feedback: null }
const listeners = new Set<() => void>()

function notify(): void {
  for (const l of listeners) l()
}

function commit(next: Partial<HomeLayoutState>): void {
  state = { ...state, ...next }
  save(state.layout)
  notify()
}

export function getHomeLayoutState(): HomeLayoutState {
  return state
}

export function subscribeHomeLayout(fn: () => void): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

/** uid of the n-th owned instance of a catalog id (purchase order). */
function nthUid(id: string, ownedIds: readonly string[]): string {
  let n = 0
  for (const o of ownedIds) {
    if (o === id) n++
  }
  return uidFor(id, n)
}

/**
 * Place a piece the player owns. With no explicit spot it takes the first
 * free auto-anchor (findFreeSpot) — the Shop tab calls this right after a
 * successful buy so the piece is immediately visible, then the player
 * arranges it in the Arrange tab.
 */
export function requestPlaceHomeFurniture(
  id: string,
  ownedIds: readonly string[],
  at?: { x: number; z: number; rot?: Quarter },
): { ok: boolean; reason?: string } {
  // P0: only catalogue pieces the ledger actually owns can be placed.
  if (!ownedIds.includes(id)) return { ok: false, reason: 'Buy it first.' }
  const uid = nthUid(id, ownedIds)
  const spot =
    at ? { x: at.x, z: at.z, rot: at.rot ?? 0 } : findFreeSpot(state.layout, id, uid)
  if (!spot) return { ok: false, reason: 'No room left — remove something first.' }
  const r = placeFurniture(state.layout, { uid, id }, spot.x, spot.z, spot.rot)
  if (!r.ok) return { ok: false, reason: r.reason }
  commit({ layout: r.layout, selectedUid: uid, feedback: null })
  return { ok: true }
}

export function requestMoveHomeFurniture(uid: string, dx: number, dz: number): boolean {
  const r = moveFurniture(state.layout, uid, dx, dz)
  commit(r.ok ? { layout: r.layout, feedback: null } : { feedback: r.reason })
  return r.ok
}

export function requestRotateHomeFurniture(uid: string): boolean {
  const r = rotateFurniture(state.layout, uid)
  commit(r.ok ? { layout: r.layout, feedback: null } : { feedback: r.reason })
  return r.ok
}

export function requestRemoveHomeFurniture(uid: string): boolean {
  const r = removeFurniture(state.layout, uid)
  if (!r.ok) {
    commit({ feedback: r.reason })
    return false
  }
  commit({ layout: r.layout, selectedUid: null, feedback: null })
  return true
}

export function selectHomeFurniture(uid: string | null): void {
  commit({ selectedUid: uid, feedback: null })
}

/** Clear the feedback line (UI dismiss). */
export function clearHomeFeedback(): void {
  if (state.feedback !== null) commit({ feedback: null })
}

/** Test/e2e helper — empty layout, no selection. */
export function __resetHomeLayoutForTests(): void {
  state = { layout: [], selectedUid: null, feedback: null }
  save(state.layout)
  notify()
}

// e2e / probe surface (mirrors __chaleOffice) — robot tests drive the same
// request* paths the Arrange tab buttons call.
if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('e2e') === '1') {
  ;(window as unknown as Record<string, unknown>).__chaleHome = {
    probe: (): { layout: readonly HomePlacement[]; selectedUid: string | null } => ({
      layout: state.layout,
      selectedUid: state.selectedUid,
    }),
    place: (id: string, x: number, z: number, rot?: number): string => {
      const owned = getState().home.furnitureIds
      const r = requestPlaceHomeFurniture(id, owned, { x, z, rot: rot as Quarter | undefined })
      return r.ok ? 'placed' : (r.reason ?? 'rejected')
    },
    move: (uid: string, dx: number, dz: number): string => (requestMoveHomeFurniture(uid, dx, dz) ? 'moved' : (state.feedback ?? 'rejected')),
    rotate: (uid: string): string => (requestRotateHomeFurniture(uid) ? 'rotated' : (state.feedback ?? 'rejected')),
    remove: (uid: string): string => (requestRemoveHomeFurniture(uid) ? 'removed' : (state.feedback ?? 'rejected')),
  }
}
