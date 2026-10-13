'use client'

// ─── District: Labadi + Fun Zone — beach recreation strip, food stalls, ─────
// ─── volleyball, loungers, and the FUN ZONE ferris wheel ───────────────────
import { FerrisWheel } from '../../scene/Expansion2'
import { BeachStall, Lounger, VolleyballCourt, BannerGate } from '../../scene/Expansion3'
import { Canoe } from '../../scene/Movers'
import { InstancedLamps, InstancedPalms, InstancedPeople, type PropItem } from '../InstancedNature'

const LAB_LAMPS: PropItem[] = [
  { p: [16, 36.9], r: Math.PI }, { p: [44, 36.9], r: Math.PI }, { p: [68, 36.9], r: Math.PI },
]
const LAB_PALMS: PropItem[] = [
  { p: [10, 44.5] }, { p: [70, 44.5], s: 1.05 }, { p: [86, 44], s: 0.95 },
]
const LAB_PEOPLE: PropItem[] = [
  { p: [18, 42], r: 2.6 }, { p: [35, 44.5], r: 0.9 }, { p: [55, 42.5], r: 1.8 }, { p: [70, 38], r: 2.2 },
]

export function LabadiFunzone() {
  return (
    <group>
      <BeachStall position={[20, 0, 40.5]} rotation={Math.PI} sign="KELEWELE" />
      <BeachStall position={[33, 0, 40.5]} rotation={Math.PI} sign="COCONUTS" roofColor="#e08a3c" />
      <BeachStall position={[47, 0, 40.5]} rotation={Math.PI} sign="GRILLED FISH" roofColor="#b58a4e" />
      <BeachStall position={[64, 0, 40.5]} rotation={Math.PI} sign="DRINKS" roofColor="#3aa08f" />
      <VolleyballCourt position={[34, 0, 43.8]} />
      {[48, 50, 52, 54].map((x) => (
        <Lounger key={x} position={[x, 0, 43.5]} rotation={0.15} />
      ))}
      <Canoe position={[58, 0, 43.5]} rotation={0.4} colorIndex={1} />
      <Canoe position={[63, 0, 44.2]} rotation={-0.3} colorIndex={3} />
      <InstancedLamps items={LAB_LAMPS} />
      <InstancedPalms items={LAB_PALMS} />
      <BannerGate position={[79, 0, 36.5]} text="FUN ZONE" bg="#006b3f" fg="#fcd116" width={6} />
      <InstancedPeople items={LAB_PEOPLE} />
      <FerrisWheel position={[72, 0, 41]} />
    </group>
  )
}
