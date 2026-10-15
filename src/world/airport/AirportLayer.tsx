'use client';

/**
 * A-001 Kotoka — terminal (landside +z / airside −z), runway, apron stands,
 * jet bridges, and instanced planes driven by the ambient turnaround machine.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AIRPORT } from './layout';
import { phaseAt, bridgeExtended, planeOnStand } from './turnaround';
import { getAmbientGameTime, registerAmbient } from '../../engine/ambient';
import { signTexture } from '@/lib/mapTextures';

const _m = new THREE.Matrix4();
const _p = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3(1, 1, 1);
const _e = new THREE.Euler();
const _c = new THREE.Color();

const LIVERIES = ['#f6f4ee', '#e8f0ff', '#fff5e6', '#f0fff4'] as const;
const TAIL_GREEN = '#006b3f';

function Terminal() {
  const { x, z, w, d, h } = AIRPORT.terminal;
  const sign = useMemo(() => signTexture('KOTOKA INTL', '#0a3d4a', '#ffd98f'), []);
  const akwaaba = useMemo(() => signTexture('AKWAABA', '#006b3f', '#fcd116'), []);
  // Landside = +z (city road), airside = −z (apron / runway)
  return (
    <group position={[x, 0, z]} name="kotoka-terminal">
      {/* white base plinth */}
      <mesh position={[0, 0.4, 0]} receiveShadow>
        <boxGeometry args={[w + 2, 0.8, d + 2]} />
        <meshStandardMaterial color="#f2f0ea" roughness={0.9} />
      </mesh>
      {/* main pier body */}
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#f4f7f9" roughness={0.65} metalness={0.05} />
      </mesh>
      {/* horizontal floor bands (reads as multi-storey glass pier) */}
      {[2.2, 4.4, 6.6].map((yy) => (
        <mesh key={yy} position={[0, yy, -d / 2 - 0.06]}>
          <boxGeometry args={[w * 0.94, 0.12, 0.08]} />
          <meshStandardMaterial color="#d0e8ee" metalness={0.3} roughness={0.25} />
        </mesh>
      ))}
      {/* structural fins on airside */}
      {Array.from({ length: 9 }, (_, i) => {
        const xx = -w / 2 + 6 + i * ((w - 12) / 8);
        return (
          <mesh key={xx} position={[xx, h * 0.45, -d / 2 - 0.2]} castShadow>
            <boxGeometry args={[0.35, h * 0.75, 0.35]} />
            <meshStandardMaterial color="#e8ecef" roughness={0.5} />
          </mesh>
        );
      })}
      {/* airside glass curtain (−z) */}
      <mesh position={[0, h * 0.45, -d / 2 - 0.05]}>
        <planeGeometry args={[w * 0.92, h * 0.7]} />
        <meshStandardMaterial
          color="#5eb8c9"
          emissive="#2a6a78"
          emissiveIntensity={0.45}
          metalness={0.55}
          roughness={0.18}
          transparent
          opacity={0.92}
        />
      </mesh>
      {/* landside glass + sign (+z, city road) */}
      <mesh position={[0, h * 0.42, d / 2 + 0.05]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[w * 0.7, h * 0.55]} />
        <meshStandardMaterial
          color="#7ec8d6"
          emissive="#3a7a88"
          emissiveIntensity={0.35}
          metalness={0.5}
          roughness={0.2}
        />
      </mesh>
      <mesh position={[0, h + 1.1, d / 2 + 0.2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[18, 2.4]} />
        <meshStandardMaterial map={sign} emissive="#555" emissiveMap={sign} emissiveIntensity={0.85} />
      </mesh>
      {/* curved light roof (simple arch of boxes) */}
      <mesh position={[0, h + 0.9, 0]} castShadow>
        <boxGeometry args={[w + 4, 0.35, d + 3]} />
        <meshStandardMaterial color="#f7f5f0" roughness={0.55} metalness={0.1} />
      </mesh>
      {/* gate number boards on airside */}
      {AIRPORT.gates.map((g) => (
        <mesh key={g.id} position={[g.x - x, 5.2, -d / 2 - 0.3]}>
          <boxGeometry args={[2.4, 1.2, 0.12]} />
          <meshStandardMaterial color="#0c2a36" emissive="#1a4a5a" emissiveIntensity={0.6} />
        </mesh>
      ))}
      {/* control tower */}
      <group position={[AIRPORT.tower.x - x, 0, AIRPORT.tower.z - z]}>
        <mesh position={[0, 8, 0]} castShadow>
          <cylinderGeometry args={[1.2, 1.6, 16, 10]} />
          <meshStandardMaterial color="#e9e3d5" roughness={0.8} />
        </mesh>
        <mesh position={[0, 16.5, 0]}>
          <cylinderGeometry args={[2.5, 2.0, 1.6, 10]} />
          <meshStandardMaterial color="#2a3a46" metalness={0.4} roughness={0.35} />
        </mesh>
        <mesh position={[0, 16.5, 0]}>
          <cylinderGeometry args={[2.1, 2.1, 0.6, 10]} />
          <meshStandardMaterial color="#ffd98f" emissive="#ffcf7d" emissiveIntensity={1.2} />
        </mesh>
      </group>
      {/* hangar + cargo */}
      <mesh position={[AIRPORT.hangar.x - x, 4, AIRPORT.hangar.z - z]} castShadow>
        <boxGeometry args={[18, 8, 14]} />
        <meshStandardMaterial color="#c5cbd0" roughness={0.7} />
      </mesh>
      <mesh position={[AIRPORT.cargo.x - x, 2.5, AIRPORT.cargo.z - z]} castShadow>
        <boxGeometry args={[12, 5, 8]} />
        <meshStandardMaterial color="#b8c0c6" roughness={0.75} />
      </mesh>
      {/* landside AKWAABA */}
      <mesh position={[-w * 0.35, 3.2, d / 2 + 1.2]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[8, 1.6]} />
        <meshStandardMaterial map={akwaaba} emissive="#333" emissiveMap={akwaaba} emissiveIntensity={0.7} />
      </mesh>
    </group>
  );
}

