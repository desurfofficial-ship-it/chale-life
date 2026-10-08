/**
 * InstancedProps.tsx — repeated props rendered via THREE.InstancedMesh:
 * one draw call per prop type, per-instance colour tinting.
 *
 * Owned by Agent 3 (World & Art).
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../palette';
import {
  CHAIR_GEOMETRY,
  NEEM_CANOPY_GEOMETRY,
  NEEM_TRUNK_GEOMETRY,
  PALM_CROWN_GEOMETRY,
  PALM_TRUNK_GEOMETRY,
  UMBRELLA_CANOPY_GEOMETRY,
  UMBRELLA_POLE_GEOMETRY,
  UTILITY_POLE_GEOMETRY,
} from './prototypes';
import { PLASTIC_CHAIRS, NEEM_TREES, PALM_TREES, UMBRELLAS, UTILITY_POLES } from './layout';

interface Placement {
  x: number;
  y: number;
  z: number;
  ry: number;
  s: number;
  tint: string;
}

interface InstancedPropProps {
  geometry: THREE.BufferGeometry;
  placements: Placement[];
}

const _matrix = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _pos = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();

function InstancedProp({ geometry, placements }: InstancedPropProps) {
  const ref = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    placements.forEach((p, i) => {
      _euler.set(0, p.ry, 0);
      _quat.setFromEuler(_euler);
      _pos.set(p.x, p.y, p.z);
      _scale.set(p.s, p.s, p.s);
      _matrix.compose(_pos, _quat, _scale);
      mesh.setMatrixAt(i, _matrix);
      _color.set(p.tint);
      mesh.setColorAt(i, _color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [placements]);

  return (
    <instancedMesh
      ref={ref}
      args={[geometry, undefined, placements.length]}
      castShadow
      receiveShadow
    >
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0} />
    </instancedMesh>
  );
}

export function InstancedProps() {
  const chairs = useMemo<Placement[]>(
    () =>
      PLASTIC_CHAIRS.map((c) => ({
        x: c.x,
        y: 0,
        z: c.z,
        ry: c.ry,
        s: 1,
        tint: PALETTE[c.color],
      })),
    [],
  );

  const neemTrunks = useMemo<Placement[]>(
    () => NEEM_TREES.map((t) => ({ x: t.x, y: 0, z: t.z, ry: 0, s: t.s, tint: '#ffffff' })),
    [],
  );
  const neemCanopies = useMemo<Placement[]>(
    () =>
      NEEM_TREES.map((t, i) => ({
        x: t.x,
        y: 0,
        z: t.z,
        ry: i * 1.3,
        s: t.s,
        tint: [PALETTE.canopy, PALETTE.canopyDark, PALETTE.canopyLight][i % 3],
      })),
    [],
  );

  const palmTrunks = useMemo<Placement[]>(
    () => PALM_TREES.map((t, i) => ({ x: t.x, y: 0, z: t.z, ry: i * 0.9, s: t.s, tint: '#ffffff' })),
    [],
  );
  const palmCrowns = useMemo<Placement[]>(
    () =>
      PALM_TREES.map((t, i) => ({
        x: t.x,
        y: 0,
        z: t.z,
        ry: i * 0.7,
        s: t.s,
        tint: i % 2 === 0 ? PALETTE.palm : PALETTE.canopyDark,
      })),
    [],
  );

  const poles = useMemo<Placement[]>(
    () => UTILITY_POLES.map((p) => ({ x: p.x, y: 0, z: p.z, ry: 0, s: 1, tint: '#ffffff' })),
    [],
  );

  const umbrellaPoles = useMemo<Placement[]>(
    () => UMBRELLAS.map((u) => ({ x: u.x, y: 0, z: u.z, ry: 0, s: 1, tint: '#ffffff' })),
    [],
  );
  const umbrellaCanopies = useMemo<Placement[]>(
    () =>
      UMBRELLAS.map((u) => ({
        x: u.x,
        y: 0,
        z: u.z,
        ry: 0.4,
        s: 1,
        tint: PALETTE[u.color],
      })),
    [],
  );

  return (
    <group name="starter-props-instanced">
      <InstancedProp geometry={CHAIR_GEOMETRY} placements={chairs} />
      <InstancedProp geometry={NEEM_TRUNK_GEOMETRY} placements={neemTrunks} />
      <InstancedProp geometry={NEEM_CANOPY_GEOMETRY} placements={neemCanopies} />
      <InstancedProp geometry={PALM_TRUNK_GEOMETRY} placements={palmTrunks} />
      <InstancedProp geometry={PALM_CROWN_GEOMETRY} placements={palmCrowns} />
      <InstancedProp geometry={UTILITY_POLE_GEOMETRY} placements={poles} />
      <InstancedProp geometry={UMBRELLA_POLE_GEOMETRY} placements={umbrellaPoles} />
      <InstancedProp geometry={UMBRELLA_CANOPY_GEOMETRY} placements={umbrellaCanopies} />
    </group>
  );
}
