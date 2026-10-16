/**
 * O-002 — Low-poly GLB furniture catalogue for office interiors.
 *
 * Files live under public/models/furniture/ (meshopt, 1 unit = 1 m,
 * bottom-centre origin, +Y up, ONE material with vertex colours). Paths are
 * public-relative (no leading slash) and go through publicUrl() at load time
 * so they resolve under the Pages base path.
 *
 * Orientation of every model as exported (glTF space):
 *  - chairs / sofas: the sitter faces +Z (backrest at −Z)
 *  - desks: the sitter's side is +Z, the monitor sits toward −Z
 *  - reception counters: customer side +Z, staff worktop at −Z
 *  - cabinets / coolers / copiers / whiteboards / lockers: front faces +Z
 *  - partitions: a panel running along X
 *
 * Pure data (no three.js) so tests can import it under node.
 */

export type ModelKind =
  | 'desk'
  | 'chair'
  | 'visitorChair'
  | 'meetingTable'
  | 'reception'
  | 'filing'
  | 'cooler'
  | 'printer'
  | 'whiteboard'
  | 'partition'
  | 'locker'
  | 'plant'
  | 'sofa';

export interface ModelVariant {
  /** public/-relative path, e.g. models/furniture/office/office-desk/office-desk-04.glb */
  readonly file: string;
  /** Footprint width along X (m). */
  readonly w: number;
  /** Footprint depth along Z (m). */
  readonly d: number;
  /** Height (m). */
  readonly h: number;
}

const v = (group: string, arch: string, n: string, w: number, d: number, h: number): ModelVariant => ({
  file: `models/furniture/${group}/${arch}/${arch}-${n}.glb`,
  w,
  d,
  h,
});

/** Dimensions from the low-poly catalogue (w × d × h, metres). */
export const OFFICE_MODELS: Record<ModelKind, readonly ModelVariant[]> = {
  // desks with a monitor on top (all 1.06–1.24 m tall incl. screen)
  desk: [
    v('office', 'office-desk', '00', 1.46, 0.8, 1.21),
    v('office', 'office-desk', '04', 1.17, 0.72, 1.19),
    v('office', 'office-desk', '06', 1.38, 0.75, 1.24),
    v('office', 'office-desk', '09', 1.12, 0.71, 1.06),
  ],
  // swivel task chairs
  chair: [
    v('office', 'office-chair', '00', 0.66, 0.63, 1.02),
    v('office', 'office-chair', '02', 0.65, 0.58, 1.12),
    v('office', 'office-chair', '10', 0.67, 0.64, 0.88),
    v('office', 'office-chair', '12', 0.62, 0.58, 1.03),
  ],
  // four-leg / sled visitor chairs (waiting halls, meeting rooms)
  visitorChair: [
    v('office', 'office-chair', '03', 0.57, 0.56, 0.91),
    v('office', 'office-chair', '08', 0.5, 0.55, 1.04),
    v('office', 'office-chair', '13', 0.54, 0.55, 0.91),
  ],
  meetingTable: [
    v('office', 'meeting-table', '00', 2.93, 1.04, 0.73),
    v('office', 'meeting-table', '08', 2.58, 1.02, 0.73),
    v('office', 'meeting-table', '13', 2.33, 0.99, 0.73),
    v('office', 'meeting-table', '15', 1.83, 1.11, 0.75),
  ],
  reception: [
    v('office', 'reception-counter', '00', 1.66, 0.81, 1.14),
    v('office', 'reception-counter', '05', 1.88, 1.0, 1.12),
    v('office', 'reception-counter', '07', 1.74, 0.7, 1.26),
    v('office', 'reception-counter', '12', 1.95, 0.75, 1.31),
  ],
  filing: [
    v('office', 'filing-cabinet', '00', 0.45, 0.62, 2.06),
    v('office', 'filing-cabinet', '04', 0.46, 0.6, 1.89),
    v('office', 'filing-cabinet', '07', 0.82, 0.56, 1.18),
    v('office', 'filing-cabinet', '16', 0.45, 0.63, 1.28),
  ],
  cooler: [
    v('office', 'water-cooler', '00', 0.41, 0.41, 1.52),
    v('office', 'water-cooler', '02', 0.4, 0.47, 1.65),
    v('office', 'water-cooler', '04', 0.34, 0.42, 1.5),
    v('office', 'water-cooler', '08', 0.36, 0.42, 1.56),
  ],
  printer: [
    v('office', 'printer-copier', '00', 0.59, 0.68, 0.99),
    v('office', 'printer-copier', '02', 0.61, 0.55, 0.97),
    v('office', 'printer-copier', '04', 0.61, 0.66, 0.87),
    v('office', 'printer-copier', '10', 0.59, 0.67, 0.98),
  ],
  // free-standing (wheeled) boards — the cutaway walls are only 1.2 m tall
  whiteboard: [
    v('office', 'whiteboard', '00', 1.52, 0.5, 1.88),
    v('office', 'whiteboard', '05', 1.05, 0.48, 1.72),
    v('office', 'whiteboard', '09', 0.89, 0.49, 1.75),
    v('office', 'whiteboard', '13', 0.81, 0.49, 1.75),
  ],
  partition: [
    v('office', 'office-partition', '05', 1.16, 0.47, 1.4),
    v('office', 'office-partition', '08', 1.26, 0.4, 1.56),
    v('office', 'office-partition', '14', 1.32, 0.43, 1.32),
    v('office', 'office-partition', '18', 1.23, 0.4, 1.86),
  ],
  locker: [
    v('office', 'locker', '00', 0.36, 0.53, 2.04),
    v('office', 'locker', '04', 0.35, 0.47, 1.98),
    v('office', 'locker', '12', 0.32, 0.51, 1.96),
    v('office', 'locker', '16', 0.64, 0.52, 1.83),
  ],
  plant: [
    v('office', 'potted-plant', '00', 0.36, 0.33, 0.87),
    v('office', 'potted-plant', '05', 0.52, 0.54, 0.99),
    v('office', 'potted-plant', '08', 0.61, 0.71, 0.83),
  ],
  sofa: [v('living', 'sofa', '00', 1.74, 0.98, 0.87)],
};

/** Every GLB file the office interiors can request. */
export function allOfficeModelFiles(): string[] {
  const out = new Set<string>();
  for (const list of Object.values(OFFICE_MODELS)) for (const m of list) out.add(m.file);
  return [...out];
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Deterministic variant for an office (+ optional salt such as a room id). */
export function pickModel(kind: ModelKind, officeId: string, salt = ''): ModelVariant {
  const list = OFFICE_MODELS[kind];
  return list[hash(`${officeId}:${kind}:${salt}`) % list.length];
}
