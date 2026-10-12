'use client'

// ─── Map HUD — DOM overlay, fully separated from the 3D world ───────────────
// The Chalé Life game can drop this component entirely and mount its own HUD:
// the world (AccraScene's <Canvas>) exposes the same callbacks and works
// standalone. Contains: district tabs, title chip, hint bar, reset button
// and a live perf readout (FPS · draw calls · triangles).
import { useEffect, useState } from 'react'
import { DISTRICT_TABS, type LandmarkDef } from '@/lib/mapConfig'

export interface MapStats {
  fps: number
  calls: number
  tris: number
}

export function MapHUD({
  focused,
  onTab,
  onReset,
  statsRef,
  labelsOn,
  onToggleLabels,
}: {
  focused: LandmarkDef | null
  onTab: (id: string | null) => void
  onReset: () => void
  statsRef: React.RefObject<MapStats>
  labelsOn: boolean
  onToggleLabels: () => void
}) {
  // sample the world's stats ref twice a second; only this tiny overlay
  // re-renders — the 3D world never does
  const [stats, setStats] = useState<MapStats>({ fps: 0, calls: 0, tris: 0 })
  useEffect(() => {
    const id = setInterval(() => {
      const s = statsRef.current
      if (s) setStats({ fps: s.fps, calls: s.calls, tris: s.tris })
    }, 500)
    return () => clearInterval(id)
  }, [statsRef])

  return (
    <>
      {/* ── district navigation tabs ── */}
      <div className="absolute bottom-14 left-1/2 z-40 -translate-x-1/2 sm:bottom-auto sm:top-4">
        <div className="flex max-w-[94vw] items-center gap-1.5 overflow-x-auto rounded-full border border-white/20 bg-black/40 px-2 py-1.5 shadow-lg backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <button
            onClick={() => onTab(null)}
            className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition sm:px-3 sm:text-[11px] ${
              focused ? 'bg-white/10 text-white/80 hover:bg-white/20' : 'bg-amber-300/90 text-[#241a3d] hover:bg-amber-200'
            }`}
          >
            FULL MAP
          </button>
          {DISTRICT_TABS.map((t) => {
            const active = focused?.id === t.id
            return (
              <button
                key={t.id}
                onClick={() => onTab(t.id)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider transition sm:px-3 sm:text-[11px] ${
                  active ? 'bg-amber-300/90 text-[#241a3d]' : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
              >
                {t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── title chip ── */}
      <div className="pointer-events-none absolute left-3 top-3 z-40 sm:left-5 sm:top-5">
        <div className="rounded-xl border border-white/25 bg-black/35 px-3 py-2 shadow-lg backdrop-blur-md sm:px-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-200 sm:text-xs">Accra · Ghana</p>
          <p className="text-[9px] uppercase tracking-[0.18em] text-white/60 sm:text-[10px]">3D Open-World Map · Chalé Life handover build</p>
        </div>
      </div>

      {/* ── labels on/off switch (landmark + district + building name pills) ──
          Task 13: spelled out ("Landmark names ON/OFF") so it reads as a
          control at a glance; aria-label + title for accessibility */}
      <button
        onClick={onToggleLabels}
        aria-pressed={labelsOn}
        aria-label={labelsOn ? 'Hide landmark names' : 'Show landmark names'}
        title={labelsOn ? 'Hide landmark names' : 'Show landmark names'}
        data-testid="names-toggle"
        className="absolute right-3 top-14 z-40 flex items-center gap-2 rounded-full border border-white/25 bg-black/45 py-1.5 pl-3 pr-1.5 shadow-lg backdrop-blur-md transition hover:bg-black/60 sm:right-5 sm:top-16"
      >
        <span className="text-[9px] font-bold uppercase tracking-wider text-white/85 sm:text-[10px]">
          Landmark names <span className={labelsOn ? 'text-amber-300' : 'text-white/50'}>{labelsOn ? 'ON' : 'OFF'}</span>
        </span>
        <span
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition ${
            labelsOn ? 'bg-amber-300' : 'bg-white/25'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              labelsOn ? 'translate-x-[1.15rem]' : 'translate-x-0.5'
            }`}
          />
        </span>
      </button>

      {/* ── perf readout (desktop) ── */}
      <div className="pointer-events-none absolute right-3 top-3 z-40 hidden sm:right-5 sm:top-5 sm:block">
        <div className="rounded-lg border border-white/20 bg-black/35 px-3 py-1.5 font-mono text-[10px] leading-relaxed text-emerald-200/90 backdrop-blur-md">
          {stats.fps} FPS · {stats.calls} draws · {(stats.tris / 1000).toFixed(0)}k tris
        </div>
      </div>

      {/* ── hint bar ── */}
      <div className="pointer-events-none absolute bottom-3 left-3 z-40 sm:bottom-5 sm:left-5">
        <div className="rounded-lg border border-white/20 bg-black/30 px-3 py-1.5 backdrop-blur-md">
          <p className="text-[9px] tracking-wide text-white/75 sm:text-[11px]">Drag to orbit · Pinch / scroll to zoom · Tap a label or tab to fly there</p>
        </div>
      </div>

      {/* ── reset button ── */}
      {focused && (
        <button
          onClick={onReset}
          className="absolute bottom-[6.5rem] right-4 z-40 rounded-full border border-amber-300/40 bg-black/45 px-4 py-2 text-xs font-semibold text-amber-200 shadow-lg backdrop-blur-md transition hover:bg-black/60 sm:bottom-6 sm:right-6"
        >
          ← Back to full map
        </button>
      )}
    </>
  )
}
