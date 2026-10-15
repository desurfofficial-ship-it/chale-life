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
