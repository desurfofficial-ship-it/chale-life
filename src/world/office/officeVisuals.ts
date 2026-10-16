/**
 * O-001 — Office visuals helpers (three.js only, no React, no store).
 * Shared geometries/materials + cached canvas textures for pills and floor
 * tile grids, so six offices cost a handful of GPU objects.
 */
import * as THREE from 'three';

const pillCache = new Map<string, THREE.CanvasTexture>();

/** White rounded pill with dark text (room names / staff names). */
export function pillTexture(text: string, accent?: string): THREE.CanvasTexture {
  const key = `${text}|${accent ?? ''}`;
  const hit = pillCache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, 256, 64);
  const r = 26;
  g.fillStyle = 'rgba(255,255,255,0.96)';
  g.beginPath();
  g.moveTo(r + 6, 6);
  g.arcTo(250, 6, 250, 58, r);
  g.arcTo(250, 58, 6, 58, r);
  g.arcTo(6, 58, 6, 6, r);
  g.arcTo(6, 6, 250, 6, r);
  g.closePath();
  g.fill();
  g.strokeStyle = 'rgba(30,30,50,0.12)';
  g.lineWidth = 2;
  g.stroke();
  let x = 128;
  if (accent) {
    g.fillStyle = accent;
    g.beginPath();
    g.arc(30, 32, 9, 0, Math.PI * 2);
    g.fill();
    x = 140;
  }
  g.fillStyle = '#2a2a3a';
  g.font = '600 26px Inter, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, x, 33, accent ? 190 : 220);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  pillCache.set(key, t);
  return t;
}

let gridTex: THREE.CanvasTexture | null = null;
/** Faint 1 m tile grid, multiplied over the pastel room tint. */
export function tileGridTexture(): THREE.CanvasTexture {
  if (gridTex) return gridTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  g.fillRect(0, 0, 64, 64);
  g.strokeStyle = 'rgba(80,80,110,0.16)';
  g.lineWidth = 2;
  g.strokeRect(0, 0, 64, 64);
  gridTex = new THREE.CanvasTexture(c);
  gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
  gridTex.colorSpace = THREE.SRGBColorSpace;
  return gridTex;
}

export const SHARED = {
  box: new THREE.BoxGeometry(1, 1, 1),
  plane: new THREE.PlaneGeometry(1, 1),
  body: new THREE.CapsuleGeometry(0.17, 0.42, 3, 8),
  head: new THREE.SphereGeometry(0.15, 10, 8),
  leg: new THREE.BoxGeometry(0.11, 0.42, 0.13),
  ring: new THREE.RingGeometry(0.42, 0.55, 32),
};

/** Shirt colours for NPCs (staff) and visitors. */
export const SHIRTS = ['#3a6ea5', '#c0392b', '#2e8b57', '#8e44ad', '#e67e22', '#16a085', '#d35400', '#2c3e50'];
export const SKINS = ['#5a3825', '#6b4430', '#7a4e35', '#4a2e1f', '#8a5a3c'];
export const VISITOR_SHIRTS = ['#f1c40f', '#e84393', '#00b894', '#fdcb6e', '#74b9ff', '#a29bfe'];

export function hashIndex(s: string, n: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % n;
}

const tagCache = new Map<string, THREE.CanvasTexture>();
/** Canvas size of the floating office tag (aspect used for sprite scale). */
export const OFFICE_TAG_ASPECT = 512 / 152;

/**
 * O-002 — Floating map tag for an office: dark pill with a coloured
 * "OFFICE" badge (brand colour) + the office name, and a pointer notch
 * under it so it reads as a pin above the building. No emoji.
 */
export function officeTagTexture(name: string, accent: string, badge = 'OFFICE'): THREE.CanvasTexture {
  const key = `${name}|${accent}|${badge}`;
  const hit = tagCache.get(key);
  if (hit) return hit;
  const W = 512;
  const H = 152;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, W, H);
  const bodyH = 112;
  const r = 30;
  const x0 = 6;
  const y0 = 6;
  const x1 = W - 6;
  const y1 = y0 + bodyH;
  // body
  g.fillStyle = 'rgba(22,24,36,0.94)';
  g.beginPath();
  g.moveTo(x0 + r, y0);
  g.arcTo(x1, y0, x1, y1, r);
  g.arcTo(x1, y1, x0, y1, r);
  g.arcTo(x0, y1, x0, y0, r);
  g.arcTo(x0, y0, x1, y0, r);
  g.closePath();
  g.fill();
  // pointer notch
  g.beginPath();
  g.moveTo(W / 2 - 18, y1 - 1);
  g.lineTo(W / 2 + 18, y1 - 1);
  g.lineTo(W / 2, H - 4);
  g.closePath();
  g.fill();
  // accent ring
  g.strokeStyle = accent;
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(x0 + r, y0 + 2);
  g.arcTo(x1 - 2, y0 + 2, x1 - 2, y1 - 2, r);
  g.arcTo(x1 - 2, y1 - 2, x0 + 2, y1 - 2, r);
  g.arcTo(x0 + 2, y1 - 2, x0 + 2, y0 + 2, r);
  g.arcTo(x0 + 2, y0 + 2, x1 - 2, y0 + 2, r);
  g.closePath();
  g.stroke();
  // badge
  g.font = '800 24px Inter, Arial, sans-serif';
  const bw = Math.max(110, g.measureText(badge).width + 28);
  g.fillStyle = accent;
  g.beginPath();
  const bx = 22;
  const by = 22;
  const bh = 34;
  g.moveTo(bx + 10, by);
  g.arcTo(bx + bw, by, bx + bw, by + bh, 10);
  g.arcTo(bx + bw, by + bh, bx, by + bh, 10);
  g.arcTo(bx, by + bh, bx, by, 10);
  g.arcTo(bx, by, bx + bw, by, 10);
  g.closePath();
  g.fill();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(badge, bx + bw / 2, by + bh / 2 + 1);
  // name
  g.font = '700 34px Inter, Arial, sans-serif';
  g.textAlign = 'left';
  g.fillStyle = '#ffffff';
  g.fillText(name, 24, 84, W - 48);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 2;
  tagCache.set(key, t);
  return t;
}
