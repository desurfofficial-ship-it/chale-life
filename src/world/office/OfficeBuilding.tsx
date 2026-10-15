'use client';
/**
 * O-001 — One world-run office: facade shell when zoomed out; roofless
 * pastel cutaway of the selected floor when zoomed in (tweet look), with
 * instanced furniture, walking NPC staff with name pills, visitors, and a
 * working lift. All per-frame motion runs in ONE ambient step (no useFrame).
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { FLOOR_HEIGHT_M, TINT_HEX, WALL_HEIGHT_M, type OfficeDef } from '../../data/offices';
import { carHeightM, doorOpen01 } from '../../rules/lift';
import { CORE_W, findRoom, isOpen, type FloorLayout, type LaidRoom } from '../../rules/office';
import { registerAmbient, isReducedMotion } from '../../engine/ambient';
import { getZoom } from '../../store/gameStore';
import { getAmbientHour } from '../../store/ambientClock';
import {
  getOfficeState,
  liftDefFor,
  officeLayout,
  selectOffice,
  selectStaff,
  subscribeOffice,
} from '../../store/officeStore';
import { markAnimated, unmarkAnimated } from '../../components/world/SceneBatcher';
import { signTexture } from '../../lib/mapTextures';
import { furnitureFor, roomSeats, type Part } from './officeFurniture';
import { SHARED, SHIRTS, SKINS, VISITOR_SHIRTS, hashIndex, pillTexture, tileGridTexture } from './officeVisuals';

/** Zoom at/above which a nearby office opens into its cutaway. */
export const DETAIL_ZOOM = 20;
/** View-centre distance (m) within which the cutaway can open. */
export const DETAIL_RADIUS_M = 45;
const WALK_MPS = 1.4;
const MAX_VISITORS = 10;

const useSel = <T,>(pick: () => T) => useSyncExternalStore(subscribeOffice, pick, pick);

export function OfficeBuilding({ def }: { def: OfficeDef }) {
  const root = useRef<THREE.Group>(null);
  const camera = useThree((s) => s.camera);
  const [detail, setDetail] = useState(false);
  const selectedOffice = useSel(() => getOfficeState().selectedOfficeId);
  const viewFloor = useSel(() => getOfficeState().viewFloor[def.id] ?? 0);
  const layouts = useMemo(() => officeLayout(def.id), [def.id]);
  const open = detail || selectedOffice === def.id;

  useEffect(() => {
    markAnimated(root.current);
    const r = root.current;
    return () => unmarkAnimated(r);
  }, []);

  // detail switch — cheap 4 Hz check of camera view-centre + zoom
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

  const onShellTap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    selectOffice(def.id);
  };

  return (
    <group
      ref={root}
      name={`office-${def.id}`}
      position={[def.site.x, 0, def.site.z]}
      rotation={[0, def.site.yaw, 0]}
      userData={{ bldg: 'office', officeId: def.id }}
    >
      {!open ? (
        <Shell def={def} onTap={onShellTap} />
      ) : (
        <>
          {viewFloor > 0 ? <LowerFloors def={def} floors={viewFloor} onTap={onShellTap} /> : null}
          <group position={[0, viewFloor * FLOOR_HEIGHT_M, 0]}>
            <FloorCutaway def={def} layout={layouts[viewFloor]} onTap={onShellTap} />
          </group>
          {def.hasLift ? <LiftShaft def={def} layouts={layouts} viewFloor={viewFloor} /> : <Stairs def={def} viewFloor={viewFloor} />}
          <People def={def} layouts={layouts} viewFloor={viewFloor} />
        </>
      )}
    </group>
  );
}

// ───────────────────────────────────────────── facade shell ────

