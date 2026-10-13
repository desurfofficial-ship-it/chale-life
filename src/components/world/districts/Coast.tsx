'use client'

// ─── District: Coast & Gulf — beach umbrellas, fishing boats, yachts, ───────
// ─── rocky embankments, lagoon dressing and the lagoon bridge ───────────────
import { Boat, Yacht } from '../../scene/Movers'
import { LagoonBridge, Rocks } from '../../scene/Expansion2'
import { InstancedUmbrellas, type PropItem } from '../InstancedNature'

const UMBRELLAS: PropItem[] = [
  [-150, 38], [-136, 38], [-122, 38], [-108, 38], [-94, 38], [-80, 38],
  [-66, 38], [-22, 38], [-30, 38], [-16, 38], [-2, 38], [12, 38],
  [26, 38], [40, 38], [54, 38], [82, 38], [96, 38], [110, 38],
  [124, 38], [138, 38], [148, 38],
].map((p, i) => ({ p: [p[0], p[1] + (i % 3) * 1.6] as [number, number] }))

export function Coast() {
  return (
    <group>
      <InstancedUmbrellas items={UMBRELLAS} />

      {/* fishing boats riding at anchor */}
      {[-110, -92, -74, -22, -8, 10, 26, 44, 60, 100, 118, 142].map((x, i) => (
        <Boat key={x} position={[x, 0, 52 + ((i * 11) % 26)]} colorIndex={i} rotation={0.4 + i * 0.35} />
      ))}
      <Boat position={[74, 0, 17.5]} colorIndex={2} rotation={-0.5} />
      <Boat position={[86, 0, 19.5]} colorIndex={4} rotation={0.9} />
      <Boat position={[-52, 0, 50]} colorIndex={1} rotation={2.2} />
      {/* yachts */}
      <Yacht position={[-28, 0, 64]} rotation={0.5} />
      <Yacht position={[75, 0, 92]} rotation={-0.35} />

      {/* rocky embankments on the outer coast */}
      <Rocks positions={[[-156, 44.6], [-149.5, 44.2], [-125, 44.8], [-118.5, 44.3], [-111.5, 44.7], [121, 44.5], [128, 44.8], [141, 44.3], [148.5, 44.7], [155, 44.4]]} />

      {/* lagoon dressing + bridge */}
      <LagoonBridge position={[80, 0, 18.5]} />
      <Rocks positions={[[95, 17], [94.5, 20.5], [95.5, 16.5]]} />
    </group>
  )
}