function ApronAndRunway() {
  const { runway, apron, terminal } = AIRPORT;
  const rwLen = runway.x1 - runway.x0;
  const rwMidX = (runway.x0 + runway.x1) / 2;
  return (
    <group name="kotoka-surface">
      {/* apron concrete */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[terminal.x, 0.02, (apron.z0 + apron.z1) / 2]}
        receiveShadow
      >
        <planeGeometry args={[terminal.w + 40, apron.z1 - apron.z0 + 4]} />
        <meshStandardMaterial color="#d8d6d0" roughness={0.95} />
      </mesh>
      {/* yellow stand boxes */}
      {AIRPORT.gates.map((g) => (
        <mesh
          key={`box-${g.id}`}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[g.x, 0.04, g.z]}
          userData={{ noCollide: true }}
        >
          <ringGeometry args={[5.5, 6.2, 4]} />
          <meshBasicMaterial color="#f0c020" transparent opacity={0.85} />
        </mesh>
      ))}
      {/* runway */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[rwMidX, 0.03, runway.z]} receiveShadow>
        <planeGeometry args={[rwLen, runway.width]} />
        <meshStandardMaterial color="#4a4e52" roughness={0.9} />
      </mesh>
      {/* centreline dashes */}
      {Array.from({ length: 24 }, (_, i) => {
        const x = runway.x0 + 8 + i * (rwLen / 24);
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.05, runway.z]}>
            <planeGeometry args={[4.5, 0.55]} />
            <meshBasicMaterial color="#f5f5f0" />
          </mesh>
        );
      })}
      {/* piano keys thresholds */}
      {[-1, 1].map((side) =>
        Array.from({ length: 8 }, (_, i) => (
          <mesh
            key={`pk-${side}-${i}`}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[side < 0 ? runway.x0 + 6 : runway.x1 - 6, 0.05, runway.z - runway.width * 0.35 + i * 1.1]}
          >
            <planeGeometry args={[8, 0.7]} />
            <meshBasicMaterial color="#f5f5f0" />
          </mesh>
        )),
      )}
      {/* edge lights */}
      {Array.from({ length: 20 }, (_, i) => {
        const x = runway.x0 + 5 + i * (rwLen / 20);
        return (
          <group key={`el-${i}`}>
            <mesh position={[x, 0.35, runway.z - runway.width / 2 + 0.3]}>
              <sphereGeometry args={[0.2, 6, 6]} />
              <meshStandardMaterial color="#ffe08a" emissive="#ffc040" emissiveIntensity={1.4} />
            </mesh>
            <mesh position={[x, 0.35, runway.z + runway.width / 2 - 0.3]}>
              <sphereGeometry args={[0.2, 6, 6]} />
              <meshStandardMaterial color="#ffe08a" emissive="#ffc040" emissiveIntensity={1.4} />
            </mesh>
          </group>
        );
      })}
      {/* grass strips */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[rwMidX, 0.01, runway.z - runway.width / 2 - 6]}>
        <planeGeometry args={[rwLen, 10]} />
        <meshStandardMaterial color="#5a8f4a" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[rwMidX, 0.01, runway.z + runway.width / 2 + 6]}>
        <planeGeometry args={[rwLen, 10]} />
        <meshStandardMaterial color="#5a8f4a" roughness={1} />
      </mesh>
    </group>
  );
}

