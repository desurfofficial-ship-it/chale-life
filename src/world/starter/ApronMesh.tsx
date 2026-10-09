/**
 * ApronMesh — outer 25 m ring past WORLD_MIN/MAX (W-005).
 * Merged vertex-coloured geometry, one draw call.
 */
import { useMemo } from 'react';
import { buildMerged } from './geometry';
import { apronSpecs } from './apron';

export function ApronMesh() {
  const geometry = useMemo(() => {
    const g = buildMerged(apronSpecs());
    if (g) g.computeBoundingSphere();
    return g;
  }, []);
  if (!geometry) return null;
  return (
    <mesh name="world-apron" geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0} />
    </mesh>
  );
}
