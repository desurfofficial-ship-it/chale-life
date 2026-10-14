/**
 * ?tycoonDemo=1 — four open businesses so World can prove the slice
 * before E-010 wires the store.
 */
import { arrange } from '../../rules/business';
import { findBusinessType } from '../../data/businesses';
import { LAND_PLOTS } from '../../lib/mapConfig';
import type { TycoonBusinessView, TycoonWorldProps } from './types';

const DEMO_SPECS: { typeId: string; plotIndex: number }[] = [
  { typeId: 'chop_bar', plotIndex: 0 },
  { typeId: 'waakye_stand', plotIndex: 1 },
  { typeId: 'barber', plotIndex: 2 },
  { typeId: 'fuel_station', plotIndex: 5 },
];

export function buildTycoonDemoProps(): TycoonWorldProps {
  const owned: string[] = [];
  const businesses: TycoonBusinessView[] = [];

  for (const spec of DEMO_SPECS) {
    const plot = LAND_PLOTS[spec.plotIndex];
    if (!plot?.id) continue;
    const type = findBusinessType(spec.typeId);
    if (!type) continue;
    const layout = arrange(spec.typeId, 'suggested', { w: plot.w, d: plot.d });
    owned.push(plot.id);
    businesses.push({
      id: `demo-${spec.typeId}`,
      plotId: plot.id,
      typeId: spec.typeId,
      category: type.category,
      layout,
      open: true,
      customersVisible: 3 + (spec.plotIndex % 3),
      staff: type.staffByTier.suggested,
      lastSaleGHS: spec.typeId === 'chop_bar' ? 12 : spec.typeId === 'fuel_station' ? 60 : 25,
    });
  }

  return {
    ownedPlotIds: owned,
    businesses,
    weather: 'clear',
    hour: 14,
    selectedPlotId: null,
  };
}
