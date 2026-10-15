import type { FurniturePlacement } from '../../rules/business';

export type TycoonWeather = 'clear' | 'cloudy' | 'rain' | 'night';

export interface TycoonBusinessView {
  readonly id: string;
  readonly plotId: string;
  readonly typeId: string;
  readonly category: 'services' | 'food_drink' | 'entertainment';
  readonly layout: readonly FurniturePlacement[];
  readonly open: boolean;
  /** Customers currently visible (from last tick) */
  readonly customersVisible: number;
  readonly staff: number;
  /** Last sale amount for money-pop (0 = none this frame window) */
  readonly lastSaleGHS: number;
  /**
   * E-011: cumulative revenue today — the MONOTONIC anchor money-pop
   * spawning dedupes against. The delta (lastSaleGHS) repeats whenever two
   * sales happen to be the same size, which silently swallowed the second
   * pop; a cumulative counter never repeats within a day.
   */
  readonly revenueToday: number;
}

export interface TycoonWorldProps {
  readonly ownedPlotIds: readonly string[];
  readonly businesses: readonly TycoonBusinessView[];
  readonly weather: TycoonWeather;
  /** Game hour 0–23 for lighting hints */
  readonly hour: number;
  /** Soft highlight under pointer / selection */
  readonly selectedPlotId?: string | null;
}
