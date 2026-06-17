/**
 * Sunrise / sunset and civil twilight, ported from the well-tested SunCalc
 * algorithm (Vladimir Agafonkin, BSD). Returns UTC Date instants; null when the
 * sun stays above/below the horizon all day. A planning aid for night limits.
 */
const rad = Math.PI / 180;
const DAY_MS = 86400000;
const J1970 = 2440588;
const J2000 = 2451545;
const e = rad * 23.4397; // obliquity of the Earth

const toJulian = (d: Date) => d.valueOf() / DAY_MS - 0.5 + J1970;
const fromJulian = (j: number) => new Date((j + 0.5 - J1970) * DAY_MS);
const toDays = (d: Date) => toJulian(d) - J2000;

const solarMeanAnomaly = (d: number) => rad * (357.5291 + 0.98560028 * d);

function eclipticLongitude(M: number): number {
  const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = rad * 102.9372; // perihelion of the Earth
  return M + C + P + Math.PI;
}

const declination = (l: number) =>
  Math.asin(Math.sin(0) * Math.cos(e) + Math.cos(0) * Math.sin(e) * Math.sin(l));

const julianCycle = (d: number, lw: number) => Math.round(d - 0.0009 - lw / (2 * Math.PI));
const approxTransit = (Ht: number, lw: number, n: number) => 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
const solarTransitJ = (ds: number, M: number, L: number) =>
  J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);

function hourAngle(h: number, phi: number, d: number): number {
  return Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(d)) / (Math.cos(phi) * Math.cos(d)));
}

export interface SunTimes {
  sunrise: Date | null;
  sunset: Date | null;
  civilDawn: Date | null;
  civilDusk: Date | null;
}

const valid = (d: Date) => (Number.isNaN(d.getTime()) ? null : d);

/** Sun event times (UTC) for a date, latitude and longitude (decimal degrees). */
export function sunTimes(date: Date, lat: number, lng: number): SunTimes | null {
  if (![lat, lng].every(Number.isFinite) || Number.isNaN(date.getTime())) return null;
  const lw = rad * -lng;
  const phi = rad * lat;
  const d = toDays(date);
  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = declination(L);
  const Jnoon = solarTransitJ(ds, M, L);

  function event(angleDeg: number): { rise: Date | null; set: Date | null } {
    const h0 = angleDeg * rad;
    const w = hourAngle(h0, phi, dec);
    if (Number.isNaN(w)) return { rise: null, set: null };
    const Jset = solarTransitJ(approxTransit(w, lw, n), M, L);
    const Jrise = Jnoon - (Jset - Jnoon);
    return { rise: valid(fromJulian(Jrise)), set: valid(fromJulian(Jset)) };
  }

  const sun = event(-0.833);
  const civil = event(-6);
  return { sunrise: sun.rise, sunset: sun.set, civilDawn: civil.rise, civilDusk: civil.set };
}
