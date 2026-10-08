/**
 * geometry.ts — merge simple primitives into ONE vertex-coloured geometry.
 *
 * The whole static block (ground, roads, drains, buildings, walls) is merged
 * into a single mesh: 1 draw call for the entire architecture. Per-vertex
 * colours replace per-mesh materials, which is what keeps the phone budget
 * (< 150 draw calls) trivially met.
 *
 * Owned by Agent 3 (World & Art).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface BaseSpec {
  /** Position (metres). */
  pos: [number, number, number];
  /** Euler rotation (radians). */
  rot?: [number, number, number];
  color: string;
}

export interface BoxSpec extends BaseSpec {
  kind: 'box';
  size: [number, number, number];
}

export interface CylSpec extends BaseSpec {
  kind: 'cyl';
  rTop: number;
  rBot: number;
  h: number;
  seg?: number;
}

export interface ConeSpec extends BaseSpec {
  kind: 'cone';
  r: number;
  h: number;
  seg?: number;
}

export interface IcoSpec extends BaseSpec {
  kind: 'ico';
  r: number;
  detail?: number;
}

export type GeomSpec = BoxSpec | CylSpec | ConeSpec | IcoSpec;

const _matrix = new THREE.Matrix4();
const _euler = new THREE.Euler();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3(1, 1, 1);
const _vec = new THREE.Vector3();
const _color = new THREE.Color();

function makeGeometry(spec: GeomSpec): THREE.BufferGeometry {
  let g: THREE.BufferGeometry;
  switch (spec.kind) {
    case 'box':
      g = new THREE.BoxGeometry(spec.size[0], spec.size[1], spec.size[2]);
      break;
    case 'cyl':
      g = new THREE.CylinderGeometry(spec.rTop, spec.rBot, spec.h, spec.seg ?? 8, 1);
      break;
    case 'cone':
      g = new THREE.ConeGeometry(spec.r, spec.h, spec.seg ?? 8, 1);
      break;
    case 'ico':
      g = new THREE.IcosahedronGeometry(spec.r, spec.detail ?? 1);
      break;
  }
  return g;
}

/**
 * Paint every vertex of a geometry with one colour.
 * `Color.set(hex)` already converts sRGB → linear working space
 * (ColorManagement is on by default in three ≥ r152), so no manual
 * conversion is applied here.
 */
export function paintGeometry(g: THREE.BufferGeometry, color: string): THREE.BufferGeometry {
  const count = g.attributes.position.count;
  _color.set(color);
  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    colors[i * 3] = _color.r;
    colors[i * 3 + 1] = _color.g;
    colors[i * 3 + 2] = _color.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return g;
}

/**
 * Merge a list of primitive specs into a single non-indexed geometry with a
 * colour attribute. Returns null for an empty list.
 */
export function buildMerged(specs: GeomSpec[]): THREE.BufferGeometry | null {
  if (specs.length === 0) return null;
  const parts: THREE.BufferGeometry[] = [];
  for (const spec of specs) {
    let g = makeGeometry(spec);
    // Merge requires uniform attribute layout: drop uvs, force non-indexed.
    g.deleteAttribute('uv');
    if (g.index) g = g.toNonIndexed();
    _euler.set(spec.rot?.[0] ?? 0, spec.rot?.[1] ?? 0, spec.rot?.[2] ?? 0);
    _quat.setFromEuler(_euler);
    _vec.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    _matrix.compose(_vec, _quat, _scale);
    g.applyMatrix4(_matrix);
    paintGeometry(g, spec.color);
    parts.push(g);
  }
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return merged;
}

/**
 * Merge a small prototype (e.g. a whole chair) that is later used as an
 * InstancedMesh source. Instance colours multiply the vertex colours, so the
 * prototype should be painted in whites/greys for tintable parts.
 */
export function buildPrototype(specs: GeomSpec[]): THREE.BufferGeometry {
  const g = buildMerged(specs);
  if (!g) throw new Error('buildPrototype: empty spec list');
  g.computeBoundingSphere();
  return g;
}