function JetBridge({
  gateX,
  gateZ,
  extend,
}: {
  gateX: number;
  gateZ: number;
  extend: number;
}) {
  // Bridge from terminal airside toward plane door
  const len = 2 + extend * 6;
  return (
    <group position={[gateX, 3.2, gateZ + 6]}>
      <mesh position={[0, 0, -len / 2]} castShadow>
        <boxGeometry args={[1.4, 1.1, len]} />
        <meshStandardMaterial color="#9aa3aa" metalness={0.35} roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, -len]} castShadow>
        <boxGeometry args={[1.6, 1.3, 1.2]} />
        <meshStandardMaterial color="#7a848c" metalness={0.3} roughness={0.5} />
      </mesh>
    </group>
  );
}

/** Shared low-poly airliner — instanced across gates. */

/** Readable low-poly airliner (white body, wings, engines, Ghana-green tail). */
function Airliner({
  body = '#f4f1ea',
  accent = '#006b3f',
}: {
  body?: string;
  accent?: string;
}) {
  return (
    <group>
      {/* fuselage along +X (nose +X) */}
      <mesh position={[0, 2.05, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <capsuleGeometry args={[1.05, 9.2, 6, 14]} />
        <meshStandardMaterial color={body} roughness={0.32} metalness={0.12} />
      </mesh>
      {/* nose tip */}
      <mesh position={[5.5, 2.05, 0]} castShadow>
        <sphereGeometry args={[1.0, 12, 10]} />
        <meshStandardMaterial color={body} roughness={0.3} metalness={0.15} />
      </mesh>
      {/* cockpit windows */}
      <mesh position={[5.35, 2.55, 0.15]} rotation={[0, 0.15, 0]}>
        <boxGeometry args={[0.9, 0.45, 1.3]} />
        <meshStandardMaterial color="#1a2834" metalness={0.7} roughness={0.15} />
      </mesh>
      {/* cabin window strip */}
      {[-3.2, -2.0, -0.8, 0.4, 1.6, 2.8].map((dx) => (
        <mesh key={dx} position={[dx, 2.55, 1.0]}>
          <boxGeometry args={[0.55, 0.28, 0.08]} />
          <meshStandardMaterial color="#ffd98f" emissive="#ffcf7d" emissiveIntensity={0.85} />
        </mesh>
      ))}
      {/* main wings */}
      <mesh position={[-0.3, 1.55, 0]} castShadow>
        <boxGeometry args={[2.8, 0.2, 13.2]} />
        <meshStandardMaterial color="#e4e0d6" roughness={0.4} metalness={0.08} />
      </mesh>
      {/* wing tips slight up */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.2, 1.7, s * 6.3]} rotation={[s * 0.12, 0, 0]} castShadow>
          <boxGeometry args={[1.6, 0.12, 1.2]} />
          <meshStandardMaterial color="#d8d4ca" roughness={0.4} />
        </mesh>
      ))}
      {/* engines under wings */}
      {[-3.0, 3.0].map((dz) => (
        <group key={dz} position={[-0.4, 1.0, dz]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.55, 0.62, 2.0, 12]} />
            <meshStandardMaterial color="#a8b0b8" metalness={0.55} roughness={0.3} />
          </mesh>
          <mesh position={[1.05, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.48, 0.52, 0.3, 12]} />
            <meshStandardMaterial color="#2a2e34" metalness={0.4} roughness={0.5} />
          </mesh>
        </group>
      ))}
      {/* vertical stabiliser — Ghana green */}
      <mesh position={[-5.4, 3.7, 0]} castShadow>
        <boxGeometry args={[2.2, 3.0, 0.28]} />
        <meshStandardMaterial color={accent} roughness={0.45} />
      </mesh>
      {/* black star proxy on tail */}
      <mesh position={[-5.35, 4.0, 0.2]}>
        <sphereGeometry args={[0.28, 8, 8]} />
        <meshStandardMaterial color="#111" roughness={0.8} />
      </mesh>
      {/* horizontal stabilisers */}
      <mesh position={[-5.5, 2.35, 0]} castShadow>
        <boxGeometry args={[1.4, 0.14, 4.2]} />
        <meshStandardMaterial color={body} roughness={0.4} />
      </mesh>
      {/* landing gear */}
      {[
        [3.4, 0],
        [-4.2, -1.15],
        [-4.2, 1.15],
      ].map(([dx, dz], i) => (
        <mesh key={i} position={[dx, 0.45, dz]} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.55, 10]} />
          <meshStandardMaterial color="#1a1c20" roughness={0.9} />
        </mesh>
      ))}
      {/* belly stripe accent */}
      <mesh position={[0.5, 1.55, 0]}>
        <boxGeometry args={[8, 0.15, 2.05]} />
        <meshStandardMaterial color={accent} roughness={0.5} />
      </mesh>
      {/* beacon */}
      <mesh position={[0.2, 3.35, 0]}>
        <sphereGeometry args={[0.14, 8, 8]} />
        <meshStandardMaterial color="#ff3030" emissive="#ff1010" emissiveIntensity={2} />
      </mesh>
    </group>
  );
}

