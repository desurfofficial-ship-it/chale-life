/**
 * TEMPORARY ground visual, absorbed from src/r3f/Ground.tsx (E-001 moved
 * src/r3f into src/app + src/engine). Sized from the World contract's
 * worldBounds so the walkable area is always visible. W-001 (World & Art)
 * replaces this file with the real Accra block — engine reads colliders from
 * src/world/colliders.ts, it does not care about this mesh.
 */

import { worldBounds } from '../world/colliders';

export function GroundPlane() {
  const w = worldBounds.maxX - worldBounds.minX;
  const d = worldBounds.maxZ - worldBounds.minZ;
  const cx = (worldBounds.maxX + worldBounds.minX) / 2;
  const cz = (worldBounds.maxZ + worldBounds.minZ) / 2;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, cz]}>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
  );
}
