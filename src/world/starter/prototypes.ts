/**
 * prototypes.ts — merged prototype geometries for REPEATED props.
 *
 * Each prototype is instanced with THREE.InstancedMesh (per-instance colour
 * multiplies the prototype's white/grey vertex colours), which keeps repeated
 * props at 1 draw call per prop type — the "instance repeated props" budget
 * rule. Static unique work lives in buildStatic.ts instead.
 *
 * Owned by Agent 3 (World & Art).
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PALETTE } from '../palette';
import { buildMerged, paintGeometry, type GeomSpec } from './geometry';

const P = PALETTE;

function box(size: [number, number, number], pos: [number, number, number], color: string): GeomSpec {
  return { kind: 'box', size, pos, color };
}

function cyl(rTop: number, rBot: number, h: number, pos: [number, number, number], color: string, seg = 8): GeomSpec {
  return { kind: 'cyl', rTop, rBot, h, pos, color, seg };
}

function ico(r: number, pos: [number, number, number], color: string, detail = 1): GeomSpec {
  return { kind: 'ico', r, pos, color, detail };
}

function mergeOrThrow(specs: GeomSpec[]): THREE.BufferGeometry {
  const g = buildMerged(specs);
  if (!g) throw new Error('[world] empty prototype');
  g.computeBoundingSphere();
  return g;
}

// ------------------------------------------------------------ plastics -----
/** Monobloc plastic chair, painted white so instance colour tints it. */
export const CHAIR_GEOMETRY = mergeOrThrow([
  box([0.42, 0.05, 0.44], [0, 0.44, 0], '#ffffff'), // seat
  box([0.42, 0.48, 0.05], [0, 0.72, -0.2], '#ffffff'), // backrest
  box([0.04, 0.42, 0.04], [-0.17, 0.21, -0.17], '#e8e8e8'), // legs
  box([0.04, 0.42, 0.04], [0.17, 0.21, -0.17], '#e8e8e8'),
  box([0.04, 0.42, 0.04], [-0.17, 0.21, 0.17], '#e8e8e8'),
  box([0.04, 0.42, 0.04], [0.17, 0.21, 0.17], '#e8e8e8'),
]);

// --------------------------------------------------------------- neem ------
export const NEEM_TRUNK_GEOMETRY = mergeOrThrow([
  cyl(0.09, 0.15, 1.9, [0, 0.95, 0], P.trunk),
  cyl(0.06, 0.08, 0.8, [0.12, 2.05, 0.05], P.trunk), // fork
]);

/** Three-blob canopy, white so instance colour varies per tree. */
export const NEEM_CANOPY_GEOMETRY = mergeOrThrow([
  ico(1.05, [0, 2.6, 0], '#ffffff'),
  ico(0.8, [0.6, 2.25, 0.35], '#f2f2f2'),
  ico(0.72, [-0.55, 2.35, -0.4], '#e8e8e8'),
]);

// --------------------------------------------------------------- palm ------
export const PALM_TRUNK_GEOMETRY = (() => {
  let g: THREE.BufferGeometry = new THREE.CylinderGeometry(0.07, 0.13, 4.2, 6, 3);
  g.deleteAttribute('uv');
  if (g.index) {
    const ni = g.toNonIndexed();
    g.dispose();
    g = ni;
  }
  // Gentle lean: bend vertices outward along +x the higher they go.
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const t = Math.max(0, y + 2.1) / 4.2;
    pos.setX(i, pos.getX(i) + t * t * 0.55);
  }
  pos.needsUpdate = true;
  g.translate(0, 2.1, 0); // base at y = 0
  paintGeometry(g, P.trunk);
  g.computeBoundingSphere();
  return g;
})();

/** Crown of drooping fronds, white so instance colour tints it. */
export const PALM_CROWN_GEOMETRY = (() => {
  const parts: THREE.BufferGeometry[] = [];
  const frondCount = 8;
  for (let i = 0; i < frondCount; i++) {
    let f: THREE.BufferGeometry = new THREE.ConeGeometry(0.3, 1.9, 4, 1);
    f.deleteAttribute('uv');
    if (f.index) {
      const ni = f.toNonIndexed();
      f.dispose();
      f = ni;
    }
    f.translate(0, 0.95, 0); // base at origin, axis +y
    f.rotateX(Math.PI * 0.62); // droop outward/down (tip below horizon)
    f.rotateY((i / frondCount) * Math.PI * 2);
    paintGeometry(f, i % 2 === 0 ? '#ffffff' : '#ececec');
    parts.push(f);
  }
  const all = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  if (!all) throw new Error('[world] palm crown merge failed');
  all.translate(0.55, 4.15, 0); // crown sits at the leaning trunk top
  all.computeBoundingSphere();
  return all;
})();

// --------------------------------------------------------- utility pole ----
export const UTILITY_POLE_GEOMETRY = mergeOrThrow([
  cyl(0.09, 0.13, 7.5, [0, 3.75, 0], P.pole, 7),
  box([1.5, 0.09, 0.09], [0, 6.95, 0], P.woodDark), // crossarm
  cyl(0.035, 0.035, 0.1, [-0.45, 7.05, 0], P.iron, 6), // insulators
  cyl(0.035, 0.035, 0.1, [0, 7.05, 0], P.iron, 6),
  cyl(0.035, 0.035, 0.1, [0.45, 7.05, 0], P.iron, 6),
]);

// ------------------------------------------------------------ umbrella -----
export const UMBRELLA_POLE_GEOMETRY = mergeOrThrow([
  cyl(0.035, 0.035, 2.3, [0, 1.15, 0], P.wood, 6),
]);

/** Parasol canopy (open cone, painted white so instance colour tints it). */
export const UMBRELLA_CANOPY_GEOMETRY = (() => {
  let g: THREE.BufferGeometry = new THREE.ConeGeometry(1.55, 0.62, 9, 1, true); // open-ended
  g.deleteAttribute('uv');
  if (g.index) {
    const ni = g.toNonIndexed();
    g.dispose();
    g = ni;
  }
  paintGeometry(g, '#ffffff');
  g.translate(0, 2.42, 0);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
})();
