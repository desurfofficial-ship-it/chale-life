'use client';
/**
 * B-001 — One world-run shop/restaurant: facade shell when zoomed out;
 * roofless pastel cutaway when zoomed in (same DETAIL_ZOOM as offices).
 */
import { Suspense, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import type { BusinessDef } from '../../data/worldBusinesses';
import { isBusinessOpen } from '../../rules/worldBusiness';
import { registerAmbient } from '../../engine/ambient';
import { getZoom } from '../../store/gameStore';
import { getAmbientHour } from '../../store/ambientClock';
import {
  getBusinessState,
  selectBusiness,
  subscribeBusiness,
} from '../../store/businessStore';
import { markAnimated, unmarkAnimated } from '../../components/world/SceneBatcher';
import { signTexture } from '../../lib/mapTextures';
import { useGLTF } from '@react-three/drei';
import { propsFor, type PropSpec } from './businessFurniture';

export const DETAIL_ZOOM = 20;
export const DETAIL_RADIUS_M = 45;

const useBiz = <T,>(pick: () => T) => useSyncExternalStore(subscribeBusiness, pick, pick);

function Shell({ def, onTap, openNow }: { def: BusinessDef; onTap: (e: ThreeEvent<MouseEvent>) => void; openNow: boolean }) {
  const { w, d } = def.site;
  const h = 3.2;
  const sign = useMemo(
    () => signTexture(def.facade.sign, def.facade.signBg, '#ffffff'),
    [def.facade.sign, def.facade.signBg],
  );
  return (
    <group onClick={onTap}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color={def.facade.wall} />
      </mesh>
      <mesh position={[0, h + 0.15, 0]}>
        <boxGeometry args={[w + 0.3, 0.3, d + 0.3]} />
        <meshStandardMaterial color={def.facade.roof} />
      </mesh>
      {/* awning */}
      <mesh position={[0, 2.2, d / 2 + 0.35]} rotation={[-0.15, 0, 0]}>
        <boxGeometry args={[w * 0.9, 0.08, 0.8]} />
        <meshStandardMaterial color={def.facade.awning} />
      </mesh>
      {/* sign */}
      <mesh position={[0, 2.7, d / 2 + 0.06]}>
        <planeGeometry args={[Math.min(w * 0.85, 6), 0.55]} />
        <meshBasicMaterial map={sign} transparent />
      </mesh>
      {/* night front light */}
      {openNow ? (
        <pointLight position={[0, 2.4, d / 2 + 0.5]} intensity={4} distance={10} color="#ffd9a0" />
      ) : null}
      {/* name pin */}
      <group position={[0, h + 1.2, 0]}>
        <mesh>
          <sphereGeometry args={[0.18, 10, 10]} />
          <meshBasicMaterial color={openNow ? '#22c55e' : '#94a3b8'} />
        </mesh>
      </group>
    </group>
  );
}


/** One low-poly prop; falls back to a box if the GLB fails. */
function PropMesh({ spec }: { spec: PropSpec }) {
  const { scene } = useGLTF(spec.path);
  const clone = scene.clone(true);
  const s = spec.scale ?? 1;
  return (
    <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.rotY ?? 0, 0]} scale={[s, s, s]}>
      <primitive object={clone} />
    </group>
  );
}

function PropFallback({ spec }: { spec: PropSpec }) {
  const s = spec.scale ?? 1;
  return (
    <mesh position={[spec.x, 0.4 * s, spec.z]} castShadow>
      <boxGeometry args={[0.6 * s, 0.8 * s, 0.6 * s]} />
      <meshStandardMaterial color="#b0bec5" />
    </mesh>
  );
}

