import { describe, expect, it } from 'vitest';
import { plotAskingPrice, LAND_PLOTS } from '../mapConfig';

describe('plotAskingPrice', () => {
  it('CBD / landmark-adjacent costs more than distant Nungua', () => {
    const cbd = LAND_PLOTS.find((p) => p.zone === 'cbd');
    const nungua = LAND_PLOTS.find((p) => p.zone === 'nungua');
    expect(cbd).toBeTruthy();
    expect(nungua).toBeTruthy();
    expect((cbd!.price ?? 0)).toBeGreaterThan((nungua!.price ?? 0));
  });

  it('explicit price wins', () => {
    expect(plotAskingPrice({ x: 0, z: 0, w: 5, d: 5, price: 9999 })).toBe(9999);
  });
});
