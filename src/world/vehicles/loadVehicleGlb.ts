/**
 * Optional GLB vehicle bodies under public/models/vehicles/.
 * Procedural communityKit geometry remains the default path.
 */
export const VEHICLE_GLB: Record<string, string> = {
  trotro: '/models/vehicles/trotro_car_rapide.glb',
  okada: '/models/vehicles/okada_motorbike.glb',
  van: '/models/vehicles/vintage_van.glb',
  car: '/models/vehicles/vintage_van.glb',
};

export function vehicleGlbUrl(kind: string): string | null {
  return VEHICLE_GLB[kind] ?? null;
}
