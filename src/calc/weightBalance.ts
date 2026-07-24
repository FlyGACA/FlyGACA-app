/** Weight & balance — total weight, moment and centre of gravity from a set of
 *  loading stations, plus optional %MAC. Pure; a planning aid — load the real
 *  arms and limits from the AFM/POH. */

export interface Station {
  weight: number;
  arm: number;
}

export interface WbResult {
  weight: number;
  moment: number;
  /** Centre of gravity (same arm unit as the inputs). */
  cg: number;
}

import { fin } from './guards';

/** CG from the stations that carry weight. Returns null if none do. */
export function weightBalance(stations: Station[]): WbResult | null {
  let weight = 0;
  let moment = 0;
  for (const s of stations) {
    if (!fin(s.weight) || !fin(s.arm) || s.weight === 0) continue;
    weight += s.weight;
    moment += s.weight * s.arm;
  }
  if (weight === 0) return null;
  return { weight, moment, cg: moment / weight };
}

/** Centre of gravity as a percentage of the mean aerodynamic chord. */
export function percentMac(cg: number, lemac: number, macLength: number): number | null {
  if (!fin(cg) || !fin(lemac) || !fin(macLength) || macLength === 0) return null;
  return ((cg - lemac) / macLength) * 100;
}
