/**
 * StarterBlock.tsx — the 60 × 60 m starter street block of Chalé Life.
 *
 * Procedural only (no GLBs): tarred main road with open gutters, laterite
 * side street, pavement along the shop fronts, block buildings (compound
 * house with wall + gate, provisions store, waakye kiosk, chop bar, iron-
 * roofed shops) and instanced props (Polytank, plastic chairs, parasols,
 * utility poles with wires, neem and palm trees).
 *
 * Performance shape (phone-first, mid-range iPhone @ 30+ fps):
 *   - static architecture merged into ONE vertex-coloured mesh  → 1 draw call
 *   - repeated props via InstancedMesh (1 call per prop type)   → 8 draw calls
 *   - sagging power wires as one LineSegments                   → 1 draw call
 *   - canvas-textured signs                                     → 4 draw calls
 *   ≈ 14 draw calls and ≈ 8k triangles total — far under the 150 / 100k budget.
 *
 * Mounts in one line from the engine:  <StarterBlock />
 *
 * Owned by Agent 3 (World & Art).
 */
import { Lighting } from './Lighting';
import { InstancedProps } from './InstancedProps';
import { Signs } from './Signs';
import { Wires } from './Wires';
import { staticGeometry } from './buildStatic';

function StaticArchitecture() {
  return (
    <mesh name="starter-architecture" geometry={staticGeometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.88} metalness={0} />
    </mesh>
  );
}

export function StarterBlock() {
  return (
    <group name="starter-block">
      <Lighting />
      <StaticArchitecture />
      <InstancedProps />
      <Wires />
      <Signs />
    </group>
  );
}