function Shell({ def, onTap }: { def: OfficeDef; onTap: (e: ThreeEvent<MouseEvent>) => void }) {
  const { w, d } = def.site;
  const h = def.floors.length * FLOOR_HEIGHT_M + 0.4;
  const sign = useMemo(() => signTexture(def.facade.sign, def.facade.signBg, '#ffffff'), [def.facade.sign, def.facade.signBg]);
  const lit = useSel(() => {
    const hr = getAmbientHour();
    return isOpen(def, hr) && (hr < 6.5 || hr >= 18) ? 1 : 0;
  });
  return (
    <group onClick={onTap}>
      <mesh position={[0, h / 2, 0]} castShadow receiveShadow geometry={SHARED.box} scale={[w, h, d]}>
        <meshStandardMaterial color={def.facade.wall} roughness={0.7} />
      </mesh>
      {def.floors.map((f) => (
        <group key={f.level}>
          {[1, -1].map((side) => (
            <mesh
              key={side}
              geometry={SHARED.box}
              position={[0, f.level * FLOOR_HEIGHT_M + 1.7, side * (d / 2 + 0.03)]}
              scale={[w - 1, 1.2, 0.06]}
            >
              <meshStandardMaterial
                color="#9fc9dc"
                emissive="#ffd98f"
                emissiveIntensity={lit ? 0.9 : 0}
                metalness={0.4}
                roughness={0.25}
              />
            </mesh>
          ))}
        </group>
      ))}
      <mesh geometry={SHARED.box} position={[0, h + 0.15, 0]} scale={[w + 0.4, 0.3, d + 0.4]} castShadow>
        <meshStandardMaterial color={def.facade.roof} roughness={0.8} />
      </mesh>
      <mesh geometry={SHARED.plane} position={[0, 1.05, d / 2 + 0.08]} scale={[Math.min(w - 1, 6), 1.1, 1]}>
        <meshStandardMaterial map={sign} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

function LowerFloors({ def, floors, onTap }: { def: OfficeDef; floors: number; onTap: (e: ThreeEvent<MouseEvent>) => void }) {
  const { w, d } = def.site;
  const h = floors * FLOOR_HEIGHT_M;
  return (
    <mesh geometry={SHARED.box} position={[0, h / 2, 0]} scale={[w, h, d]} onClick={onTap} castShadow receiveShadow>
      <meshStandardMaterial color={def.facade.wall} roughness={0.75} />
    </mesh>
  );
}

// ──────────────────────────────────────────── floor cutaway ────

function FloorCutaway({
  def,
  layout,
  onTap,
}: {
  def: OfficeDef;
  layout: FloorLayout;
  onTap: (e: ThreeEvent<MouseEvent>) => void;
}) {
  const { w, d } = def.site;
  const grid = useMemo(() => tileGridTexture(), []);
  return (
    <group onClick={onTap}>
      {/* slab */}
      <mesh geometry={SHARED.box} position={[0, 0.05, 0]} scale={[w + 0.3, 0.1, d + 0.3]} receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>
      {/* pastel room floors with tile grid */}
      {layout.rooms.map((r) => (
        <RoomFloor key={r.spec.id} room={r} grid={grid} />
      ))}
      {/* core floor */}
      <mesh geometry={SHARED.plane} rotation={[-Math.PI / 2, 0, 0]} position={[layout.core.x, 0.11, 0]} scale={[CORE_W, d, 1]}>
        <meshStandardMaterial color={TINT_HEX.grey} roughness={0.95} />
      </mesh>
      <Walls def={def} layout={layout} />
      <Furniture layout={layout} />
      {layout.rooms.map((r) => (
        <sprite key={`pill-${r.spec.id}`} position={[r.x, WALL_HEIGHT_M + 1.0, r.z - r.d / 2 + 0.6]} scale={[1.9, 0.48, 1]}>
          <spriteMaterial map={pillTexture(r.spec.label)} depthWrite={false} transparent />
        </sprite>
      ))}
    </group>
  );
}

function RoomFloor({ room, grid }: { room: LaidRoom; grid: THREE.Texture }) {
  const tex = useMemo(() => {
    const t = grid.clone();
    t.needsUpdate = true;
    t.repeat.set(Math.max(1, Math.round(room.w)), Math.max(1, Math.round(room.d)));
    return t;
  }, [grid, room.w, room.d]);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh geometry={SHARED.plane} rotation={[-Math.PI / 2, 0, 0]} position={[room.x, 0.11, room.z]} scale={[room.w - 0.04, room.d - 0.04, 1]} receiveShadow>
      <meshStandardMaterial color={TINT_HEX[room.spec.tint]} map={tex} roughness={0.95} />
    </mesh>
  );
}

/** Low white walls with thick caps; door gaps in the front wall + partitions. */
function Walls({ def, layout }: { def: OfficeDef; layout: FloorLayout }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const segs = useMemo(() => {
    const { w, d } = def.site;
    const t = 0.16;
    const H = WALL_HEIGHT_M;
    const out: { x: number; z: number; sx: number; sz: number }[] = [];
    const door = 1.1;
    // back + sides
    out.push({ x: 0, z: -d / 2, sx: w, sz: t });
    out.push({ x: -w / 2, z: 0, sx: t, sz: d });
    out.push({ x: w / 2, z: 0, sx: t, sz: d });
    // front wall with a door per room (ground floor = street door into the first room)
    for (const r of layout.rooms) {
      const left = r.x - r.w / 2;
      const right = r.x + r.w / 2;
      const gapL = r.x - door / 2;
      const gapR = r.x + door / 2;
      if (gapL - left > 0.05) out.push({ x: (left + gapL) / 2, z: d / 2, sx: gapL - left, sz: t });
      if (right - gapR > 0.05) out.push({ x: (gapR + right) / 2, z: d / 2, sx: right - gapR, sz: t });
      // partition on the room's west edge, with a corridor-side door gap
      const pz0 = -d / 2;
      const pz1 = d / 2 - 1.4;
      out.push({ x: left, z: (pz0 + pz1) / 2, sx: t, sz: pz1 - pz0 });
    }
    // core front
    out.push({ x: -w / 2 + CORE_W / 2, z: layout.core.z + layout.core.d / 2, sx: CORE_W * 0.3, sz: t });
    return out.map((s) => ({ ...s, y: H / 2 }));
  }, [def.site, layout]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    segs.forEach((s, i) => {
      o.position.set(s.x, 0.1 + s.y, s.z);
      o.scale.set(s.sx, WALL_HEIGHT_M, s.sz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [segs]);
  const caps = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = caps.current;
    if (!m) return;
    const o = new THREE.Object3D();
    segs.forEach((s, i) => {
      o.position.set(s.x, 0.1 + WALL_HEIGHT_M + 0.03, s.z);
      o.scale.set(s.sx + 0.06, 0.06, s.sz + 0.06);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [segs]);
  return (
    <>
      <instancedMesh ref={ref} args={[SHARED.box, undefined, segs.length]} castShadow receiveShadow>
        <meshStandardMaterial color="#fbfbfd" roughness={0.85} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[SHARED.box, undefined, segs.length]}>
        <meshStandardMaterial color="#e9e9f0" roughness={0.7} />
      </instancedMesh>
    </>
  );
}

function Furniture({ layout }: { layout: FloorLayout }) {
  const parts = useMemo(() => layout.rooms.flatMap((r) => furnitureFor(r)), [layout]);
  const solid = useMemo(() => parts.filter((p) => !p.glow), [parts]);
  const glow = useMemo(() => parts.filter((p) => p.glow), [parts]);
  return (
    <>
      <PartBatch parts={solid} />
      <PartBatch parts={glow} emissive />
    </>
  );
}

function PartBatch({ parts, emissive }: { parts: Part[]; emissive?: boolean }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    parts.forEach((p, i) => {
      o.position.set(p.x, 0.1 + p.y, p.z);
      o.scale.set(p.sx, p.sy, p.sz);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(p.color));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [parts]);
  if (parts.length === 0) return null;
  return (
    <instancedMesh ref={ref} args={[SHARED.box, undefined, parts.length]} castShadow={!emissive}>
      {emissive ? (
        <meshStandardMaterial color="#ffffff" emissive="#9ad7ff" emissiveIntensity={0.55} roughness={0.3} />
      ) : (
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      )}
    </instancedMesh>
  );
}

// ───────────────────────────────────────────────────── lift ────

function LiftShaft({ def, layouts, viewFloor }: { def: OfficeDef; layouts: FloorLayout[]; viewFloor: number }) {
  const core = layouts[0].core;
  const car = useRef<THREE.Group>(null);
  const doorL = useRef<THREE.Mesh>(null);
  const doorR = useRef<THREE.Mesh>(null);
  const button = useRef<THREE.MeshStandardMaterial>(null);
  const top = (viewFloor + 1) * FLOOR_HEIGHT_M;
  const ldef = useMemo(() => liftDefFor(def), [def]);
  const cx = core.x;
  const cz = core.z;

  useEffect(
    () =>
      registerAmbient(() => {
        const lift = getOfficeState().lifts[def.id];
        if (!lift || !car.current) return;
        const y = carHeightM(lift, ldef);
        car.current.position.y = y;
        car.current.visible = y <= viewFloor * FLOOR_HEIGHT_M + 0.01;
        const open = doorOpen01(lift, ldef);
        if (doorL.current) doorL.current.position.x = -0.35 - open * 0.55;
        if (doorR.current) doorR.current.position.x = 0.35 + open * 0.55;
        if (button.current) button.current.emissiveIntensity = (lift.waiting[viewFloor]?.length ?? 0) > 0 ? 1.6 : 0.15;
      }),
    [def.id, ldef, viewFloor],
  );

  return (
    <group position={[cx, 0, cz]}>
      {/* glass shaft up to the viewed floor */}
      <mesh geometry={SHARED.box} position={[0, top / 2, 0]} scale={[1.8, top, 1.8]}>
        <meshStandardMaterial color="#bfe3f0" transparent opacity={0.22} depthWrite={false} metalness={0.3} roughness={0.1} />
      </mesh>
      {/* steel frame posts */}
      {[
        [-0.9, -0.9],
        [0.9, -0.9],
        [-0.9, 0.9],
        [0.9, 0.9],
      ].map(([x, z], i) => (
        <mesh key={i} geometry={SHARED.box} position={[x, top / 2, z]} scale={[0.08, top, 0.08]}>
          <meshStandardMaterial color="#7f8c99" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* car */}
      <group ref={car}>
        <mesh geometry={SHARED.box} position={[0, 0.16, 0]} scale={[1.5, 0.1, 1.5]}>
          <meshStandardMaterial color="#dfe6e9" />
        </mesh>
        <mesh geometry={SHARED.box} position={[0, 1.2, -0.72]} scale={[1.5, 2.2, 0.05]}>
          <meshStandardMaterial color="#b2bec3" metalness={0.5} roughness={0.3} />
        </mesh>
        <mesh ref={doorL} geometry={SHARED.box} position={[-0.35, 1.2, 0.76]} scale={[0.7, 2.2, 0.04]}>
          <meshStandardMaterial color="#95a5a6" metalness={0.7} roughness={0.25} transparent opacity={0.85} />
        </mesh>
        <mesh ref={doorR} geometry={SHARED.box} position={[0.35, 1.2, 0.76]} scale={[0.7, 2.2, 0.04]}>
          <meshStandardMaterial color="#95a5a6" metalness={0.7} roughness={0.25} transparent opacity={0.85} />
        </mesh>
      </group>
      {/* call button on the viewed floor */}
      <mesh geometry={SHARED.box} position={[0.98, viewFloor * FLOOR_HEIGHT_M + 1.1, 0.95]} scale={[0.08, 0.14, 0.04]}>
        <meshStandardMaterial ref={button} color="#ffe082" emissive="#ffca28" emissiveIntensity={0.15} />
      </mesh>
      {/* floor indicator pill above the door */}
      <sprite position={[0, viewFloor * FLOOR_HEIGHT_M + 2.75, 1.0]} scale={[0.9, 0.24, 1]}>
        <spriteMaterial map={pillTexture(viewFloor === 0 ? 'Lift · G' : `Lift · ${viewFloor}`)} depthWrite={false} transparent />
      </sprite>
    </group>
  );
}

function Stairs({ def, viewFloor }: { def: OfficeDef; viewFloor: number }) {
  const { w, d } = def.site;
  const steps = 8;
  return (
    <group position={[-w / 2 + CORE_W / 2, viewFloor * FLOOR_HEIGHT_M, -d / 2 + 1.4]}>
      {Array.from({ length: steps }).map((_, i) => (
        <mesh key={i} geometry={SHARED.box} position={[0, 0.1 + (i * 0.2 + 0.1), -1.2 + i * 0.3]} scale={[1.6, 0.2, 0.3]}>
          <meshStandardMaterial color="#d9d0c0" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────── people ────

interface Walker {
  x: number;
  z: number;
  y: number;
  yaw: number;
  phase: number;
  visible: boolean;
}

function People({ def, layouts, viewFloor }: { def: OfficeDef; layouts: FloorLayout[]; viewFloor: number }) {
  const n = def.staffNames.length;
  const total = n + MAX_VISITORS;
  const body = useRef<THREE.InstancedMesh>(null);
  const head = useRef<THREE.InstancedMesh>(null);
  const legL = useRef<THREE.InstancedMesh>(null);
  const legR = useRef<THREE.InstancedMesh>(null);
  const ring = useRef<THREE.Mesh>(null);
  const pills = useRef<(THREE.Sprite | null)[]>([]);
  const walkers = useRef<Walker[]>(
    Array.from({ length: total }, () => ({ x: 0, z: 0, y: 0, yaw: 0, phase: Math.random() * 6, visible: false })),
  );
  const ldef = useMemo(() => liftDefFor(def), [def]);
  const core = layouts[0].core;

  // per-instance colours once
  useLayoutEffect(() => {
    const c = new THREE.Color();
    for (let i = 0; i < total; i++) {
      const isStaff = i < n;
      const key = isStaff ? def.staffNames[i] : `${def.id}-v${i}`;
      body.current?.setColorAt(i, c.set(isStaff ? SHIRTS[hashIndex(key, SHIRTS.length)] : VISITOR_SHIRTS[i % VISITOR_SHIRTS.length]));
      head.current?.setColorAt(i, c.set(SKINS[hashIndex(key + 's', SKINS.length)]));
    }
    if (body.current?.instanceColor) body.current.instanceColor.needsUpdate = true;
    if (head.current?.instanceColor) head.current.instanceColor.needsUpdate = true;
  }, [def, n, total]);

  useEffect(() => {
    const o = new THREE.Object3D();
    const hide = new THREE.Matrix4().makeScale(0, 0, 0);
    const baseY = viewFloor * FLOOR_HEIGHT_M + 0.1;
    return registerAmbient((dt) => {
      const st = getOfficeState();
      const sim = st.sims[def.id];
      const lift = st.lifts[def.id];
      const reduced = isReducedMotion();
      const W = walkers.current;
      const carY = lift ? carHeightM(lift, ldef) : 0;

      for (let i = 0; i < total; i++) {
        const w = W[i];
        let tx = w.x;
        let tz = w.z;
        let ty = baseY;
        let sitting = false;
        let visible = false;
        let snap = false;
        if (i < n) {
          const s = sim.staff[i];
          const tr = st.transit[s.id];
          if (tr) {
            if (tr.stage === 'waiting' && tr.from === viewFloor) {
              // queue in the lift lobby in front of the core
              tx = core.x + 0.4 * ((i % 3) - 1);
              tz = core.z + core.d / 2 + 0.5 + Math.floor(i / 3) * 0.45;
              visible = true;
            } else if (tr.stage === 'riding' && Math.abs(carY - viewFloor * FLOOR_HEIGHT_M) < 0.05) {
              tx = core.x + 0.35 * ((i % 3) - 1);
              tz = core.z + 0.3 * ((i % 2) - 0.5);
              ty = carY + 0.1;
              visible = true;
              snap = true;
            }
          } else if (s.roomId) {
            const room = findRoom(layouts, s.roomId);
            if (room && room.floor === viewFloor) {
              const seats = roomSeats(room);
              const seat = seats[s.seat % seats.length];
              tx = seat.x;
              tz = seat.z;
              sitting = s.activity === 'working' || s.activity === 'planning' || s.activity === 'meeting';
              visible = true;
            }
          }
        } else {
          // visitors: queue / sit in the hall or counter room on G
          const vi = i - n;
          if (viewFloor === 0 && vi < Math.min(MAX_VISITORS, sim.visitorsInside)) {
            const room =
              layouts[0].rooms.find((r) => r.spec.kind === 'hall') ??
              layouts[0].rooms.find((r) => r.spec.kind === 'counter' || r.spec.kind === 'lobby');
            if (room) {
              const seats = roomSeats(room);
              const s = seats[vi % seats.length];
              tx = s.x + (vi >= seats.length ? 0.3 : 0);
              tz = s.z + (vi >= seats.length ? 0.4 : 0);
              sitting = room.spec.kind === 'hall' && vi < seats.length;
              visible = true;
            }
          }
        }

        if (!visible) {
          w.visible = false;
          body.current?.setMatrixAt(i, hide);
          head.current?.setMatrixAt(i, hide);
          legL.current?.setMatrixAt(i, hide);
          legR.current?.setMatrixAt(i, hide);
          const p = pills.current[i];
          if (p) p.visible = false;
          continue;
        }
        if (!w.visible || snap) {
          w.x = tx;
          w.z = tz;
        }
        w.visible = true;
        const dx = tx - w.x;
        const dz = tz - w.z;
        const dist = Math.hypot(dx, dz);
        const moving = dist > 0.05;
        if (moving) {
          const stepLen = Math.min(dist, WALK_MPS * dt);
          w.x += (dx / dist) * stepLen;
          w.z += (dz / dist) * stepLen;
          w.yaw = Math.atan2(dx, dz);
          w.phase += dt * 7;
        } else if (sitting) {
          w.yaw = Math.PI; // face the desk (−z)
        }
        w.y = ty;
        const swing = moving && !reduced ? Math.sin(w.phase) * 0.38 : 0;
        const bob = moving && !reduced ? Math.abs(Math.sin(w.phase)) * 0.04 : 0;
        const sitDrop = sitting && !moving ? 0.28 : 0;

        o.rotation.set(0, w.yaw, 0);
        o.scale.set(1, 1, 1);
        o.position.set(w.x, w.y + 0.85 - sitDrop + bob, w.z);
        o.updateMatrix();
        body.current?.setMatrixAt(i, o.matrix);
        o.position.set(w.x, w.y + 1.32 - sitDrop + bob, w.z);
        o.updateMatrix();
        head.current?.setMatrixAt(i, o.matrix);
        for (const [mesh, side] of [
          [legL.current, -1],
          [legR.current, 1],
        ] as const) {
          if (!mesh) continue;
          const lx = Math.cos(w.yaw) * 0.09 * side;
          const lz = -Math.sin(w.yaw) * 0.09 * side;
          o.position.set(w.x + lx, w.y + 0.25 + (sitDrop ? 0.1 : 0), w.z + lz);
          o.rotation.set(sitDrop ? -Math.PI / 2.4 : swing * side, w.yaw, 0, 'YXZ');
          o.updateMatrix();
          mesh.setMatrixAt(i, o.matrix);
        }
        const p = pills.current[i];
        if (p) {
          p.visible = true;
          p.position.set(w.x, w.y + 1.85 - sitDrop, w.z);
        }
      }
      for (const m of [body.current, head.current, legL.current, legR.current]) if (m) m.instanceMatrix.needsUpdate = true;

      // selection ring
      if (ring.current) {
        const idx = sim.staff.findIndex((s) => s.id === st.selectedStaffId);
        const w = idx >= 0 ? W[idx] : null;
        ring.current.visible = !!w && w.visible;
        if (w) ring.current.position.set(w.x, w.y + 0.03, w.z);
      }
    });
  }, [def, layouts, viewFloor, n, total, ldef, core]);

  const onTap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id == null || id >= n) return;
    selectOffice(def.id);
    selectStaff(getOfficeState().sims[def.id].staff[id].id);
  };

  return (
    <group>
      <instancedMesh ref={body} args={[SHARED.body, undefined, total]} onClick={onTap} frustumCulled={false}>
        <meshStandardMaterial color="#ffffff" roughness={0.8} />
      </instancedMesh>
      <instancedMesh ref={head} args={[SHARED.head, undefined, total]} frustumCulled={false}>
        <meshStandardMaterial color="#ffffff" roughness={0.7} />
      </instancedMesh>
      <instancedMesh ref={legL} args={[SHARED.leg, undefined, total]} frustumCulled={false}>
        <meshStandardMaterial color="#2d3436" roughness={0.9} />
      </instancedMesh>
      <instancedMesh ref={legR} args={[SHARED.leg, undefined, total]} frustumCulled={false}>
        <meshStandardMaterial color="#2d3436" roughness={0.9} />
      </instancedMesh>
      <mesh ref={ring} geometry={SHARED.ring} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
        <meshBasicMaterial color="#7c4dff" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {def.staffNames.map((name, i) => (
        <sprite
          key={name}
          ref={(s) => {
            pills.current[i] = s;
          }}
          scale={[0.95, 0.24, 1]}
          visible={false}
        >
          <spriteMaterial map={pillTexture(name, SHIRTS[hashIndex(name, SHIRTS.length)])} depthWrite={false} transparent />
        </sprite>
      ))}
    </group>
  );
}
