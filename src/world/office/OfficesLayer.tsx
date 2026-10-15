'use client';
/**
 * O-001 — Mounts every world-run office and registers the office/lift
 * simulation on the ambient step (no new useFrame).
 */
import { useEffect } from 'react';
import { OFFICES } from '../../data/offices';
import { registerAmbient } from '../../engine/ambient';
import { tickOffices } from '../../store/officeStore';
import { OfficeBuilding } from './OfficeBuilding';

export function OfficesLayer() {
  useEffect(() => registerAmbient((dt) => tickOffices(dt)), []);
  return (
    <group name="o001-offices">
      {OFFICES.map((o) => (
        <OfficeBuilding key={o.id} def={o} />
      ))}
    </group>
  );
}
