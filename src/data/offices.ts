/**
 * O-001 — World-run offices (pure data).
 *
 * Ownership rule (whole game): every business is 'world' | 'employer' |
 * 'player'. Offices here are world-run NPC businesses; one (the tech hub)
 * also hires the player. Players only ever own FOR SALE plots.
 *
 * Each office re-uses the footprint of a building that already stands on the
 * map (so the captured colliders stay valid — see `site.replaces`). Rooms are
 * declared per floor; their rectangles are laid out by rules/office.ts
 * (layoutFloor) so the data stays short and the geometry stays testable.
 *
 * No store, no three.js, no React.
 */

export type Ownership = 'world' | 'employer' | 'player';

export type OfficeKind = 'bank' | 'law' | 'tech' | 'callcentre' | 'radio' | 'lands';

/** What a room is for — drives furniture + what NPCs do there. */
export type RoomKind =
  | 'lobby' // lift / stair lobby + reception
  | 'hall' // banking hall / waiting hall (queue + chairs)
  | 'counter' // tellers / service counters
  | 'desks' // open-plan desks
  | 'booths' // call-centre headset booths
  | 'private' // manager / partner / editor / director office
  | 'meeting' // boardroom / meeting / training
  | 'review' // review / approval / supervisor station
  | 'break' // canteen / kitchenette / green room
  | 'vault'
  | 'server'
  | 'records' // filing / records shelves
  | 'studio'; // on-air studio + control room

export type Tint = 'lilac' | 'mint' | 'cream' | 'pink' | 'sky' | 'beige' | 'grey';

/** Soft pastel floor tints (tweet look). */
export const TINT_HEX: Record<Tint, string> = {
  lilac: '#e6dcf5',
  mint: '#d8f0e2',
  cream: '#f6edd8',
  pink: '#f7dbe2',
  sky: '#d9e9f7',
  beige: '#efe3d2',
  grey: '#e6e6ea',
};

export interface RoomSpec {
  readonly id: string;
  readonly label: string;
  readonly kind: RoomKind;
  readonly tint: Tint;
  /** Seats / work spots NPCs can occupy. */
  readonly seats: number;
}

export interface FloorSpec {
  /** 0 = ground (G). */
  readonly level: number;
  readonly rooms: readonly RoomSpec[];
}

/** One stage of an office's work loop: where it happens and how long. */
export interface PipelineStage {
  readonly stage: string;
  readonly roomKind: RoomKind;
  /** Game minutes this stage takes at base skill. */
  readonly minutes: number;
  /** Which role does it (any staff with this role). */
  readonly role: string;
}

export interface ScheduledEvent {
  readonly id: string;
  readonly label: string;
  /** Game hour it starts (0–23, may be fractional). */
  readonly hour: number;
  readonly durationMinutes: number;
  readonly roomKind: RoomKind;
  /** Optional: only on the last N days of a 30-day month (month-end). */
  readonly monthEndOnly?: boolean;
}

export interface OfficeSite {
  /** World centre of the footprint (m). */
  readonly x: number;
  readonly z: number;
  /** Footprint (m) — same as the building it replaces. */
  readonly w: number;
  readonly d: number;
  /** Yaw (rad) of the front face. */
  readonly yaw: number;
  /** The existing building whose footprint/colliders this office takes over. */
  readonly replaces: string;
  readonly district: string;
}

export interface OfficeDef {
  readonly id: string;
  readonly name: string;
  readonly kind: OfficeKind;
  readonly ownership: Ownership;
  readonly site: OfficeSite;
  readonly floors: readonly FloorSpec[];
  readonly hasLift: boolean;
  /** Lift car capacity (people) when hasLift. */
  readonly liftCapacity: number;
  readonly openHour: number;
  readonly closeHour: number;
  /** Lunch window start hour (1 h long). */
  readonly lunchHour: number;
  /** Fraction of staff who walk out to nearby food spots at lunch. */
  readonly lunchOutRatio: number;
  readonly roles: readonly string[];
  readonly staffNames: readonly string[];
  readonly pipeline: readonly PipelineStage[];
  /** Names of work items flowing through the pipeline. */
  readonly taskNames: readonly string[];
  readonly events: readonly ScheduledEvent[];
  /** Visitors (customers / guests) per open hour — 0 for back offices. */
  readonly visitorsPerHour: number;
  readonly facade: { readonly wall: string; readonly roof: string; readonly sign: string; readonly signBg: string };
}