const PLANE_BODIES = ['#f7f4ee', '#eef4ff', '#fff8ec', '#f2fff6', '#faf6f0'] as const;
const PLANE_ACCENTS = ['#006b3f', '#1a4a8a', '#8b1a1a', '#2d6b4f', '#0a3d4a'] as const;

function GatePlane({ gateIndex }: { gateIndex: number }) {
  const group = useRef<THREE.Group>(null);
  const g = AIRPORT.gates[gateIndex];
  const body = PLANE_BODIES[gateIndex % PLANE_BODIES.length];
  const accent = PLANE_ACCENTS[gateIndex % PLANE_ACCENTS.length];

  useEffect(() => {
    return registerAmbient((_dt, gameTime) => {
      const root = group.current;
      if (!root) return;
      const { phase, phaseT } = phaseAt(gameTime, gateIndex);

      let x = g.x;
      let z = g.z;
      let y = 0;
      let yaw = g.yaw;
      let visible = true;

      if (phase === 'gone') {
        visible = false;
      } else if (phase === 'arrive') {
        if (phaseT < 0.45) {
          x = AIRPORT.runway.x0 + (phaseT / 0.45) * (g.x - AIRPORT.runway.x0);
          z = AIRPORT.runway.z;
          y = Math.max(0, 10 * (1 - phaseT / 0.32));
          yaw = 0;
        } else {
          const u = (phaseT - 0.45) / 0.55;
          x = g.x;
          z = THREE.MathUtils.lerp(AIRPORT.runway.z, g.z, u);
          yaw = THREE.MathUtils.lerp(0, g.yaw, Math.min(1, u * 1.5));
        }
      } else if (planeOnStand(phase)) {
        x = g.x;
        z = g.z;
        yaw = g.yaw;
      } else if (phase === 'taxi') {
        const u = phaseT;
        x = THREE.MathUtils.lerp(g.x, AIRPORT.runway.x1 - 25, u);
        z = THREE.MathUtils.lerp(g.z, AIRPORT.runway.z, Math.min(1, u * 1.3));
        yaw = THREE.MathUtils.lerp(g.yaw, 0, u);
      } else if (phase === 'takeoff') {
        x = AIRPORT.runway.x0 + 40 + phaseT * (AIRPORT.runway.x1 - AIRPORT.runway.x0 - 50);
        z = AIRPORT.runway.z;
        y = phaseT * phaseT * 32;
        yaw = 0;
        if (phaseT > 0.92) visible = false;
      }

      root.visible = visible;
      root.position.set(x, y, z);
      root.rotation.y = yaw;
    });
  }, [gateIndex, g.x, g.z, g.yaw]);

  return (
    <group ref={group} position={[g.x, 0, g.z]} rotation={[0, g.yaw, 0]}>
      <Airliner body={body} accent={accent} />
    </group>
  );
}

