/**
 * Wires.tsx — sagging overhead power lines between the utility poles.
 * A single LineSegments draw (1 call for the whole wire network).
 *
 * Owned by Agent 3 (World & Art).
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../palette';
import { WIRE_SPANS } from './layout';

const WIRE_OFFSETS_Z = [-0.45, 0, 0.45]; // across the crossarm
const WIRE_Y = 7.0; // insulator height
const SAG = 0.55;
const SAMPLES = 10;

function sampleSpan(from: THREE.Vector3, to: THREE.Vector3, out: number[]) {
  const mid = from.clone().lerp(to, 0.5);
  mid.y -= SAG;
  const curve = new THREE.QuadraticBezierCurve3(from, mid, to);
  const pts = curve.getPoints(SAMPLES);
  for (let i = 0; i < pts.length - 1; i++) {
    out.push(pts[i].x, pts[i].y, pts[i].z, pts[i + 1].x, pts[i + 1].y, pts[i + 1].z);
  }
}

export function Wires() {
  const geometry = useMemo(() => {
    const data: number[] = [];
    for (const span of WIRE_SPANS) {
      for (const oz of WIRE_OFFSETS_Z) {
        sampleSpan(
          new THREE.Vector3(span.from.x, WIRE_Y, span.from.z + oz),
          new THREE.Vector3(span.to.x, WIRE_Y, span.to.z + oz),
          data,
        );
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(data, 3));
    return g;
  }, []);

  return (
    <lineSegments name="starter-wires" geometry={geometry}>
      <lineBasicMaterial color={PALETTE.wire} toneMapped={false} />
    </lineSegments>
  );
}