export const FLOOR_HEIGHT_M = 3.2;
export const WALL_HEIGHT_M = 1.2;

const r = (id: string, label: string, kind: RoomKind, tint: Tint, seats: number): RoomSpec => ({
  id,
  label,
  kind,
  tint,
  seats,
});

export const OFFICES: readonly OfficeDef[] = [
  {
    id: 'OFF_GOLD_COAST_BANK',
    name: 'Gold Coast Bank',
    kind: 'bank',
    ownership: 'world',
    site: { x: 163, z: -152, w: 11, d: 10, yaw: 0, replaces: 'NorthReach OfficeBlock "GOLD COAST BANK"', district: 'business-park' },
    floors: [
      { level: 0, rooms: [r('hall', 'Banking hall', 'hall', 'cream', 8), r('tellers', 'Tellers', 'counter', 'mint', 4), r('lobby', 'Lift lobby', 'lobby', 'grey', 2)] },
      { level: 1, rooms: [r('service', 'Customer service', 'desks', 'sky', 4), r('loans', 'Loans office', 'desks', 'lilac', 3)] },
      { level: 2, rooms: [r('vault', 'Vault', 'vault', 'grey', 1), r('manager', "Manager's office", 'review', 'pink', 2)] },
      { level: 3, rooms: [r('canteen', 'Staff canteen', 'break', 'beige', 6), r('board', 'Board room', 'meeting', 'lilac', 6)] },
    ],
    hasLift: true,
    liftCapacity: 6,
    openHour: 8,
    closeHour: 17,
    lunchHour: 12.5,
    lunchOutRatio: 0.4,
    roles: ['teller', 'officer', 'manager', 'guard'],
    staffNames: ['Ama', 'Kofi', 'Esi', 'Yaw', 'Akosua', 'Kwame'],
    pipeline: [
      { stage: 'Requested', roomKind: 'desks', minutes: 20, role: 'officer' },
      { stage: 'Checked', roomKind: 'desks', minutes: 40, role: 'officer' },
      { stage: 'Approval', roomKind: 'review', minutes: 30, role: 'manager' },
      { stage: 'Paid out', roomKind: 'counter', minutes: 10, role: 'teller' },
    ],
    taskNames: ['Kenkey shop loan', 'Trotro owner loan', 'Salary account', 'MoMo float top-up', 'School fees loan'],
    events: [{ id: 'cash_van', label: 'Cash van delivery', hour: 9, durationMinutes: 20, roomKind: 'vault' }],
    visitorsPerHour: 18,
    facade: { wall: '#3d6b52', roof: '#2b4a3a', sign: 'GOLD COAST BANK', signBg: '#9c7a1e' },
  },
  {
    id: 'OFF_ADOM_HOLDINGS',
    name: 'Adom Holdings Law & Accounts',
    kind: 'law',
    ownership: 'world',
    site: { x: 146, z: -152, w: 10, d: 10, yaw: 0, replaces: 'NorthReach OfficeBlock "ADOM HOLDINGS"', district: 'business-park' },
    floors: [
      { level: 0, rooms: [r('reception', 'Reception', 'lobby', 'cream', 2), r('printer', 'Printer corner', 'records', 'grey', 1)] },
      { level: 1, rooms: [r('accts', 'Accountants', 'desks', 'mint', 6), r('filing', 'Filing room', 'records', 'beige', 2)] },
      { level: 2, rooms: [r('paralegal', 'Paralegals', 'desks', 'sky', 4), r('review', 'Review', 'review', 'pink', 2)] },
      { level: 3, rooms: [r('partner1', 'Partner office', 'private', 'lilac', 1), r('partner2', 'Partner office', 'private', 'lilac', 1)] },
      { level: 4, rooms: [r('board', 'Boardroom', 'meeting', 'cream', 8), r('kitchen', 'Kitchenette', 'break', 'beige', 3)] },
    ],
    hasLift: true,
    liftCapacity: 5,
    openHour: 8,
    closeHour: 18,
    lunchHour: 13,
    lunchOutRatio: 0.5,
    roles: ['accountant', 'paralegal', 'partner', 'admin'],
    staffNames: ['Efua', 'Kojo', 'Abena', 'Kwesi', 'Adjoa', 'Nana', 'Selorm'],
    pipeline: [
      { stage: 'Requested', roomKind: 'lobby', minutes: 10, role: 'admin' },
      { stage: 'Drafting', roomKind: 'desks', minutes: 60, role: 'paralegal' },
      { stage: 'Accounts', roomKind: 'desks', minutes: 45, role: 'accountant' },
      { stage: 'Review', roomKind: 'review', minutes: 30, role: 'partner' },
      { stage: 'Filed', roomKind: 'records', minutes: 10, role: 'admin' },
    ],
    taskNames: ['Land title search', 'Company audit', 'Tax return', 'Lease agreement', 'Payroll'],
    events: [
      { id: 'board_meeting', label: 'Boardroom meeting', hour: 11, durationMinutes: 60, roomKind: 'meeting' },
      { id: 'month_end', label: 'Month-end close', hour: 18, durationMinutes: 180, roomKind: 'desks', monthEndOnly: true },
    ],
    visitorsPerHour: 3,
    facade: { wall: '#2f5d7c', roof: '#1f3b57', sign: 'ADOM HOLDINGS', signBg: '#1f3b57' },
  },
  {
    id: 'OFF_KOTOKA_TECH_HUB',
    name: 'Kotoka Tech Hub',
    kind: 'tech',
    ownership: 'employer',
    site: { x: -96, z: -97, w: 12, d: 8, yaw: 0, replaces: 'AirportDistrict Building "apcity-office"', district: 'airport-city' },
    floors: [
      { level: 0, rooms: [r('lead', 'Lead desk', 'review', 'lilac', 2), r('dev', 'Dev room', 'desks', 'mint', 4), r('break', 'Break room', 'break', 'beige', 4)] },
      { level: 1, rooms: [r('design', 'Design room', 'desks', 'sky', 3), r('review', 'Review room', 'review', 'cream', 2), r('approval', 'Approval station', 'meeting', 'pink', 2)] },
    ],
    hasLift: true,
    liftCapacity: 4,
    openHour: 9,
    closeHour: 19,
    lunchHour: 13,
    lunchOutRatio: 0.6,
    roles: ['lead', 'developer', 'designer', 'sales'],
    staffNames: ['Elikem', 'Nhyira', 'Kobby', 'Adwoa', 'Selasi', 'Ekow'],
    pipeline: [
      { stage: 'Requested', roomKind: 'review', minutes: 10, role: 'lead' },
      { stage: 'Planned', roomKind: 'review', minutes: 20, role: 'lead' },
      { stage: 'Working', roomKind: 'desks', minutes: 90, role: 'developer' },
      { stage: 'Review', roomKind: 'review', minutes: 30, role: 'designer' },
      { stage: 'Approval', roomKind: 'meeting', minutes: 15, role: 'lead' },
    ],
    taskNames: ['Website job', 'MoMo integration', 'School portal', 'Logo design', 'Mobile app fix'],
    events: [{ id: 'standup', label: 'Stand-up', hour: 9.5, durationMinutes: 15, roomKind: 'meeting' }],
    visitorsPerHour: 1,
    facade: { wall: '#f4f1ea', roof: '#54396b', sign: 'KOTOKA TECH HUB', signBg: '#54396b' },
  },
  {
    id: 'OFF_AKWAABA_TELECOM',
    name: 'Akwaaba Telecom Call Centre',
    kind: 'callcentre',
    ownership: 'world',
    site: { x: 78, z: -95.5, w: 9, d: 9, yaw: 0, replaces: 'AirportDistrict GlassTower (78, −95.5)', district: 'airport-city' },
    floors: [
      { level: 0, rooms: [r('reception', 'Reception', 'lobby', 'cream', 2), r('training', 'Training room', 'meeting', 'sky', 6)] },
      { level: 1, rooms: [r('booths', 'Headset booths', 'booths', 'mint', 8), r('super', 'Supervisor', 'review', 'pink', 1)] },
      { level: 2, rooms: [r('server', 'Server room', 'server', 'grey', 1), r('break', 'Break room', 'break', 'beige', 4)] },
    ],
    hasLift: true,
    liftCapacity: 5,
    openHour: 6,
    closeHour: 22,
    lunchHour: 12,
    lunchOutRatio: 0.3,
    roles: ['agent', 'supervisor', 'technician'],
    staffNames: ['Delali', 'Mawuli', 'Afia', 'Edem', 'Yaa', 'Fiifi', 'Akua'],
    pipeline: [
      { stage: 'Ringing', roomKind: 'booths', minutes: 2, role: 'agent' },
      { stage: 'On call', roomKind: 'booths', minutes: 8, role: 'agent' },
      { stage: 'Escalated', roomKind: 'review', minutes: 6, role: 'supervisor' },
      { stage: 'Resolved', roomKind: 'booths', minutes: 2, role: 'agent' },
    ],
    taskNames: ['Data bundle issue', 'SIM re-registration', 'MoMo reversal', 'Network complaint', 'Bill query'],
    events: [{ id: 'shift_change', label: 'Shift change', hour: 14, durationMinutes: 20, roomKind: 'lobby' }],
    visitorsPerHour: 0,
    facade: { wall: '#2d5a4e', roof: '#1e3d35', sign: 'AKWAABA TELECOM', signBg: '#e8b83a' },
  },
  {
    id: 'OFF_ADOM_FM',
    name: 'Adom FM Radio & Newsroom',
    kind: 'radio',
    ownership: 'world',
    site: { x: 106, z: 0.5, w: 10, d: 8, yaw: 0.03, replaces: 'OxfordOsu ApartmentBlock (106, 0.5)', district: 'osu' },
    floors: [
      { level: 0, rooms: [r('studio', 'On-air studio', 'studio', 'pink', 3), r('control', 'Control room', 'studio', 'grey', 2), r('green', 'Green room', 'break', 'beige', 3)] },
      { level: 1, rooms: [r('news', 'Newsroom', 'desks', 'sky', 5), r('editor', "Editor's office", 'private', 'lilac', 1)] },
    ],
    hasLift: false,
    liftCapacity: 0,
    openHour: 5,
    closeHour: 23,
    lunchHour: 13,
    lunchOutRatio: 0.4,
    roles: ['presenter', 'producer', 'reporter', 'editor'],
    staffNames: ['Kafui', 'Naa', 'Kweku', 'Ewurabena', 'Sena'],
    pipeline: [
      { stage: 'Pitched', roomKind: 'desks', minutes: 15, role: 'reporter' },
      { stage: 'Reporting', roomKind: 'desks', minutes: 60, role: 'reporter' },
      { stage: 'Edited', roomKind: 'private', minutes: 20, role: 'editor' },
      { stage: 'On air', roomKind: 'studio', minutes: 15, role: 'presenter' },
    ],
    taskNames: ['Traffic report', 'Black Stars update', 'Market prices', 'Dumsor news', 'Morning show guest'],
    events: [
      { id: 'news_hour', label: 'News hour', hour: 18, durationMinutes: 60, roomKind: 'studio' },
      { id: 'morning_show', label: 'Morning show', hour: 6, durationMinutes: 180, roomKind: 'studio' },
    ],
    visitorsPerHour: 2,
    facade: { wall: '#efe6da', roof: '#ce1126', sign: 'ADOM FM', signBg: '#ce1126' },
  },
  {
    id: 'OFF_LANDS_PERMITS',
    name: 'Lands & Permits Office',
    kind: 'lands',
    ownership: 'world',
    site: { x: 33, z: -41, w: 16, d: 8, yaw: 0, replaces: 'CBD Building "podium-a" (33, −41)', district: 'cbd' },
    floors: [
      { level: 0, rooms: [r('wait', 'Waiting hall', 'hall', 'cream', 10), r('counters', 'Counters 1–4', 'counter', 'mint', 4), r('records', 'Records', 'records', 'beige', 2)] },
      { level: 1, rooms: [r('clerks', 'Clerks', 'desks', 'sky', 4), r('director', "Director's office", 'private', 'lilac', 1), r('meeting', 'Meeting room', 'meeting', 'pink', 4)] },
    ],
    hasLift: false,
    liftCapacity: 0,
    openHour: 8,
    closeHour: 16,
    lunchHour: 12,
    lunchOutRatio: 0.5,
    roles: ['clerk', 'records officer', 'director'],
    staffNames: ['Opoku', 'Dzifa', 'Mensah', 'Asantewaa', 'Tetteh'],
    pipeline: [
      { stage: 'Ticket', roomKind: 'hall', minutes: 15, role: 'clerk' },
      { stage: 'Counter', roomKind: 'counter', minutes: 10, role: 'clerk' },
      { stage: 'Records', roomKind: 'records', minutes: 25, role: 'records officer' },
      { stage: 'Signed', roomKind: 'private', minutes: 15, role: 'director' },
    ],
    taskNames: ['Building permit', 'Site plan', 'Land search', 'Indenture stamp', 'Business permit'],
    events: [],
    visitorsPerHour: 14,
    facade: { wall: '#f6f1e6', roof: '#7a5a9e', sign: 'LANDS & PERMITS', signBg: '#006b3f' },
  },
];

