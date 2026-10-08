import { describe, expect, it } from 'vitest';
import { locations } from '../data/locations';
import { colliders, worldBounds } from '../world/colliders';
import { circleIntersectsBox, type Box } from './collision';
import { DEFAULT_MOVEMENT } from './movement';
import { getState, getHud } from '../store/gameStore';
import { initializePlayerSpawn, resolveSpawn, SPAWN_YAW } from './spawn';

/**
 * E-002 — the player must start at the starter compound location from the
 * World → Gameplay contract (src/data/locations.ts), never inside a collider
 * (a spawn inside geometry blocks both movement axes → permanently stuck).
 */
describe('resolveSpawn', () => {
  it('uses the home location from the registry (LOC-002 Starter Compound)', () => {
    const home = locations.find((l) => l.type === 'home');
    expect(home).toBeDefined();
    const spawn = resolveSpawn();
    expect(spawn.locationId).toBe(home!.id);
    expect(spawn.x).toBeCloseTo(home!.x, 10);
    expect(spawn.z).toBeCloseTo(home!.z, 10);
  });

  it('is outside every real World collider (circle vs box, capsule radius)', () => {
    const spawn = resolveSpawn();
    for (const box of colliders) {
      expect(circleIntersectsBox(spawn.x, spawn.z, DEFAULT_MOVEMENT.radius, box)).toBe(false);
    }
  });

  it('is clamped inside the world bounds minus the capsule radius', () => {
    const spawn = resolveSpawn();
    expect(spawn.x).toBeGreaterThanOrEqual(worldBounds.minX + DEFAULT_MOVEMENT.radius);
    expect(spawn.x).toBeLessThanOrEqual(worldBounds.maxX - DEFAULT_MOVEMENT.radius);
    expect(spawn.z).toBeGreaterThanOrEqual(worldBounds.minZ + DEFAULT_MOVEMENT.radius);
    expect(spawn.z).toBeLessThanOrEqual(worldBounds.maxZ - DEFAULT_MOVEMENT.radius);
  });

  it('is pure: calling it twice returns the same point', () => {
    const a = resolveSpawn();
    const b = resolveSpawn();
    expect(b).toEqual(a);
  });

  it('nudges the spawn out when a collider covers the marked location', () => {
    // A hypothetical 2×2 m shed dropped right on top of the compound gate.
    const blocker: Box = { minX: -10.5, minZ: 12.4, maxX: -8.5, maxZ: 14.4 };
    expect(circleIntersectsBox(-9.5, 13.4, DEFAULT_MOVEMENT.radius, blocker)).toBe(true);

    const spawn = resolveSpawn(DEFAULT_MOVEMENT.radius, [blocker]);
    expect(circleIntersectsBox(spawn.x, spawn.z, DEFAULT_MOVEMENT.radius, blocker)).toBe(false);
    // Still the same logical location (nudged, not relocated across town).
    expect(Math.hypot(spawn.x + 9.5, spawn.z - 13.4)).toBeLessThanOrEqual(5);
  });

  it('never returns a point inside ANY box of a hostile fake world', () => {
    // Wall-to-wall corridors: the ring search must find the free lane.
    const walls: Box[] = [
      { minX: -30, minZ: -30, maxX: 30, maxZ: -2 },
      { minX: -30, minZ: 2, maxX: 30, maxZ: 30 },
    ];
    const spawn = resolveSpawn(0.45, walls);
    expect(circleIntersectsBox(spawn.x, spawn.z, 0.45, walls[0])).toBe(false);
    expect(circleIntersectsBox(spawn.x, spawn.z, 0.45, walls[1])).toBe(false);
  });
});

describe('initializePlayerSpawn', () => {
  it('commits the spawn to the store and refreshes the HUD snapshot', () => {
    initializePlayerSpawn();

    const p = getState().player.position;
    expect(p.x).toBeCloseTo(-9.5, 5);
    expect(p.z).toBeCloseTo(13.4, 5);
    expect(p.y).toBe(0);
    expect(getState().player.yaw).toBe(SPAWN_YAW);

    const hud = getHud();
    expect(hud.x).toBeCloseTo(-9.5, 5);
    expect(hud.z).toBeCloseTo(13.4, 5);
    expect(hud.yaw).toBe(SPAWN_YAW);
  });
});
