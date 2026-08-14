import { weightBalance } from '../weightBalance';
import type { Station, WbResult } from '../weightBalance';

export interface FuelWeightParams {
  zeroFuelStations: Station[];
  fuelArm: number;
  totalFuel: number;
  taxiFuel: number;
  tripFuel: number;
}

export interface FuelWeightPoints {
  zfw: WbResult | null;
  ramp: WbResult | null;
  tow: WbResult | null;
  ldw: WbResult | null;
}

export function calculateFuelWeightPoints(params: FuelWeightParams): FuelWeightPoints {
  const zfw = weightBalance(params.zeroFuelStations);
  const ramp = weightBalance([...params.zeroFuelStations, { weight: params.totalFuel, arm: params.fuelArm }]);
  const tow = weightBalance([...params.zeroFuelStations, { weight: params.totalFuel - (params.taxiFuel || 0), arm: params.fuelArm }]);
  const ldw = weightBalance([...params.zeroFuelStations, { weight: params.totalFuel - (params.taxiFuel || 0) - (params.tripFuel || 0), arm: params.fuelArm }]);

  return { zfw, ramp, tow, ldw };
}
