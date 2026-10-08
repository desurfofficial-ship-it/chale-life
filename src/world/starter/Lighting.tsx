/**
 * Lighting.tsx — warm coastal Accra midday sun, light shadows only.
 *
 * One shadow-casting directional sun + hemisphere sky bounce. Tight 1024²
 * shadow map over the 60 × 60 m block keeps the phone budget healthy;
 * soft PCF radius avoids hard cartoon edges.
 *
 * Owned by Agent 3 (World & Art).
 */
import { PALETTE } from '../palette';

export function Lighting() {
  return (
    <group name="starter-lighting">
      <hemisphereLight args={[PALETTE.skyBlue, '#8a7350', 0.55]} />
      <directionalLight
        position={[24, 34, 14]}
        intensity={2.1}
        color="#ffd9a8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-42}
        shadow-camera-right={42}
        shadow-camera-top={42}
        shadow-camera-bottom={-42}
        shadow-camera-near={5}
        shadow-camera-far={100}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-radius={4}
      />
    </group>
  );
}
