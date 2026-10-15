/**
 * Optional GLB vehicle bodies under public/models/vehicles/.
 * Procedural communityKit geometry remains the default path.
 */
import { publicUrl } from '../gltfSupport';

export const VEHICLE_GLB: Record<string, string> = {
  trotro: publicUrl('models/vehicles/trotro_car_rapide.glb'),
  okada: publicUrl('models/vehicles/okada_motorbike.glb'),
  van: publicUrl('models/vehicles/vintage_van.glb'),
  car: publicUrl('models/vehicles/vintage_van.glb'),
};

export function vehicleGlbUrl(kind: string): string | null {
  return VEHICLE_GLB[kind] ?? null;
}
