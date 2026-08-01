import { describe, expect, it } from 'vitest';
import { greatCircle } from '@/calc/navigation';
import {
  MAX_ZOOM,
  MIN_ZOOM,
  angularDist,
  circlePoints,
  clampZoom,
  dragToRotation,
  gcPointAt,
  graticule,
  nightPath,
  normLon,
  projectOrtho,
  projectRadar,
  sampleGreatCircle,
} from '@/calc/hud/projection';
import type { Camera } from '@/calc/hud/projection';

const cam = (lat0: number, lon0: number, zoom = 1): Camera => ({ lat0, lon0, zoom });

describe('projectOrtho', () => {
  it('maps the camera centre to the disc origin', () => {
    const p = projectOrtho(24, 45, cam(24, 45));
    expect(p.x).toBeCloseTo(0, 12);
    expect(p.y).toBeCloseTo(0, 12);
    expect(p.visible).toBe(true);
    expect(p.cosC).toBeCloseTo(1, 12);
  });
  it('culls the antipode', () => {
    const p = projectOrtho(-24, -135, cam(24, 45));
    expect(p.visible).toBe(false);
    expect(p.cosC).toBeCloseTo(-1, 12);
  });
  it('puts a point 90°E of an equatorial camera on the +x rim', () => {
    const p = projectOrtho(0, 90, cam(0, 0));
    expect(p.x).toBeCloseTo(1, 12);
    expect(p.y).toBeCloseTo(0, 12);
    expect(p.cosC).toBeCloseTo(0, 12);
  });
  it('puts the north pole straight up from an equatorial camera', () => {
    const p = projectOrtho(90, 0, cam(0, 0));
    expect(p.x).toBeCloseTo(0, 12);
    expect(p.y).toBeCloseTo(1, 12);
  });
});

describe('gcPointAt / sampleGreatCircle', () => {
  const a = { lat: 24.96278, lon: 46.70806 }; // OERK
  const b = { lat: 21.68111, lon: 39.15611 }; // OEJN
  it('hits both endpoints exactly', () => {
    expect(gcPointAt(a, b, 0).lat).toBeCloseTo(a.lat, 9);
    expect(gcPointAt(a, b, 1).lon).toBeCloseTo(b.lon, 9);
  });
  it('midpoint is equidistant from both ends', () => {
    const mid = gcPointAt(a, b, 0.5);
    const dA = greatCircle(mid.lat, mid.lon, a.lat, a.lon)!.distanceNm;
    const dB = greatCircle(mid.lat, mid.lon, b.lat, b.lon)!.distanceNm;
    expect(dA).toBeCloseTo(dB, 6);
  });
  it('handles coincident points', () => {
    const p = gcPointAt(a, a, 0.7);
    expect(p.lat).toBe(a.lat);
    expect(p.lon).toBe(a.lon);
  });
  it('samples n + 1 points from a to b', () => {
    const pts = sampleGreatCircle(a, b, 16);
    expect(pts.length).toBe(17);
    expect(pts[0].lat).toBeCloseTo(a.lat, 9);
    expect(pts[16].lat).toBeCloseTo(b.lat, 9);
  });
});

describe('circlePoints', () => {
  it('keeps every point at the requested geodesic radius', () => {
    const center = { lat: 24.9576, lon: 46.6988 }; // OERK-CTR
    for (const p of circlePoints(center, 8, 36)) {
      expect(greatCircle(center.lat, center.lon, p.lat, p.lon)!.distanceNm).toBeCloseTo(8, 6);
    }
  });
  it('closes the ring', () => {
    const ring = circlePoints({ lat: 20, lon: 40 }, 50, 24);
    expect(ring[0].lat).toBeCloseTo(ring[ring.length - 1].lat, 9);
    expect(ring[0].lon).toBeCloseTo(ring[ring.length - 1].lon, 9);
  });
});

describe('camera controls', () => {
  it('drag right pulls the view west (globe follows the cursor)', () => {
    const next = dragToRotation(cam(20, 40), 50, 0, 200);
    expect(next.lon0).toBeLessThan(40);
    expect(next.lat0).toBe(20);
  });
  it('drag down raises the camera latitude, clamped at the poles', () => {
    const next = dragToRotation(cam(80, 0), 0, 100, 100);
    expect(next.lat0).toBeLessThanOrEqual(85);
    expect(next.lat0).toBeGreaterThan(80);
  });
  it('ignores a degenerate radius', () => {
    expect(dragToRotation(cam(10, 10), 5, 5, 0)).toEqual(cam(10, 10));
  });
  it('clamps zoom to the configured range', () => {
    expect(clampZoom(0.2)).toBe(MIN_ZOOM);
    expect(clampZoom(99)).toBe(MAX_ZOOM);
    expect(clampZoom(NaN)).toBe(MIN_ZOOM);
    expect(clampZoom(3.5)).toBe(3.5);
  });
  it('normalises longitudes into [−180, 180)', () => {
    expect(normLon(190)).toBe(-170);
    expect(normLon(-190)).toBe(170);
    expect(normLon(45)).toBe(45);
  });
});

describe('graticule', () => {
  it('emits parallels and meridians as polylines', () => {
    const lines = graticule(15);
    expect(lines.length).toBeGreaterThan(20);
    for (const line of lines) expect(line.length).toBeGreaterThan(10);
  });
});

describe('nightPath', () => {
  it('is empty when the sun is overhead the camera', () => {
    expect(nightPath({ lat: 24, lon: 45 }, cam(24, 45)).kind).toBe('none');
  });
  it('covers the disc when the sun is at the antipode', () => {
    expect(nightPath({ lat: -24, lon: -135 }, cam(24, 45)).kind).toBe('full');
  });
  it('returns a closed-ish path when the terminator crosses the disc', () => {
    const shade = nightPath({ lat: 0, lon: -45 }, cam(24, 45));
    expect(shade.kind).toBe('path');
    if (shade.kind === 'path') {
      expect(shade.points.length).toBeGreaterThan(10);
      for (const p of shade.points) {
        expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(1.0001);
      }
    }
  });
});

describe('projectRadar', () => {
  const center = { lat: 24.96278, lon: 46.70806 };
  it('maps the centre to the origin', () => {
    const p = projectRadar(center.lat, center.lon, center, 120);
    expect(p.x).toBeCloseTo(0, 6);
    expect(p.y).toBeCloseTo(0, 6);
    expect(p.inRange).toBe(true);
  });
  it('is linear in distance and north-up', () => {
    const north60 = projectRadar(25.9628, 46.70806, center, 120); // ≈60 NM north
    expect(north60.y).toBeCloseTo(0.5, 2);
    expect(north60.x).toBeCloseTo(0, 2);
    expect(north60.inRange).toBe(true);
  });
  it('flags out-of-range contacts', () => {
    const far = projectRadar(30, 55, center, 120);
    expect(far.inRange).toBe(false);
    expect(far.r01).toBeGreaterThan(1);
  });
});

describe('angularDist', () => {
  it('matches the great-circle distance', () => {
    const a = { lat: 24.96278, lon: 46.70806 };
    const b = { lat: 21.68111, lon: 39.15611 };
    const nm = greatCircle(a.lat, a.lon, b.lat, b.lon)!.distanceNm;
    expect(angularDist(a, b) * 3440.065).toBeCloseTo(nm, 6);
  });
});