function Cutaway({ def, richProps }: { def: BusinessDef; richProps: boolean }) {
  const { w, d } = def.site;
  const sim = useBiz(() => getBusinessState().sims[def.id]);
  const seats = def.capacity;
  const cols = Math.ceil(Math.sqrt(seats));
  const staff = sim?.staff ?? [];

  return (
    <group>
      {/* floor */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[w - 0.2, d - 0.2]} />
        <meshStandardMaterial
          color={
            def.kind === 'restaurant'
              ? '#f6edd8'
              : def.sub === 'barber' || def.sub === 'salon'
                ? '#f3e9df'
                : def.sub === 'gym'
                  ? '#e4ebe6'
                  : '#e8eef7'
          }
        />
      </mesh>
      {/* back + side walls (roofless) */}
      <mesh position={[0, 0.9, -d / 2 + 0.08]}>
        <boxGeometry args={[w, 1.8, 0.16]} />
        <meshStandardMaterial color={def.facade.wall} />
      </mesh>
      <mesh position={[-w / 2 + 0.08, 0.9, 0]}>
        <boxGeometry args={[0.16, 1.8, d]} />
        <meshStandardMaterial color={def.facade.wall} />
      </mesh>
      <mesh position={[w / 2 - 0.08, 0.9, 0]}>
        <boxGeometry args={[0.16, 1.8, d]} />
        <meshStandardMaterial color={def.facade.wall} />
      </mesh>
      {/* counter */}
      <mesh position={[0, 0.55, d / 2 - 1.2]} castShadow>
        <boxGeometry args={[w * 0.7, 1.1, 0.6]} />
        <meshStandardMaterial color="#8d6e63" />
      </mesh>
      {/* tables / shelves */}
      {Array.from({ length: Math.min(seats, 16) }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = -w / 2 + 1.2 + col * ((w - 2.4) / Math.max(1, cols - 1));
        const z = -d / 2 + 1.4 + row * 1.3;
        return (
          <mesh key={i} position={[x, 0.35, z]} castShadow>
            <boxGeometry args={def.kind === 'restaurant' ? [0.9, 0.7, 0.9] : [0.7, 1.2, 0.4]} />
            <meshStandardMaterial color={def.kind === 'restaurant' ? '#d7ccc8' : '#90caf9'} />
          </mesh>
        );
      })}
      {/* GLB props only for the selected business — keeps draw calls under the
          earnAndEat e2e budget (<450) when many cutaways are near the camera. */}
      {richProps ? (
        <Suspense fallback={null}>
          {propsFor(def).map((spec, i) => (
            <Suspense key={`p${i}`} fallback={<PropFallback spec={spec} />}>
              <PropMesh spec={spec} />
            </Suspense>
          ))}
        </Suspense>
      ) : null}
      {/* staff pills as simple capsules */}
      {staff.filter((s) => s.onShift).map((s, i) => {
        const x = -w / 2 + 1.5 + (i % 3) * 1.2;
        const z = d / 2 - 1.6;
        return (
          <group key={s.id} position={[x, 0, z]}>
            <mesh position={[0, 0.85, 0]}>
              <capsuleGeometry args={[0.22, 0.7, 4, 8]} />
              <meshStandardMaterial color="#5d4037" />
            </mesh>
            <mesh position={[0, 1.55, 0]}>
              <sphereGeometry args={[0.2, 10, 10]} />
              <meshStandardMaterial color="#f1c27d" />
            </mesh>
          </group>
        );
      })}
      {/* customers seated dots */}
      {Array.from({ length: Math.min(sim?.seated ?? 0, 12) }).map((_, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = -w / 2 + 1.2 + col * ((w - 2.4) / Math.max(1, cols - 1));
        const z = -d / 2 + 1.4 + row * 1.3 + 0.5;
        return (
          <mesh key={`c${i}`} position={[x, 0.7, z]}>
            <sphereGeometry args={[0.18, 8, 8]} />
            <meshStandardMaterial color="#64b5f6" />
          </mesh>
        );
      })}
    </group>
  );
}

export function BusinessBuilding({ def }: { def: BusinessDef }) {
  const root = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const [, setDetail] = useState(false);
  const selected = useBiz(() => getBusinessState().selectedBusinessId);
  // Cutaway only when selected — keeps earnAndEat draw-call budget (<450).
  const open = selected === def.id;
  const hour = getAmbientHour();
  const openNow = isBusinessOpen(def, hour);

  useEffect(() => {
    markAnimated(root.current);
    const r = root.current;
    return () => unmarkAnimated(r);
  }, []);

  useEffect(() => {
    let acc = 0;
    const dir = new THREE.Vector3();
    return registerAmbient((dt) => {
      acc += dt;
      if (acc < 0.25) return;
      acc = 0;
      camera.getWorldDirection(dir);
      const t = dir.y < -1e-3 ? -camera.position.y / dir.y : 0;
      const cx = camera.position.x + dir.x * t;
      const cz = camera.position.z + dir.z * t;
      const near = Math.hypot(cx - def.site.x, cz - def.site.z) < DETAIL_RADIUS_M;
      const next = near && getZoom() >= DETAIL_ZOOM;
      setDetail((prev) => (prev === next ? prev : next));
    });
  }, [camera, def.site.x, def.site.z]);

  const onTap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectBusiness(def.id);
  };

  return (
    <group
      ref={root}
      name={`business-${def.id}`}
      position={[def.site.x, 0, def.site.z]}
      rotation={[0, def.site.yaw, 0]}
      userData={{ bldg: 'business', businessId: def.id }}
    >
      {!open ? <Shell def={def} onTap={onTap} openNow={openNow} /> : (
        <group onClick={onTap}>
          <Cutaway
            def={def}
            richProps={
              selected === def.id &&
              (def.sub === 'barber' || def.sub === 'salon' || def.sub === 'gym')
            }
          />
          {/* low facade lip so cutaway reads as sliced model */}
          <mesh position={[0, 0.15, def.site.d / 2 - 0.05]}>
            <boxGeometry args={[def.site.w, 0.3, 0.1]} />
            <meshStandardMaterial color={def.facade.wall} />
          </mesh>
        </group>
      )}
    </group>
  );
}

