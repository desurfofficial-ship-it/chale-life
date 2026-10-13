'use client'

// ─── District helpers: market stalls inside the neighborhood grids (Task 11) ─
// Reuses the Makola prop set (VendorTable / Kiosk / BeachStall / baskets /
// crates / fabric racks) so every neighborhood gets its own everyday market:
// stall rows along the alleys, roofed huts as anchors, umbrella shade items
// collected into instanced batches by the parent district.
import { VendorTable, BasketStack, CrateStack, FabricRack } from '../../scene/Expansion3'
import { BeachStall } from '../../scene/Expansion3'
import { Kiosk } from '../../scene/Expansion3'
import type { PropItem } from '../InstancedNature'

// A row of vendor tables along +x or +z, alternating facing, with basket and
// crate dressing between stalls. Returns the umbrella shade items so the
// parent can merge them into its InstancedUmbrellas batch.
export function StallRow({
  from, count, step, axis = 'x', colorIndex = 0,
}: {
  from: [number, number]
  count: number
  step: number
  axis?: 'x' | 'z'
  colorIndex?: number
}) {
  const items = Array.from({ length: count }, (_, i) => ({
    x: axis === 'x' ? from[0] + i * step : from[0],
    z: axis === 'x' ? from[1] : from[1] + i * step,
  }))
  return (
    <group>
      {items.map(({ x, z }, i) => (
        <group key={i}>
          <VendorTable
            position={[x, 0, z]}
            rotation={axis === 'x' ? (i % 2 === 0 ? Math.PI / 2 : -Math.PI / 2) : i % 2 === 0 ? 0 : Math.PI}
            colorIndex={colorIndex + i}
          />
          {i % 2 === 0 && <BasketStack position={[x + (axis === 'x' ? 0 : 1.4), 0, z + (axis === 'x' ? 1.2 : 0)]} />}
          {i % 2 === 1 && <CrateStack position={[x - (axis === 'x' ? 0 : 1.4), 0, z - (axis === 'x' ? 1.2 : 0)]} />}
        </group>
      ))}
    </group>
  )
}

// roofed market hut (counts as a building): BeachStall shell with a market sign
export function MarketHut({ position, rotation = 0, sign, roofColor = '#d8b56a' }: {
  position: [number, number, number]
  rotation?: number
  sign: string
  roofColor?: string
}) {
  return <BeachStall position={position} rotation={rotation} sign={sign} roofColor={roofColor} />
}

// umbrella shade items for a stall row (collected into InstancedUmbrellas)
export function stallUmbrellas(from: [number, number], count: number, step: number, axis: 'x' | 'z' = 'x'): PropItem[] {
  return Array.from({ length: count }, (_, i) => ({
    p: [axis === 'x' ? from[0] + i * step : from[0], axis === 'x' ? from[1] : from[1] + i * step] as [number, number],
    r: (i * 1.3) % Math.PI,
  }))
}

export { Kiosk, FabricRack }
