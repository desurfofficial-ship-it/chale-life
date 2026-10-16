/**
 * Home zones (rooms) unlocked by housing tier.
 * Starter (single_room) only has the one chamber — no Living / Kitchen /
 * Dining / Bath chips until the player upgrades.
 *
 * Devices (lamps, AC, …) are listed per zone like House Control tiles;
 * locked zones show a lock + upgrade hint instead of controls.
 */

export type ZoneId =
  | 'room'
  | 'living'
  | 'bedroom'
  | 'kitchen'
  | 'dining'
  | 'bath'
  | 'washroom';

export type DeviceKind = 'lamp' | 'ac' | 'fan' | 'outlet';

export interface ZoneDevice {
  readonly id: string;
  readonly title: string;
  readonly kind: DeviceKind;
  /** Minimum housing tier id that unlocks this device control. */
  readonly minTierId: string;
}

export interface HomeZone {
  readonly id: ZoneId;
  readonly label: string;
  /** Housing tier that first unlocks this zone. */
  readonly minTierId: string;
  readonly devices: readonly ZoneDevice[];
}

/** Ordered housing tier ids (cheapest → priciest) for unlock checks. */
export const TIER_ORDER = [
  'single_room',
  'chamber_kitchen_bath',
  'self_contained',
  'one_bedroom_apartment',
  'premium_apartment',
  'luxury_house',
] as const;

export function tierRank(tierId: string): number {
  const i = (TIER_ORDER as readonly string[]).indexOf(tierId);
  return i < 0 ? 0 : i;
}

export function zoneUnlocked(zone: HomeZone, tierId: string): boolean {
  return tierRank(tierId) >= tierRank(zone.minTierId);
}

export function deviceUnlocked(device: ZoneDevice, tierId: string): boolean {
  return tierRank(tierId) >= tierRank(device.minTierId);
}

/**
 * All zones. Starter only unlocks `room`.
 * Higher tiers peel open Living / Kitchen / Bath / Bedroom / Dining.
 */
export const HOME_ZONES: readonly HomeZone[] = [
  {
    id: 'room',
    label: 'Room',
    minTierId: 'single_room',
    devices: [
      { id: 'room_ceiling', title: 'Ceiling lamp', kind: 'lamp', minTierId: 'single_room' },
      { id: 'room_desk', title: 'Desk lamp', kind: 'lamp', minTierId: 'single_room' },
      { id: 'room_fan', title: 'Standing fan', kind: 'fan', minTierId: 'single_room' },
      { id: 'room_ac', title: 'Room AC', kind: 'ac', minTierId: 'self_contained' },
    ],
  },
  {
    id: 'living',
    label: 'Living',
    minTierId: 'self_contained',
    devices: [
      { id: 'living_ceiling', title: 'Ceiling lamp', kind: 'lamp', minTierId: 'self_contained' },
      { id: 'living_floor', title: 'Floor lamp', kind: 'lamp', minTierId: 'self_contained' },
      { id: 'living_tv', title: 'TV backlight', kind: 'lamp', minTierId: 'one_bedroom_apartment' },
      { id: 'living_ac', title: 'Living AC', kind: 'ac', minTierId: 'self_contained' },
    ],
  },
  {
    id: 'bedroom',
    label: 'Bedroom',
    minTierId: 'one_bedroom_apartment',
    devices: [
      { id: 'bed_ceiling', title: 'Ceiling lamp', kind: 'lamp', minTierId: 'one_bedroom_apartment' },
      { id: 'bed_side', title: 'Bedside lamp', kind: 'lamp', minTierId: 'one_bedroom_apartment' },
      { id: 'bed_ac', title: 'Bedroom AC', kind: 'ac', minTierId: 'one_bedroom_apartment' },
    ],
  },
  {
    id: 'kitchen',
    label: 'Kitchen',
    minTierId: 'chamber_kitchen_bath',
    devices: [
      { id: 'kit_ceiling', title: 'Ceiling lamp', kind: 'lamp', minTierId: 'chamber_kitchen_bath' },
      { id: 'kit_outlet', title: 'Counter outlet', kind: 'outlet', minTierId: 'chamber_kitchen_bath' },
    ],
  },
  {
    id: 'dining',
    label: 'Dining',
    minTierId: 'premium_apartment',
    devices: [
      { id: 'din_ceiling', title: 'Pendant lamp', kind: 'lamp', minTierId: 'premium_apartment' },
      { id: 'din_ac', title: 'Dining AC', kind: 'ac', minTierId: 'premium_apartment' },
    ],
  },
  {
    id: 'bath',
    label: 'Bath',
    minTierId: 'chamber_kitchen_bath',
    devices: [
      { id: 'bath_ceiling', title: 'Bath light', kind: 'lamp', minTierId: 'chamber_kitchen_bath' },
      { id: 'bath_fan', title: 'Extractor', kind: 'fan', minTierId: 'self_contained' },
    ],
  },
  {
    id: 'washroom',
    label: 'Washroom',
    minTierId: 'one_bedroom_apartment',
    devices: [
      { id: 'wash_ceiling', title: 'Wash light', kind: 'lamp', minTierId: 'one_bedroom_apartment' },
    ],
  },
];

export function zonesForTier(tierId: string): readonly HomeZone[] {
  return HOME_ZONES.filter((z) => zoneUnlocked(z, tierId));
}

export function findZone(id: ZoneId): HomeZone | undefined {
  return HOME_ZONES.find((z) => z.id === id);
}
