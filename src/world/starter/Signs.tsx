/**
 * Signs.tsx — shop-front signage as canvas-textured planes.
 *
 * Invented names only — no real brands or trademarks on signs (per spec).
 * Each sign is one small mesh with a canvas texture (~4 draw calls total).
 * No <Html> is used anywhere in the world, so the orthographic camera
 * contract is respected by construction.
 *
 * Text fitting (W-002): the canvas is sized to the plane's physical aspect
 * ratio (height fixed at 128/160 px), and every line is fitted with
 * ctx.measureText — the font shrinks until the line fits the canvas width
 * minus 4% padding per side. This replaces the old fixed font sizes, which
 * clipped long names ("MAAME EFFIA PROVISIO…") on wide boards.
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

interface TextureSpec {
  bg: string;
  fg: string;
  text: string;
  sub?: string;
  /** Physical width / height of the sign plane — canvas matches it. */
  aspect: number;
}

/** Largest font size (px) whose rendered width fits `maxWidth`, shrinking from `capPx`. */
function fitFont(ctx: CanvasRenderingContext2D, weight: string, capPx: number, maxWidth: number, text: string): number {
  let size = capPx;
  for (; size > 9; size -= 2) {
    ctx.font = `${weight} ${size}px system-ui, -apple-system, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
  }
  return size;
}

function makeSignTexture({ bg, fg, text, sub, aspect }: TextureSpec): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.height = sub ? 160 : 128;
  canvas.width = Math.min(2048, Math.max(256, Math.round(canvas.height * aspect)));
  const ctx = canvas.getContext('2d')!;
  const pad = Math.round(canvas.width * 0.04); // 4% breathing room per side
  const usable = canvas.width - pad * 2;

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = fg;
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, canvas.width - 12, canvas.height - 12);
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  if (sub) {
    fitFont(ctx, 'bold', 64, usable, text);
    ctx.fillText(text, canvas.width / 2, 56);
    fitFont(ctx, '600', 40, usable, sub);
    ctx.fillText(sub, canvas.width / 2, 116);
  } else {
    fitFont(ctx, 'bold', 64, usable, text);
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
    () => makeSignTexture({ bg, fg, text, sub, aspect: width / height }),
    [bg, fg, text, sub, width, height],
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
        position={[(kiosk.x0 + kiosk.x1) / 2, 2.02, kiosk.z1 + 0.1]}
        width={2.6}
        height={0.62}
        bg="#f2c11f"
        fg="#26210a"
        text="DAAVI"
        sub="WAAKYE"
      />
      <Sign
        position={[(PROVISIONS.footprint.x0 + PROVISIONS.footprint.x1) / 2, 2.85, PROVISIONS.footprint.z1 + 0.06]}
        width={7.2}
        height={0.62}
        bg="#26586b"
        fg="#f4efe2"
        text="MAAME EFFIA PROVISIONS"
      />
      <Sign
        position={[(CHOP_BAR.footprint.x0 + CHOP_BAR.footprint.x1) / 2, 2.7, CHOP_BAR.footprint.z0 - 0.06]}
        rotationY={Math.PI}
        width={6.6}
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