function AnimatedBridge({ gateIndex }: { gateIndex: number }) {
  const g = AIRPORT.gates[gateIndex];
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    const root = ref.current;
    if (!root) return;
    const { phase, phaseT } = phaseAt(getAmbientGameTime(), gateIndex);
    const ext = bridgeExtended(phase, phaseT);
    const len = 2 + ext * 6;
    // child 0 is the tunnel, child 1 the head
    const tunnel = root.children[0] as THREE.Mesh | undefined;
    const head = root.children[1] as THREE.Mesh | undefined;
    if (tunnel) {
      tunnel.scale.z = Math.max(0.05, len / 4);
      tunnel.position.z = -len / 2;
    }
    if (head) head.position.z = -len;
  });
  return (
    <group ref={ref} position={[g.x, 3.2, g.z + 6]}>
      <mesh position={[0, 0, -2]} castShadow>
        <boxGeometry args={[1.5, 1.15, 4]} />
        <meshStandardMaterial color="#8a949c" metalness={0.35} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0, -4]} castShadow>
        <boxGeometry args={[1.7, 1.35, 1.3]} />
        <meshStandardMaterial color="#6a747c" metalness={0.3} roughness={0.45} />
      </mesh>
    </group>
  );
}

function PlanesAndBridges() {
  return (
    <group name="kotoka-planes">
      {AIRPORT.gates.map((g, i) => (
        <GatePlane key={g.id} gateIndex={i} />
      ))}
      {AIRPORT.gates.map((g, i) => (
        <AnimatedBridge key={`br-${g.id}`} gateIndex={i} />
      ))}
    </group>
  );
}

function ServiceTrucks() {
  // Simple fuel truck + tug cycling depot → gate 2 → depot on a path
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const COUNT = 5;

  useEffect(() => {
    return registerAmbient((_dt, gameTime) => {
      const m = meshRef.current;
      if (!m) return;
      const depot = AIRPORT.depot;
      for (let i = 0; i < COUNT; i++) {
        const g = AIRPORT.gates[i % AIRPORT.gates.length];
        const { phase, phaseT } = phaseAt(gameTime, i % AIRPORT.gates.length);
        let x = depot.x;
        let z = depot.z;
        // park beside plane during refuel / unload
        if (phase === 'refuel' || phase === 'unload' || phase === 'cater') {
          x = g.x + (i % 2 === 0 ? 4.5 : -4.5);
          z = g.z + 1.5;
        } else if (phase === 'arrive' && phaseT > 0.6) {
          x = THREE.MathUtils.lerp(depot.x, g.x + 4, (phaseT - 0.6) / 0.4);
          z = THREE.MathUtils.lerp(depot.z, g.z, (phaseT - 0.6) / 0.4);
        }
        _p.set(x, 0.55, z);
        _e.set(0, 0, 0);
        _q.setFromEuler(_e);
        _s.set(1, 1, 1);
        _m.compose(_p, _q, _s);
        m.setMatrixAt(i, _m);
        _c.set(i === 0 ? '#e8b84a' : i === 1 ? '#3a7ab8' : '#c0c4c8');
        m.setColorAt(i, _c);
      }
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    });
  }, []);

  return (
    <instancedMesh ref={meshRef} args={[undefined as unknown as THREE.BufferGeometry, undefined as unknown as THREE.Material, COUNT]} castShadow>
      <boxGeometry args={[2.2, 1.1, 1.2]} />
      <meshStandardMaterial vertexColors roughness={0.55} metalness={0.2} />
    </instancedMesh>
  );
}

export function AirportLayer() {
  return (
    <group name="a001-kotoka">
      <Terminal />
      <ApronAndRunway />
      <PlanesAndBridges />
      <ServiceTrucks />
    </group>
  );
}

export default AirportLayer;
