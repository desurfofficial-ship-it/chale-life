/**
 * Signs.tsx — shop-front signage as canvas-textured planes.
 *
 * Invented names only — no real brands or trademarks on signs (per spec).
 * Each sign is one small mesh with a 512×128 CanvasTexture (~4 draw calls
 * total). No <Html> is used anywhere in the world, so the orthographic
 * camera contract is respected by construction.
 *
 * Owned by Agent 3 (World & Art).
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { WAAKYE_KIOSK, PROVISIONS, CHOP_BAR, TROTRO_STOP } from './layout';

interface SignProps {
  position: [number, number, number];
  rotationY?: number;
  width: number;
  height: number;
  bg: string;
  fg: string;
  text: string;
  sub?: string;
  twoSided?: boolean;
}

function makeSignTexture({ bg, fg, text, sub }: Omit<SignProps, 'position' | 'rotationY' | 'width' | 'height' | 'twoSided'>): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = sub ? 160 : 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const mainSize = text.length > 16 ? 52 : 64;
  if (sub) {
    ctx.font = `bold ${mainSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(text, canvas.width / 2, sub ? 56 : canvas.height / 2);
    ctx.font = `600 40px system-ui, -apple-system, sans-serif`;
    ctx.fillText(sub, canvas.width / 2, 116);
  } else {
    ctx.font = `bold ${mainSize}px system-ui, -apple-system, sans-serif`;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function Sign(props: SignProps) {
  const { position, rotationY, width, height, bg, fg, text, sub, twoSided } = props;
  const texture = useMemo(
    () => makeSignTexture({ bg, fg, text, sub }),
    [bg, fg, text, sub],
  );
  return (
    <mesh position={position} rotation={[0, rotationY ?? 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.8}
        side={twoSided ? THREE.DoubleSide : THREE.FrontSide}
      />
    </mesh>
  );
}

export function Signs() {
  const kiosk = WAAKYE_KIOSK.footprint;
  return (
    <group name="starter-signs">
      <Sign
        position={[(kiosk.x0 + kiosk.x1) / 2, 2.02, kiosk.z1 + 0.06]}
        width={2.6}
        height={0.62}
        bg="#f2c11f"
        fg="#26210a"
        text="AUNTY BA"
        sub="WAAKYE"
      />
      <Sign
        position={[(PROVISIONS.footprint.x0 + PROVISIONS.footprint.x1) / 2, 2.85, PROVISIONS.footprint.z1 + 0.06]}
        width={5.2}
        height={0.62}
        bg="#26586b"
        fg="#f4efe2"
        text="MAAME EFFIA PROVISIONS"
      />
      <Sign
        position={[(CHOP_BAR.footprint.x0 + CHOP_BAR.footprint.x1) / 2, 2.7, CHOP_BAR.footprint.z0 - 0.06]}
        rotationY={Math.PI}
        width={5.2}
        height={0.62}
        bg="#6e3b1e"
        fg="#f6ecd8"
        text="MAAME ESI CHOP BAR"
      />
      <Sign
        position={[TROTRO_STOP.sign.x, 2.35, TROTRO_STOP.sign.z]}
        rotationY={-Math.PI / 2}
        width={1.3}
        height={0.5}
        bg="#f2c11f"
        fg="#26210a"
        text="TROTRO STOP"
        twoSided
      />
    </group>
  );
}