export function findOffice(id: string): OfficeDef | undefined {
  return OFFICES.find((o) => o.id === id);
}

/** Office jobs the player can take (employer offices only). Shift-based. */
export interface OfficeJobDef {
  readonly id: string;
  readonly title: string;
  readonly officeId: string;
  readonly role: string;
  /** Floor of the player's assigned desk. */
  readonly deskFloor: number;
  readonly shiftStartHour: number;
  readonly shiftHours: number;
  readonly salaryPerShiftGHS: number;
  readonly bonusPerTaskGHS: number;
  readonly minEnergy: number;
  readonly minHunger: number;
  /** Trait gate — met by having ANY of these traits… */
  readonly requiredTraits?: readonly string[];
  /** …OR by working up the ladder: N completed shifts as another job. */
  readonly promotedFrom?: { readonly jobId: string; readonly shifts: number };
  readonly requirementLabel: string;
  /** Energy drained over a full shift. */
  readonly energyCost: number;
}

export const OFFICE_JOBS: readonly OfficeJobDef[] = [
  {
    id: 'OJOB_OFFICE_ASSISTANT',
    title: 'Office Assistant',
    officeId: 'OFF_KOTOKA_TECH_HUB',
    role: 'admin',
    deskFloor: 0,
    shiftStartHour: 9,
    shiftHours: 6,
    salaryPerShiftGHS: 60,
    bonusPerTaskGHS: 5,
    minEnergy: 30,
    minHunger: 20,
    requirementLabel: 'Energy ≥ 30 · Hunger ≥ 20',
    energyCost: 25,
  },
  {
    id: 'OJOB_JUNIOR_DEV',
    title: 'Junior Developer',
    officeId: 'OFF_KOTOKA_TECH_HUB',
    role: 'developer',
    deskFloor: 0,
    shiftStartHour: 9,
    shiftHours: 8,
    salaryPerShiftGHS: 120,
    bonusPerTaskGHS: 15,
    minEnergy: 40,
    minHunger: 30,
    requiredTraits: ['campus', 'hustler'],
    promotedFrom: { jobId: 'OJOB_OFFICE_ASSISTANT', shifts: 3 },
    requirementLabel: 'Energy ≥ 40 · Hunger ≥ 30 · Trait: Campus / Hustler, or 3 shifts as Office Assistant',
    energyCost: 35,
  },
  {
    id: 'OJOB_SALES_REP',
    title: 'Sales Rep',
    officeId: 'OFF_KOTOKA_TECH_HUB',
    role: 'sales',
    deskFloor: 1,
    shiftStartHour: 10,
    shiftHours: 6,
    salaryPerShiftGHS: 80,
    bonusPerTaskGHS: 20,
    minEnergy: 35,
    minHunger: 25,
    requiredTraits: ['hustler', 'party', 'family'],
    promotedFrom: { jobId: 'OJOB_OFFICE_ASSISTANT', shifts: 2 },
    requirementLabel: 'Energy ≥ 35 · Hunger ≥ 25 · Trait: Hustler / Party / Family, or 2 shifts as Office Assistant',
    energyCost: 30,
  },
];

export function findOfficeJob(id: string): OfficeJobDef | undefined {
  return OFFICE_JOBS.find((j) => j.id === id);
}
